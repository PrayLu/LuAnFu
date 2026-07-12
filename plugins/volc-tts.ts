import type { Plugin, Connect } from 'vite';
import type { ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

const TTS_URL = 'https://openspeech.bytedance.com/api/v3/tts/unidirectional';

type TtsBody = {
  text?: string;
  voiceType?: string;
  speedRatio?: number;
};

function envOr(name: string, fallback: string) {
  const value = process.env[name];
  if (!value || value === 'undefined') return fallback;
  return value;
}

function resourceIdForSpeaker(speaker: string) {
  if (speaker.startsWith('S_')) return envOr('VOLC_RESOURCE_ID', 'seed-icl-2.0');
  if (speaker.includes('_uranus_') || speaker.startsWith('saturn_')) {
    return envOr('VOLC_RESOURCE_ID', 'seed-tts-2.0');
  }
  return envOr('VOLC_RESOURCE_ID', 'seed-tts-1.0');
}

function readJson(req: Connect.IncomingMessage): Promise<TtsBody> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8') || '{}';
        resolve(JSON.parse(raw) as TtsBody);
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(data));
}

/** Parse concatenated JSON objects from V3 chunked body and join base64 audio. */
function decodeV3Audio(raw: string): { audio: Buffer | null; error?: string; code?: number } {
  const parts: Buffer[] = [];
  let idx = 0;
  let lastCode = 0;
  let lastMessage = '';

  while (idx < raw.length) {
    while (idx < raw.length && /\s/.test(raw[idx]!)) idx += 1;
    if (idx >= raw.length) break;
    if (raw[idx] !== '{') break;

    let depth = 0;
    let inStr = false;
    let escape = false;
    let end = idx;
    for (; end < raw.length; end += 1) {
      const ch = raw[end]!;
      if (inStr) {
        if (escape) escape = false;
        else if (ch === '\\') escape = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          end += 1;
          break;
        }
      }
    }

    const slice = raw.slice(idx, end);
    idx = end;
    try {
      const obj = JSON.parse(slice) as {
        code?: number;
        message?: string;
        data?: string | null;
      };
      lastCode = obj.code ?? lastCode;
      lastMessage = obj.message || lastMessage;
      if (typeof obj.data === 'string' && obj.data) {
        parts.push(Buffer.from(obj.data, 'base64'));
      }
    } catch {
      break;
    }
  }

  if (parts.length === 0) {
    return { audio: null, error: lastMessage || 'empty_audio', code: lastCode };
  }
  return { audio: Buffer.concat(parts) };
}

/**
 * Dev/preview middleware: proxies Volcengine Doubao TTS V3 so tokens stay server-side.
 */
export function volcTtsPlugin(): Plugin {
  return {
    name: 'volc-tts',
    configureServer(server) {
      attach(server.middlewares);
    },
    configurePreviewServer(server) {
      attach(server.middlewares);
    },
  };
}

function attach(middlewares: Connect.Server) {
  middlewares.use('/api/tts/status', (_req, res) => {
    const appid = envOr('VOLC_APP_ID', '');
    const token = envOr('VOLC_ACCESS_TOKEN', '');
    sendJson(res, 200, {
      configured: Boolean(appid && token),
      api: 'v3',
      resourceId: envOr('VOLC_RESOURCE_ID', 'seed-tts-2.0'),
      defaultVoice: envOr('VOLC_VOICE_TYPE', 'zh_male_dayi_uranus_bigtts'),
    });
  });

  middlewares.use('/api/tts', async (req, res, next) => {
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.end();
      return;
    }

    if (req.method !== 'POST') {
      next();
      return;
    }

    const appid = envOr('VOLC_APP_ID', '');
    const token = envOr('VOLC_ACCESS_TOKEN', '');
    const defaultVoice = envOr('VOLC_VOICE_TYPE', 'zh_male_dayi_uranus_bigtts');

    if (!appid || !token) {
      sendJson(res, 503, {
        error: 'missing_credentials',
        message: '请在 .env 中配置 VOLC_APP_ID 与 VOLC_ACCESS_TOKEN',
      });
      return;
    }

    try {
      const body = await readJson(req);
      const text = (body.text || '').trim();
      if (!text) {
        sendJson(res, 400, { error: 'empty_text' });
        return;
      }
      if (text.length > 300) {
        sendJson(res, 400, { error: 'text_too_long', message: '单次旁白请控制在 300 字内' });
        return;
      }

      const speaker = body.voiceType || defaultVoice;
      const resourceId = resourceIdForSpeaker(speaker);
      const speedRatio = body.speedRatio ?? 1.0;

      const payload = {
        user: { uid: 'luanfu-onboarding' },
        req_params: {
          text,
          speaker,
          audio_params: {
            format: 'mp3',
            sample_rate: 24000,
            speech_rate: Math.round((speedRatio - 1) * 50),
          },
        },
      };

      const upstream = await fetch(TTS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-App-Id': appid,
          'X-Api-Access-Key': token,
          'X-Api-Resource-Id': resourceId,
          'X-Api-Request-Id': randomUUID(),
        },
        body: JSON.stringify(payload),
      });

      const raw = await upstream.text();
      if (!upstream.ok) {
        let message = raw.slice(0, 200);
        try {
          const parsed = JSON.parse(raw) as {
            header?: { message?: string; code?: number };
            message?: string;
            code?: number;
          };
          message = parsed.header?.message || parsed.message || message;
          sendJson(res, 502, {
            error: 'upstream_failed',
            code: parsed.header?.code ?? parsed.code ?? upstream.status,
            message,
          });
        } catch {
          sendJson(res, 502, {
            error: 'upstream_failed',
            code: upstream.status,
            message,
          });
        }
        return;
      }

      const decoded = decodeV3Audio(raw);
      if (!decoded.audio) {
        sendJson(res, 502, {
          error: 'upstream_failed',
          code: decoded.code,
          message: decoded.error || 'empty_audio',
        });
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'no-store');
      res.end(decoded.audio);
    } catch (err) {
      sendJson(res, 500, {
        error: 'proxy_error',
        message: err instanceof Error ? err.message : 'unknown',
      });
    }
  });
}

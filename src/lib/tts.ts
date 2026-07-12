import { appAudio } from './audio';

export type TtsStatus = {
  configured: boolean;
  cluster?: string;
  defaultVoice?: string;
};

let statusCache: TtsStatus | null = null;
let statusPromise: Promise<TtsStatus> | null = null;
let currentAudio: HTMLAudioElement | null = null;
let playToken = 0;

function haltAudio() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.removeAttribute('src');
    currentAudio.load();
    currentAudio = null;
  }
}

export async function getTtsStatus(): Promise<TtsStatus> {
  if (statusCache) return statusCache;
  if (!statusPromise) {
    statusPromise = fetch('/api/tts/status')
      .then(async (res) => {
        if (!res.ok) return { configured: false };
        return (await res.json()) as TtsStatus;
      })
      .catch(() => ({ configured: false }))
      .then((s) => {
        statusCache = s;
        return s;
      });
  }
  return statusPromise;
}

export function stopTts() {
  playToken += 1;
  haltAudio();
}

/**
 * Speak text via Volcengine TTS proxy. No-ops if muted / not configured / empty.
 */
export async function speakText(
  text: string,
  options?: { voiceType?: string; speedRatio?: number },
): Promise<boolean> {
  const trimmed = text.trim();
  if (!trimmed || appAudio.isMuted()) return false;

  await appAudio.unlock();
  const status = await getTtsStatus();
  if (!status.configured) return false;

  const token = ++playToken;
  haltAudio();

  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: trimmed,
        voiceType: options?.voiceType,
        speedRatio: options?.speedRatio ?? 1.0,
      }),
    });

    if (!res.ok) {
      return false;
    }

    if (token !== playToken || appAudio.isMuted()) return false;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;

    await new Promise<void>((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (currentAudio === audio) currentAudio = null;
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (currentAudio === audio) currentAudio = null;
        reject(new Error('audio_play_failed'));
      };
      void audio.play().catch(reject);
    });

    return token === playToken;
  } catch {
    return false;
  }
}

appAudio.subscribe((muted) => {
  if (muted) stopTts();
});

import { useState, useRef, useEffect, useCallback } from 'react';
import { gsap } from 'gsap';
import { toPng } from 'html-to-image';
import { speakText, stopTts, getTtsStatus } from './lib/tts';
import { appAudio } from './lib/audio';
import { asset } from './lib/asset';
import {
  loadSave,
  writeSave,
  clearSave,
  formatSaveTime,
  type SaveData,
} from './lib/save';

function MuteButton() {
  const [muted, setMuted] = useState(appAudio.isMuted());
  const [ttsReady, setTtsReady] = useState(false);

  useEffect(() => appAudio.subscribe(setMuted), []);
  useEffect(() => {
    void getTtsStatus().then((s) => setTtsReady(s.configured));
  }, []);

  return (
    <button
      type="button"
      className="mute-fab"
      aria-label={muted ? '打开声音' : '关闭声音'}
      title={ttsReady ? '火山引擎语音已接入' : '未配置火山语音（见 .env.example）'}
      onClick={() => {
        void appAudio.unlock();
        appAudio.toggleMute();
      }}
    >
      {muted ? '静音' : '声开'}
    </button>
  );
}

/* ───────────── Types ───────────── */
type Page = 'welcome' | 'levelSelect' | 'level1' | 'level2' | 'level3' | 'celebration';

interface TimelineEvent {
  year: string;
  shortLabel: string;
  title: string;
  description: string;
  image: string;
  hasSilkBall: boolean;
}

interface StoryOption {
  id: string;
  text: string;
}

interface StoryScene {
  id: string;
  chapter: string;
  setting: string;
  image: string;
  narrative: string;
  question: string;
  options: StoryOption[];
  correctId: string;
  insight: string;
  threadLabel: string;
}

interface SilkFortune {
  omen: { title: string; verse: string };
  thread: { name: string; color: string; meaning: string };
  role: { name: string; blessing: string };
}

interface Mentor {
  id: string;
  title: string;
  name: string;
  image: string;
  avatar: string;
  trait: string;
  inscription: string;
  blurb: string;
  oath: string;
  /** 火山引擎 voice_type */
  voiceType: string;
  voices: {
    levelSelect: string;
    level1Intro: string;
    level1Collect: string;
    level1Done: string;
    level2Intro: string;
    level2Correct: string;
    level2Wrong: string;
    level3Intro: string;
    level3Draw: string;
    graduation: string;
  };
}

function pickRandom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

const openingQuestions = [
  {
    index: '第一问',
    text: '你摸过丝绸，可曾听过它在机上的呼吸？',
    echo: '机杼会回答你。',
  },
  {
    index: '第二问',
    text: '故宫婚床上的那床被，为何偏偏是潞绸？',
    echo: '人心与匠心，织在同一经纬。',
  },
  {
    index: '第三问',
    text: '若你也落下一梭，会织进怎样的一生？',
    echo: '答案，不在此处——在你即将展开的三卷里。',
  },
];

/* ───────────── Data ───────────── */
const timelineData: TimelineEvent[] = [
  {
    year: '上古',
    shortLabel: '上古',
    title: '始教民育蚕',
    description: '《通鉴纲目·外记》记载："始教民育蚕，治丝茧以供衣服，而天下无皴瘃之患，后世祀为先蚕。"中华文明六千年的丝绸历史由此开篇，潞绸便源自这悠久的桑蚕文明。',
    image: asset('timeline-ancient.jpg'),
    hasSilkBall: false,
  },
  {
    year: '宋代',
    shortLabel: '宋代',
    title: '《清明上河图》潞紬店',
    description: '在北宋张择端的传世名画《清明上河图》上，虹桥之畔清晰可见"潞紬店"的招牌。潞绸作为当时顶级的丝织品，已是汴京繁华街市中的知名品牌。',
    image: asset('timeline-song.jpg'),
    hasSilkBall: true,
  },
  {
    year: '明清',
    shortLabel: '明清',
    title: '御贡明清六百年',
    description: '潞绸自明代起成为皇家贡品，持续御贡明清两朝六百年。故宫坤宁宫东暖阁的婚床上，铺的便是潞绸被褥，从皇家走入百姓婚房，见证无数重要时刻。',
    image: asset('timeline-qing.jpg'),
    hasSilkBall: false,
  },
  {
    year: '1856',
    shortLabel: '1856',
    title: '慈禧与潞绸',
    description: '公元1856年，"懿嫔"慈禧喜得龙子（同治帝），喜讯传遍宫廷。潞绸作为当时最珍贵的丝织品，被用于庆贺这一皇家喜事，进一步奠定了其尊贵地位。',
    image: asset('timeline-cixi.jpg'),
    hasSilkBall: false,
  },
  {
    year: '1958',
    shortLabel: '1958',
    title: '高平丝织印染厂建厂',
    description: '国家第二个五年计划期间，华北地区最大的丝织印染厂在高平南王庄合作社成立，后改组成为高平丝织厂，即今天的潞安府潞绸集团。开启了潞绸工业化生产的新篇章。',
    image: asset('timeline-1958.jpg'),
    hasSilkBall: true,
  },
  {
    year: '1960s',
    shortLabel: '60s',
    title: '旷世织锦',
    description: '二十世纪六十年代末，高平丝织厂织造了《毛主席去安源》巨幅画像，用56904张手工纹版，以7把梭子带动21色丝线，构造经线2层、纬线7层，完全还原油画风采，已成绝版。',
    image: asset('timeline-1960s.jpg'),
    hasSilkBall: true,
  },
  {
    year: '2000s',
    shortLabel: '00s',
    title: '高档丝绸标志认证',
    description: '潞安府成为华北地区唯一入选国家首批"中国高档丝绸标志认证"的企业，标志着潞绸品质获得国家级认可。',
    image: asset('timeline-silkmark.jpg'),
    hasSilkBall: false,
  },
  {
    year: '2006',
    shortLabel: '2006',
    title: '新娘潞绸被诞生',
    description: '公司专注打造"最富中国文化寓意"的经典婚被——潞安府新娘潞绸被。被面采用国家级非遗潞绸，被胎选用太行山国家地理标志保护蚕茧，手工拉制，成为尊贵中国新娘的婚礼象征物。',
    image: asset('timeline-wedding.jpg'),
    hasSilkBall: false,
  },
  {
    year: '2014',
    shortLabel: '2014',
    title: '国家级非物质文化遗产',
    description: '2014年11月，潞绸织造技艺入选"国家级非物质文化遗产"名录。这一传承六千年的古老技艺，得到了国家的最高级别保护与认可。',
    image: asset('timeline-2014.jpg'),
    hasSilkBall: true,
  },
  {
    year: '2015',
    shortLabel: '2015',
    title: '丝麻面料创新',
    description: '在潞绸非遗织造技艺基础上不断创新，推出国内首创的特色丝麻面料。集桑蚕丝的细腻柔软与大麻的粗犷质朴为一体，是"例外""玛丝菲尔""雅戈尔"等国内一线品牌的专供面料。',
    image: asset('timeline-silkhemp.jpg'),
    hasSilkBall: false,
  },
  {
    year: '2019',
    shortLabel: '2019',
    title: '国家工业遗产',
    description: '潞绸文化园入选第三批国家工业遗产，成为集工业旅游、文化创意、参观体验、休闲购物为一体的综合性文化旅游园区。"炎帝陵——潞绸文化园"已成为游客休闲旅游的新线路。',
    image: asset('timeline-2019.jpg'),
    hasSilkBall: false,
  },
  {
    year: '国际',
    shortLabel: '世界',
    title: '潞绸走向世界',
    description: '潞绸作为中华文明的使者，走进俄罗斯国家博物馆、法国巴黎名媛舞会、柬埔寨、迪拜、西班牙、意大利、英联邦成员国等。代表中国丝绸，在国际舞台上绽放光彩。',
    image: asset('timeline-global.jpg'),
    hasSilkBall: true,
  },
];

const storyScenes: StoryScene[] = [
  {
    id: 's1',
    chapter: '第一梭',
    setting: '织造车间',
    image: asset('timeline-1960s.jpg'),
    narrative:
      '入职第一天，师傅带你走进织造车间。机杼声里，他指着墙上那幅巨作告诉你：当年织《毛主席去安源》，用了五万多张手工纹版、七把梭子与二十一色丝线。你忽然明白，潞绸人敬的，不只是漂亮的布。',
    question: '这份坚持，最贴近潞绸人的哪一种精神？',
    options: [
      { id: 'a', text: '匠心 —— 精益求精，不忘初心' },
      { id: 'b', text: '速度 —— 尽快交货最重要' },
      { id: 'c', text: '跟风 —— 流行什么就织什么' },
    ],
    correctId: 'a',
    insight: '六十八载专注织造。旷世织锦提醒我们：好东西，值得慢慢做对。',
    threadLabel: '匠心',
  },
  {
    id: 's2',
    chapter: '第二梭',
    setting: '婚被展厅',
    image: asset('timeline-wedding.jpg'),
    narrative:
      '一对新人来选婚被。导购轻轻展开被面，讲起太行山蚕茧与非遗织造。新娘问：「这床被，你们最想送给新人的，是一句什么话？」你刚想开口……',
    question: '新娘潞绸被的使命，应该怎么答？',
    options: [
      { id: 'a', text: '便宜实惠，一年换新' },
      { id: 'b', text: '潞绸传家，忠爱一生' },
      { id: 'c', text: '款式最多，颜色最全' },
    ],
    correctId: 'b',
    insight: '一床婚被承载的，是代代相传的祝福，不只是一件商品。',
    threadLabel: '传家',
  },
  {
    id: 's3',
    chapter: '第三梭',
    setting: '客户接待',
    image: asset('card-values.jpg'),
    narrative:
      '一位老客户远道而来，订单却临时改了规格。同事有些着急。老师傅递过茶，笑着说：「先听清楚对方的难处。」你看着这一幕，想起入职手册上的那句价值观。',
    question: '面对客户与同事，潞绸人应秉持？',
    options: [
      { id: 'a', text: '业绩为先，其余再说' },
      { id: 'b', text: '少说多做，不必解释' },
      { id: 'c', text: '忠诚于心，真诚待人' },
    ],
    correctId: 'c',
    insight: '忠诚与真诚，是穿起每一段合作关系的经线。',
    threadLabel: '忠诚',
  },
  {
    id: 's4',
    chapter: '第四梭',
    setting: '面料展区',
    image: asset('timeline-silkhemp.jpg'),
    narrative:
      '展台上，丝麻面料摸上去既细腻又有骨力。讲解员说，它供「例外」「玛丝菲尔」「雅戈尔」等品牌使用。有人问：非遗技艺为什么还要不断创新？',
    question: '面料业务最贴近的使命是？',
    options: [
      { id: 'a', text: '只守古法，不再求变' },
      { id: 'b', text: '传承技艺，相伴客户，引领市场' },
      { id: 'c', text: '什么好卖就做什么' },
    ],
    correctId: 'b',
    insight: '创新不是丢掉根脉，而是让非遗在当代市场里继续发光。',
    threadLabel: '创新',
  },
];

const omenPool = [
  { title: '锦绣开篇', verse: '新程如丝，细而不断；落梭之处，便是起点。' },
  { title: '忠爱长织', verse: '心之所向，梭之所往；一床一布，皆藏真心。' },
  { title: '匠心得遇', verse: '慢工出细活，贵在坚持；好丝不怕经纬长。' },
  { title: '传家有光', verse: '一缕丝线，连起千家祝福；你来，光也来。' },
  { title: '出海乘风', verse: '潞绸之名，远播四方；此行有你，更远一分。' },
  { title: '经纬通达', verse: '事事有回响，人人是知音；织得密处见性情。' },
];

const threadPool = [
  { name: '御贡金', color: '#D4AF37', meaning: '尊贵与担当——你扛得住重要时刻' },
  { name: '桑叶绿', color: '#2A5744', meaning: '生长与沉稳——根基深，走得远' },
  { name: '婚喜绛', color: '#C84A3E', meaning: '热忱与承诺——对人真，做事烈' },
  { name: '素练白', color: '#F7F4ED', meaning: '纯净与初心——从一张白绢织起传奇' },
  { name: '暮云灰', color: '#8C8C8C', meaning: '包容与沉淀——能听、能扛、能成事' },
  { name: '茧珀橙', color: '#E8A87C', meaning: '温暖与活力——你让团队更有光' },
];

const rolePool = [
  { name: '守线人', blessing: '把品质守到最后一毫米' },
  { name: '传声梭', blessing: '把潞绸故事讲给更多人听' },
  { name: '织梦者', blessing: '用创意把非遗织进当下' },
  { name: '知音伴', blessing: '真诚对待每一位客户与同事' },
  { name: '拓路人', blessing: '帮潞绸走向更远的地方' },
  { name: '青丝新', blessing: '以新人锐气，续百年锦绣' },
];

const mentors: Mentor[] = [
  {
    id: 'weaver',
    title: '织造师傅',
    name: '机杼翁',
    image: asset('timeline-1960s.jpg'),
    avatar: asset('mentor-weaver.png'),
    trait: '匠心',
    blurb: '跟他学沉住气，把每一梭都走准',
    inscription: '机杼不歇，心细如丝。愿你下笔有力，落梭有准。',
    oath: '徒儿，从今日起跟我走。机声里藏着潞绸的骨气，侧耳，便听见了。',
    voiceType: 'zh_male_dayi_uranus_bigtts',
    voices: {
      levelSelect: '三卷在前：抽丝问史，穿梭问心，织成问命。别急，一梭一梭来。',
      level1Intro: '还记得第一问吗？丝绸在机上的呼吸——现在，横滑展卷，去听。',
      level1Collect: '好。金线入手，便是把岁月攥进掌心。再往前。',
      level1Done: '长卷展毕。你听见了吗？那一声声机杼，是六十八年没断过的气。',
      level2Intro: '第二问藏在人情里。徒儿，走进情景，像穿梭一样，把心对准经线。',
      level2Correct: '对了。这一梭，穿得干净。',
      level2Wrong: '偏了也不怕。梭可以重来，心不能糊。再选。',
      level3Intro: '第三问来了。闭眼——听丝响。你要落下的，是怎样的一生？',
      level3Draw: '抽吧。签上写的不是命运，是你愿意成为的人。',
      graduation: '出师了。把匠心带走，别只带走一张卷。',
    },
  },
  {
    id: 'wedding',
    title: '婚被师傅',
    name: '传家娘',
    image: asset('timeline-wedding.jpg'),
    avatar: asset('mentor-wedding.png'),
    trait: '传家',
    blurb: '跟她学心意，把祝福织进被里',
    inscription: '传家有礼，忠爱为凭。愿你待人以诚，做事以恒。',
    oath: '孩子，跟娘走。潞绸不只漂亮，它懂成全——床上的一被，心里的一生。',
    voiceType: 'zh_female_vv_uranus_bigtts',
    voices: {
      levelSelect: '三卷如三道礼：先知来处，再明心意，最后许下一诺。',
      level1Intro: '第一问是呼吸，第二问才是温度。先把长卷看完，娘再告诉你那床被的事。',
      level1Collect: '收好。岁月像蚕丝，细，却能缠住家。',
      level1Done: '看见了吧？从御贡到婚房，丝线一直在成全人。',
      level2Intro: '第二问：为何是潞绸？因为忠爱要有物可托。去情景里，选对那份心意。',
      level2Correct: '嗯。这才像过日子的人——心口一致。',
      level2Wrong: '别慌。情是慢慢认的，再想一想。',
      level3Intro: '第三问最软，也最重。你愿把怎样的一生，织进被里？',
      level3Draw: '抽签如许愿。娘在这儿，看你落下一句真心。',
      graduation: '出师礼成。愿你对人温柔，对事长久——潞绸传家，忠爱一生。',
    },
  },
  {
    id: 'fabric',
    title: '面料师傅',
    name: '新织手',
    image: asset('timeline-silkhemp.jpg'),
    avatar: asset('mentor-fabric.png'),
    trait: '创新',
    blurb: '跟他学破局，让古法长出新枝',
    inscription: '古法新织，相伴客户。愿你敢创新，也守得住根。',
    oath: '跟我，别只会守旧。根要深，枝要新——潞绸才活得久。',
    voiceType: 'zh_male_m191_uranus_bigtts',
    voices: {
      levelSelect: '三卷是三条路：回看根、校准心、再向前织。走吧。',
      level1Intro: '第一问：机上的呼吸。听清楚过去，才知道什么能改、什么不能丢。',
      level1Collect: '拿到了？好。材料、年代、手艺——全是创新的底牌。',
      level1Done: '根摸清了。下一步，看你会不会把古法织进今天。',
      level2Intro: '第二问藏在选择里。客户、匠心、创新——哪一根是你的经线？',
      level2Correct: '漂亮。破局不是莽，是找准那一梭。',
      level2Wrong: '试错也是织。重来，对准了再穿。',
      level3Intro: '第三问：你这一生，织旧还是织新？抽签告诉我。',
      level3Draw: '签是灵感，手是你的。抽。',
      graduation: '出师。去岗位上，把「敢」和「守」一起带走。',
    },
  },
  {
    id: 'story',
    title: '讲述师傅',
    name: '说书人',
    image: asset('timeline-global.jpg'),
    avatar: asset('mentor-story.png'),
    trait: '文化',
    blurb: '跟她学开口，把潞绸讲给世界听',
    inscription: '丝路有声，故事有光。愿你开口有情，行走有向。',
    oath: '徒儿，跟我说书。潞绸若无人讲述，再好的丝也只会沉在箱底。',
    voiceType: 'zh_female_xiaohe_uranus_bigtts',
    voices: {
      levelSelect: '三卷三折书：史是开篇，心是高潮，签是你写下的结尾。',
      level1Intro: '第一问是声音。横滑长卷——每一页，都是一句台词。',
      level1Collect: '收着。这是你日后讲给别人听的「硬细节」。',
      level1Done: '史读完了。记住：好故事，经得起追问。',
      level2Intro: '第二问：为何潞绸？答在价值观里。去情景中，找到能说动人的那句。',
      level2Correct: '这句，能上台。',
      level2Wrong: '话没说圆。再想想，听众不吃含糊。',
      level3Intro: '第三问最个人。你的一生，会是怎样一则潞绸故事？',
      level3Draw: '抽签如起标题。来，起你的篇名。',
      graduation: '出师。从今天起，你不只是员工——你是潞绸的下一任讲述者。',
    },
  },
];

/* ───────────── Mentor Voice Bubble ───────────── */
function MentorVoice({
  mentor,
  text,
  tone = 'dark',
}: {
  mentor: Mentor | null;
  text: string;
  tone?: 'dark' | 'light';
}) {
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!mentor || !text.trim()) return;
    let cancelled = false;

    void (async () => {
      const status = await getTtsStatus();
      if (cancelled || !status.configured || appAudio.isMuted()) return;
      setSpeaking(true);
      await speakText(text, { voiceType: mentor.voiceType });
      if (!cancelled) setSpeaking(false);
    })();

    return () => {
      cancelled = true;
      stopTts();
      setSpeaking(false);
    };
  }, [mentor?.id, mentor?.voiceType, text]);

  if (!mentor || !text) return null;
  const dark = tone === 'dark';
  return (
    <div className={`mentor-voice ${dark ? 'dark' : 'light'}${speaking ? ' speaking' : ''}`}>
      <div className="mentor-voice-avatar">
        <img src={mentor.avatar} alt="" />
      </div>
      <div className="mentor-voice-body">
        <p className="mentor-voice-name">
          {mentor.title} · {mentor.name}
          {speaking ? ' · 诵' : ''}
        </p>
        <p className="mentor-voice-text">{text}</p>
      </div>
    </div>
  );
}

/* ───────────── Weave Transition ───────────── */
function WeaveTransition({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="weave-transition" aria-hidden>
      <div className="weave-veil" />
      <svg viewBox="0 0 400 800" preserveAspectRatio="none">
        <path
          className="weave-thread gold"
          d="M-20,120 C80,180 120,80 200,160 S320,220 420,140"
        />
        <path
          className="weave-thread green"
          d="M-20,280 C60,340 140,240 210,320 S340,380 420,300"
        />
        <path
          className="weave-thread gold"
          d="M-20,460 C90,520 150,400 230,490 S340,560 420,470"
          style={{ animationDelay: '0.12s' }}
        />
        <path
          className="weave-thread green"
          d="M-20,620 C70,680 160,560 240,650 S350,720 420,640"
          style={{ animationDelay: '0.18s' }}
        />
      </svg>
    </div>
  );
}

/* ───────────── Main App ───────────── */
export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('welcome');
  const [completedLevels, setCompletedLevels] = useState<number[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [showMasterSelect, setShowMasterSelect] = useState(false);
  const [showWeave, setShowWeave] = useState(false);
  const [silkFortune, setSilkFortune] = useState<SilkFortune | null>(null);
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<SaveData | null>(() => loadSave());

  const navigateTo = useCallback((page: Page) => {
    if (isAnimating) return;
    void appAudio.unlock();
    setIsAnimating(true);
    setShowWeave(true);
    setTimeout(() => {
      setCurrentPage(page);
    }, 380);
    setTimeout(() => {
      setShowWeave(false);
      setIsAnimating(false);
    }, 900);
  }, [isAnimating]);

  const completeLevel = useCallback((level: number) => {
    setCompletedLevels(prev => prev.includes(level) ? prev : [...prev, level]);
  }, []);

  const progress = (completedLevels.length / 3) * 100;

  useEffect(() => {
    if (!mentor) return;
    const page =
      completedLevels.length === 3 && silkFortune ? 'celebration' as const : 'levelSelect' as const;
    writeSave({
      playerName,
      mentorId: mentor.id,
      completedLevels,
      silkFortune,
      page,
    });
    setSavedSnapshot(loadSave());
  }, [playerName, mentor, completedLevels, silkFortune]);

  const resetJourney = useCallback(() => {
    clearSave();
    setSavedSnapshot(null);
    setMentor(null);
    setPlayerName('');
    setCompletedLevels([]);
    setSilkFortune(null);
    setShowNameInput(false);
    setShowMasterSelect(false);
    setCurrentPage('welcome');
  }, []);

  const handleContinueSave = useCallback(() => {
    const save = loadSave();
    if (!save?.mentorId) return;
    const picked = mentors.find((m) => m.id === save.mentorId);
    if (!picked) return;
    void appAudio.unlock();
    setPlayerName(save.playerName || '');
    setMentor(picked);
    setCompletedLevels(save.completedLevels || []);
    setSilkFortune(save.silkFortune);
    setShowNameInput(false);
    setShowMasterSelect(false);
    const target =
      save.page === 'celebration' && save.silkFortune ? 'celebration' : 'levelSelect';
    navigateTo(target);
  }, [navigateTo]);

  const handleFreshStart = useCallback(() => {
    clearSave();
    setSavedSnapshot(null);
    setShowNameInput(false);
    setShowMasterSelect(false);
  }, []);

  const handleWelcomeStart = useCallback(() => {
    void appAudio.unlock();
    setShowNameInput(true);
  }, []);

  const handleNameSubmit = useCallback((name: string) => {
    setPlayerName(name);
    setShowNameInput(false);
    setShowMasterSelect(true);
  }, []);

  const handleNameSkip = useCallback(() => {
    setShowNameInput(false);
    setShowMasterSelect(true);
  }, []);

  const handleMasterSelect = useCallback((picked: Mentor) => {
    setMentor(picked);
    setShowMasterSelect(false);
    navigateTo('levelSelect');
  }, [navigateTo]);

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      <MuteButton />
      <WeaveTransition show={showWeave} />

      {currentPage !== 'welcome' && currentPage !== 'celebration' && (
        <div className="absolute top-0 left-0 right-0 z-50">
          <div className="h-[3px]" style={{ background: 'rgba(42,87,68,0.1)' }}>
            <div className="progress-bar h-full" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      <div className="w-full h-full page-enter" key={currentPage}>
        {currentPage === 'welcome' && (
          <WelcomePage
            onStart={handleWelcomeStart}
            showNameInput={showNameInput}
            showMasterSelect={showMasterSelect}
            onNameSubmit={handleNameSubmit}
            onNameSkip={handleNameSkip}
            onMasterSelect={handleMasterSelect}
            saved={savedSnapshot}
            onContinueSave={handleContinueSave}
            onFreshStart={handleFreshStart}
          />
        )}
        {currentPage === 'levelSelect' && (
          <LevelSelectPage
            completedLevels={completedLevels}
            mentor={mentor}
            playerName={playerName}
            savedAt={savedSnapshot?.updatedAt}
            onSelectLevel={(level) => {
              if (level === 1) navigateTo('level1');
              else if (level === 2) navigateTo('level2');
              else if (level === 3) navigateTo('level3');
            }}
            onViewCertificate={() => navigateTo('celebration')}
            onResetSave={resetJourney}
          />
        )}
        {currentPage === 'level1' && (
          <Level1Timeline
            mentor={mentor}
            onComplete={() => {
              completeLevel(1);
              navigateTo('levelSelect');
            }}
            onBack={() => navigateTo('levelSelect')}
          />
        )}
        {currentPage === 'level2' && (
          <Level2Values
            mentor={mentor}
            onComplete={() => {
              completeLevel(2);
              navigateTo('levelSelect');
            }}
            onBack={() => navigateTo('levelSelect')}
          />
        )}
        {currentPage === 'level3' && (
          <Level3Future
            mentor={mentor}
            onComplete={(fortune) => {
              setSilkFortune(fortune);
              completeLevel(3);
              navigateTo('celebration');
            }}
            onBack={() => navigateTo('levelSelect')}
          />
        )}
        {currentPage === 'celebration' && (
          <CelebrationPage
            playerName={playerName}
            fortune={silkFortune}
            mentor={mentor}
            onRestart={resetJourney}
          />
        )}
      </div>
    </div>
  );
}

/* ═══════════ NAME INPUT MODAL ═══════════ */
function NameInputModal({ onSubmit, onSkip }: { onSubmit: (name: string) => void; onSkip: () => void }) {
  const [name, setName] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(modalRef.current, { opacity: 0, scale: 0.9, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'back.out(1.7)' });
  }, []);

  const handleSubmit = () => {
    if (name.trim()) onSubmit(name.trim());
  };

  return (
    <div className="absolute inset-0 z-50 modal-overlay flex items-center justify-center p-6">
      <div ref={modalRef} className="rounded-2xl p-8 max-w-[340px] w-full text-center" style={{ background: '#fff' }}>
        <div className="w-24 h-auto mx-auto mb-4 rounded-lg overflow-hidden" style={{ boxShadow: '0 2px 10px rgba(42,87,68,0.1)' }}>
          <img src={asset('logo-luanfu.png')} alt="潞安府潞绸" className="w-full h-full object-contain" />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-green)' }}>
          欢迎加入潞安府
        </h3>
        <p className="text-sm mb-6 opacity-60" style={{ color: 'var(--color-text)' }}>
          请留下姓名，展开这一卷潞绸史
        </p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="你的名字"
          className="chinese-input w-full text-center text-lg p-3 rounded-xl mb-4"
          style={{
            background: 'rgba(42,87,68,0.05)',
            border: '1px solid rgba(42,87,68,0.2)',
            fontFamily: 'var(--font-serif)',
          }}
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
        />
        <button onClick={handleSubmit} disabled={!name.trim()} className="btn-primary w-full mb-3">
          下一步 · 拜师
        </button>
        <button
          onClick={onSkip}
          className="text-xs w-full"
          style={{ color: 'var(--color-gray)', background: 'none', border: 'none', padding: '8px' }}
        >
          跳过姓名，直接拜师
        </button>
      </div>
    </div>
  );
}

/* ═══════════ MASTER SELECT MODAL ═══════════ */
function MasterSelectModal({ onSelect }: { onSelect: (m: Mentor) => void }) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    gsap.fromTo(modalRef.current, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' });
  }, []);

  const confirm = () => {
    const mentor = mentors.find(m => m.id === picked);
    if (mentor) onSelect(mentor);
  };

  return (
    <div className="absolute inset-0 z-50 modal-overlay flex items-end sm:items-center justify-center p-4">
      <div
        ref={modalRef}
        className="rounded-2xl p-5 max-w-[400px] w-full max-h-[88vh] overflow-y-auto"
        style={{ background: '#F7F4ED', scrollbarWidth: 'none' }}
      >
        <p className="text-center text-[10px] tracking-[0.3em] mb-1" style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-serif)' }}>
          拜师入门
        </p>
        <h3 className="text-xl font-bold text-center mb-1" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-green)' }}>
          选择你的师傅
        </h3>
        <p className="text-xs text-center mb-4" style={{ color: 'var(--color-gray)' }}>
          师傅会一路开口提点你——不只是证书上的落款
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {mentors.map((m) => {
            const active = picked === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setPicked(m.id)}
                className={`master-card ${active ? 'active' : ''}`}
              >
                <div className="master-card-img">
                  <img src={m.image} alt={m.title} />
                  <div className="master-card-avatar">
                    <img src={m.avatar} alt="" />
                  </div>
                </div>
                <p className="master-card-title">{m.title}</p>
                <p className="master-card-name">{m.name}</p>
                <p className="master-card-blurb">{m.blurb}</p>
                <span className="master-card-trait">{m.trait}</span>
              </button>
            );
          })}
        </div>

        <button onClick={confirm} disabled={!picked} className="btn-primary w-full">
          听师傅一言 · 拜入师门
        </button>
        {picked && (
          <p className="text-xs text-center mt-3 leading-relaxed px-2" style={{ color: 'var(--color-green)', fontFamily: 'var(--font-serif)' }}>
            「{mentors.find(m => m.id === picked)?.oath}」
          </p>
        )}
      </div>
    </div>
  );
}

/* ═══════════ WELCOME PAGE ═══════════ */
function WelcomePage({
  onStart,
  showNameInput,
  showMasterSelect,
  onNameSubmit,
  onNameSkip,
  onMasterSelect,
  saved,
  onContinueSave,
  onFreshStart,
}: {
  onStart: () => void;
  showNameInput: boolean;
  showMasterSelect: boolean;
  onNameSubmit: (name: string) => void;
  onNameSkip: () => void;
  onMasterSelect: (m: Mentor) => void;
  saved: SaveData | null;
  onContinueSave: () => void;
  onFreshStart: () => void;
}) {
  const [phase, setPhase] = useState<'hero' | 'questions'>('hero');
  const [qIndex, setQIndex] = useState(0);
  const brandRef = useRef<HTMLHeadingElement>(null);
  const lineRef = useRef<HTMLParagraphElement>(null);
  const btnRef = useRef<HTMLDivElement>(null);
  const qRef = useRef<HTMLDivElement>(null);

  const savedMentor = saved?.mentorId
    ? mentors.find((m) => m.id === saved.mentorId)
    : null;
  const canContinue = Boolean(saved?.mentorId && savedMentor);

  useEffect(() => {
    if (phase !== 'hero') return;
    const tl = gsap.timeline({ delay: 0.25 });
    tl.fromTo(brandRef.current, { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out' })
      .fromTo(lineRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' }, '-=0.55')
      .fromTo(btnRef.current, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, '-=0.35');
    return () => { tl.kill(); };
  }, [phase]);

  useEffect(() => {
    if (phase !== 'questions' || !qRef.current) return;
    gsap.fromTo(qRef.current, { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' });
  }, [phase, qIndex]);

  const currentQ = openingQuestions[qIndex];

  const handleNextQuestion = () => {
    if (qIndex < openingQuestions.length - 1) {
      setQIndex(i => i + 1);
    } else {
      onStart();
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div className="welcome-hero">
        <img src={asset('card-history.jpg')} alt="" />
        <div className="welcome-scrim" />
      </div>
      <div className="welcome-thread" />

      {phase === 'hero' && (
        <div className="relative z-10 h-full flex flex-col justify-end px-7 pb-14 pt-10">
          <div className="mb-auto pt-6">
            <img
              src={asset('logo-luanfu.png')}
              alt="潞安府"
              className="w-16 h-auto rounded-md opacity-95"
              style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.25)' }}
            />
          </div>

          <h1
            ref={brandRef}
            className="opacity-0 mb-4"
            style={{
              fontFamily: 'var(--font-serif)',
              color: '#F7F4ED',
              fontSize: 'clamp(2.1rem, 9vw, 2.75rem)',
              fontWeight: 700,
              lineHeight: 1.2,
              letterSpacing: '0.06em',
              textShadow: '0 4px 28px rgba(0,0,0,0.45)',
            }}
          >
            潞安府潞绸集团
          </h1>

          <p
            ref={lineRef}
            className="opacity-0 text-base mb-8 max-w-[300px]"
            style={{ color: 'rgba(247,244,237,0.88)', fontFamily: 'var(--font-serif)', lineHeight: 1.7 }}
          >
            {canContinue
              ? '锦卷未完。可续读上次的旅程，或重新开卷。'
              : '入职之前，先听三问。答案，藏在你即将展开的三卷里。'}
          </p>

          <div ref={btnRef} className="opacity-0 flex flex-col gap-3 items-start">
            {canContinue && (
              <>
                <button
                  type="button"
                  onClick={onContinueSave}
                  className="btn-ghost self-start"
                  style={{ minWidth: '180px' }}
                >
                  续读锦卷
                </button>
                <p className="text-xs max-w-[280px]" style={{ color: 'rgba(247,244,237,0.65)', fontFamily: 'var(--font-serif)', lineHeight: 1.6 }}>
                  {saved?.playerName ? `${saved.playerName} · ` : ''}
                  师从{savedMentor?.name}
                  {` · 已成 ${saved?.completedLevels.length ?? 0}/3 卷`}
                  {saved?.updatedAt ? ` · ${formatSaveTime(saved.updatedAt)}` : ''}
                </p>
                <button
                  type="button"
                  onClick={onFreshStart}
                  className="text-sm underline underline-offset-4"
                  style={{ color: 'rgba(247,244,237,0.55)', fontFamily: 'var(--font-serif)' }}
                >
                  重新开卷
                </button>
              </>
            )}
            {!canContinue && (
              <button
                type="button"
                onClick={() => setPhase('questions')}
                className="btn-ghost self-start"
                style={{ minWidth: '180px' }}
              >
                侧耳三问
              </button>
            )}
          </div>
        </div>
      )}

      {phase === 'questions' && (
        <div className="relative z-10 h-full flex flex-col justify-center px-7 pb-12">
          <div ref={qRef} className="max-w-[360px]">
            <p className="text-[11px] tracking-[0.35em] mb-4" style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-serif)' }}>
              {currentQ.index} · {qIndex + 1}/3
            </p>
            <h2
              className="text-[22px] leading-relaxed font-bold mb-5"
              style={{ color: '#F7F4ED', fontFamily: 'var(--font-serif)', textShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
            >
              {currentQ.text}
            </h2>
            <p className="text-sm mb-10 leading-relaxed" style={{ color: 'rgba(247,244,237,0.7)', fontFamily: 'var(--font-serif)' }}>
              {currentQ.echo}
            </p>
            <button onClick={handleNextQuestion} className="btn-ghost" style={{ minWidth: '160px' }}>
              {qIndex < openingQuestions.length - 1 ? '下一问' : '去寻答案 · 拜师展卷'}
            </button>
          </div>
        </div>
      )}

      {showNameInput && (
        <NameInputModal onSubmit={onNameSubmit} onSkip={onNameSkip} />
      )}
      {showMasterSelect && (
        <MasterSelectModal onSelect={onMasterSelect} />
      )}
    </div>
  );
}

/* ═══════════ LEVEL SELECT PAGE ═══════════ */
function LevelSelectPage({
  completedLevels,
  mentor,
  playerName,
  savedAt,
  onSelectLevel,
  onViewCertificate,
  onResetSave,
}: {
  completedLevels: number[];
  mentor: Mentor | null;
  playerName: string;
  savedAt?: number;
  onSelectLevel: (l: number) => void;
  onViewCertificate: () => void;
  onResetSave: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      const cards = scrollRef.current.querySelectorAll('.level-card');
      gsap.fromTo(cards, { opacity: 0, y: 24 }, { opacity: 1, y: 0, stagger: 0.12, duration: 0.65, ease: 'power3.out', delay: 0.15 });
    }
  }, []);

  const levels = [
    {
      id: 1,
      metaphor: '抽丝',
      title: '探寻历史',
      subtitle: '回收第一问 · 机上的呼吸',
      image: asset('card-history.jpg'),
      desc: '横滑长卷，去听丝绸在岁月里的呼吸——答案，就在经纬之间',
    },
    {
      id: 2,
      metaphor: '穿梭',
      title: '遴选知音',
      subtitle: '回收第二问 · 为何是潞绸',
      image: asset('card-values.jpg'),
      desc: '走进四个情景，把心对准经线——忠爱与匠心，会自己说话',
    },
    {
      id: 3,
      metaphor: '织成',
      title: '织梦未来',
      subtitle: '回收第三问 · 你的一梭',
      image: asset('card-future.jpg'),
      desc: '抽三支丝签。不是算命——是你愿意成为怎样的潞绸人',
    },
  ];

  const allCompleted = completedLevels.length === 3;

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      <div className="absolute inset-0 opacity-20">
        <img src={asset('bg-rice-paper.jpg')} alt="" className="w-full h-full object-cover" />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        <div className="pt-6 pb-2 px-4 text-center flex-shrink-0">
          <p className="text-xs tracking-[0.25em] mb-2" style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-serif)' }}>
            一卷潞绸史
          </p>
          <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-green)' }}>
            抽丝 · 穿梭 · 织成
          </h2>
          <p className="text-xs mt-1.5 opacity-60 mb-3" style={{ color: 'var(--color-gray)' }}>
            {mentor
              ? `${playerName ? `${playerName} · ` : ''}师从${mentor.title}${mentor.name}`
              : '完成三段织造，成为一名潞绸人'}
          </p>
          {mentor && (
            <div className="px-1 pb-1">
              <MentorVoice mentor={mentor} text={mentor.voices.levelSelect} tone="light" />
            </div>
          )}
        </div>

        {/* Journey metaphor strip */}
        <div className="journey-strip py-3 flex-shrink-0 px-6">
          {[
            { id: 1, label: '抽丝' },
            { id: 2, label: '穿梭' },
            { id: 3, label: '织成' },
          ].map((step, idx) => (
            <div key={step.id} className="contents">
              <div className="journey-node">
                <div
                  className={`journey-dot ${completedLevels.includes(step.id) ? 'done' : ''}`}
                />
                <span className="text-[11px]" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-green)' }}>
                  {step.label}
                </span>
              </div>
              {idx < 2 && <div className="journey-line" />}
            </div>
          ))}
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto snap-y snap-mandatory"
          style={{ scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }}
        >
          {levels.map((level) => {
            const isCompleted = completedLevels.includes(level.id);
            return (
              <div
                key={level.id}
                className="level-card h-[calc(100vh-168px)] min-h-[480px] snap-center shrink-0 px-4 py-2 flex flex-col"
                style={{ opacity: 0 }}
              >
                <div
                  className="rounded-2xl overflow-hidden flex flex-col flex-1 cursor-pointer"
                  style={{ boxShadow: '0 8px 32px rgba(42,87,68,0.14)' }}
                  onClick={() => onSelectLevel(level.id)}
                >
                  <div className="relative flex-1 min-h-0">
                    <img src={level.image} alt={level.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                    {isCompleted && (
                      <div
                        className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--color-gold)' }}
                      >
                        <span className="text-white text-lg">✓</span>
                      </div>
                    )}
                    <div className="absolute bottom-5 left-5 right-5">
                      <span className="metaphor-tag">{level.metaphor}</span>
                      <h3
                        className="text-2xl font-bold mb-1"
                        style={{ fontFamily: 'var(--font-serif)', color: '#F7F4ED', textShadow: '0 2px 10px rgba(0,0,0,0.45)' }}
                      >
                        {level.title}
                      </h3>
                      <p className="text-sm" style={{ color: 'rgba(247,244,237,0.85)' }}>{level.subtitle}</p>
                    </div>
                  </div>

                  <div className="p-5 flex-shrink-0" style={{ background: '#fff' }}>
                    <p className="text-[15px] leading-relaxed mb-4" style={{ color: 'var(--color-text)', opacity: 0.82 }}>
                      {level.desc}
                    </p>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-14 h-[1px]" style={{ background: 'var(--color-gold)' }} />
                      <span className="text-sm font-bold tracking-widest" style={{ color: 'var(--color-green)', fontFamily: 'var(--font-serif)' }}>
                        展开此段
                      </span>
                      <div className="w-14 h-[1px]" style={{ background: 'var(--color-gold)' }} />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {allCompleted && (
            <div className="h-[calc(100vh-168px)] min-h-[480px] snap-center shrink-0 px-4 py-2 flex flex-col">
              <div
                className="rounded-2xl flex flex-col flex-1 items-center justify-center cursor-pointer px-6"
                style={{ background: 'rgba(42,87,68,0.05)', border: '2px dashed var(--color-green)' }}
                onClick={onViewCertificate}
              >
                <div
                  className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--color-gold)', animation: 'glowPulse 2s ease-in-out infinite' }}
                >
                  <span className="text-2xl text-white">卷</span>
                </div>
                <h3 className="text-xl font-bold mb-2 text-center" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-green)' }}>
                  出师礼成 · 领取锦卷
                </h3>
                <p className="text-sm text-center opacity-60" style={{ color: 'var(--color-text)' }}>
                  三问已有回响，三卷已经织就
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="save-bar flex-shrink-0 px-5 py-3 flex items-center justify-between gap-3">
          <p className="text-[11px] leading-snug" style={{ color: 'var(--color-gray)', fontFamily: 'var(--font-serif)' }}>
            存档已记
            {savedAt ? ` · ${formatSaveTime(savedAt)}` : ''}
            <span className="opacity-70"> · 关闭后可续读</span>
          </p>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('清空存档并回到开卷页？当前进度将无法续读。')) {
                onResetSave();
              }
            }}
            className="text-[11px] shrink-0"
            style={{ color: 'var(--color-green)', fontFamily: 'var(--font-serif)', opacity: 0.75 }}
          >
            清空存档
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ LEVEL 1: HORIZONTAL SILK SCROLL ═══════════ */
function Level1Timeline({
  mentor,
  onComplete,
  onBack,
}: {
  mentor: Mentor | null;
  onComplete: () => void;
  onBack: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [collectedItems, setCollectedItems] = useState<string[]>([]);
  const [showComplete, setShowComplete] = useState(false);
  const [showHint, setShowHint] = useState(true);
  const [voiceLine, setVoiceLine] = useState(mentor?.voices.level1Intro ?? '');

  const totalCollectibles = timelineData.filter(d => d.hasSilkBall).length;
  const allCollected = collectedItems.length >= totalCollectibles;

  useEffect(() => {
    if (allCollected && !showComplete) {
      setVoiceLine(mentor?.voices.level1Done ?? '');
      setTimeout(() => setShowComplete(true), 700);
    }
  }, [allCollected, showComplete, mentor]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onScroll = () => {
      const idx = Math.round(el.scrollLeft / el.clientWidth);
      setActiveIndex(Math.min(Math.max(idx, 0), timelineData.length - 1));
      if (el.scrollLeft > 40) setShowHint(false);
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const goToIndex = (index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' });
  };

  const collectAt = (event: TimelineEvent, index: number) => {
    if (!event.hasSilkBall || collectedItems.includes(event.year)) return;
    setCollectedItems(prev => [...prev, event.year]);
    setVoiceLine(mentor?.voices.level1Collect ?? '');
    goToIndex(index);
  };

  return (
    <div className="w-full h-full flex flex-col relative" style={{ background: '#0F1412' }}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-30 pt-5 pb-2 px-4 pointer-events-none">
        <div className="flex items-start justify-between mb-2">
          <button
            onClick={onBack}
            className="pointer-events-auto w-9 h-9 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(247,244,237,0.15)', backdropFilter: 'blur(8px)' }}
          >
            <span style={{ color: '#F7F4ED' }}>←</span>
          </button>
          <div className="text-center">
            <p className="text-[10px] tracking-[0.3em] mb-1" style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-serif)' }}>
              抽丝 · 回收第一问
            </p>
            <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-serif)', color: '#F7F4ED' }}>
              探寻历史
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'rgba(247,244,237,0.65)' }}>
              金线节点 {collectedItems.length}/{totalCollectibles}
            </p>
          </div>
          <div className="w-9" />
        </div>
        <div className="pointer-events-none px-1">
          <MentorVoice mentor={mentor} text={voiceLine} tone="dark" />
        </div>
      </div>

      {/* Horizontal long scroll */}
      <div ref={scrollRef} className="silk-scroll flex-1" style={{ paddingTop: mentor ? 128 : 72 }}>
        {timelineData.map((event, index) => {
          const collected = collectedItems.includes(event.year);
          return (
            <section key={event.year} className="silk-panel">
              <div className="silk-panel-bg">
                <img src={event.image} alt={event.title} />
                <div className="silk-panel-scrim" />
              </div>

              <div className="silk-panel-content">
                <div className="silk-year">{event.year}</div>
                <h3 className="silk-title">{event.title}</h3>
                <p className="silk-desc">{event.description}</p>

                {event.hasSilkBall && !collected && (
                  <button
                    onClick={() => collectAt(event, index)}
                    className="mt-5 self-start flex items-center gap-2 px-4 py-2 rounded-full"
                    style={{
                      background: 'rgba(212,175,55,0.2)',
                      border: '1px solid rgba(212,175,55,0.55)',
                      color: 'var(--color-gold)',
                      fontFamily: 'var(--font-serif)',
                      fontSize: 13,
                      animation: 'silkBounce 2.2s ease-in-out infinite',
                    }}
                  >
                    <img src={asset('silk-ball.png')} alt="" className="w-6 h-6 object-contain" />
                    收取金线
                  </button>
                )}
                {event.hasSilkBall && collected && (
                  <div
                    className="mt-5 self-start flex items-center gap-2 px-4 py-2 rounded-full text-sm"
                    style={{ background: 'rgba(42,87,68,0.55)', color: '#F7F4ED', fontFamily: 'var(--font-serif)' }}
                  >
                    ✓ 已织入长卷
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {showHint && activeIndex === 0 && (
        <div className="scroll-hint">
          <span style={{ fontSize: 18 }}>→</span>
          <span>横滑展卷</span>
        </div>
      )}

      {/* Gold thread rail with year nodes */}
      <div className="thread-rail">
        <div className="thread-rail-line">
          <div className="thread-nodes">
            {timelineData.map((event, index) => {
              const collected = collectedItems.includes(event.year);
              return (
                <button
                  key={event.year}
                  type="button"
                  className={[
                    'thread-node',
                    activeIndex === index ? 'active' : '',
                    collected ? 'collected' : '',
                    event.hasSilkBall && !collected ? 'has-ball' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => {
                    goToIndex(index);
                    if (event.hasSilkBall && !collected) collectAt(event, index);
                  }}
                  title={event.title}
                >
                  {collected ? '✓' : event.shortLabel.slice(0, 2)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {showComplete && (
        <div className="absolute inset-0 z-50 modal-overlay flex items-center justify-center p-6">
          <div className="text-center max-w-[300px]">
            <div
              className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: 'var(--color-gold)', animation: 'collectPop 0.6s ease-out' }}
            >
              <span className="text-3xl" style={{ color: '#1A1A1A' }}>丝</span>
            </div>
            <h3 className="text-2xl font-bold mb-2" style={{ color: '#F7F4ED', fontFamily: 'var(--font-serif)' }}>
              第一问，有回响了
            </h3>
            <p className="text-sm mb-4" style={{ color: 'rgba(247,244,237,0.8)' }}>
              {mentor?.voices.level1Done ?? '金线收齐，六十八年潞绸史尽在掌握'}
            </p>
            <button onClick={onComplete} className="btn-primary">
              去回收第二问
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════ LEVEL 2: STORY CHOICES ═══════════ */
function Level2Values({
  mentor,
  onComplete,
  onBack,
}: {
  mentor: Mentor | null;
  onComplete: () => void;
  onBack: () => void;
}) {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);
  const [wovenLabels, setWovenLabels] = useState<string[]>([]);
  const [showComplete, setShowComplete] = useState(false);
  const [voiceLine, setVoiceLine] = useState(mentor?.voices.level2Intro ?? '');
  const cardRef = useRef<HTMLDivElement>(null);

  const scene = storyScenes[sceneIndex];
  const progress = ((wovenLabels.length) / storyScenes.length) * 100;
  const isCorrect = selectedId === scene.correctId;

  useEffect(() => {
    if (!cardRef.current) return;
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 18 },
      { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' }
    );
  }, [sceneIndex]);

  const handleSelect = (optionId: string) => {
    if (resolved) return;
    setSelectedId(optionId);
    setResolved(true);

    if (optionId === scene.correctId) {
      setWovenLabels(prev => (prev.includes(scene.threadLabel) ? prev : [...prev, scene.threadLabel]));
      setVoiceLine(mentor?.voices.level2Correct ?? '');
    } else {
      setVoiceLine(mentor?.voices.level2Wrong ?? '');
    }
  };

  const handleContinue = () => {
    if (!resolved) return;

    if (!isCorrect) {
      setSelectedId(null);
      setResolved(false);
      setVoiceLine(mentor?.voices.level2Intro ?? '');
      return;
    }

    if (sceneIndex >= storyScenes.length - 1) {
      setShowComplete(true);
      return;
    }

    setSceneIndex(i => i + 1);
    setSelectedId(null);
    setResolved(false);
    setVoiceLine(mentor?.voices.level2Intro ?? '');
  };

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden" style={{ background: '#0F1412' }}>
      {/* Scene background */}
      <div className="absolute inset-0">
        <img src={scene.image} alt="" className="w-full h-full object-cover transition-opacity duration-700" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(15,20,18,0.72) 0%, rgba(15,20,18,0.35) 28%, rgba(15,20,18,0.88) 72%, rgba(15,20,18,0.96) 100%)',
          }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 pt-5 pb-2 px-4 flex items-start justify-between">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-full"
          style={{ background: 'rgba(247,244,237,0.14)', backdropFilter: 'blur(8px)' }}
        >
          <span style={{ color: '#F7F4ED' }}>←</span>
        </button>
        <div className="text-center">
          <p className="text-[10px] tracking-[0.3em] mb-1" style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-serif)' }}>
            穿梭 · 回收第二问
          </p>
          <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-serif)', color: '#F7F4ED' }}>
            穿经成锦
          </h2>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(247,244,237,0.65)' }}>
            {scene.chapter} · {scene.setting}
          </p>
        </div>
        <div className="w-9" />
      </div>

      <div className="relative z-10 px-4 pb-2">
        <MentorVoice mentor={mentor} text={voiceLine} tone="dark" />
      </div>

      {/* Thread progress */}
      <div className="relative z-10 px-6 pt-2 pb-3">
        <div className="story-thread-track">
          <div className="story-thread-fill" style={{ width: `${progress}%` }} />
          {storyScenes.map((s, i) => {
            const done = wovenLabels.includes(s.threadLabel);
            const active = i === sceneIndex;
            return (
              <div
                key={s.id}
                className={`story-thread-node ${done ? 'done' : ''} ${active ? 'active' : ''}`}
                style={{ left: `${(i / (storyScenes.length - 1)) * 100}%` }}
              >
                <span>{done ? '✓' : i + 1}</span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-5 px-1">
          {storyScenes.map((s) => (
            <span
              key={s.id}
              className="text-[10px]"
              style={{
                color: wovenLabels.includes(s.threadLabel) ? 'var(--color-gold)' : 'rgba(247,244,237,0.45)',
                fontFamily: 'var(--font-serif)',
              }}
            >
              {s.threadLabel}
            </span>
          ))}
        </div>
      </div>

      {/* Story card */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-6" style={{ scrollbarWidth: 'none' }}>
        <div
          ref={cardRef}
          className="story-card rounded-2xl p-5 mx-auto max-w-[420px]"
          style={{ background: 'rgba(247,244,237,0.94)', boxShadow: '0 12px 40px rgba(0,0,0,0.28)' }}
        >
          <p
            className="text-[13px] leading-relaxed mb-4"
            style={{ color: 'var(--color-text)', fontFamily: 'var(--font-serif)' }}
          >
            {scene.narrative}
          </p>

          <div className="mb-4 pb-3" style={{ borderBottom: '1px solid rgba(42,87,68,0.12)' }}>
            <p className="text-xs mb-1.5 tracking-widest" style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-serif)' }}>
              这一梭，你怎么穿？
            </p>
            <h3 className="text-[16px] font-bold leading-snug" style={{ color: 'var(--color-green)', fontFamily: 'var(--font-serif)' }}>
              {scene.question}
            </h3>
          </div>

          <div className="space-y-2.5">
            {scene.options.map((opt) => {
              let stateClass = '';
              if (resolved) {
                if (opt.id === scene.correctId) stateClass = 'correct';
                else if (opt.id === selectedId) stateClass = 'wrong';
              } else if (selectedId === opt.id) {
                stateClass = 'picked';
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={resolved && isCorrect}
                  onClick={() => handleSelect(opt.id)}
                  className={`story-option ${stateClass}`}
                >
                  <span className="story-option-key">{opt.id.toUpperCase()}</span>
                  <span className="story-option-text">{opt.text}</span>
                </button>
              );
            })}
          </div>

          {resolved && (
            <div
              className="mt-4 rounded-xl p-3"
              style={{
                background: isCorrect ? 'rgba(42,87,68,0.08)' : 'rgba(200,74,62,0.08)',
                border: `1px solid ${isCorrect ? 'rgba(42,87,68,0.2)' : 'rgba(200,74,62,0.25)'}`,
              }}
            >
              <p
                className="text-xs mb-1 font-bold"
                style={{ color: isCorrect ? 'var(--color-green)' : 'var(--color-red)', fontFamily: 'var(--font-serif)' }}
              >
                {isCorrect ? `金线已穿 · ${scene.threadLabel}` : '这一梭偏了，再试一次'}
              </p>
              <p className="text-[13px] leading-relaxed" style={{ color: 'var(--color-text)', opacity: 0.85 }}>
                {isCorrect ? scene.insight : '没关系。再读一遍情景，选出最贴近潞绸精神的答案。'}
              </p>
            </div>
          )}

          {resolved && (
            <button onClick={handleContinue} className="btn-primary w-full mt-4">
              {isCorrect
                ? (sceneIndex >= storyScenes.length - 1 ? '锦绣织成' : '下一梭')
                : '重新选择'}
            </button>
          )}
        </div>
      </div>

      {showComplete && (
        <div className="absolute inset-0 z-50 modal-overlay flex items-center justify-center p-6">
          <div className="text-center max-w-[320px]">
            <div
              className="w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ background: 'var(--color-gold)', animation: 'collectPop 0.6s ease-out' }}
            >
              <span className="text-3xl" style={{ color: '#1A1A1A' }}>锦</span>
            </div>
            <h3 className="text-2xl font-bold mb-2" style={{ color: '#F7F4ED', fontFamily: 'var(--font-serif)' }}>
              第二问，也有了答案
            </h3>
            <p className="text-sm mb-3" style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-serif)' }}>
              {wovenLabels.join(' · ')}
            </p>
            <p className="text-sm mb-6" style={{ color: 'rgba(247,244,237,0.8)' }}>
              为何是潞绸？因为心口能对齐的人，才配得上这一缕丝。
            </p>
            <button onClick={onComplete} className="btn-primary">
              去回收第三问
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════ LEVEL 3: SILK FORTUNE DRAW ═══════════ */
function Level3Future({
  mentor,
  onComplete,
  onBack,
}: {
  mentor: Mentor | null;
  onComplete: (fortune: SilkFortune) => void;
  onBack: () => void;
}) {
  type DrawStep = 'intro' | 'omen' | 'thread' | 'role' | 'summary';
  const [step, setStep] = useState<DrawStep>('intro');
  const [drawing, setDrawing] = useState(false);
  const [fortune, setFortune] = useState<Partial<SilkFortune>>({});
  const [voiceLine, setVoiceLine] = useState(mentor?.voices.level3Intro ?? '');
  const slipRef = useRef<HTMLDivElement>(null);

  const stepMeta: Record<Exclude<DrawStep, 'intro' | 'summary'>, { label: string; hint: string }> = {
    omen: { label: '第一签 · 入职签文', hint: '抽一支，看你此行的开篇之语' },
    thread: { label: '第二签 · 本命丝色', hint: '抽出属于你的一缕丝线' },
    role: { label: '第三签 · 岗位寓意', hint: '看看你将以何种姿态织进潞绸' },
  };

  const playDraw = (next: DrawStep, apply: () => void) => {
    if (drawing) return;
    setDrawing(true);
    setStep(next);
    setVoiceLine(mentor?.voices.level3Draw ?? '');

    setTimeout(() => {
      if (slipRef.current) {
        gsap.fromTo(
          slipRef.current,
          { rotate: -2, y: 0 },
          { rotate: 2, y: -6, duration: 0.08, yoyo: true, repeat: 10, ease: 'power1.inOut' }
        );
      }
    }, 30);

    setTimeout(() => {
      apply();
      setDrawing(false);
      requestAnimationFrame(() => {
        if (slipRef.current) {
          gsap.fromTo(
            slipRef.current,
            { opacity: 0, scale: 0.92, y: 16 },
            { opacity: 1, scale: 1, y: 0, duration: 0.55, ease: 'back.out(1.6)' }
          );
        }
      });
    }, 900);
  };

  const drawOmen = () => {
    playDraw('omen', () => {
      setFortune(prev => ({ ...prev, omen: pickRandom(omenPool) }));
    });
  };

  const drawThread = () => {
    playDraw('thread', () => {
      setFortune(prev => ({ ...prev, thread: pickRandom(threadPool) }));
    });
  };

  const drawRole = () => {
    playDraw('role', () => {
      setFortune(prev => ({ ...prev, role: pickRandom(rolePool) }));
    });
  };

  const goSummary = () => {
    if (!fortune.omen || !fortune.thread || !fortune.role) return;
    setStep('summary');
  };

  const finish = () => {
    if (!fortune.omen || !fortune.thread || !fortune.role) return;
    onComplete(fortune as SilkFortune);
  };

  const revealedCount = [fortune.omen, fortune.thread, fortune.role].filter(Boolean).length;

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden" style={{ background: '#0F1412' }}>
      <div className="absolute inset-0">
        <img src={asset('card-future.jpg')} alt="" className="w-full h-full object-cover opacity-55" />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(15,20,18,0.75) 0%, rgba(15,20,18,0.45) 35%, rgba(15,20,18,0.92) 100%)',
          }}
        />
      </div>

      <div className="relative z-10 pt-5 pb-2 px-4 flex items-start justify-between">
        <button
          onClick={onBack}
          className="w-9 h-9 flex items-center justify-center rounded-full"
          style={{ background: 'rgba(247,244,237,0.14)', backdropFilter: 'blur(8px)' }}
          disabled={drawing}
        >
          <span style={{ color: '#F7F4ED' }}>←</span>
        </button>
        <div className="text-center">
          <p className="text-[10px] tracking-[0.3em] mb-1" style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-serif)' }}>
            织成 · 回收第三问
          </p>
          <h2 className="text-base font-bold" style={{ fontFamily: 'var(--font-serif)', color: '#F7F4ED' }}>
            抽丝签
          </h2>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(247,244,237,0.65)' }}>
            {revealedCount}/3 支已开
          </p>
        </div>
        <div className="w-9" />
      </div>

      <div className="relative z-10 px-4 pb-1">
        <MentorVoice mentor={mentor} text={voiceLine} tone="dark" />
      </div>

      {/* Progress beads */}
      <div className="relative z-10 flex justify-center gap-3 py-3">
        {['签文', '丝色', '寓意'].map((label, i) => {
          const done = i < revealedCount;
          const active = (step === 'omen' && i === 0) || (step === 'thread' && i === 1) || (step === 'role' && i === 2);
          return (
            <div key={label} className="flex flex-col items-center gap-1">
              <div
                className="w-2.5 h-2.5 rounded-full transition-all"
                style={{
                  background: done ? 'var(--color-gold)' : active ? '#F7F4ED' : 'rgba(247,244,237,0.25)',
                  boxShadow: done || active ? '0 0 10px rgba(212,175,55,0.45)' : 'none',
                }}
              />
              <span className="text-[10px]" style={{ color: 'rgba(247,244,237,0.55)', fontFamily: 'var(--font-serif)' }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-5 pb-8">
        {step === 'intro' && (
          <div className="text-center max-w-[320px]">
            <div
              className="fortune-scroll mx-auto mb-6"
              style={{ animation: 'fortuneFloat 3s ease-in-out infinite' }}
            >
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 28, color: 'var(--color-gold)' }}>签</span>
            </div>
            <h3 className="text-xl font-bold mb-3" style={{ color: '#F7F4ED', fontFamily: 'var(--font-serif)' }}>
              第三问，交给丝线
            </h3>
            <p className="text-sm mb-8 leading-relaxed" style={{ color: 'rgba(247,244,237,0.75)' }}>
              若你也落下一梭，会织进怎样的一生？——闭眼，听丝响，连抽三支。
            </p>
            <button onClick={drawOmen} className="btn-primary" style={{ minWidth: 180 }}>
              听师傅的，抽第一签
            </button>
          </div>
        )}

        {(step === 'omen' || step === 'thread' || step === 'role') && (
          <div className="w-full max-w-[340px]">
            <p className="text-center text-xs tracking-[0.2em] mb-2" style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-serif)' }}>
              {stepMeta[step].label}
            </p>
            <p className="text-center text-sm mb-5" style={{ color: 'rgba(247,244,237,0.7)' }}>
              {drawing ? '丝线翻飞，签文将现……' : stepMeta[step].hint}
            </p>

            <div ref={slipRef} className="fortune-slip mb-6">
              {drawing ? (
                <div className="text-center py-10">
                  <div className="fortune-spinner mx-auto mb-3" />
                  <p style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-serif)' }}>抽签中</p>
                </div>
              ) : step === 'omen' && fortune.omen ? (
                <div className="text-center">
                  <p className="text-xs mb-2 tracking-widest" style={{ color: 'var(--color-gold)' }}>入职签文</p>
                  <h4 className="text-2xl font-bold mb-3" style={{ color: 'var(--color-green)', fontFamily: 'var(--font-serif)' }}>
                    {fortune.omen.title}
                  </h4>
                  <p className="text-[15px] leading-relaxed" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-serif)' }}>
                    {fortune.omen.verse}
                  </p>
                </div>
              ) : step === 'thread' && fortune.thread ? (
                <div className="text-center">
                  <p className="text-xs mb-3 tracking-widest" style={{ color: 'var(--color-gold)' }}>本命丝色</p>
                  <div
                    className="w-16 h-16 rounded-full mx-auto mb-3"
                    style={{
                      background: fortune.thread.color,
                      boxShadow: `0 0 24px ${fortune.thread.color}88`,
                      border: '2px solid rgba(255,255,255,0.35)',
                    }}
                  />
                  <h4 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-green)', fontFamily: 'var(--font-serif)' }}>
                    {fortune.thread.name}
                  </h4>
                  <p className="text-[14px] leading-relaxed" style={{ color: 'var(--color-text)' }}>
                    {fortune.thread.meaning}
                  </p>
                </div>
              ) : step === 'role' && fortune.role ? (
                <div className="text-center">
                  <p className="text-xs mb-2 tracking-widest" style={{ color: 'var(--color-gold)' }}>岗位寓意</p>
                  <h4 className="text-2xl font-bold mb-3" style={{ color: 'var(--color-green)', fontFamily: 'var(--font-serif)' }}>
                    {fortune.role.name}
                  </h4>
                  <p className="text-[15px] leading-relaxed" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-serif)' }}>
                    {fortune.role.blessing}
                  </p>
                </div>
              ) : null}
            </div>

            {!drawing && (
              <div className="text-center">
                {step === 'omen' && fortune.omen && (
                  <button onClick={drawThread} className="btn-primary" style={{ minWidth: 180 }}>
                    抽第二签
                  </button>
                )}
                {step === 'thread' && fortune.thread && (
                  <button onClick={drawRole} className="btn-primary" style={{ minWidth: 180 }}>
                    抽第三签
                  </button>
                )}
                {step === 'role' && fortune.role && (
                  <button onClick={goSummary} className="btn-primary" style={{ minWidth: 180 }}>
                    亮出锦签
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {step === 'summary' && fortune.omen && fortune.thread && fortune.role && (
          <div className="w-full max-w-[340px]">
            <div className="fortune-slip mb-6">
              <p className="text-center text-xs tracking-[0.25em] mb-4" style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-serif)' }}>
                你的三支丝签
              </p>
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] mb-1" style={{ color: 'var(--color-gray)' }}>签文 · {fortune.omen.title}</p>
                  <p className="text-sm" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-serif)' }}>{fortune.omen.verse}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: fortune.thread.color, border: '1px solid rgba(0,0,0,0.1)' }} />
                  <div>
                    <p className="text-[11px] mb-0.5" style={{ color: 'var(--color-gray)' }}>丝色 · {fortune.thread.name}</p>
                    <p className="text-sm" style={{ color: 'var(--color-text)' }}>{fortune.thread.meaning}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] mb-1" style={{ color: 'var(--color-gray)' }}>寓意 · {fortune.role.name}</p>
                  <p className="text-sm" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-serif)' }}>{fortune.role.blessing}</p>
                </div>
              </div>
            </div>
            <div className="text-center">
              <button onClick={finish} className="btn-primary" style={{ minWidth: 180 }}>
                织入通关证书
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════ CELEBRATION PAGE ═══════════ */
function CelebrationPage({
  playerName,
  fortune,
  mentor,
  onRestart,
}: {
  playerName: string;
  fortune: SilkFortune | null;
  mentor: Mentor | null;
  onRestart: () => void;
}) {
  const [phase, setPhase] = useState<'unveil' | 'certificate'>('unveil');
  const [saving, setSaving] = useState(false);
  const [saveHint, setSaveHint] = useState('');
  const unveilRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const nameRef = useRef<HTMLParagraphElement>(null);

  const silkColor = fortune?.thread.color ?? '#D4AF37';
  const displayName = playerName.trim() || '新伙伴';

  useEffect(() => {
    const tl = gsap.timeline();
    tl.fromTo('.unveil-thread', { scaleX: 0, opacity: 0 }, { scaleX: 1, opacity: 1, duration: 1.1, ease: 'power3.inOut' })
      .fromTo(titleRef.current, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out' }, '-=0.35')
      .fromTo(nameRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }, '-=0.25');

    const timer = setTimeout(() => setPhase('certificate'), 2600);
    return () => {
      tl.kill();
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (phase !== 'certificate') return;

    const viewport = viewportRef.current;
    const stage = stageRef.current;
    if (!viewport || !stage) return;

    let tl: gsap.core.Timeline | null = null;
    const frame = requestAnimationFrame(() => {
      const fullHeight = stage.scrollHeight;
      gsap.set(viewport, { height: 22, opacity: 1 });

      tl = gsap.timeline({ delay: 0.05 });
      tl.to(viewport, {
        height: fullHeight,
        duration: 2.15,
        ease: 'power2.inOut',
      })
        .add(() => {
          // 展开后改回自适应，交给外层滚动
          gsap.set(viewport, { height: 'auto', clearProps: 'overflow' });
        })
        .fromTo('.bamboo-slip', { opacity: 0, y: 10 }, { opacity: 1, y: 0, stagger: 0.12, duration: 0.5, ease: 'power2.out' }, '-=0.7')
        .fromTo(
          '.cert-seal',
          { opacity: 0, scale: 0.7, rotate: -24 },
          { opacity: 1, scale: 1, rotate: -14, duration: 0.65, ease: 'back.out(1.6)' },
          '-=0.3'
        );
    });

    return () => {
      cancelAnimationFrame(frame);
      tl?.kill();
    };
  }, [phase]);

  const handleSave = async () => {
    const stage = stageRef.current;
    if (!stage || saving) return;

    setSaving(true);
    setSaveHint('正在生成锦卷…');

    try {
      await document.fonts.ready;
      const dataUrl = await toPng(stage, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#0F1412',
      });
      const link = document.createElement('a');
      link.download = `潞安府入职锦卷-${displayName}.png`;
      link.href = dataUrl;
      link.click();
      setSaveHint('已保存到相册/下载');
    } catch {
      setSaveHint('保存失败，请截图收藏');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveHint(''), 2800);
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden" style={{ background: '#0F1412' }}>
      <div className="absolute inset-0 opacity-35">
        <img src={asset('bg-rice-paper.jpg')} alt="" className="w-full h-full object-cover" />
      </div>
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 35%, rgba(42,87,68,0.38) 0%, rgba(15,20,18,0.94) 72%)',
        }}
      />

      {phase === 'unveil' && (
        <div ref={unveilRef} className="absolute inset-0 z-20 flex flex-col items-center justify-center px-8">
          <div
            className="unveil-thread mb-8"
            style={{
              width: 'min(72vw, 280px)',
              height: 2,
              background: `linear-gradient(90deg, transparent, ${silkColor}, transparent)`,
              transformOrigin: 'center',
              boxShadow: `0 0 16px ${silkColor}88`,
            }}
          />
          <h1
            ref={titleRef}
            className="opacity-0 text-3xl font-bold mb-4 tracking-[0.2em]"
            style={{ color: '#F7F4ED', fontFamily: 'var(--font-serif)' }}
          >
            锦绣落成 · 出师
          </h1>
          <p
            ref={nameRef}
            className="opacity-0 text-base"
            style={{ color: silkColor, fontFamily: 'var(--font-serif)' }}
          >
            {displayName}
          </p>
        </div>
      )}

      {phase === 'certificate' && (
        <div className="relative z-10 h-full flex flex-col min-h-0">
          <div
            className="cert-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 pt-5 pb-3"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div ref={viewportRef} className="scroll-viewport">
              <div
                ref={stageRef}
                className="scroll-stage"
                style={{ ['--silk-border' as string]: silkColor }}
              >
                <div className="scroll-rod scroll-rod-top" aria-hidden />

                <div className="scroll-fabric silk-bordered">
                  <div className="silk-surface" aria-hidden />
                  <div className="silk-sheen" aria-hidden />
                  <div className="silk-color-frame" aria-hidden />

                  <div className="scroll-fabric-inner">
                    <img src={asset('logo-luanfu.png')} alt="潞安府" className="w-12 h-auto mx-auto mb-3 rounded" />

                    <p className="text-[10px] tracking-[0.35em] mb-1.5 text-center" style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-serif)' }}>
                      出师礼 · 入职锦卷
                    </p>
                    <h2 className="text-lg font-bold text-center mb-1" style={{ color: 'var(--color-green)', fontFamily: 'var(--font-serif)' }}>
                      潞安府潞绸集团
                    </h2>

                    {fortune && (
                      <p className="text-center text-[11px] mb-1" style={{ color: silkColor, fontFamily: 'var(--font-serif)' }}>
                        本命丝色 · {fortune.thread.name}
                      </p>
                    )}

                    <div className="cert-divider my-3" />

                    <p className="text-center text-lg font-bold mb-0.5" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-serif)' }}>
                      {displayName}
                    </p>
                    <p className="text-center text-sm mb-3" style={{ color: 'var(--color-green)', fontFamily: 'var(--font-serif)' }}>
                      今日出师，成为潞绸人
                    </p>

                    <div className="echo-questions mb-4">
                      <p>三问已有回响</p>
                      <p>听过机上的呼吸 · 懂得为何是潞绸 · 许下自己的一梭</p>
                    </div>

                    {fortune && (
                      <div className="bamboo-rack mb-4">
                        <div className="bamboo-slip">
                          <span className="bamboo-slip-label">签文</span>
                          <span className="bamboo-slip-text">{fortune.omen.title}</span>
                        </div>
                        <div className="bamboo-slip">
                          <span className="bamboo-slip-label">丝色</span>
                          <span className="bamboo-slip-text">{fortune.thread.name}</span>
                          <span className="bamboo-slip-dot" style={{ background: fortune.thread.color }} />
                        </div>
                        <div className="bamboo-slip">
                          <span className="bamboo-slip-label">寓意</span>
                          <span className="bamboo-slip-text">{fortune.role.name}</span>
                        </div>
                      </div>
                    )}

                    <div className="cert-divider mb-3" />

                    <p className="text-center text-[13px] leading-relaxed mb-2 px-1" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-serif)' }}>
                      欢迎你加入潞安府，成为一名潞绸人！
                    </p>
                    <p className="text-center text-[12px] leading-relaxed px-1 mb-3" style={{ color: 'var(--color-gray)', fontFamily: 'var(--font-serif)' }}>
                      “使命光荣，任重道远”，潞绸人一直在追梦的路上……
                    </p>

                    {mentor && (
                      <div className="master-sign mb-4">
                        <p className="master-sign-label">出师寄语 · 师傅落款</p>
                        <p className="master-sign-name">
                          {mentor.title} · {mentor.name}
                        </p>
                        <p className="master-sign-text">「{mentor.voices.graduation}」</p>
                        <p className="master-sign-text" style={{ marginTop: 6, opacity: 0.75 }}>
                          {mentor.inscription}
                        </p>
                      </div>
                    )}

                    <div className="cert-seal mx-auto" aria-label="潞绸传家 忠爱一生">
                      <div className="cert-seal-grid">
                        <span>忠</span>
                        <span>潞</span>
                        <span>爱</span>
                        <span>绸</span>
                        <span>一</span>
                        <span>传</span>
                        <span>生</span>
                        <span>家</span>
                      </div>
                      <div className="cert-seal-ink" aria-hidden />
                    </div>
                  </div>
                </div>

                <div className="scroll-rod scroll-rod-bottom" aria-hidden />
              </div>
            </div>
          </div>

          <div
            className="cert-actions flex-shrink-0 flex flex-col items-center gap-2 px-4 pt-3 pb-6 w-full"
            style={{
              background: 'linear-gradient(180deg, transparent, rgba(15,20,18,0.92) 28%)',
            }}
          >
            <div className="w-full max-w-[320px] flex flex-col gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary w-full"
                style={{
                  background: silkColor,
                  color: silkColor === '#F7F4ED' || silkColor === '#E8A87C' ? '#1A1A1A' : '#F7F4ED',
                }}
              >
                {saving ? '生成中…' : '保存锦卷'}
              </button>
              <button
                onClick={onRestart}
                className="btn-ghost w-full"
                style={{ borderColor: 'rgba(247,244,237,0.25)', color: 'rgba(247,244,237,0.85)' }}
              >
                重新展卷
              </button>
              {saveHint && (
                <p className="text-xs text-center mt-1" style={{ color: 'rgba(247,244,237,0.65)' }}>{saveHint}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

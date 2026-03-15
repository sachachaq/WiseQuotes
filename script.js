/* =========================================================
   WiseQuotes — script.js
   ========================================================= */

'use strict';

/* ---------- State ---------- */
let philosophyData = null;
let currentResult = null;
let currentMood   = null;
let moodDebounce  = null;

const recentPhilosopherIds = [];
const RECENT_WINDOW = 7; // won't repeat same philosopher within last 7 picks

/* ---------- DOM refs ---------- */
const questionInput        = document.getElementById('user-question');
const charCount            = document.getElementById('char-count');
const askBtn               = document.getElementById('ask-btn');
const responseSection      = document.getElementById('response-section');
const responseCard         = document.getElementById('response-card');
const pseudoQuoteText      = document.getElementById('pseudo-quote-text');
const philosopherExcerpt   = document.getElementById('philosopher-excerpt');
const philosopherName      = document.getElementById('philosopher-name');
const philosopherSource    = document.getElementById('philosopher-source');

/* ---------- Helpers ---------- */

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function cap(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

/* ---------- Kardashian deepity generator ---------- */

const DEEPITY_STOP_WORDS = new Set([
  'a','an','the','i','me','my','we','our','you','your','he','she','it','they','them',
  'and','but','or','nor','so','yet','for','both','either',
  'is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','could','should','may','might','can','shall',
  'to','of','in','on','at','by','for','with','about','as','into','from','through',
  'what','when','where','why','how','who','which','that','this','these','those',
  'just','very','really','quite','rather','too','also','even','still','already',
  'always','never','ever','now','then','here','there','back','down','out','up','off',
  'get','go','make','take','come','say','see','think','feel','know','want',
  'need','find','keep','give','show','try','ask','become','leave','start','seem',
  'something','anything','everything','nothing','someone','anyone','everyone',
  'thing','things','way','place','time','year','day','life','world','people',
  'good','bad','big','new','old','own','more','most','other','such','only','much',
  'right','same','different','long','little','great','last','next','first','few',
  'lot','lots','kind','sort','type','bit','bit','part','point','whole','each',
  'am','were','was','been','did','does','had','has','have'
]);

// Conjugated verb forms not caught by the base stop-words above.
// These must never be used as deepity topics — they produce broken sentences.
const DEEPITY_VERB_FORMS = new Set([
  // be
  'being',
  // do / does / doing
  'doing','done',
  // go
  'goes','going','went','gone',
  // get
  'gets','getting','got','gotten',
  // make
  'makes','making','made',
  // take
  'takes','taking','took','taken',
  // come
  'comes','coming','came',
  // say
  'says','saying','said',
  // see
  'sees','seeing','seen','saw',
  // think
  'thinks','thinking','thought',
  // feel
  'feels','feeling','felt',
  // know
  'knows','knowing','knew','known',
  // want
  'wants','wanting','wanted',
  // need
  'needs','needing','needed',
  // find
  'finds','finding','found',
  // keep
  'keeps','keeping','kept',
  // give
  'gives','giving','gave','given',
  // show
  'shows','showing','showed','shown',
  // try
  'tries','trying','tried',
  // ask
  'asks','asking','asked',
  // become
  'becomes','becoming','became',
  // leave
  'leaves','leaving','left',
  // start
  'starts','starting','started',
  // seem
  'seems','seeming','seemed',
  // put / let / run / turn / move / mean / happen / live / hold / bring / use
  'puts','putting','lets','letting','runs','running','turns','turning',
  'moves','moving','means','meaning','happens','happening',
  'lives','living','holds','holding','brings','bringing',
  'uses','using','used','pulls','pulling','sits','sitting',
  'stands','standing','looks','looking','looked','looked',
  'calls','calling','called','stays','staying','stayed',
  'helps','helping','helped','works','working','worked',
  'plays','playing','played','tells','telling','told',
]);

// ── Synonym map ───────────────────────────────────────────
// Templates receive (t, s) where s is a synonym or conceptual equivalent.
// This lets Identity Loop / Temporal Truth avoid awkward word repetition
// while still producing a tautology ("A decision you make is a choice you chose.").
const TOPIC_SYNONYMS = {
  anxiety:     ['worry', 'unease', 'dread'],
  anger:       ['frustration', 'fury', 'heat'],
  beauty:      ['grace', 'wonder', 'loveliness'],
  calm:        ['stillness', 'quiet', 'peace'],
  change:      ['shift', 'transition', 'movement'],
  chaos:       ['disorder', 'confusion', 'noise'],
  choice:      ['decision', 'path', 'option'],
  confusion:   ['uncertainty', 'doubt', 'fog'],
  control:     ['grip', 'hold', 'power'],
  death:       ['end', 'passing', 'departure'],
  doubt:       ['uncertainty', 'hesitation', 'questioning'],
  dream:       ['vision', 'hope', 'longing'],
  failure:     ['loss', 'setback', 'stumble'],
  faith:       ['belief', 'trust', 'conviction'],
  fear:        ['dread', 'worry', 'unease'],
  freedom:     ['openness', 'space', 'release'],
  grief:       ['loss', 'sorrow', 'sadness'],
  growth:      ['change', 'becoming', 'expansion'],
  guilt:       ['regret', 'weight', 'burden'],
  happiness:   ['joy', 'delight', 'lightness'],
  health:      ['wellness', 'wholeness', 'vitality'],
  hope:        ['possibility', 'expectation', 'light'],
  identity:    ['self', 'who you are', 'being'],
  joy:         ['happiness', 'delight', 'gladness'],
  loneliness:  ['solitude', 'aloneness', 'quiet'],
  loss:        ['absence', 'grief', 'what was'],
  love:        ['affection', 'warmth', 'devotion'],
  meaning:     ['purpose', 'significance', 'the why'],
  pain:        ['hurt', 'ache', 'suffering'],
  patience:    ['stillness', 'calm', 'waiting'],
  peace:       ['calm', 'stillness', 'quiet'],
  power:       ['strength', 'force', 'will'],
  purpose:     ['meaning', 'direction', 'the why'],
  regret:      ['looking back', 'hindsight', 'what was'],
  shame:       ['guilt', 'burden', 'weight'],
  stress:      ['pressure', 'tension', 'weight'],
  success:     ['achievement', 'arrival', 'getting there'],
  trust:       ['faith', 'belief', 'reliance'],
  truth:       ['reality', 'what is', 'fact'],
  uncertainty: ['doubt', 'not knowing', 'openness'],
  weather:     ['the sky', 'the elements', 'conditions'],
  work:        ['effort', 'labor', 'what you do'],
};

function getSynonym(topic) {
  const syns = TOPIC_SYNONYMS[topic];
  return (syns && syns.length) ? rand(syns) : topic;
}

// ── Structure 1: Identity Loop (27 templates) ─────────────
// Pattern: subject = itself reframed.
// "The road you take is the road you're on."
// "A decision you make is a choice you chose."
// t = topic noun; s = synonym (may equal t if no synonym available)
const IDENTITY_LOOP_TEMPLATES = [
  (t, s) => `The ${t} you have is the ${s} that's yours.`,
  (t, s) => `The ${t} you carry is the ${s} that's with you.`,
  (t, s) => `Your ${t} is the ${s} that belongs to you.`,
  (t, s) => `The ${t} in front of you is the ${s} you're facing.`,
  (t, s) => `The ${t} you chose is the ${s} you decided on.`,
  (t, s) => `The ${t} that's with you is the ${s} you've got.`,
  (t, s) => `The ${t} you're inside is the ${s} you're in.`,
  (t, s) => `The ${t} you hold onto is the ${s} you haven't let go of.`,
  (t, s) => `A ${t} you walk into is a ${s} you're standing in.`,
  (t, s) => `The ${t} you moved past is the ${s} that's behind you now.`,
  (t, s) => `The ${t} you arrived with is the ${s} you walked in carrying.`,
  (t, s) => `Whatever ${t} you have is the ${s} that you've got.`,
  (t, s) => `The ${t} you found is the ${s} you were looking for.`,
  (t, s) => `A ${t} you've lived through is a ${s} you've been inside.`,
  (t, s) => `The ${t} you're holding is the ${s} in your hands.`,
  (t, s) => `Your ${t} today is the ${s} that belongs to right now.`,
  (t, s) => `The ${t} you brought with you is the ${s} you didn't leave behind.`,
  (t, s) => `The ${t} that's real is the ${s} that actually exists.`,
  (t, s) => `The ${t} you named is the ${s} you gave a word to.`,
  (t, s) => `The ${t} you've accepted is the ${s} you stopped fighting.`,
  (t, s) => `The ${t} you returned to is the ${s} you came back to.`,
  (t, s) => `The ${t} you live with is the ${s} that lives with you.`,
  (t, s) => `The ${t} in your life is the ${s} your life has.`,
  (t, s) => `The ${t} you keep is the ${s} you never put down.`,
  (t, s) => `The ${t} you came from is the ${s} that was before you.`,
  (t, s) => `A ${t} you step into is a ${s} you're now inside.`,
  (t, s) => `The ${t} that shapes you is the ${s} doing the shaping.`,
];

// ── Structure 2: Conditional Deepity (28 templates) ───────
// Pattern: if X then X already is.
// "If something happens, then it occurred."
// All templates accept (t, s) for consistency; most only need t.
const CONDITIONAL_DEEPITY_TEMPLATES = [
  (t) => `If ${t} is real, then it exists.`,
  (t) => `Once ${t} arrives, you're no longer without it.`,
  (t) => `When ${t} changes you, you are no longer unchanged.`,
  (t) => `If ${t} happened, then it has occurred.`,
  (t) => `Once ${t} begins, the start has already happened.`,
  (t) => `If ${t} is present, you're already inside it.`,
  (t) => `When ${t} is over, it's no longer continuing.`,
  (t) => `If ${t} touched you, the touching is done.`,
  (t) => `Once ${t} passes, the passing is behind you.`,
  (t) => `When ${t} is gone, it's no longer here.`,
  (t) => `If ${t} found you, you've been found by it.`,
  (t) => `Once ${t} exists, it is no longer absent.`,
  (t) => `When ${t} takes hold, you're in its grip.`,
  (t) => `If ${t} was real, it was real while it lasted.`,
  (t) => `Once ${t} has started, it is no longer unstarted.`,
  (t) => `If ${t} left a mark, the mark is already there.`,
  (t) => `When ${t} shifts, something has shifted.`,
  (t) => `Once ${t} is known, it can no longer be unknown.`,
  (t) => `If ${t} moved you, you were moved.`,
  (t) => `Once ${t} lands, it has arrived.`,
  (t) => `If ${t} was felt, then there was feeling.`,
  (t) => `When ${t} settles, it has come to rest.`,
  (t) => `If ${t} returns, it has come back.`,
  (t) => `Once ${t} matters, it has become something that matters.`,
  (t) => `If ${t} was there, it was present.`,
  (t) => `When ${t} hits you, you've been hit by it.`,
  (t) => `If ${t} came first, it was there before what came after.`,
  (t) => `Once ${t} is let in, you've already opened the door.`,
];

// ── Structure 3: Perspective Loop (27 templates) ──────────
// Pattern: understanding something means you already changed by it.
// "When you learn something new, you know more than before."
const PERSPECTIVE_LOOP_TEMPLATES = [
  (t, s) => `When you find ${t}, you stop looking for it.`,
  (t, s) => `The more ${t} you understand, the less of it stays unknown.`,
  (t, s) => `When you've been through ${t}, you know what ${s} feels like.`,
  (t, s) => `The deeper into ${t} you go, the further from outside it you are.`,
  (t, s) => `After ${t}, you understand it better than you did before.`,
  (t, s) => `When you face ${t}, it becomes something you've faced.`,
  (t, s) => `Once ${t} is behind you, you're in front of it.`,
  (t, s) => `The more ${t} you've had, the more ${s} you've been through.`,
  (t, s) => `When ${t} starts to make sense, it's already begun to.`,
  (t, s) => `Every time you move through ${t}, you become someone who did.`,
  (t, s) => `The more you carry ${t}, the more ${s} you've been carrying.`,
  (t, s) => `When you've sat with ${t}, you know what sitting with ${s} is like.`,
  (t, s) => `The longer ${t} stays with you, the longer ${s} has been there.`,
  (t, s) => `When you let go of ${t}, it's no longer something you're holding.`,
  (t, s) => `The more you return to ${t}, the more times you've gone back to ${s}.`,
  (t, s) => `When ${t} no longer surprises you, you've already been surprised by it.`,
  (t, s) => `The more clearly you see ${t}, the less unclear it is.`,
  (t, s) => `When you walk through ${t}, the walking is part of it.`,
  (t, s) => `The more you've held ${t}, the longer ${s} has been in your hands.`,
  (t, s) => `Once you've experienced ${t}, you have the experience of ${s}.`,
  (t, s) => `When ${t} becomes familiar, the unfamiliarity is already gone.`,
  (t, s) => `When you look at ${t} directly, you're no longer looking away.`,
  (t, s) => `After enough ${t}, you know what too much ${s} feels like.`,
  (t, s) => `Once ${t} teaches you something, you've learned it.`,
  (t, s) => `The more you notice ${t}, the less you're missing it.`,
  (t, s) => `When ${t} becomes clear, the confusion about it is already lifting.`,
  (t, s) => `The further you go into ${t}, the less of it is still ahead of you.`,
];

// ── Structure 4: Temporal Truth (24 templates) ────────────
// Pattern: time passing simply means the moment moved forward.
// "The future is what comes after now."
const TEMPORAL_TRUTH_TEMPLATES = [
  (t, s) => `The ${t} ahead is what hasn't reached you yet.`,
  (t, s) => `${cap(t)} that already happened is ${s} that's in the past now.`,
  (t, s) => `Every ${t} that ends is a ${s} that finished.`,
  (t, s) => `The ${t} behind you is the ${s} that already passed.`,
  (t, s) => `Right now, your ${t} is exactly where it is.`,
  (t, s) => `The ${t} still coming is the ${s} that hasn't arrived yet.`,
  (t, s) => `Yesterday's ${t} is the ${s} that came before today's.`,
  (t, s) => `The ${t} you're waiting for hasn't come yet.`,
  (t, s) => `${cap(t)} begins when it starts, and ends when it's done.`,
  (t, s) => `Future ${t} is the ${s} that hasn't happened yet.`,
  (t, s) => `The ${t} that's over has already ended.`,
  (t, s) => `${cap(t)} from before is ${s} that's already in the past.`,
  (t, s) => `The ${t} you remember is ${s} that already happened.`,
  (t, s) => `The ${t} you're in now is the ${s} that's happening right now.`,
  (t, s) => `Any ${t} that's passed is ${s} that went before this moment.`,
  (t, s) => `The ${t} that was is the ${s} that no longer is.`,
  (t, s) => `The ${t} coming toward you is the ${s} that isn't here yet.`,
  (t, s) => `The ${t} you carried yesterday is the ${s} you had before today.`,
  (t, s) => `${cap(t)} that moved on is ${s} that didn't stay.`,
  (t, s) => `The ${t} that remains is the ${s} that hasn't left.`,
  (t, s) => `${cap(t)} that ended is ${s} that no longer continues.`,
  (t, s) => `The ${t} before now is the ${s} that already was.`,
  (t, s) => `When ${t} finally comes, it will have arrived.`,
  (t, s) => `The ${t} in the middle is the ${s} between the beginning and the end.`,
];

// Nouns/emotions/concepts that carry strong meaning — bump their priority
const MEANINGFUL_WORD_HINTS = new Set([
  'anxiety','grief','loss','fear','anger','pain','hope','love','joy','peace',
  'guilt','shame','doubt','trust','change','growth','death','life','time',
  'money','work','stress','weather','health','family','friend','future','past',
  'failure','success','purpose','meaning','identity','freedom','control','power',
  'beauty','truth','faith','mind','body','soul','heart','dream','goal','choice',
]);

function extractTopics(text) {
  if (!text || text.trim().length < 3) return [];
  const words = text.toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !DEEPITY_STOP_WORDS.has(w) && !DEEPITY_VERB_FORMS.has(w));
  if (!words.length) return [];

  // Score: known meaningful words score 3, longer words score by length
  words.sort((a, b) => {
    const scoreA = (MEANINGFUL_WORD_HINTS.has(a) ? 3 : 0) + a.length * 0.1;
    const scoreB = (MEANINGFUL_WORD_HINTS.has(b) ? 3 : 0) + b.length * 0.1;
    return scoreB - scoreA;
  });

  // Return up to 3 top candidates (deduplicated)
  return [...new Set(words)].slice(0, 3);
}

// Each template is tagged with its structure so philosopher selection
// can be steered toward the same conceptual territory.
const ALL_DEEPITY_TEMPLATES = [
  ...IDENTITY_LOOP_TEMPLATES.map(fn   => ({ fn, structure: 'identity-loop'       })),
  ...CONDITIONAL_DEEPITY_TEMPLATES.map(fn => ({ fn, structure: 'conditional-deepity' })),
  ...PERSPECTIVE_LOOP_TEMPLATES.map(fn => ({ fn, structure: 'perspective-loop'    })),
  ...TEMPORAL_TRUTH_TEMPLATES.map(fn  => ({ fn, structure: 'temporal-truth'       })),
];

// ── Structure → philosopher theme keywords ────────────────
// These are injected into philosopher scoring so the philosopher
// echoes the same conceptual territory as the deepity structure.
//
//  Identity Loop       → self / existence / authenticity
//  Conditional Deepity → truth / reason / logic / certainty
//  Perspective Loop    → learning / growth / wisdom / understanding
//  Temporal Truth      → time / impermanence / the present moment
const STRUCTURE_THEMES = {
  'identity-loop':       ['identity','self','being','exist','authentic','belong',
                          'define','choice','own','become','real','who'],
  'conditional-deepity': ['truth','reason','exist','certainty','doubt','clarity',
                          'logic','reality','knowledge','method','think'],
  'perspective-loop':    ['learn','knowledge','understand','wisdom','growth','change',
                          'progress','experience','habit','examine','education'],
  'temporal-truth':      ['time','present','live','moment','change','flow','past',
                          'future','patience','hurry','slow','day','wasted'],
};

// Track recently used template indices — avoid repeating within last 20 picks
const recentTemplateIndices = [];
const TEMPLATE_RECENT_WINDOW = 20;

function pickDeepityTemplate() {
  const recentSet = new Set(recentTemplateIndices);
  const candidates = ALL_DEEPITY_TEMPLATES
    .map((entry, i) => ({ ...entry, i }))
    .filter(({ i }) => !recentSet.has(i));

  // Fall back to full pool only if fresh pool is very small
  const pool = candidates.length >= 10 ? candidates : ALL_DEEPITY_TEMPLATES.map((entry, i) => ({ ...entry, i }));
  const chosen = rand(pool);

  recentTemplateIndices.push(chosen.i);
  if (recentTemplateIndices.length > TEMPLATE_RECENT_WINDOW) recentTemplateIndices.shift();

  return { fn: chosen.fn, structure: chosen.structure };
}

function generateBlendedDeepity() {
  const { fn: templateFn, structure } = pickDeepityTemplate();
  const topics = extractTopics(questionInput.value.trim());
  if (topics.length) {
    const topic = rand(topics);
    const synonym = getSynonym(topic);
    return { text: templateFn(topic, synonym), structure };
  }
  const fallback = [
    ...philosophyData.pseudoProfoundTemplates.balanced,
    ...philosophyData.pseudoProfoundTemplates.kardashian,
    ...philosophyData.pseudoProfoundTemplates.extreme,
  ];
  return { text: rand(fallback), structure };
}

function weightedRand(pool, scoreFn = p => p.weight ?? 1) {
  const total = pool.reduce((sum, p) => sum + scoreFn(p), 0);
  let r = Math.random() * total;
  for (const p of pool) {
    r -= scoreFn(p);
    if (r <= 0) return p;
  }
  return pool[pool.length - 1];
}

function extractInputKeywords(text) {
  if (!text || text.trim().length < 3) return new Set();
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 4 && !DEEPITY_STOP_WORDS.has(w))
  );
}

function scorePhilosopher(philosopher, keywords) {
  const base = philosopher.weight ?? 1;
  if (!keywords.size || !philosopher.themes) return base;
  let matches = 0;
  for (const theme of philosopher.themes) {
    for (const kw of keywords) {
      if (kw.includes(theme) || theme.includes(kw)) {
        matches++;
        break; // count each theme once
      }
    }
  }
  // Each thematic match adds 3× base weight; strong matches lift the philosopher significantly
  return base + matches * 3;
}

function pickPhilosopher(allPhilosophers, keywords) {
  // Exclude recently used philosophers; fall back to full pool if too few remain
  const fresh = allPhilosophers.filter(p => !recentPhilosopherIds.includes(p.id));
  const pool  = fresh.length >= 4 ? fresh : allPhilosophers;
  const chosen = weightedRand(pool, p => scorePhilosopher(p, keywords));

  // Record the pick and trim the window
  recentPhilosopherIds.push(chosen.id);
  if (recentPhilosopherIds.length > RECENT_WINDOW) recentPhilosopherIds.shift();

  return chosen;
}

function pickExcerpt(excerpts, keywords) {
  if (!keywords.size || excerpts.length <= 1) return rand(excerpts);
  // Score each excerpt by how many input keywords appear in its text
  return weightedRand(excerpts, e => {
    const lower = e.text.toLowerCase();
    let score = 1;
    for (const kw of keywords) {
      if (lower.includes(kw)) score += 2;
    }
    return score;
  });
}

function pick() {
  const philosophers = philosophyData.philosophers;
  const inputKeywords = extractInputKeywords(questionInput.value.trim());

  const { text: pseudo, structure } = generateBlendedDeepity();

  // Build combined keyword set:
  //   • user input keywords  — what the person is thinking about
  //   • structure keywords   — conceptual territory of the deepity structure
  //                            (identity, time, learning, logic…)
  //   • deepity text words   — topic noun used in the generated quote
  const structureKeywords = STRUCTURE_THEMES[structure] ?? [];
  const deepityKeywords   = extractInputKeywords(pseudo);
  const combinedKeywords  = new Set([...inputKeywords, ...structureKeywords, ...deepityKeywords]);

  const philosopher = pickPhilosopher(philosophers, combinedKeywords);
  const excerptObj  = pickExcerpt(philosopher.excerpts, combinedKeywords);

  return {
    pseudo,
    philosopher: philosopher.name,
    excerpt: excerptObj.text,
    source: excerptObj.source,
  };
}

/* ---------- Emotion / mood detection ---------- */

const EMOTION_KEYWORDS = {
  calm:      ['calm', 'peace', 'peaceful', 'quiet', 'still', 'rest', 'breath', 'meditat', 'present',
              'mindful', 'tranquil', 'serene', 'gentle', 'slow', 'relax', 'balance', 'harmony',
              'content', 'patient', 'flow', 'ease', 'center', 'ground', 'reflect', 'ponder',
              'wonder', 'contempl', 'think', 'thought', 'notice', 'observe', 'accept'],
  sad:       ['sad', 'sadness', 'grief', 'griev', 'loss', 'lose', 'lonely', 'alone', 'miss', 'hurt',
              'pain', 'heartbreak', 'tear', 'cry', 'depress', 'down', 'empty', 'hopeless', 'broken',
              'regret', 'sorry', 'disappoint', 'mourn', 'ache', 'numb', 'isolat', 'abandon',
              'drift', 'hollow', 'longing', 'yearn'],
  love:      ['love', 'loved', 'loving', 'adore', 'affection', 'romance', 'romantic', 'tender',
              'cherish', 'devoted', 'devotion', 'intimacy', 'intimate', 'crush', 'infatuat',
              'passion', 'warmth', 'together', 'partner', 'soulmate', 'heart', 'darling', 'caring',
              'belong', 'connection', 'attach', 'bond', 'miss you', 'hold'],
  joy:       ['happy', 'happin', 'joy', 'joyful', 'celebrat', 'grateful', 'gratitude', 'excit',
              'wonderful', 'beautiful', 'amazing', 'thankful', 'bless', 'delight', 'cheerful',
              'hopeful', 'inspir', 'alive', 'thrill', 'proud', 'laugh', 'smile', 'glow', 'elat',
              'euphori', 'vibrant', 'energi', 'uplift'],
  anger:     ['angry', 'anger', 'frustrat', 'furious', 'fury', 'rage', 'irritat', 'annoyed',
              'annoy', 'resent', 'bitter', 'hostile', 'outrage', 'livid', 'mad', 'hate', 'hatred',
              'unfair', 'injust', 'betray', 'disrespect', 'offend', 'insult', 'disgust', 'fed up',
              'can\'t stand', 'sick of'],
  confusion: ['confus', 'uncertain', 'unsure', 'unclear', 'lost', 'puzzle', 'doubt', 'question',
              'don\'t know', 'not sure', 'maybe', 'wonder', 'undecided', 'overwhelm', 'stress',
              'anxious', 'anxiety', 'worried', 'worry', 'fear', 'afraid', 'panic', 'stuck',
              'exhaust', 'pressure', 'deadlin', 'chaos', 'spiral', 'numb', 'directionless'],
};

function detectEmotion(text) {
  if (!text || text.length < 3) return null;
  const lower = text.toLowerCase();
  const scores = { calm: 0, sad: 0, love: 0, joy: 0, anger: 0, confusion: 0 };

  for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) scores[emotion]++;
    }
  }

  const max = Math.max(...Object.values(scores));
  if (max === 0) return null;
  return Object.entries(scores).find(([, v]) => v === max)?.[0] ?? null;
}

function applyMood(emotion) {
  if (emotion === currentMood) return;
  document.body.classList.remove(
    'mood-calm', 'mood-sad', 'mood-love', 'mood-joy', 'mood-anger', 'mood-confusion'
  );
  if (emotion) document.body.classList.add(`mood-${emotion}`);
  currentMood = emotion;
}

/* ---------- Sparkle particles ---------- */

const SPARKLE_GLYPHS = ['✦', '✧', '·', '⋆', '✺', '◇', '★', '✶'];

function launchSparkles(anchorEl, count = 18) {
  const rect = anchorEl.getBoundingClientRect();
  const cx = rect.left + rect.width  / 2;
  const cy = rect.top  + rect.height / 2;

  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.className = 'sparkle';
    el.textContent = SPARKLE_GLYPHS[i % SPARKLE_GLYPHS.length];

    // Random burst direction
    const angle   = (Math.random() * 360) * (Math.PI / 180);
    const dist1   = 30  + Math.random() * 60;
    const dist2   = 60  + Math.random() * 100;
    const dist3   = 80  + Math.random() * 130;
    const tx1 = Math.cos(angle) * dist1;
    const ty1 = Math.sin(angle) * dist1;
    const tx2 = Math.cos(angle) * dist2;
    const ty2 = Math.sin(angle) * dist2 - Math.random() * 20;
    const tx3 = Math.cos(angle) * dist3;
    const ty3 = Math.sin(angle) * dist3 - Math.random() * 30;

    const dur  = (.55 + Math.random() * .65).toFixed(2) + 's';
    const delay = (i * 28 + Math.random() * 40).toFixed(0) + 'ms';
    const size  = (.6 + Math.random() * .9).toFixed(2) + 'rem';

    const roll = Math.random();
    const color = roll > .6
      ? `hsl(${36 + Math.random()*16}, 62%, ${50 + Math.random()*18}%)`   // warm gold
      : roll > .3
        ? `hsl(${100 + Math.random()*25}, 30%, ${52 + Math.random()*18}%)` // sage green
        : `hsl(${25 + Math.random()*18}, 28%, ${58 + Math.random()*16}%)`; // warm stone

    el.style.cssText = `
      left: ${cx}px;
      top:  ${cy}px;
      font-size: ${size};
      color: ${color};
      text-shadow: 0 0 6px ${color};
      --tx1: ${tx1}px; --ty1: ${ty1}px;
      --tx2: ${tx2}px; --ty2: ${ty2}px;
      --tx3: ${tx3}px; --ty3: ${ty3}px;
      --dur: ${dur};
      animation-delay: ${delay};
    `;

    document.body.appendChild(el);

    // Clean up after animation
    const totalMs = (parseFloat(dur) + parseFloat(delay)) * 1000 + 100;
    setTimeout(() => el.remove(), totalMs);
  }
}

/* ---------- Quote reveal animation ---------- */

function animateWords(element, text, delayStart = 0) {
  const words = text.split(' ');
  element.innerHTML = '';

  words.forEach((word, i) => {
    const span = document.createElement('span');
    span.className = 'word';
    span.textContent = word;
    span.style.animationDelay = `${delayStart + i * 55}ms`;
    element.appendChild(span);

    // Add a text node for the space (not wrapped, to avoid odd spacing)
    if (i < words.length - 1) {
      element.appendChild(document.createTextNode(' '));
    }
  });
}

const pseudoQuoteEl   = document.getElementById('pseudo-quote');
const userThought     = document.getElementById('user-thought');
const userThoughtText = document.getElementById('user-thought-text');
const cardShare       = document.getElementById('card-share');
const shareImageBtn   = document.getElementById('share-image-btn');
const shareTextBtn    = document.getElementById('share-text-btn');

function revealResponse(result) {
  // Reset dramatic classes
  pseudoQuoteEl.classList.remove('revealing');
  responseCard.classList.remove('pop');

  // Populate user's original thought
  if (result.question) {
    userThoughtText.textContent = result.question;
    userThought.hidden = false;
  } else {
    userThought.hidden = true;
  }

  // Animate pseudo-quote word by word
  animateWords(pseudoQuoteText, result.pseudo, 0);

  // Delay-reveal philosopher block via classes
  philosopherExcerpt.classList.remove('visible');
  philosopherName.classList.remove('visible');
  philosopherSource.classList.remove('visible');

  philosopherExcerpt.textContent = `"${result.excerpt}"`;
  philosopherName.textContent    = result.philosopher;
  philosopherSource.textContent  = result.source;

  const wordCount          = result.pseudo.split(' ').length;
  const quoteFinishDelay   = wordCount * 55 + 200;

  // Show card first (opacity: 0 → 1 transition)
  responseSection.hidden = false;
  responseCard.getBoundingClientRect(); // force reflow
  requestAnimationFrame(() => {
    responseCard.classList.add('revealed');
  });

  // ── Dramatic reveal sequence ──────────────────────────────

  // 1. Card pop — slight scale bounce
  setTimeout(() => {
    responseCard.classList.add('pop');
    setTimeout(() => responseCard.classList.remove('pop'), 520);
  }, 80);

  // 2. Glow pulse on quote element (peaks mid-animation)
  setTimeout(() => {
    pseudoQuoteEl.classList.add('revealing');
    setTimeout(() => pseudoQuoteEl.classList.remove('revealing'), 1700);
  }, 200);

  // 3. Shimmer sweep — inject ephemeral overlay div
  setTimeout(() => {
    const shimmer = document.createElement('div');
    shimmer.className = 'pseudo-quote-shimmer';
    pseudoQuoteEl.style.position = 'relative'; // ensure containment
    pseudoQuoteEl.appendChild(shimmer);
    setTimeout(() => shimmer.remove(), 1100);
  }, 220);

  // 4. Sparkle burst — launches when first words are visible
  setTimeout(() => {
    launchSparkles(pseudoQuoteEl, 22);
  }, 280);

  // 5. Second sparkle wave — smaller, at end of word animation
  setTimeout(() => {
    launchSparkles(pseudoQuoteEl, 10);
  }, quoteFinishDelay + 50);

  // ── Philosopher block staggered reveal ───────────────────
  setTimeout(() => philosopherExcerpt.classList.add('visible'), quoteFinishDelay + 100);
  setTimeout(() => philosopherName.classList.add('visible'),    quoteFinishDelay + 300);
  setTimeout(() => philosopherSource.classList.add('visible'),  quoteFinishDelay + 450);

  // ── Share section (fade in after philosopher reveal) ──────
  cardShare.classList.remove('visible');
  setTimeout(() => cardShare.classList.add('visible'), quoteFinishDelay + 600);

  // Scroll card into view gently
  setTimeout(() => {
    responseSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

/* ---------- Main ask flow ---------- */

async function loadData() {
  if (philosophyData) return;
  const res = await fetch('philosophy-data.json');
  philosophyData = await res.json();
}

async function handleAsk() {
  const question = questionInput.value.trim();

  // Loading state
  askBtn.classList.add('loading');
  askBtn.querySelector('.ask-btn-inner').innerHTML =
    '<span class="ask-icon" aria-hidden="true">✦</span> Consulting the cosmos…';

  try {
    await loadData();

    // Tiny dramatic pause — the universe is thinking
    await new Promise(r => setTimeout(r, 900 + Math.random() * 600));

    // Apply mood background before reveal
    applyMood(detectEmotion(question));

    currentResult = pick();
    currentResult.question = question;

    // Reset card state before re-animating
    responseCard.classList.remove('revealed');

    // Small delay so removal of .revealed doesn't cancel the new transition
    await new Promise(r => setTimeout(r, 30));

    revealResponse(currentResult);

  } catch (err) {
    console.error('WiseQuotes error:', err);
    alert('The universe is momentarily unreachable. Please try again.');
  } finally {
    askBtn.classList.remove('loading');
    askBtn.querySelector('.ask-btn-inner').innerHTML =
      '<span class="ask-icon" aria-hidden="true">✦</span> Ask the Universe';
  }
}

/* ---------- Share helpers ---------- */

function wrapTextLines(ctx, font, text, maxWidth) {
  ctx.font = font;
  const words = text.split(' ');
  let line = '';
  const lines = [];
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawWrappedText(ctx, font, lines, x, y, lineHeight, fillStyle) {
  ctx.font = font;
  ctx.fillStyle = fillStyle;
  lines.forEach((line, i) => ctx.fillText(line, x, y + i * lineHeight));
}

function drawShareCanvas(result) {
  const W = 880, PAD = 72, INNER = W - PAD * 2;
  const QUESTION_FONT = 'italic 300 17px Georgia, serif';
  const QUOTE_FONT    = 'italic 300 24px Georgia, serif';
  const EXCERPT_FONT  = 'italic 300 16px Georgia, serif';
  const QUESTION_LH = 28, QUOTE_LH = 38, EXCERPT_LH = 28;

  // Measure pass (no drawing)
  const tmp = document.createElement('canvas');
  tmp.width = W; tmp.height = 10;
  const tctx = tmp.getContext('2d');
  tctx.textAlign = 'center';
  const questionLines = result.question
    ? wrapTextLines(tctx, QUESTION_FONT, result.question, INNER - 40)
    : [];
  const quoteLines   = wrapTextLines(tctx, QUOTE_FONT,   result.pseudo,  INNER - 20);
  const excerptLines = wrapTextLines(tctx, EXCERPT_FONT, result.excerpt, INNER);

  const questionBlock = questionLines.length
    ? questionLines.length * QUESTION_LH + 52 // label + text + gap below
    : 0;

  const H = (
    184
    + questionBlock
    + quoteLines.length   * QUOTE_LH
    + 85  // close-quote + divider + philosopher label + gaps
    + excerptLines.length * EXCERPT_LH
    + 22  // name
    + (result.source ? 26 : 0)
    + 56  // bottom padding
  );

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.textAlign = 'center';

  // Background
  ctx.fillStyle = '#f7f3ec';
  ctx.fillRect(0, 0, W, H);

  // Border
  ctx.strokeStyle = 'rgba(168,152,128,0.28)';
  ctx.lineWidth = 1;
  ctx.strokeRect(24, 24, W - 48, H - 48);

  let cy = 72;

  // Glyph
  ctx.font = 'bold 22px serif';
  ctx.fillStyle = '#b08a48';
  ctx.fillText('✦', W / 2, cy);
  cy += 40;

  // Site name
  ctx.font = '300 11px sans-serif';
  ctx.fillStyle = '#6b5f52';
  ctx.fillText('V E R Y   W I S E   Q U O T E S', W / 2, cy);
  cy += 36;

  // User's original thought
  if (questionLines.length) {
    ctx.font = '300 10px sans-serif';
    ctx.fillStyle = 'rgba(107,95,82,0.6)';
    ctx.fillText('Y O U   A S K E D', W / 2, cy);
    cy += 20;
    drawWrappedText(ctx, QUESTION_FONT, questionLines, W / 2, cy, QUESTION_LH, '#584f43');
    cy += questionLines.length * QUESTION_LH + 28;

    // Thin divider after question
    ctx.strokeStyle = 'rgba(168,152,128,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2 - 60, cy); ctx.lineTo(W / 2 + 60, cy);
    ctx.stroke();
    cy += 20;
  }

  // Kardashian label
  ctx.font = '300 10px sans-serif';
  ctx.fillStyle = 'rgba(107,95,82,0.65)';
  ctx.fillText('K A R D A S H I A N   W I S D O M', W / 2, cy);
  cy += 36;

  // Open quote mark
  ctx.save();
  ctx.textAlign = 'left';
  ctx.font = 'italic 52px Georgia, serif';
  ctx.fillStyle = 'rgba(168,152,128,0.35)';
  ctx.fillText('\u201c', PAD - 14, cy + 14);
  ctx.restore();

  // Quote text
  drawWrappedText(ctx, QUOTE_FONT, quoteLines, W / 2, cy, QUOTE_LH, '#2d2820');
  cy += quoteLines.length * QUOTE_LH;

  // Close quote mark
  ctx.save();
  ctx.textAlign = 'right';
  ctx.font = 'italic 52px Georgia, serif';
  ctx.fillStyle = 'rgba(168,152,128,0.35)';
  ctx.fillText('\u201d', W - PAD + 14, cy);
  ctx.restore();
  cy += 30;

  // Divider
  ctx.strokeStyle = 'rgba(168,152,128,0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 90, cy); ctx.lineTo(W / 2 + 90, cy);
  ctx.stroke();
  cy += 25;

  // Philosopher label
  ctx.font = '300 10px sans-serif';
  ctx.fillStyle = 'rgba(107,95,82,0.65)';
  ctx.fillText('P H I L O S O P H E R   E C H O', W / 2, cy);
  cy += 30;

  // Excerpt
  drawWrappedText(ctx, EXCERPT_FONT, excerptLines, W / 2, cy, EXCERPT_LH, '#584f43');
  cy += excerptLines.length * EXCERPT_LH + 20;

  // Philosopher name
  ctx.font = '600 14px Georgia, serif';
  ctx.fillStyle = '#b08a48';
  ctx.fillText(result.philosopher, W / 2, cy);
  cy += 22;

  // Source
  if (result.source) {
    ctx.font = '300 10px sans-serif';
    ctx.fillStyle = '#6b5f52';
    ctx.fillText(result.source, W / 2, cy);
  }

  return canvas;
}

async function handleShareImage() {
  if (!currentResult) return;
  const originalHTML = shareImageBtn.innerHTML;
  shareImageBtn.disabled = true;
  shareImageBtn.textContent = '…';

  try {
    const canvas = drawShareCanvas(currentResult);
    await new Promise(resolve => {
      canvas.toBlob(async blob => {
        const file = new File([blob], 'wisequotes.png', { type: 'image/png' });
        if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: 'Very Wise Quotes' }); }
          catch (e) { if (e.name !== 'AbortError') downloadBlob(blob); }
        } else {
          downloadBlob(blob);
        }
        resolve();
      }, 'image/png');
    });
  } finally {
    shareImageBtn.innerHTML = originalHTML;
    shareImageBtn.disabled = false;
  }
}

function downloadBlob(blob) {
  const a = document.createElement('a');
  a.download = 'wisequotes.png';
  a.href = URL.createObjectURL(blob);
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

async function handleShareText() {
  if (!currentResult) return;
  const questionLine = currentResult.question ? `"${currentResult.question}"\n\n` : '';
  const sourceLine = currentResult.source ? `, ${currentResult.source}` : '';
  const text = [
    questionLine + '— Kardashian Wisdom —',
    `"${currentResult.pseudo}"`,
    '',
    '— Philosopher Echo —',
    `"${currentResult.excerpt}"`,
    `— ${currentResult.philosopher}${sourceLine}`,
  ].join('\n');
  const originalHTML = shareTextBtn.innerHTML;

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none;top:0;left:0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch {}
    document.body.removeChild(ta);
  }

  shareTextBtn.textContent = 'Copied ✓';
  shareTextBtn.disabled = true;
  setTimeout(() => { shareTextBtn.innerHTML = originalHTML; shareTextBtn.disabled = false; }, 2200);
}

/* ---------- Event listeners ---------- */

// Char counter + live mood preview
questionInput.addEventListener('input', () => {
  charCount.textContent = `${questionInput.value.length} / 280`;
  clearTimeout(moodDebounce);
  moodDebounce = setTimeout(() => {
    applyMood(detectEmotion(questionInput.value.trim()));
  }, 500);
});

// Enter key in textarea
questionInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    handleAsk();
  }
});

// Ask button
askBtn.addEventListener('click', handleAsk);

// Share buttons
shareImageBtn.addEventListener('click', handleShareImage);
shareTextBtn.addEventListener('click', handleShareText);

/* ---------- Init ---------- */

// Pre-load data silently so first ask is faster
loadData().catch(() => {});

// Mobile placeholder: break onto two lines and center
const PLACEHOLDER_DESKTOP = 'Share a teeny tiny thought. Big ones overwhelm me.';
const PLACEHOLDER_MOBILE  = 'Share a teeny tiny thought.\nBig ones overwhelm me.';

function syncPlaceholder() {
  questionInput.placeholder = window.innerWidth <= 480
    ? PLACEHOLDER_MOBILE
    : PLACEHOLDER_DESKTOP;
}
syncPlaceholder();
window.addEventListener('resize', syncPlaceholder);

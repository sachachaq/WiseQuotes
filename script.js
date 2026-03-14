/* =========================================================
   WiseQuotes — script.js
   ========================================================= */

'use strict';

/* ---------- State ---------- */
let philosophyData = null;
let currentResult = null;
let currentMood   = null;
let moodDebounce  = null;
let flutterTimer  = null;

const recentPhilosopherIds = [];
const RECENT_WINDOW = 7; // won't repeat same philosopher within last 7 picks

/* ---------- DOM refs ---------- */
const questionInput        = document.getElementById('user-question');
const charCount            = document.getElementById('char-count');
const vibeSlider           = document.getElementById('vibe-slider');
const vibeControl          = document.getElementById('vibe-control');
const sliderFill           = document.getElementById('slider-fill');
const vibeBird             = document.getElementById('vibe-bird');
const askBtn               = document.getElementById('ask-btn');
const responseSection      = document.getElementById('response-section');
const responseCard         = document.getElementById('response-card');
const responseQuestionBlock= document.getElementById('response-question-block');
const responseQuestionText = document.getElementById('response-question-text');
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

const DEEPITY_TEMPLATES = [
  t => `The ${t} you have is the ${t} you're dealing with right now.`,
  t => `When ${t} is happening, what is happening is ${t}. And that's just what ${t} does.`,
  t => `The thing about ${t} is that ${t} is the thing. And knowing that is knowing the thing about ${t}.`,
  t => `You can't get through ${t} without going through ${t}. That's what makes it ${t}.`,
  t => `${cap(t)} changes you, and when it does, you are changed by ${t}.`,
  t => `When ${t} is in your life, your life has ${t} in it. And that's honestly a lot.`,
  t => `The ${t} you're carrying is the weight of ${t}. And carrying ${t} means ${t} is being carried.`,
  t => `${cap(t)} is hard because ${t} is hard. And hard things, like ${t}, are hard.`,
  t => `What you're going through with ${t} is the part of ${t} you're currently going through.`,
  t => `The version of ${t} you have is your version of ${t}, which is yours.`,
  t => `I've thought a lot about ${t}, and I always come back to: ${t} is the ${t} you're living.`,
  t => `Before there was ${t} in your life, there wasn't ${t}. Now there is. That's growth.`,
  t => `Every part of ${t} is a part of the whole ${t}. And the whole thing is all of the ${t}.`,
  t => `${cap(t)} happened, which means ${t} has occurred. And when ${t} occurs, it's already happened.`,
  t => `The ${t} in your situation is really the situation of your ${t}. Which is still ${t}.`,
  t => `You're not just experiencing ${t} — you're having a full ${t} experience. That's what ${t} is.`,
  t => `${cap(t)} is a journey, and every journey has ${t} in it, because the journey is the ${t}.`,
  t => `At the end of the day, ${t} is at the end of the day. And that's where ${t} lives.`,
];

function extractTopic(text) {
  if (!text || text.trim().length < 3) return null;
  const words = text.toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !DEEPITY_STOP_WORDS.has(w));
  if (!words.length) return null;
  // Prefer longer, more specific words
  words.sort((a, b) => b.length - a.length);
  return words[0];
}

function generateKardashianDeepity() {
  const topic = extractTopic(questionInput.value.trim());
  if (topic) return rand(DEEPITY_TEMPLATES)(topic);
  return rand(philosophyData.pseudoProfoundTemplates.kardashian);
}

function getVibeKey(value) {
  if (value < 34)  return 'serious';
  if (value < 67)  return 'balanced';
  return 'kardashian';
}

function getVibeLabel(value) {
  if (value < 34)  return 'Serious';
  if (value < 67)  return 'Balanced';
  return 'Kardashian';
}

function updateSliderUI(value) {
  sliderFill.style.width = value + '%';
  updateBird(value);
}

function updateBird(value) {
  if (!vibeBird) return;
  vibeBird.style.left = value + '%';
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

function pick(excluding = null) {
  const vibeKey  = getVibeKey(parseInt(vibeSlider.value, 10));
  const philosophers = philosophyData.philosophers;
  const keywords = extractInputKeywords(questionInput.value.trim());

  // Pick a pseudo-quote
  let pseudo;
  if (vibeKey === 'kardashian') {
    // Dynamically generated from user input
    pseudo = generateKardashianDeepity();
  } else {
    const quotes = philosophyData.pseudoProfoundTemplates[vibeKey];
    let pseudoList = excluding ? quotes.filter(q => q !== excluding.pseudo) : quotes;
    if (!pseudoList.length) pseudoList = quotes;
    pseudo = rand(pseudoList);
  }

  // Pick philosopher weighted by thematic relevance to user input
  const philosopher = pickPhilosopher(philosophers, keywords);

  // Pick the most relevant excerpt from that philosopher
  const excerptObj = pickExcerpt(philosopher.excerpts, keywords);

  return {
    pseudo,
    philosopher: philosopher.name,
    excerpt: excerptObj.text,
    source: excerptObj.source,
    vibe: getVibeLabel(parseInt(vibeSlider.value, 10))
  };
}

/* ---------- Emotion / mood detection ---------- */

const EMOTION_KEYWORDS = {
  calm:   ['calm', 'peace', 'peaceful', 'quiet', 'still', 'rest', 'breath', 'meditat', 'present',
           'mindful', 'tranquil', 'serene', 'gentle', 'slow', 'relax', 'balance', 'harmony',
           'content', 'patient', 'flow', 'ease', 'center', 'ground'],
  stress: ['stress', 'anxious', 'anxiety', 'worried', 'worry', 'overwhelm', 'pressure', 'deadline',
           'fear', 'afraid', 'panic', 'rush', 'hurry', 'chaos', 'difficult', 'struggle', 'lost',
           'confus', 'urgent', 'busy', 'exhaust', 'stuck', 'too much', "can't", 'cannot', 'failing',
           'angry', 'frustrat', 'tension'],
  joy:    ['happy', 'happin', 'joy', 'joyful', 'love', 'celebrat', 'grateful', 'gratitude', 'excit',
           'wonderful', 'beautiful', 'amazing', 'thankful', 'bless', 'delight', 'cheerful', 'hope',
           'hopeful', 'inspir', 'alive', 'great', 'good', 'thrill', 'proud'],
  sad:    ['sad', 'sadness', 'grief', 'griev', 'loss', 'lose', 'lonely', 'alone', 'miss', 'hurt',
           'pain', 'heartbreak', 'tear', 'cry', 'depress', 'down', 'empty', 'hopeless', 'broken',
           'regret', 'sorry', 'disappoint', 'mourn', 'ache', 'numb']
};

function detectEmotion(text) {
  if (!text || text.length < 3) return null;
  const lower = text.toLowerCase();
  const scores = { calm: 0, stress: 0, joy: 0, sad: 0 };

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
  document.body.classList.remove('mood-calm', 'mood-stress', 'mood-joy', 'mood-sad');
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

const pseudoQuoteEl = document.getElementById('pseudo-quote');

function revealResponse(result, question) {
  // Populate question echo
  responseQuestionText.textContent = question || '';
  responseQuestionBlock.hidden = !question;

  // Reset dramatic classes
  pseudoQuoteEl.classList.remove('revealing');
  responseCard.classList.remove('pop');

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

    currentResult = pick(currentResult);

    // Reset card state before re-animating
    responseCard.classList.remove('revealed');

    // Small delay so removal of .revealed doesn't cancel the new transition
    await new Promise(r => setTimeout(r, 30));

    revealResponse(currentResult, question);

  } catch (err) {
    console.error('WiseQuotes error:', err);
    alert('The universe is momentarily unreachable. Please try again.');
  } finally {
    askBtn.classList.remove('loading');
    askBtn.querySelector('.ask-btn-inner').innerHTML =
      '<span class="ask-icon" aria-hidden="true">✦</span> Ask the Universe';
  }
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

// Slider UI
vibeSlider.addEventListener('input', () => {
  updateSliderUI(parseInt(vibeSlider.value, 10));
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

/* ---------- Init ---------- */

updateSliderUI(50);

// Pre-load data silently so first ask is faster
loadData().catch(() => {});

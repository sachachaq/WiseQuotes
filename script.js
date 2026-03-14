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

const REFLECTIVE_TEMPLATES = [
  t => `Strange, how ${t} keeps arriving exactly where it started.`,
  t => `The ${t} you're describing sounds a lot like more ${t}.`,
  t => `Funny — ${t} tends to show up right when you're already dealing with ${t}.`,
  t => `The ${t} question is really just a ${t}-shaped answer in disguise.`,
  t => `There's something about ${t} that only makes sense while you're still inside it.`,
  t => `${cap(t)} always arrives carrying more ${t}.`,
  t => `You're not confused about ${t}. You understand it perfectly. That's the problem.`,
  t => `The ${t} was already there before you noticed it. That's what ${t} does.`,
  t => `Looking for a way out of ${t} is its own kind of ${t}.`,
  t => `${cap(t)} is exactly as complicated as the time you've spent thinking about ${t}.`,
  t => `You already know what the ${t} is doing. The ${t} knows too.`,
  t => `The answer to ${t} keeps asking you the same question back.`,
];

const EXTREME_DEEPITY_TEMPLATES = [
  t => `${cap(t)} is, was, and will be ${t}. That's the entire timeline of ${t}.`,
  t => `The ${t} journey begins with ${t}, continues through ${t}, and ultimately arrives at more ${t}.`,
  t => `Some people experience ${t}. Others experience it differently. But all of them are experiencing their version of ${t}, which is ${t}.`,
  t => `${cap(t)} comes for everyone. Even people who don't have ${t} are just people who haven't had their ${t} yet.`,
  t => `I looked into ${t}, and what I found was: ${t} was already there, looking back.`,
  t => `${cap(t)} is just ${t} with the volume turned all the way up. And honestly? That's a lot of ${t}.`,
  t => `The universe sent me ${t} so I could understand ${t}. And now that I understand ${t}, I understand why the universe sent me ${t}.`,
  t => `Before ${t}, there was no ${t}. After ${t}, there is just the memory of ${t}. During ${t}, there is only ${t}.`,
  t => `${cap(t)} asked me what it was. I told it: you are ${t}. And then ${t} understood itself.`,
  t => `Some say ${t} changes you. I say you change, and call it ${t}. Either way, ${t}.`,
  t => `The hardest part of ${t} is that it's not the easy part. The easy part is after all the hard parts of ${t}.`,
  t => `${cap(t)} lives inside ${t}. Inside that ${t} is more ${t}. It's ${t} all the way down, babe.`,
  t => `What is ${t}? At its core, ${t} is the most ${t} thing about ${t}. I stand by this.`,
  t => `They say you can't rush ${t}. But also, if you wait too long, ${t} has already happened without you. So: medium speed on the ${t}.`,
  t => `You + ${t} = someone who is you, with ${t}. And that math? That math is real.`,
  t => `${cap(t)} is what happens when ${t} meets more ${t} under the right conditions. Which is any conditions, because ${t}.`,
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

const ALL_DEEPITY_TEMPLATES = [
  ...REFLECTIVE_TEMPLATES,
  ...DEEPITY_TEMPLATES,
  ...EXTREME_DEEPITY_TEMPLATES,
];

function generateBlendedDeepity() {
  const topic = extractTopic(questionInput.value.trim());
  if (topic) return rand(ALL_DEEPITY_TEMPLATES)(topic);
  const fallback = [
    ...philosophyData.pseudoProfoundTemplates.balanced,
    ...philosophyData.pseudoProfoundTemplates.kardashian,
    ...philosophyData.pseudoProfoundTemplates.extreme,
  ];
  return rand(fallback);
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
  const keywords = extractInputKeywords(questionInput.value.trim());

  const pseudo = generateBlendedDeepity();

  // Pick philosopher weighted by thematic relevance to user input
  const philosopher = pickPhilosopher(philosophers, keywords);

  // Pick the most relevant excerpt from that philosopher
  const excerptObj = pickExcerpt(philosopher.excerpts, keywords);

  return {
    pseudo,
    philosopher: philosopher.name,
    excerpt: excerptObj.text,
    source: excerptObj.source,
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

const pseudoQuoteEl   = document.getElementById('pseudo-quote');
const cardShare       = document.getElementById('card-share');
const shareImageBtn   = document.getElementById('share-image-btn');
const shareTextBtn    = document.getElementById('share-text-btn');

function revealResponse(result) {
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
  const QUOTE_FONT   = 'italic 300 24px Georgia, serif';
  const EXCERPT_FONT = 'italic 300 16px Georgia, serif';
  const QUOTE_LH = 38, EXCERPT_LH = 28;

  // Measure pass (no drawing)
  const tmp = document.createElement('canvas');
  tmp.width = W; tmp.height = 10;
  const tctx = tmp.getContext('2d');
  tctx.textAlign = 'center';
  const quoteLines   = wrapTextLines(tctx, QUOTE_FONT,   result.pseudo,   INNER - 20);
  const excerptLines = wrapTextLines(tctx, EXCERPT_FONT, result.excerpt,  INNER);

  const H = (
    184
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
  ctx.fillStyle = '#8a7e70';
  ctx.fillText('V E R Y   W I S E   Q U O T E S', W / 2, cy);
  cy += 36;

  // Kardashian label
  ctx.font = '300 10px sans-serif';
  ctx.fillStyle = 'rgba(138,126,112,0.65)';
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
  ctx.fillStyle = 'rgba(138,126,112,0.65)';
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
    ctx.fillStyle = '#8a7e70';
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
  const text = `"${currentResult.pseudo}"\n\n— ${currentResult.philosopher}${currentResult.source ? ', ' + currentResult.source : ''}`;
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

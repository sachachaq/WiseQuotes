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
const newThoughtBtn        = document.getElementById('new-thought-btn');
const anotherBtn           = document.getElementById('another-btn');
const shareToggleBtn       = document.getElementById('share-toggle-btn');
const shareCardWrapper     = document.getElementById('share-card-wrapper');
const includeQuestionToggle= document.getElementById('include-question-toggle');
const shareQuestionBlock   = document.getElementById('share-question-block');
const shareQuestionText    = document.getElementById('share-question-text');
const sharePseudoQuote     = document.getElementById('share-pseudo-quote-text');
const sharePhilosopherExcerpt = document.getElementById('share-philosopher-excerpt');
const sharePhilosopherName = document.getElementById('share-philosopher-name');
const sharePhilosopherSourceCard = document.getElementById('share-philosopher-source-card');
const shareCopyBtn         = document.getElementById('share-copy-btn');
const shareTwitterBtn      = document.getElementById('share-twitter-btn');

/* ---------- Helpers ---------- */

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
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

  // Horizontal position along the track
  vibeBird.style.left = value + '%';

  // Determine mode
  const mode = value < 34 ? 'serious' : value < 67 ? 'balanced' : 'kardasian';
  const prev = vibeControl.dataset.mode;
  vibeControl.dataset.mode = mode;

  // Wing flutter only when entering or moving within kardasian zone
  if (mode === 'kardasian') {
    vibeControl.classList.add('is-moving');
    clearTimeout(flutterTimer);
    flutterTimer = setTimeout(() => vibeControl.classList.remove('is-moving'), 620);
  } else if (prev === 'kardasian') {
    // Clean up if leaving kardasian
    vibeControl.classList.remove('is-moving');
  }
}

function weightedRand(philosophers) {
  const total = philosophers.reduce((sum, p) => sum + (p.weight ?? 1), 0);
  let r = Math.random() * total;
  for (const p of philosophers) {
    r -= (p.weight ?? 1);
    if (r <= 0) return p;
  }
  return philosophers[philosophers.length - 1];
}

function pick(excluding = null) {
  const vibeKey  = getVibeKey(parseInt(vibeSlider.value, 10));
  const quotes   = philosophyData.pseudoProfoundTemplates[vibeKey];
  const philosophers = philosophyData.philosophers;

  // Pick a pseudo-quote (avoid repeating if possible)
  let pseudoList = excluding ? quotes.filter(q => q !== excluding.pseudo) : quotes;
  if (!pseudoList.length) pseudoList = quotes;
  const pseudo = rand(pseudoList);

  // Pick philosopher using weighted selection
  const philosopher = weightedRand(philosophers);

  // Pick excerpt from that philosopher
  const excerptObj = rand(philosopher.excerpts);

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

/* ---------- Share card ---------- */

function populateShareCard(result, question) {
  shareQuestionText.textContent = question || '';
  sharePseudoQuote.textContent  = result.pseudo;
  sharePhilosopherExcerpt.textContent = `"${result.excerpt}"`;
  sharePhilosopherName.textContent    = result.philosopher;
  sharePhilosopherSourceCard.textContent = result.source;
}

function syncShareQuestionVisibility() {
  shareQuestionBlock.hidden = !includeQuestionToggle.checked;
}

function buildShareText() {
  const lines = [];
  const q = questionInput.value.trim();
  if (includeQuestionToggle.checked && q) {
    lines.push(`"${q}"`);
    lines.push('');
  }
  lines.push(`"${currentResult.pseudo}"`);
  lines.push('');
  lines.push(`"${currentResult.excerpt}"`);
  lines.push(`— ${currentResult.philosopher}, ${currentResult.source}`);
  lines.push('');
  lines.push('✦ WiseQuotes — wisequotes.app');
  return lines.join('\n');
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
    shareCardWrapper.hidden = true;
    shareToggleBtn.textContent = 'Share this wisdom';

    // Small delay so removal of .revealed doesn't cancel the new transition
    await new Promise(r => setTimeout(r, 30));

    revealResponse(currentResult, question);
    populateShareCard(currentResult, question);
    newThoughtBtn.hidden = false;

  } catch (err) {
    console.error('WiseQuotes error:', err);
    alert('The universe is momentarily unreachable. Please try again.');
  } finally {
    askBtn.classList.remove('loading');
    askBtn.querySelector('.ask-btn-inner').innerHTML =
      '<span class="ask-icon" aria-hidden="true">✦</span> Ask the Universe';
  }
}

async function handleAnother() {
  if (!philosophyData) return;

  anotherBtn.disabled = true;
  anotherBtn.textContent = 'Seeking…';

  await new Promise(r => setTimeout(r, 600 + Math.random() * 400));

  currentResult = pick(currentResult);

  responseCard.classList.remove('revealed');
  shareCardWrapper.hidden = true;
  shareToggleBtn.textContent = 'Share this wisdom';

  await new Promise(r => setTimeout(r, 30));

  revealResponse(currentResult, questionInput.value.trim());
  populateShareCard(currentResult, questionInput.value.trim());

  anotherBtn.disabled = false;
  anotherBtn.textContent = 'Another truth';
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

// New thought — full reset
newThoughtBtn.addEventListener('click', () => {
  // Clear input
  questionInput.value = '';
  charCount.textContent = '0 / 280';

  // Hide response + share card
  responseCard.classList.remove('revealed');
  responseSection.hidden = true;
  shareCardWrapper.hidden = true;
  shareToggleBtn.textContent = 'Share this wisdom';

  // Reset slider and bird
  vibeSlider.value = 50;
  vibeControl.classList.remove('is-moving');
  updateSliderUI(50);

  // Reset mood
  applyMood(null);
  currentResult = null;

  // Hide this button
  newThoughtBtn.hidden = true;

  // Scroll back to top
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Focus input
  setTimeout(() => questionInput.focus(), 400);
});

// Another truth
anotherBtn.addEventListener('click', handleAnother);

// Share card toggle
shareToggleBtn.addEventListener('click', () => {
  const isHidden = shareCardWrapper.hidden;
  shareCardWrapper.hidden = !isHidden;
  shareToggleBtn.textContent = isHidden ? 'Hide share card' : 'Share this wisdom';
  if (isHidden) {
    setTimeout(() => {
      shareCardWrapper.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }
});

// Include question toggle
includeQuestionToggle.addEventListener('change', syncShareQuestionVisibility);

// Copy share text
shareCopyBtn.addEventListener('click', async () => {
  if (!currentResult) return;
  try {
    await navigator.clipboard.writeText(buildShareText());
    shareCopyBtn.textContent = 'Copied!';
    shareCopyBtn.classList.add('copied');
    setTimeout(() => {
      shareCopyBtn.textContent = 'Copy card text';
      shareCopyBtn.classList.remove('copied');
    }, 2200);
  } catch {
    // Fallback for browsers that block clipboard
    const ta = document.createElement('textarea');
    ta.value = buildShareText();
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    shareCopyBtn.textContent = 'Copied!';
    setTimeout(() => { shareCopyBtn.textContent = 'Copy card text'; }, 2200);
  }
});

// Share on X / Twitter
shareTwitterBtn.addEventListener('click', () => {
  if (!currentResult) return;
  const tweet = [
    `"${currentResult.pseudo}"`,
    '',
    `✦ WiseQuotes`
  ].join('\n');
  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
});

/* ---------- Init ---------- */

updateSliderUI(50);

// Pre-load data silently so first ask is faster
loadData().catch(() => {});

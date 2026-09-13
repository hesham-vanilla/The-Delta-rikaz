// ---------- Content ----------
const STOPS = [
  {
    img: 'animation/1.png',
    eyebrow: 'Arrival — The Delta, Khobar',
    title: 'The Business District',
    text: 'Offices, meeting rooms and ground-floor restaurants gather around a shaded colonnade — a working day that never has to leave the block.',
    label: 'Business'
  },
  {
    img: 'animation/2.png',
    eyebrow: 'Where the day slows down',
    title: 'The High Street',
    text: 'Olive trees line a car-free promenade of cafés and concept stores, cast in warm stone from end to end.',
    label: 'High Street'
  },
  {
    img: 'animation/3.png',
    eyebrow: 'Ordinary afternoons',
    title: 'The Promenade',
    text: 'Fountains, filtered light and open storefronts turn a walk to lunch into the best part of the day.',
    label: 'Promenade'
  },
  {
    img: 'animation/4.png',
    eyebrow: 'Faith and learning, side by side',
    title: 'Al Noor Quarter',
    text: "A mosque and an international school share the same square — the Delta's day begins here for hundreds of families.",
    label: 'Al Noor Quarter'
  },
  {
    img: 'animation/5.png',
    eyebrow: 'Home, reimagined',
    title: 'The Residences',
    text: 'Limestone townhomes and low-rise apartments frame quiet, tree-lined streets with the Khobar skyline always in view.',
    label: 'Residences'
  },
  {
    img: 'animation/6.png',
    eyebrow: 'An hour to yourself',
    title: 'The Pool Club',
    text: 'A resort-length pool and shaded lounge decks, wrapped in olive trees — five minutes from every front door.',
    label: 'Pool Club'
  },
  {
    img: 'animation/7.png',
    eyebrow: 'Where the evenings go',
    title: 'The Park',
    text: 'Open lawns and soft-edged paths give the Delta its breathing room — and its best light, an hour before sunset.',
    label: 'Park'
  },
  {
    img: 'animation/8.png',
    eyebrow: 'After dark, elevated',
    title: 'The Boutique Row',
    text: 'Local and international maisons front a lit colonnade built for slow evenings and considered purchases.',
    label: 'Boutique Row'
  },
  {
    img: 'animation/9.png',
    eyebrow: 'The Delta, after sunset',
    title: 'Evenings at the Delta',
    text: 'String light and open doors along a café-lined street — proof that the plan was written for people first.',
    label: 'Evenings'
  }
];

// TRANSITIONS[i] plays while moving from STOPS[i] to STOPS[i+1] —
// each is a folder of pre-extracted JPEG frames (no video decoding/seeking,
// which is what made scrubbing the raw .mp4 files slow and glitchy).
const TRANSITION_FRAME_COUNT = 61;
const TRANSITIONS = STOPS.slice(0, -1).map((_, i) => ({
  dir: `assets/transitions/${i + 1}-${i + 2}`,
  count: TRANSITION_FRAME_COUNT
}));

const DWELL_VH = 100;
const TRANS_VH = 150;

const segments = [];
STOPS.forEach((_, i) => {
  segments.push({ type: 'dwell', stop: i, vh: DWELL_VH });
  if (i < STOPS.length - 1) {
    segments.push({ type: 'trans', from: i, to: i + 1, vh: TRANS_VH });
  }
});
const totalVh = segments.reduce((sum, s) => sum + s.vh, 0);

// ---------- DOM ----------
const reel = document.getElementById('reel');
const stage = document.getElementById('stage');
const stageImg = document.getElementById('stageImg');
const stageCanvas = document.getElementById('stageCanvas');
const stageEyebrow = document.getElementById('stageEyebrow');
const stageTitle = document.getElementById('stageTitle');
const stageText = document.getElementById('stageText');
const stageCount = document.getElementById('stageCount');
const stageLabel = document.getElementById('stageLabel');
const stageMeta = document.querySelector('.stage__meta');

const nav = document.getElementById('nav');
const navLinks = Array.from(document.querySelectorAll('.nav__links a, .nav__logo, .nav__cta, .mobile-menu a'));
const progressFill = document.getElementById('progressFill');
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');
const outro = document.getElementById('outro');

reel.style.height = totalVh + 'vh';
const ctx = stageCanvas.getContext('2d');

// ---------- Content rendering ----------
let renderedStop = -1;
function renderStop(i){
  if(i === renderedStop) return;
  renderedStop = i;
  const s = STOPS[i];
  stageImg.src = s.img;
  stageEyebrow.textContent = s.eyebrow;
  stageTitle.textContent = s.title;
  stageText.textContent = s.text;
  stageLabel.textContent = s.label;
  stageCount.innerHTML = `<em>${String(i + 1).padStart(2, '0')}</em> / ${String(STOPS.length).padStart(2, '0')}`;
}
renderStop(0);

// ---------- Staggered, eased text reveal ----------
// Each element gets its own little exit/enter window within the transition's
// local progress (0..1), so they don't all snap in/out in lockstep — the
// eyebrow leads, the title and body trail slightly, meta is quickest.
const easeInOutCubic = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp01 = v => Math.min(1, Math.max(0, v));

const REVEAL_ELEMENTS = [
  { el: stageEyebrow, exit: [0.00, 0.16], enter: [0.86, 1.00], rise: 16, blur: 5 },
  { el: stageTitle,   exit: [0.03, 0.20], enter: [0.82, 0.97], rise: 22, blur: 6 },
  { el: stageText,    exit: [0.06, 0.23], enter: [0.79, 0.94], rise: 18, blur: 5 },
];
const META_REVEAL = { exit: [0.00, 0.12], enter: [0.90, 1.00] };

function revealAt(localProgress, [exitStart, exitEnd], [enterStart, enterEnd]){
  if(localProgress <= exitStart) return 1;
  if(localProgress < exitEnd) return 1 - easeInOutCubic(clamp01((localProgress - exitStart) / (exitEnd - exitStart)));
  if(localProgress < enterStart) return 0;
  if(localProgress < enterEnd) return easeInOutCubic(clamp01((localProgress - enterStart) / (enterEnd - enterStart)));
  return 1;
}

function applyStagger(localProgress){
  REVEAL_ELEMENTS.forEach(({ el, exit, enter, rise, blur }) => {
    const v = revealAt(localProgress, exit, enter);
    el.style.opacity = v;
    el.style.transform = `translateY(${(1 - v) * rise}px)`;
    el.style.filter = v < 0.999 ? `blur(${(1 - v) * blur}px)` : 'none';
  });
  const metaV = revealAt(localProgress, META_REVEAL.exit, META_REVEAL.enter);
  stageMeta.style.opacity = metaV;
}

function setStaggerVisible(){
  REVEAL_ELEMENTS.forEach(({ el }) => {
    el.style.opacity = 1;
    el.style.transform = 'translateY(0)';
    el.style.filter = 'none';
  });
  stageMeta.style.opacity = 1;
}

function setActiveNav(stopNumOneIndexed){
  navLinks.forEach(a => {
    const v = a.dataset.stop;
    a.classList.toggle('is-active', v && Number(v) === stopNumOneIndexed);
  });
}

// ---------- Transition frame loading ----------
// Each transition's frames are loaded once (as plain <img> objects) the first
// time we're near it, then reused — no re-fetching, no seeking, no decoder
// stalls. A frame that hasn't finished loading yet is simply skipped for
// that tick; the next tick (or the next scroll frame) picks it up once ready.
const loadedFrameSets = new Map(); // index -> Image[]
let currentFrames = null;

function pad(n){ return String(n).padStart(3, '0'); }

function ensureTransitionLoaded(i){
  if(loadedFrameSets.has(i)){
    currentFrames = loadedFrameSets.get(i);
    return;
  }
  const { dir, count } = TRANSITIONS[i];
  const images = [];
  for(let f = 1; f <= count; f++){
    const img = new Image();
    img.src = `${dir}/frame_${pad(f)}.jpg`;
    images.push(img);
  }
  loadedFrameSets.set(i, images);
  currentFrames = images;
}

function drawTransitionFrame(localProgress){
  if(!currentFrames) return;
  const count = currentFrames.length;
  const index = Math.min(count - 1, Math.floor(localProgress * (count - 1)));
  const img = currentFrames[index];
  if(!img || !img.complete || !img.naturalWidth) return;

  const cw = stageCanvas.width, ch = stageCanvas.height;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const scale = Math.max(cw / iw, ch / ih);
  const dw = iw * scale, dh = ih * scale;
  const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
}

function sizeCanvas(){
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(stage.clientWidth * dpr);
  const h = Math.round(stage.clientHeight * dpr);
  if(stageCanvas.width !== w || stageCanvas.height !== h){
    stageCanvas.width = w;
    stageCanvas.height = h;
  }
}
// The stage is only ever 100vh, so its size only changes on resize —
// reading clientWidth/Height (which forces layout) on every single scroll
// frame was part of what made scrolling feel laggy. Size once, then only
// again when the window actually resizes.
sizeCanvas();

// ---------- Main scroll-driven update ----------
let ticking = false;

function update(){
  ticking = false;

  const rect = reel.getBoundingClientRect();
  const travel = reel.offsetHeight - window.innerHeight;
  const scrolledPx = Math.min(Math.max(-rect.top, 0), Math.max(travel, 0));
  const unitsScrolled = (scrolledPx / window.innerHeight) * 100;

  let cum = 0;
  let active = segments[segments.length - 1];
  let localProgress = 1;
  for(const seg of segments){
    if(unitsScrolled < cum + seg.vh){
      active = seg;
      localProgress = seg.vh ? (unitsScrolled - cum) / seg.vh : 0;
      break;
    }
    cum += seg.vh;
  }
  localProgress = Math.min(1, Math.max(0, localProgress));

  if(active.type === 'dwell'){
    renderStop(active.stop);
    stageImg.style.display = 'block';
    stageCanvas.style.display = 'none';
    setStaggerVisible();
    setActiveNav(active.stop + 1);
    progressFill.style.width = ((active.stop + 1) / STOPS.length * 100) + '%';
    // pre-warm the next transition while the visitor reads this stop
    if(active.stop < TRANSITIONS.length) ensureTransitionLoaded(active.stop);
  } else {
    ensureTransitionLoaded(active.from);
    stageImg.style.display = 'none';
    stageCanvas.style.display = 'block';
    drawTransitionFrame(localProgress);
    applyStagger(localProgress);

    const showIdx = localProgress < 0.5 ? active.from : active.to;
    renderStop(showIdx);
    if(localProgress >= 0.5) stageImg.src = STOPS[active.to].img; // keep img warm for the swap back to dwell

    const fromNum = active.from + 1, toNum = active.to + 1;
    const interpNum = fromNum + (toNum - fromNum) * localProgress;
    progressFill.style.width = (interpNum / STOPS.length * 100) + '%';
    setActiveNav(localProgress < 0.5 ? fromNum : toNum);
  }
}

function onScroll(){
  if(!ticking){
    ticking = true;
    requestAnimationFrame(update);
  }
}

// ---------- Custom eased scroll animation ----------
// Native `scrollTo({behavior:'smooth'})` moves at a roughly fixed speed, so a
// short hop (like settling a few vh into the nearest stop) finishes almost
// instantly — it reads as an abrupt jolt rather than an ease. Animating over
// a fixed duration with an ease-out curve, regardless of distance, feels
// gentler and consistent whether the hop is small or large.
let scrollAnim = null;
function animateScrollTo(targetY, duration = 550){
  if(scrollAnim) cancelAnimationFrame(scrollAnim.raf);
  const startY = window.scrollY;
  const delta = targetY - startY;
  if(Math.abs(delta) < 1) { scrollAnim = null; return; }
  const startTime = performance.now();
  const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

  function step(now){
    const t = Math.min(1, (now - startTime) / duration);
    window.scrollTo(0, startY + delta * easeOutCubic(t));
    if(t < 1){
      scrollAnim.raf = requestAnimationFrame(step);
    } else {
      scrollAnim = null;
    }
  }
  scrollAnim = { raf: requestAnimationFrame(step) };
}

// ---------- Settle-to-nearest-stop snapping ----------
// Once the visitor stops scrolling, ease the rest of the way to whichever
// full image (dwell segment) is closest, so you never get stranded staring
// at a half-formed transition frame. Snapping only fires after a short pause
// (not on every scroll tick), and only within the pinned reel itself.
const dwellStartsVh = [];
{
  let cum = 0;
  for(const seg of segments){
    if(seg.type === 'dwell') dwellStartsVh.push(cum);
    cum += seg.vh;
  }
}
const SNAP_IDLE_MS = 220;
// Snapping only kicks in once you're this close (in vh units) to a full
// image — stop in the dead middle of a transition and it leaves you there;
// stop near either end and it eases the rest of the way. That's the "little
// high range" tolerance rather than an unconditional, always-snap behaviour.
const SNAP_MAX_DIST_VH = TRANS_VH * 0.28;
let snapTimer = null;

function nearestDwellVh(unitsScrolled){
  let nearest = dwellStartsVh[0], minDist = Infinity;
  for(const v of dwellStartsVh){
    const d = Math.abs(unitsScrolled - v);
    if(d < minDist){ minDist = d; nearest = v; }
  }
  return { vh: nearest, dist: minDist };
}

function trySnap(){
  const rect = reel.getBoundingClientRect();
  const travel = reel.offsetHeight - window.innerHeight;
  const scrolledPx = -rect.top;
  // only snap while genuinely inside the pinned reel's scroll range
  if(scrolledPx <= 0 || scrolledPx >= travel) return;

  const unitsScrolled = (scrolledPx / window.innerHeight) * 100;
  const { vh: targetVh, dist } = nearestDwellVh(unitsScrolled);
  if(dist > SNAP_MAX_DIST_VH) return;
  const targetPx = (targetVh / 100) * window.innerHeight;
  const reelTop = rect.top + window.scrollY;
  const targetY = reelTop + targetPx;

  if(Math.abs(window.scrollY - targetY) > 2){
    animateScrollTo(targetY);
  }
}

function armSnap(){
  clearTimeout(snapTimer);
  snapTimer = setTimeout(trySnap, SNAP_IDLE_MS);
}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('scroll', armSnap, { passive: true });
window.addEventListener('resize', () => { sizeCanvas(); onScroll(); });
onScroll();

// nav solid background once scrolled past a small threshold
window.addEventListener('scroll', () => {
  nav.classList.toggle('is-solid', window.scrollY > window.innerHeight * 0.4);
}, { passive: true });

// ---------- outro reveal ----------
new IntersectionObserver((entries) => {
  entries.forEach(entry => entry.target.classList.toggle('in-view', entry.isIntersecting));
}, { threshold: 0.4 }).observe(outro);

// ---------- nav click -> scroll to stop ----------
function scrollToStop(stopNum){
  if(stopNum === 'outro'){
    const y = outro.getBoundingClientRect().top + window.scrollY;
    animateScrollTo(y, 700);
    return;
  }
  const stopIdx = Number(stopNum) - 1;
  let cum = 0;
  for(const seg of segments){
    if(seg.type === 'dwell' && seg.stop === stopIdx) break;
    cum += seg.vh;
  }
  const px = cum / 100 * window.innerHeight;
  const reelTop = reel.getBoundingClientRect().top + window.scrollY;
  animateScrollTo(reelTop + px, 700);
}
navLinks.forEach(a => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    scrollToStop(a.dataset.stop);
  });
});

// ---------- mobile menu ----------
burger.addEventListener('click', () => mobileMenu.classList.toggle('is-open'));
mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => mobileMenu.classList.remove('is-open'));
});

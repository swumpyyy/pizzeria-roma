// ───── Strati della pizza, dall'alto in basso ─────
// Gli strati sono ritagliati dalla foto della pizza: a offset 0 ricompongono la foto.
// Per cambiare le immagini basta toccare questo array (stessa tela per tutti: 1145 × 597).
// assembled / exploded: offset verticale in % dell'altezza dello strato (negativo = su).
// labelAt: dove sta l'ingrediente dentro la tela, se non è al centro (in % dell'altezza).
// Le etichette vanno a sinistra e a destra alternate.
const LAYERS = [
  { file: 'basilico.webp',    alt: 'Foglia di basilico', label: 'Basilico fresco',                          assembled: 0, exploded: -88, labelAt: -12 },
  { file: 'fiordilatte.webp', alt: 'Fior di latte fuso', label: 'Fior di latte di Agerola',                 assembled: 0, exploded: -21 },
  { file: 'salsa.webp',       alt: 'Salsa di pomodoro',  label: 'Salsa di pomodoro Datterino',              assembled: 0, exploded: 21 },
  { file: 'impasto.webp',     alt: 'Base di impasto',    label: 'Impasto alla romana, sottile e croccante', assembled: 0, exploded: 63 },
];

console.assert(
  LAYERS.every((l) => l.file && Number.isFinite(l.assembled) && Number.isFinite(l.exploded)),
  'LAYERS: ogni strato vuole file, assembled ed exploded'
);

let lenis = null;

// Strati ed etichette nascono dalla configurazione
const pizza = document.querySelector('.pizza');
const labelList = document.querySelector('.labels');
LAYERS.forEach((layer, i) => {
  const img = new Image();
  img.src = 'assets/' + layer.file;
  img.alt = layer.alt;
  img.className = 'layer';
  img.draggable = false;
  img.style.zIndex = LAYERS.length - i;
  pizza.append(img);

  const li = document.createElement('li');
  li.className = 'label ' + (i % 2 ? 'label--r' : 'label--l');
  li.textContent = layer.label;
  labelList.append(li);
});

// ───── Schede del menu ─────
const groups = document.querySelectorAll('.menu__group');
const tabs = document.querySelectorAll('.tabs button');
function showTab(id) {
  groups.forEach((g) => (g.hidden = g.id !== id));
  tabs.forEach((b) => b.setAttribute('aria-pressed', b.dataset.tab === id));
}
tabs.forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
showTab('cucina');

// ───── Link interni ─────
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  const target = link && document.querySelector(link.getAttribute('href'));
  if (!target) return;
  if (link.dataset.tab) showTab(link.dataset.tab);
  if (!lenis) return; // senza scroll fluido ci pensa il browser
  e.preventDefault();
  lenis.scrollTo(target, { offset: target.id === 'top' ? 0 : -72 });
  target.tabIndex = -1;
  target.focus({ preventScroll: true });
});

// ───── Animazione ─────
// Una sola timeline lunga 100: le posizioni sono percentuali di scroll.
function buildTimeline(root, mobile) {
  const q = gsap.utils.selector(root);
  const spread = mobile ? 1.45 : 1; // su mobile c'è più spazio in verticale
  const open = (i) => LAYERS[i].exploded * spread;
  const shut = (i) => LAYERS[i].assembled;
  // posizione in % dello schermo, quindi regge il resize senza ricalcoli
  const pos = mobile
    ? { hero: { xPercent: 0, yPercent: 10, scale: 1.45 }, open: { yPercent: 3, scale: 1 }, end: { xPercent: 0, yPercent: -22, scale: 1.35 } }
    : { hero: { xPercent: 0, yPercent: 18, scale: 1.15 }, open: { yPercent: 3, scale: 1 }, end: { xPercent: 19, yPercent: 0, scale: 1 } };
  // ombra che ogni strato sollevato lascia su quello sotto; a pizza chiusa è nulla e resta la foto
  const flat = 'drop-shadow(0px 0px 0px rgba(0,0,0,0))';
  const lifted = `drop-shadow(0px ${mobile ? 12 : 22}px ${mobile ? 9 : 16}px rgba(0,0,0,0.55))`;
  const hidden = { opacity: 0, filter: 'blur(10px)' };
  const dim = { opacity: 0, scale: 0.8, filter: 'blur(14px) brightness(0.3)' };

  // Stato 1
  gsap.set(q('.pizza-pos'), pos.hero);
  gsap.set(q('.layer'), { yPercent: shut, filter: flat });
  gsap.set(q('.hero-copy, .scroll-cue'), { filter: 'brightness(1)' });
  gsap.set(q('.label'), { ...hidden, '--o': (i) => (open(i) + (LAYERS[i].labelAt || 0)) / 100, x: (i) => (i % 2 ? 24 : -24) });
  gsap.set(q('.deco'), dim);
  gsap.set(q('.offer'), { opacity: 0, pointerEvents: 'none', x: mobile ? 0 : -40, y: mobile ? 30 : 0 });

  return gsap.timeline({ paused: true, defaults: { ease: 'power2.inOut' } })
    // 1 → 2 (0–40)
    .to(q('.hero-copy, .scroll-cue'), { opacity: 0, y: -50, filter: 'brightness(0.3)', duration: 16, ease: 'power1.in' }, 0)
    .to(q('.pizza-pos'), { ...pos.open, duration: 34 }, 0)
    .to(q('.layer'), { yPercent: open, filter: lifted, duration: 26, stagger: 1.4 }, 6)
    .to(q('.pizza__floor'), { yPercent: open(LAYERS.length - 1) + 18, opacity: 0.55, duration: 33 }, 6)
    .to(q('.deco'), { opacity: 1, scale: 1, filter: 'blur(0px) brightness(1)', duration: 14, stagger: 2.5, ease: 'power1.out' }, 14)
    .to(q('.label'), { opacity: 1, x: 0, filter: 'blur(0px)', duration: 10, stagger: 1.6, ease: 'power1.out' }, 21)
    // 2 (40–55): tutto fermo
    // 2 → 3 (55–100)
    .to(q('.label'), { ...hidden, duration: 8, stagger: 0.6, ease: 'power1.in' }, 55)
    .to(q('.deco'), { ...dim, duration: 10, stagger: 1, ease: 'power1.in' }, 55)
    .to(q('.layer'), { yPercent: shut, filter: flat, duration: 24, stagger: { each: 1.2, from: 'end' } }, 57)
    .to(q('.pizza__floor'), { yPercent: 0, opacity: 1, duration: 28 }, 57)
    .to(q('.pizza-pos'), { ...pos.end, duration: 32 }, 60)
    .set(q('.offer'), { pointerEvents: 'auto' }, 80)
    .to(q('.offer'), { opacity: 1, x: 0, y: 0, duration: 16, ease: 'power2.out' }, 80)
    .to({}, { duration: 4 }); // coda: lo stato 3 resta fermo fino al 100%
}

function init() {
  gsap.registerPlugin(ScrollTrigger);
  const scene = document.querySelector('.scene');
  const stage = scene.querySelector('.stage');
  const BLOCKS = ['.hero-copy', '.labels', '.offer']; // il testo dei tre stati

  gsap.matchMedia().add(
    { mobile: '(max-width: 768px)', desktop: '(min-width: 769px)', reduce: '(prefers-reduced-motion: reduce)' },
    (ctx) => {
      const { mobile, reduce } = ctx.conditions;

      if (reduce) {
        // Niente pin né scrub: i tre stati come sezioni statiche una sotto l'altra
        const stages = [stage, stage.cloneNode(true), stage.cloneNode(true)];
        scene.append(stages[1], stages[2]);
        stages.forEach((s, i) => {
          buildTimeline(s, mobile).progress([0, 0.475, 1][i]);
          // in ogni sezione resta leggibile solo il testo del suo stato
          BLOCKS.forEach((sel, j) => (s.querySelector(sel).inert = i !== j));
        });
        return () => {
          stages[1].remove();
          stages[2].remove();
          BLOCKS.forEach((sel) => (stage.querySelector(sel).inert = false));
        };
      }

      scene.classList.add('is-pinned');
      lenis = new Lenis();
      lenis.on('scroll', ScrollTrigger.update);
      const raf = (time) => lenis.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);

      ScrollTrigger.create({
        animation: buildTimeline(stage, mobile),
        trigger: scene,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
      });

      // Leggero movimento flottante delle decorazioni, indipendente dallo scroll
      stage.querySelectorAll('.deco img').forEach((img, i) =>
        gsap.to(img, { y: 14, rotation: i % 2 ? -6 : 6, duration: 3 + i * 0.7, ease: 'sine.inOut', yoyo: true, repeat: -1 })
      );

      // Da tastiera i bottoni dello stato 3 si raggiungono anche dall'hero: li portiamo in vista
      const offer = stage.querySelector('.offer');
      const reveal = () => lenis.scrollTo(scene.offsetTop + scene.offsetHeight - innerHeight);
      offer.addEventListener('focusin', reveal);

      return () => {
        offer.removeEventListener('focusin', reveal);
        gsap.ticker.remove(raf);
        lenis.destroy();
        lenis = null;
        scene.classList.remove('is-pinned');
      };
    }
  );
}

// Se le librerie dal CDN non arrivano resta l'hero statico e il resto della pagina funziona
if (window.gsap && window.ScrollTrigger && window.Lenis) init();

// Halcyon — entry
import { initScroll, initMotion, heroIntro, reduced, vessel } from './motion.js';
import { initPress, initCursor, burst } from './press.js';
import { loader, initPolish } from './polish.js';

const lenis = initScroll();
lenis.stop(); scrollTo(0, 0);
initMotion();
initPolish();
const cursor = initCursor();
initPress();

// the 3D craft is the opening view now, so its NASA models load during the loader
const craft = import('./vessel.js').then(m => m.initVessel(document.querySelector('.vessel__canvas'), vessel, { reduced }));
const craftReady = craft.then(c => c.loaded);

// the planets load in idle time after the intro (or right away if they come into range first)
const dest = document.querySelector('.destinations');
let planets = null;
const loadPlanets = () => planets ??= import('./spheres.js').then(m => m.initSpheres(dest.querySelector('.spheres'),
  { reduced, onLabel: (t, on) => cursor.label(t, on), onBurst: (x, y, p) => burst(x, y, p, '159,198,255') }));
const idle = window.requestIdleCallback || (f => setTimeout(f, 200));
new IntersectionObserver(([e], io) => { if (e.isIntersecting) { io.disconnect(); loadPlanets(); } }, { rootMargin: '300% 0px' }).observe(dest);

// decode the journey photos before the sideways gallery starts
new IntersectionObserver(([e], io) => {
  if (!e.isIntersecting) return; io.disconnect();
  document.querySelectorAll('.journey img, .departure img').forEach(img => { img.loading = 'eager'; img.decode?.().catch(() => {}); });
}, { rootMargin: '150% 0px' }).observe(document.querySelector('.departure'));

loader([craftReady]).then(() => { heroIntro().eventCallback('onComplete', () => idle(loadPlanets, { timeout: 1500 })); lenis.start(); });

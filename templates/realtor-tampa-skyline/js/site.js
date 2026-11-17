/* Altura: page-specific motion. Loaded before core.js, which calls SITE.motion once GSAP is ready. */
window.SITE = Object.assign(window.SITE || {}, {
  cardStyle: 'glass',
  navSolidAt: 60,
  motion({ gsap, ScrollTrigger, $, $$ }) {
    const hero = $('[data-hero]');
    if (hero) {
      gsap.from('.hero__eyebrow, .hero__lede, .hero__actions, .hud', { y: 24, autoAlpha: 0, duration: 1.4, ease: 'expo.out', stagger: .08, delay: .35 });
      gsap.to('.hero__copy', { y: -60, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '32% top', scrub: true } });
      gsap.to('.hero__cue', { autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '8% top', scrub: true } });
      gsap.fromTo('.hero__grid-copy', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, ease: 'none', scrollTrigger: { trigger: hero, start: '48% top', end: '68% top', scrub: true } });
      gsap.to('.hud', { autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: hero, start: '40% top', end: '55% top', scrub: true } });
      gsap.to('.hero__veil', { opacity: 1, ease: 'none', scrollTrigger: { trigger: hero, start: '45% top', end: '70% top', scrub: true } });
    }
    // marquee driven by scroll
    const mq = $('.marquee__track');
    if (mq) gsap.fromTo(mq, { xPercent: 0 }, { xPercent: -50, ease: 'none', scrollTrigger: { trigger: '.marquee', start: 'top bottom', end: 'bottom top', scrub: .6 } });

    // neighborhoods: a photo that follows the pointer over the list (fine pointers only)
    const list = $('[data-hoods]'), float = $('.hoods__float'), fimg = float && float.querySelector('img');
    if (list && float && matchMedia('(pointer: fine) and (min-width: 1000px)').matches) {
      const xTo = gsap.quickTo(float, 'x', { duration: .7, ease: 'expo.out' });
      const yTo = gsap.quickTo(float, 'y', { duration: .7, ease: 'expo.out' });
      list.addEventListener('pointermove', e => { const r = list.getBoundingClientRect(); xTo(e.clientX - r.left); yTo(e.clientY - r.top); });
      $$('.hood', list).forEach(li => li.addEventListener('pointerenter', () => {
        if (fimg.getAttribute('src') !== li.dataset.img) fimg.src = li.dataset.img;
        gsap.to(float, { autoAlpha: 1, scale: 1, duration: .5, ease: 'expo.out' });
      }));
      list.addEventListener('pointerleave', () => gsap.to(float, { autoAlpha: 0, scale: .85, duration: .4 }));
    }
    $$('.hood').forEach((li, i) => gsap.fromTo(li, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'expo.out', delay: i * .05, scrollTrigger: { trigger: li, start: 'top 92%', once: true } }));
  }
});

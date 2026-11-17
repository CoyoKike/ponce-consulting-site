/* Miami: page-specific motion. Loaded before core.js, which calls SITE.motion once GSAP is ready. */
window.SITE = Object.assign(window.SITE || {}, {
  cardStyle: 'editorial',
  get navSolidAt() { const h = document.querySelector('[data-hero]'); return h ? h.offsetHeight - innerHeight * 1.1 : 120; },
  motion({ gsap, ScrollTrigger, $, $$ }) {
    // hero copy drifts up and fades as the evening comes in
    const hero = $('[data-hero]');
    if (hero) {
      gsap.to('.hero__copy', { yPercent: -18, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '45% top', scrub: true } });
      gsap.to('.hero__cue', { autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '10% top', scrub: true } });
      gsap.fromTo('.hud__bar i', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom bottom', scrub: true } });
      gsap.from('.hero__eyebrow, .hero__lede, .hero__actions, .hero__hud', { y: 30, autoAlpha: 0, duration: 1.6, ease: 'expo.out', stagger: .08, delay: .3 });
    }
    // waterfronts: a horizontal run on wide screens
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1000px)', () => {
      const track = $('.waters__track');
      const pin = $('.waters__pin');
      const dist = () => Math.max(0, track.scrollWidth + track.offsetLeft - innerWidth + 64);
      const tw = gsap.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 } });
      $$('.water figure img').forEach(img => gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: img.closest('.water'), containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } }));
      return () => tw.kill();
    });
  }
});

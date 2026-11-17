/* Casa Montalvo: page motion. Loaded before core.js, which calls SITE.motion once GSAP is ready. */
window.SITE = Object.assign(window.SITE || {}, {
  cardStyle: 'warm',
  navSolidAt: 80,
  motion({ gsap, $, $$ }) {
    const hero = $('[data-hero]');
    if (hero) {
      gsap.to('.hero__copy', { yPercent: -14, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: hero, start: '8% top', end: '40% top', scrub: true } });
      gsap.to('.openhouse', { y: 40, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: hero, start: '10% top', end: '35% top', scrub: true } });
      gsap.to('.hero__cue', { autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '8% top', scrub: true } });
      gsap.to('.hero__wash', { autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: hero, start: '10% top', end: '40% top', scrub: true } });
      gsap.from('.hero__copy .kicker, .hero__lede, .hero__actions, .openhouse', { y: 28, autoAlpha: 0, duration: 1.5, ease: 'expo.out', stagger: .09, delay: .35 });
    }
    // neighborhood cards: image eases in from a soft round mask
    $$('.hood figure').forEach(f => gsap.fromTo(f, { clipPath: 'inset(10% 10% 10% 10% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 18px)', ease: 'none', scrollTrigger: { trigger: f, start: 'top 95%', end: 'top 50%', scrub: true } }));
  }
});

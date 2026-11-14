/* Mouse-reactive sphere field on a canvas.
   Each sphere springs back to a home point; the pointer pushes it away,
   neighbours collide, fast spheres squash along their direction of travel. */
(function () {
  const DPR = Math.min(window.devicePixelRatio || 1, 1.75);
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Pre-rendered sprites so each frame is just drawImage calls.
  function sprite(kind) {
    const S = 256, c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d'), r = S / 2;
    if (kind === 'bubble') {
      let gr = g.createRadialGradient(r, r, r * .55, r, r, r);
      gr.addColorStop(0, 'rgba(160,215,235,0.02)');
      gr.addColorStop(.82, 'rgba(170,225,245,0.10)');
      gr.addColorStop(.96, 'rgba(225,245,255,0.55)');
      gr.addColorStop(1, 'rgba(225,245,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(r, r, r, 0, 7); g.fill();
      gr = g.createRadialGradient(r * .62, r * .5, 0, r * .62, r * .5, r * .32);
      gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.ellipse(r * .62, r * .5, r * .3, r * .2, -.6, 0, 7); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 3;
      g.beginPath(); g.arc(r, r, r * .8, .5, 1.6); g.stroke();
    } else {
      const accent = kind === 'pearl-accent';
      let gr = g.createRadialGradient(r * .7, r * .6, r * .05, r, r, r);
      if (accent) {
        gr.addColorStop(0, '#ffd0b8'); gr.addColorStop(.25, '#f58a5c'); gr.addColorStop(.7, '#b8441d'); gr.addColorStop(1, '#3a1206');
      } else {
        gr.addColorStop(0, '#dce9ee'); gr.addColorStop(.22, '#7fa2b1'); gr.addColorStop(.65, '#1d3a48'); gr.addColorStop(1, '#07141b');
      }
      g.fillStyle = gr; g.beginPath(); g.arc(r, r, r - 1, 0, 7); g.fill();
      gr = g.createRadialGradient(r, r * 1.55, r * .2, r, r * 1.3, r * .9);
      gr.addColorStop(0, accent ? 'rgba(255,170,120,0.35)' : 'rgba(120,200,230,0.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(r, r, r - 1, 0, 7); g.fill();
      gr = g.createRadialGradient(r * .66, r * .52, 0, r * .66, r * .52, r * .22);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(r * .66, r * .52, r * .22, 0, 7); g.fill();
    }
    return c;
  }
  const SPR = {};
  const getSprite = k => SPR[k] || (SPR[k] = sprite(k));

  class SphereField {
    constructor(canvas, opts) {
      this.c = canvas; this.g = canvas.getContext('2d');
      this.o = Object.assign({ style: 'bubble', layout: 'cluster', density: 1, rise: 0, accentEvery: 0 }, opts);
      this.host = this.o.host || canvas.parentElement;
      this.m = { x: -9999, y: -9999, vx: 0, vy: 0, on: false };
      this.squeeze = 0;            // 0..1, pulls spheres to a point and shrinks them
      this.squeezeAt = { x: .5, y: .5 };
      this.shrink = 1;             // radius multiplier (bubbles compressed by water pressure)
      this.visible = false; this.t = 0;
      this.resize(); this.build();
      addEventListener('resize', () => { this.resize(); this.build(); if (REDUCED) this.draw(); });
      this.host.addEventListener('pointermove', e => this.move(e));
      this.host.addEventListener('pointerleave', () => { this.m.on = false; this.m.x = this.m.y = -9999; });
      new IntersectionObserver(es => {
        this.visible = es[0].isIntersecting;
        if (this.visible && !this.raf && !REDUCED) this.loop();
      }).observe(canvas);
      if (REDUCED) this.draw();
    }
    resize() {
      const r = this.c.getBoundingClientRect();
      this.W = r.width; this.H = r.height;
      this.c.width = Math.round(this.W * DPR); this.c.height = Math.round(this.H * DPR);
    }
    build() {
      const { W, H } = this, o = this.o, s = [];
      const unit = Math.min(W, H);
      if (o.layout === 'cluster') {
        // loose column of bubbles on the right side of the hero
        const n = W < 700 ? 9 : 16;
        for (let i = 0; i < n; i++) {
          const r = unit * (0.018 + Math.pow(Math.random(), 2.2) * 0.085);
          s.push(this.make(W * (0.56 + Math.random() * 0.36), H * Math.random(), r, i));
        }
      } else {
        // fill: scattered over the whole section, no overlaps at start
        const target = Math.min(90, Math.round((W * H * (1 - (o.xMin || 0))) / 21000 * o.density));
        let tries = 0;
        while (s.length < target && tries++ < target * 40) {
          const r = unit * (0.014 + Math.pow(Math.random(), 1.8) * 0.06);
          const x0 = (o.xMin || 0) * W, x = x0 + r + Math.random() * (W - x0 - 2 * r), y = r + Math.random() * (H - 2 * r);
          if (s.every(q => Math.hypot(q.hx - x, q.hy - y) > q.r + r + 6)) s.push(this.make(x, y, r, s.length));
        }
      }
      this.s = s;
    }
    make(x, y, r, i) {
      const accent = this.o.accentEvery && i % this.o.accentEvery === 0;
      return { hx: x, hy: y, x, y, vx: 0, vy: 0, r, r0: r, ph: Math.random() * 6.28,
        spr: this.o.style === 'bubble' ? 'bubble' : (accent ? 'pearl-accent' : 'pearl') };
    }
    move(e) {
      const b = this.c.getBoundingClientRect();
      const x = e.clientX - b.left, y = e.clientY - b.top;
      if (this.m.on) { this.m.vx = x - this.m.x; this.m.vy = y - this.m.y; }
      this.m.x = x; this.m.y = y; this.m.on = true;
    }
    // radial kick from a point in canvas coordinates
    impulse(x, y, power) {
      for (const p of this.s) {
        const dx = p.x - x, dy = p.y - y, d = Math.hypot(dx, dy) || 1;
        const f = power * Math.max(0, 1 - d / (Math.max(this.W, this.H) * .9));
        p.vx += dx / d * f; p.vy += dy / d * f;
      }
    }
    // upward push, stronger for bubbles near (x, y)
    lift(x, y, power) {
      for (const p of this.s) {
        const d = Math.hypot(p.x - x, p.y - y), f = power * (.35 + .65 * Math.max(0, 1 - d / Math.max(this.W, this.H)));
        p.vy -= f * (.6 + Math.random() * .8); p.vx += (p.x - x) / (d || 1) * f * .25;
      }
    }
    step() {
      const { s, m } = this, W = this.W, H = this.H;
      this.t += 1 / 60;
      const R = Math.min(W, H) * .14;               // pointer influence radius
      const cx = this.squeezeAt.x * W, cy = this.squeezeAt.y * H, q = this.squeeze;
      for (const p of s) {
        if (this.o.rise) {                         // bubbles drift upward and wrap
          p.hy -= this.o.rise * (0.4 + p.r0 * this.shrink / 60);
          if (p.hy < -p.r0 * 2) { p.hy = H + p.r0 * 2; p.y = p.hy; p.x = p.hx; p.vx = p.vy = 0; }
        }
        const bob = Math.sin(this.t * .8 + p.ph) * p.r0 * .25;
        const tx = p.hx + (cx - p.hx) * q * .55;
        const ty = p.hy + bob + (cy - p.hy) * q * .55;
        p.r = p.r0 * (1 - q * .38) * this.shrink;
        p.vx += (tx - p.x) * .012; p.vy += (ty - p.y) * .012;
        if (m.on) {
          const dx = p.x - m.x, dy = p.y - m.y, d = Math.hypot(dx, dy) || 1, reach = R + p.r;
          if (d < reach) {
            const k = 1 - d / reach;
            p.vx += dx / d * k * 2.6 + m.vx * k * .18;
            p.vy += dy / d * k * 2.6 + m.vy * k * .18;
          }
        }
      }
      // sphere-sphere collisions
      for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) {
        const a = s[i], b = s[j], dx = b.x - a.x, dy = b.y - a.y, min = a.r + b.r;
        if (Math.abs(dx) > min || Math.abs(dy) > min) continue;
        const d = Math.hypot(dx, dy) || .01;
        if (d < min) {
          const nx = dx / d, ny = dy / d, ov = (min - d) / 2;
          const wa = b.r / min, wb = a.r / min;      // small spheres move more
          a.x -= nx * ov * wa * 2; a.y -= ny * ov * wa * 2; b.x += nx * ov * wb * 2; b.y += ny * ov * wb * 2;
          const rv = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (rv < 0) { const imp = rv * .9; a.vx += nx * imp * wa; a.vy += ny * imp * wa; b.vx -= nx * imp * wb; b.vy -= ny * imp * wb; }
        }
      }
      for (const p of s) { p.vx *= .9; p.vy *= .9; p.x += p.vx; p.y += p.vy; }
      m.vx *= .5; m.vy *= .5;
    }
    draw() {
      const g = this.g;
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
      g.clearRect(0, 0, this.W, this.H);
      for (const p of this.s) {
        const sp = Math.hypot(p.vx, p.vy), st = Math.min(sp / 40, .28);
        g.save(); g.translate(p.x, p.y);
        if (st > .01) { g.rotate(Math.atan2(p.vy, p.vx)); g.scale(1 + st, 1 - st * .8); g.rotate(-Math.atan2(p.vy, p.vx)); }
        g.drawImage(getSprite(p.spr), -p.r, -p.r, p.r * 2, p.r * 2);
        g.restore();
      }
    }
    loop() {
      if (!this.visible) { this.raf = 0; return; }
      this.step(); this.draw();
      this.raf = requestAnimationFrame(() => this.loop());
    }
  }
  window.SphereField = SphereField;
})();

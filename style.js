(() => {
  const canvas = document.getElementById("stage"),
        ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;

  let W, H, running = false;
  let fireworks = [], sparks = [], diyas = [];
  let score = 0, timeLeft = 20, lastLaunch = 0;

  const bestKey = "diwali_best_score_v3";

  const scoreEl = document.getElementById("score"),
        timeEl = document.getElementById("time"),
        bestEl = document.getElementById("best"),
        btnStart = document.getElementById("btnStart"),
        btnPlay = document.getElementById("btnPlay"),
        btnReset = document.getElementById("btnReset"),
        btnShare = document.getElementById("btnShare"),
        cta = document.getElementById("cta");

  const rand = (a, b) => Math.random() * (b - a) + a;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));

  function resize() {
    W = innerWidth;
    H = innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener("resize", resize);

  /* ---------------- Fireworks ---------------- */
  class Firework {
    constructor(x, y, tx, ty, color) {
      this.x = x;
      this.y = y;
      this.tx = tx;
      this.ty = ty;
      this.color = color;
      this.speed = rand(2.2, 3.2);
      this.angle = Math.atan2(ty - y, tx - x);
      this.vx = Math.cos(this.angle) * this.speed;
      this.vy = Math.sin(this.angle) * this.speed;
      this.life = 1;
    }

    update(dt) {
      this.x += this.vx * dt * 60;
      this.y += this.vy * dt * 60;
      this.vy += 0.012 * dt * 60;

      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - this.vx * 2, this.y - this.vy * 2);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";

      if (Math.hypot(this.tx - this.x, this.ty - this.y) < 10 || this.y < H * 0.15) {
        explode(this.x, this.y, this.color);
        this.life = 0;
        addScore(5);
      }

      return this.life > 0;
    }
  }

  /* ---------------- Explosions ---------------- */
  function explode(x, y, color) {
    const count = Math.floor(rand(30, 60));
    for (let i = 0; i < count; i++) {
      const a = Math.PI * 2 * (i / count) + rand(-0.15, 0.15);
      const s = rand(1.5, 3.6);
      sparks.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 1,
        color
      });
    }

    ctx.save();
    ctx.fillStyle = "rgba(255, 200, 100, 0.15)";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawSpark(s, dt) {
    s.x += s.vx * dt * 60;
    s.y += s.vy * dt * 60;
    s.vy += 0.02 * dt * 60;
    s.life -= 0.012 * dt * 60;

    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    return s.life > 0;
  }

  /* ---------------- Bombs & Diyas ---------------- */
  function spawnDiya() {
    const x = rand(36, W - 36),
          y = rand(H * 0.35, H * 0.8),
          type = Math.random() < 0.3 ? "diya" : "bomb";
    diyas.push({ x, y, type, r: 20, life: 1, flicker: rand(0, Math.PI * 2) });
  }

  // 💣 and 🪔 drawing with ambient halo glow
  function drawDiya(d, dt) {
    d.flicker += dt * 6;
    const glow = (Math.sin(d.flicker) * 0.5 + 0.5) * 0.35 + 0.65;

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // ✨ Ambient halo behind each item for better visibility
    ctx.beginPath();
    ctx.arc(d.x, d.y, 28, 0, Math.PI * 2);
    ctx.fillStyle = d.type === "bomb"
      ? "rgba(255, 120, 30, 0.25)"   // warm orange halo for bombs
      : "rgba(255, 180, 80, 0.25)";  // golden halo for diyas
    ctx.fill();

    // Emoji glow and flicker
    ctx.font = "30px Poppins, system-ui";
    ctx.shadowColor = d.type === "bomb"
      ? `rgba(255, 140, 40, ${glow})`
      : `rgba(255, 200, 80, ${glow})`;
    ctx.shadowBlur = 16 * glow;
    ctx.fillText(d.type === "bomb" ? "💣" : "🪔", d.x, d.y);

    ctx.restore();
    return d.life > 0;
  }

  /* ---------------- Gameplay Logic ---------------- */
  function addScore(n) {
    score += n;
    scoreEl.textContent = score;

    const best = Number(localStorage.getItem(bestKey) || 0);
    if (score > best) {
      localStorage.setItem(bestKey, String(score));
      bestEl.textContent = score;
    }
  }

  function launch(x, y) {
    const hue = Math.floor(rand(25, 45));
    const color = `hsl(${hue} 100% 65%)`;
    const sx = rand(W * 0.2, W * 0.8),
          sy = H + 20;
    fireworks.push(new Firework(sx, sy, x, y, color));
  }

  function pointer(e) {
    const r = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;

    // handle bomb/diya clicks
    for (let i = diyas.length - 1; i >= 0; i--) {
      const d = diyas[i];
      if (Math.hypot(d.x - x, d.y - y) <= 26) {
        diyas.splice(i, 1);
        if (d.type === "diya") {
          addScore(10);
          explode(x, y, "hsl(40 100% 70%)");
        } else {
          addScore(5);
          explode(x, y, "hsl(35 100% 60%)");
        }
        return;
      }
    }

    launch(x, y);
  }

  canvas.addEventListener("pointerdown", pointer, { passive: true });
  canvas.addEventListener("touchstart", pointer, { passive: true });

  /* ---------------- Animation Loop ---------------- */
  let last = performance.now();

  function frame(now) {
    const dt = clamp((now - last) / 1000, 0, 0.033);
    last = now;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255, 190, 70, 0.05)";
    ctx.fillRect(0, 0, W, H);

    if (running && now - lastLaunch > 550) {
      lastLaunch = now;
      launch(rand(W * 0.15, W * 0.85), rand(H * 0.2, H * 0.45));
      if (Math.random() < 0.35 && diyas.length < 6) spawnDiya();
    }

    fireworks = fireworks.filter(f => f.update(dt));
    sparks = sparks.filter(s => drawSpark(s, dt));
    diyas = diyas.filter(d => drawDiya(d, dt));

    requestAnimationFrame(frame);
  }

  /* ---------------- Game Control ---------------- */
  function start() {
    if (running) return;
    running = true;
    score = 0;
    timeLeft = 20;
    scoreEl.textContent = 0;
    timeEl.textContent = 20;
    cta.classList.add("hidden");
    lastLaunch = performance.now();
  }

  function reset() {
    running = false;
    fireworks = [];
    sparks = [];
    diyas = [];
    score = 0;
    timeLeft = 20;
    scoreEl.textContent = "0";
    timeEl.textContent = "20";
    cta.classList.remove("hidden");
  }

  /* ---------------- Timer & Finale ---------------- */
  setInterval(() => {
    if (!running) return;
    timeLeft--;
    timeEl.textContent = timeLeft;

    if (timeLeft <= 0) {
      running = false;

      for (let i = 0; i < 8; i++) {
        setTimeout(() => launch(rand(80, W - 80), rand(H * 0.2, H * 0.45)), i * 120);
      }

      setTimeout(() => {
        const cx = W / 2, cy = H / 2;
        let glow = 0;

        const glowAnim = () => {
          ctx.save();
          ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
          ctx.fillRect(0, 0, W, H);

          ctx.font = "90px Poppins, system-ui";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.shadowColor = `rgba(255, 200, 80, ${Math.sin(glow) * 0.5 + 0.5})`;
          ctx.shadowBlur = 40;
          ctx.fillText("🪔", cx, cy);

          ctx.restore();
          glow += 0.1;

          if (glow < Math.PI * 4) {
            requestAnimationFrame(glowAnim);
          } else {
            ctx.save();
            ctx.font = "42px Poppins, system-ui";
            ctx.textAlign = "center";
            ctx.fillStyle = "#ffd56a";
            ctx.shadowColor = "#ffb347";
            ctx.shadowBlur = 25;
            ctx.fillText("✨ Happy Diwali! ✨", cx, cy + 100);
            ctx.restore();
          }
        };

        glowAnim();
      }, 1500);

      setTimeout(() => {
        cta.classList.remove("hidden");
        cta.querySelector("h2").textContent = `Time's up! 🎉 Score: ${score}`;
      }, 2500);
    }
  }, 1000);

  /* ---------------- Buttons ---------------- */
  btnStart.onclick = start;
  btnPlay.onclick = start;
  btnReset.onclick = reset;

  btnShare.onclick = async () => {
    const url = location.href;
    const text = `Happy Diwali! 🪔 I scored ${score}! Play here: ${url}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "Diwali Fireworks", text, url });
      } catch { }
    } else {
      await navigator.clipboard.writeText(text);
      btnShare.textContent = "Copied!";
      setTimeout(() => (btnShare.textContent = "Share"), 1200);
    }
  };

  bestEl.textContent = localStorage.getItem(bestKey) || "0";
  frame(performance.now());
})();

/* ── Scroll reveal ── */
const revealTargets = [
  ...document.querySelectorAll(
    ".section-heading, .card, .feature-card, .video-row, .profile-fig, .profile-text, .kw, .link-card"
  ),
];

revealTargets.forEach((el, i) => {
  el.classList.add("reveal");
  el.style.transitionDelay = `${Math.min(i % 6, 5) * 65}ms`;
});

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!prefersReduced && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealTargets.forEach((el) => observer.observe(el));
} else {
  revealTargets.forEach((el) => el.classList.add("is-visible"));
}

/* ── Lite YouTube embed ── */
const mainEmbed = document.querySelector(".feature-embed[data-vid]");
const mainTitle = document.querySelector(".feature-card-body h3");
const mainDesc  = document.querySelector(".feature-card-body p");
let isPlaying   = false;

function loadMainPlayer(vid, title, desc, autoplay = false) {
  if (autoplay || isPlaying) {
    // すでに再生中 or クリックで再生 → iframeに差し替え
    const iframe = document.createElement("iframe");
    iframe.src = `https://www.youtube.com/embed/${vid}?autoplay=1`;
    iframe.title = title;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    mainEmbed.innerHTML = "";
    mainEmbed.appendChild(iframe);
    isPlaying = true;
  } else {
    // サムネ差し替えのみ
    mainEmbed.dataset.vid = vid;
    const thumb = mainEmbed.querySelector(".embed-thumb");
    if (thumb) {
      thumb.src = `https://i.ytimg.com/vi/${vid}/maxresdefault.jpg`;
      thumb.onerror = () => { thumb.src = `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`; };
      thumb.alt = title;
    }
  }
  if (mainTitle) mainTitle.textContent = title;
  if (mainDesc)  mainDesc.textContent  = desc;
}

// メインプレーヤーをクリックで再生
mainEmbed?.addEventListener("click", () => {
  const vid   = mainEmbed.dataset.vid;
  const title = mainEmbed.querySelector(".embed-thumb")?.alt ?? "";
  loadMainPlayer(vid, title, mainDesc?.textContent ?? "", true);
}, { once: false });

// 右カードをクリックでメインに反映
document.querySelectorAll(".video-row[data-vid]").forEach((row) => {
  row.addEventListener("click", (e) => {
    e.preventDefault();
    const { vid, title, desc } = row.dataset;
    loadMainPlayer(vid, title, desc);
    // アクティブスタイル
    document.querySelectorAll(".video-row").forEach((r) => r.classList.remove("is-active"));
    row.classList.add("is-active");
    // スクロールしてメインを見せる
    mainEmbed?.closest(".feature-card")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
});

/* ── Hover sparks ── */
const sparkSymbols = ["♪", "♬", "♫", "♩", "✦", "★"];

function createSpark(event) {
  if (prefersReduced) return;
  const spark = document.createElement("span");
  spark.className = "note-spark";
  spark.textContent = sparkSymbols[Math.floor(Math.random() * sparkSymbols.length)];
  spark.style.left = `${event.clientX}px`;
  spark.style.top = `${event.clientY}px`;
  document.body.append(spark);
  setTimeout(() => spark.remove(), 820);
}

document.querySelectorAll(".btn-primary, .btn-secondary, .link-card, .video-row, .feature-card").forEach((el) => {
  el.addEventListener("pointerenter", createSpark);
  el.addEventListener("pointermove", (e) => {
    if (Math.random() < 0.03) createSpark(e);
  });
});

/* ── Background particle canvas ── */
if (!prefersReduced) {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;";
  document.body.prepend(canvas);

  const ctx = canvas.getContext("2d");
  const SYMBOLS = ["♪", "♬", "♫", "♩", "✦"];
  const COLORS = [
    "rgba(96,144,216,",
    "rgba(255,96,184,",
    "rgba(255,211,107,",
    "rgba(120,96,72,",
    "rgba(160,200,255,",
  ];
  const COUNT = 28;

  /* ── スクロール速度トラッキング ── */
  let scrollVelocity = 0;   // 正=下スクロール 負=上スクロール
  let lastScrollY = window.scrollY;
  let lastScrollTime = performance.now();

  window.addEventListener("scroll", () => {
    const now = performance.now();
    const dy  = window.scrollY - lastScrollY;
    const dt  = Math.max(now - lastScrollTime, 1);
    // px/ms → 扱いやすいスケールに圧縮
    scrollVelocity = dy / dt * 12;
    lastScrollY    = window.scrollY;
    lastScrollTime = now;
  }, { passive: true });

  // 毎フレーム減衰させる
  function decayScroll() {
    scrollVelocity *= 0.88;
  }

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  function rand(min, max) { return min + Math.random() * (max - min); }

  class Particle {
    constructor(fromBottom = false) {
      this.reset(fromBottom);
    }

    reset(fromBottom = true) {
      this.x          = rand(0, canvas.width);
      this.y          = fromBottom ? canvas.height + rand(10, 60) : rand(-60, canvas.height);
      this.symbol     = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      this.color      = COLORS[Math.floor(Math.random() * COLORS.length)];
      this.size       = rand(13, 26);
      this.baseSpeedY = rand(0.35, 0.9);
      this.speedX     = rand(-0.4, 0.4);
      this.alpha      = rand(0.18, 0.52);
      this.alphaDir   = Math.random() < 0.5 ? 1 : -1;
      this.alphaSpeed = rand(0.003, 0.008);
      this.rot        = rand(-0.4, 0.4);
      this.rotSpeed   = rand(-0.008, 0.008);
      this.wobble     = rand(0, Math.PI * 2);
      this.wobbleSpeed= rand(0.01, 0.025);
      // スクロール感度（粒ごとにばらつかせる）
      this.scrollFactor = rand(0.06, 0.18);
    }

    update(scrollV) {
      // スクロール量をY移動に乗せる（下スクロールで加速、上で逆行）
      const effectiveSpeedY = this.baseSpeedY + scrollV * this.scrollFactor;
      this.y      -= effectiveSpeedY;
      this.wobble += this.wobbleSpeed;
      this.x      += this.speedX + Math.sin(this.wobble) * 0.5;
      // 速いスクロール時は回転も増す
      this.rot    += this.rotSpeed + scrollV * this.scrollFactor * 0.04;

      this.alpha  += this.alphaSpeed * this.alphaDir;
      if (this.alpha >= 0.52) { this.alpha = 0.52; this.alphaDir = -1; }
      if (this.alpha <= 0.10) { this.alpha = 0.10; this.alphaDir =  1; }

      // 上に抜けたらリセット、下スクロール中に早く消えた場合も補充
      if (this.y < -60) this.reset(true);
      if (this.y > canvas.height + 60) this.reset(false);
    }

    draw() {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.font = `${this.size}px sans-serif`;
      ctx.fillStyle = this.color + this.alpha + ")";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.symbol, 0, 0);
      ctx.restore();
    }
  }

  const particles = Array.from({ length: COUNT }, () => new Particle(false));

  function loop() {
    decayScroll();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.update(scrollVelocity);
      p.draw();
    }
    requestAnimationFrame(loop);
  }
  loop();
}

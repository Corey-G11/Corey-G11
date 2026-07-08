// Matrix-style "digital rain" background. Draws falling glyph columns with
// fading trails on a fixed canvas behind the page content. Theme-aware (reads
// the CSS variables), throttled to ~20fps, and disabled entirely when the
// user prefers reduced motion.
(function () {
  "use strict";

  const canvas = document.getElementById("rain");
  if (!canvas || typeof canvas.getContext !== "function") return;

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const GLYPHS =
    "アィウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワン" +
    "0123456789ABCDEF<>/{}[]()=+*#$_|;:";
  const FONT_SIZE = 16;
  const FRAME_MS = 50; // ~20fps — plenty for rain, cheap on the GPU

  let width = 0;
  let height = 0;
  let columns = 0;
  let drops = []; // per-column: current row position of the falling head
  let speeds = []; // per-column: rows advanced per frame (varied for depth)
  let theme = { bg: "#04080a", glyph: "#00e653", glyphAlpha: 0.5, fadeAlpha: 0.09 };
  let lastFrame = 0;
  let running = false;

  function readTheme() {
    const cs = getComputedStyle(document.documentElement);
    const light = document.documentElement.getAttribute("data-theme") === "light";
    theme = {
      bg: cs.getPropertyValue("--bg").trim() || (light ? "#eef4ee" : "#04080a"),
      glyph: cs.getPropertyValue("--accent").trim() || (light ? "#0a7d3a" : "#00e653"),
      // Light theme: barely-there ink rain so the "paper terminal" stays calm.
      glyphAlpha: light ? 0.14 : 0.35,
      fadeAlpha: light ? 0.16 : 0.09,
    };
    // Hard repaint so leftover trails from the old palette don't linger.
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);
  }

  function resize() {
    // Cap the backing-store scale: it's a dim background, crispness doesn't
    // matter, fill-rate does.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = FONT_SIZE + "px ui-monospace, Menlo, Consolas, monospace";

    columns = Math.ceil(width / FONT_SIZE);
    drops = new Array(columns);
    speeds = new Array(columns);
    for (let i = 0; i < columns; i++) {
      // Start each column at a random height so the screen fills organically.
      drops[i] = Math.floor(Math.random() * (height / FONT_SIZE));
      speeds[i] = 0.5 + Math.random() * 0.75;
    }
    readTheme();
  }

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    if (now - lastFrame < FRAME_MS) return;
    lastFrame = now;

    // Fade the previous frame toward the background color — this is what
    // creates the trailing tails behind each falling head.
    ctx.globalAlpha = theme.fadeAlpha;
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);

    ctx.globalAlpha = theme.glyphAlpha;
    ctx.fillStyle = theme.glyph;
    for (let i = 0; i < columns; i++) {
      const glyph = GLYPHS[(Math.random() * GLYPHS.length) | 0];
      const x = i * FONT_SIZE;
      const y = Math.floor(drops[i]) * FONT_SIZE;
      ctx.fillText(glyph, x, y);

      drops[i] += speeds[i];
      // Recycle the column once it falls off-screen, with a random delay so
      // columns don't sync up.
      if (y > height && Math.random() > 0.975) {
        drops[i] = 0;
        speeds[i] = 0.5 + Math.random() * 0.75;
      }
    }
  }

  function start() {
    if (running || reduceMotion.matches) return;
    running = true;
    resize();
    requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    // Leave a clean background rather than a frozen mid-rain frame.
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.bg;
    ctx.fillRect(0, 0, width, height);
  }

  window.addEventListener("resize", resize);

  // Follow the theme toggle live.
  new MutationObserver(readTheme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  // Honor reduced-motion changes live, too.
  const onMotionPref = () => (reduceMotion.matches ? stop() : start());
  if (typeof reduceMotion.addEventListener === "function") {
    reduceMotion.addEventListener("change", onMotionPref);
  }

  start();
})();

/* ==========================================================================
   hood.js — صفحة الحي: بتقرا ?h=karma|topaz|lazord|pearl وبترسم الصفحة من data.js
   1 الهيرو والأرقام  2 نماذج الوحدات  3 رحلة الحي  4 باقي الأحياء
   ========================================================================== */
(function () {
  "use strict";

  const key = document.body.dataset.hood;
  const id = HOODS[key] ? key : HOOD_ORDER[0];
  const hood = HOODS[id];

  /* ---------- 1) الهيرو والأرقام ---------- */
  document.body.dataset.hood = id;
  byId("hKind").textContent = hood.kind;
  byId("hAr").textContent = hood.ar;
  byId("hEn").textContent = hood.en;
  byId("hTag").textContent = hood.tag;
  byId("hDesc").textContent = hood.desc;

  const copy = document.querySelector(".h-copy");
  [...copy.children].forEach((c, i) => c.style.setProperty("--n", i));
  findImage(hood.logo).then((url) => {
    if (!url) return;
    const logo = byId("hLogo");
    logo.src = url; logo.alt = hood.name; byId("hLogoBadge").hidden = false;
    copy.classList.add("has-logo");
  });
  loadInto(byId("hImg"), hood.img);

  const statsBox = byId("hStats");
  statsBox.innerHTML = hood.stats.map((s) =>
    `<article class="stat-card"><strong><bdi dir="ltr">${s.t ? s.t : `${s.pre || ""}<span class="hc" data-to="${s.to}">${s.to}</span>`}</bdi></strong><span>${s.l}</span></article>`
  ).join("");
  watchCounters(statsBox, [...statsBox.querySelectorAll(".hc")]);

  /* ---------- 2) نماذج الوحدات ---------- */
  const modelIds = MODELS[id];
  const steps = PHOTO_STEPS[HOOD_TYPE[id]];
  const ROWS = [["land", "مساحة الأرض"], ["ground", "الدور الأرضي"], ["first", "الدور الأول"], ["repeated", "الدور المتكرر"], ["roof", "الروف"], ["openRoof", "الروف المفتوح"]];

  const strip = byId("mStrip"), panel = byId("mPanel"), box = byId("mBox");
  let current = null;

  const chips = modelIds.map((mid) => {
    const m = MODEL_DATA[mid];
    const b = document.createElement("button");
    b.type = "button"; b.className = "m-chip"; b.dataset.id = mid;
    b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-controls", "mPanel");
    b.innerHTML = "<b></b><small></small>";
    b.children[0].textContent = m.name;
    b.children[1].textContent = m.repeated || m.land || "";
    b.addEventListener("click", () => show(mid));
    strip.append(b);
    return b;
  });

  function fill(mid) {
    const m = MODEL_DATA[mid];
    box.innerHTML =
      '<button class="m-x" type="button" aria-label="إغلاق">✕</button>' +
      '<div class="m-gal"><div class="m-img"><img alt="" hidden><div class="m-ph"><b></b><small>الصورة قريبًا</small></div></div><div class="m-cap"><b></b><span></span></div><div class="m-steps"></div></div>' +
      '<div class="m-info"><p class="eyebrow"></p><h3></h3><ul class="hood-facts"></ul><p class="m-note"></p><a class="button" href="index.html#contact">اسأل عن هذا النموذج ←</a></div>' +
      '<div class="m-others"></div>';

    box.querySelector(".eyebrow").textContent = hood.name;
    box.querySelector("h3").textContent = m.name;
    box.querySelector(".m-note").textContent = FLEX_NOTE;
    box.querySelector(".m-x").addEventListener("click", close);

    const frame = box.querySelector(".m-img"), img = frame.querySelector("img"), ph = frame.querySelector(".m-ph");
    const cap = box.querySelector(".m-cap"), stepsBox = box.querySelector(".m-steps"), facts = box.querySelector(".hood-facts");
    const photos = steps.map((_, i) => findImage(`model-${mid}-${i + 1}`));
    const pills = [], rows = [];

    /* اختيار زرار = تغيير الصورة + الكلام اللي تحتها + تلوين الصف المرتبط */
    const goTo = async (i, instant) => {
      const step = steps[i];
      pills.forEach((p, k) => p.classList.toggle("is-active", k === i));
      rows.forEach((r) => r.li.classList.toggle("is-active", ROW_PHOTO[r.key] === step));
      cap.children[0].textContent = STEP_INFO[step].title;
      cap.children[1].textContent = STEP_INFO[step].sub;
      frame.classList.toggle("swap", !instant);
      const url = await photos[i];
      if (url) {
        const next = new Image(); next.src = url;
        try { await next.decode(); } catch (_) {}
        img.src = url; img.alt = `${m.name} — ${STEP_INFO[step].title}`; img.hidden = false; ph.hidden = true;
      } else {
        img.hidden = true; ph.hidden = false;
        ph.querySelector("b").textContent = `${m.name} — ${STEP_INFO[step].title}`;
      }
      frame.classList.remove("swap");
    };

    steps.forEach((step, i) => {
      const p = document.createElement("button");
      p.type = "button"; p.textContent = STEP_INFO[step].tab;
      p.addEventListener("click", () => goTo(i));
      stepsBox.append(p); pills.push(p);
    });

    ROWS.filter(([k]) => m[k] && !HIDDEN_ROWS.includes(k)).forEach(([k, label]) => {
      const li = document.createElement("li"), b = document.createElement("b"), s = document.createElement("span");
      b.textContent = label; s.textContent = m[k];
      const target = steps.indexOf(ROW_PHOTO[k]);
      const row = document.createElement(target >= 0 ? "button" : "div");
      row.className = "m-row" + (target >= 0 ? "" : " is-static");
      if (target >= 0) { row.type = "button"; li.classList.add("has-photo"); row.addEventListener("click", () => goTo(target)); }
      row.append(b, s); li.append(row); facts.append(li);
      rows.push({ key: k, li });
    });

    goTo(0, true);

    /* مصغرات النماذج التانية في نفس الحي */
    const others = modelIds.filter((x) => x !== mid).slice(0, 4), othersBox = box.querySelector(".m-others");
    if (!others.length) othersBox.remove();
    others.forEach((o) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "m-th";
      b.innerHTML = '<span class="m-th-img"><img alt="" hidden></span><small></small>';
      b.querySelector("small").textContent = MODEL_DATA[o].name;
      const im = b.querySelector("img");
      findImage(`model-${o}-1`).then((u) => { if (u) { im.src = u; im.hidden = false; } });
      b.addEventListener("click", () => show(o));
      othersBox.append(b);
    });
  }

  function mark(mid) {
    chips.forEach((c) => { const on = c.dataset.id === mid; c.classList.toggle("is-active", on); c.setAttribute("aria-expanded", String(on)); });
    current = mid;
  }
  function show(mid) {
    if (mid === current) return close();
    const wasOpen = panel.classList.contains("open");
    mark(mid);
    if (wasOpen) { box.classList.add("swap"); setTimeout(() => { fill(mid); box.classList.remove("swap"); }, 180); }
    else { fill(mid); panel.classList.add("open"); }
    chips.find((c) => c.dataset.id === mid).scrollIntoView({ inline: "center", block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }
  function close() {
    const c = chips.find((x) => x.dataset.id === current);
    panel.classList.remove("open"); mark(null); if (c) c.focus({ preventScroll: true });
  }
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && current) close(); });

  /* ---------- 3) رحلة الحي ---------- */
  const stepsHost = byId("jSteps"), journey = document.querySelector(".journey");
  const stepEls = hood.steps.map((s, i) => {
    const el = document.createElement("article");
    el.className = "j-step reveal";
    el.innerHTML = `<span class="j-num">0${i + 1}</span><h3></h3><p></p>`;
    el.querySelector("h3").textContent = s.t;
    el.querySelector("p").textContent = s.d;
    if (s.chip) { const c = document.createElement("span"); c.className = "j-chip"; c.textContent = s.chip; el.append(c); }
    const imgName = hood.images[i + 1];
    if (imgName) {
      const wrap = document.createElement("div"); wrap.className = "j-img";
      const im = document.createElement("img"); im.alt = ""; im.loading = "lazy"; im.decoding = "async"; wrap.append(im); el.prepend(wrap);
      findImage(imgName).then((u) => (u ? (im.src = u) : wrap.remove()));
    }
    stepsHost.append(el);
    return el;
  });
  reveal(stepEls);

  /* الخط الذهبي بيمشي مع النزول، والخطوة اللي في نص الشاشة بتتلوّن */
  if (reduceMotion || !hasIO) {
    journey.style.setProperty("--p", 1);
  } else {
    const activeIO = new IntersectionObserver((entries) => entries.forEach((e) => e.target.classList.toggle("is-active", e.isIntersecting)), { rootMargin: "-40% 0px -40% 0px" });
    stepEls.forEach((el) => activeIO.observe(el));

    let ticking = false, visible = false;
    const update = () => {
      ticking = false;
      const r = journey.getBoundingClientRect(), mid = innerHeight * 0.55;
      journey.style.setProperty("--p", Math.min(1, Math.max(0, (mid - r.top) / r.height)).toFixed(4));
    };
    const onScroll = () => { if (!ticking && visible) { ticking = true; requestAnimationFrame(update); } };
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) update(); }, { rootMargin: "100px" }).observe(journey);
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll, { passive: true });
  }

  /* ---------- 4) باقي الأحياء ---------- */
  const more = byId("moreHoods");
  renderHoodCards(more, id);
  reveal(more.querySelectorAll(".n-item"));
})();

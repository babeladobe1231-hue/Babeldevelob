/* ==========================================================================
   app.js — الكود المشترك بين كل الصفحات (بدون أي مكتبات خارجية)
   1 الصور  2 كروت الأحياء  3 القائمة  4 حركة الظهور  5 العدّادات
   6 مشهد الفوتر  7 نافذة الخدمات  8 الفورم
   ========================================================================== */
"use strict";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const byId = (id) => document.getElementById(id);
const hasIO = "IntersectionObserver" in window;

/* ---------- 1) الصور ----------
   كل صورة بتتكتب في الـ HTML بالاسم بس: data-img="karma"
   - لو فيه images-manifest.js مولَّد (node tools/check-images.mjs) بنقرا منه الامتداد مباشرة (أسرع حاجة).
   - لو لأ، بنجرّب الامتدادات بالترتيب (مرة واحدة لكل صورة). */
const IMG_DIR = "images/";
const IMG_EXTS = ["webp", "jpg", "png", "jpeg", "svg", "avif"];
const imgCache = new Map();

function findImage(name) {
  if (!imgCache.has(name)) {
    const manifest = window.BABEL_IMAGES;
    if (manifest) {
      imgCache.set(name, Promise.resolve(manifest[name] ? IMG_DIR + manifest[name] : null));
    } else {
      imgCache.set(name, (async () => {
        for (const ext of IMG_EXTS) {
          const url = `${IMG_DIR}${name}.${ext}`;
          const ok = await new Promise((res) => { const p = new Image(); p.onload = () => res(true); p.onerror = () => res(false); p.src = url; });
          if (ok) return url;
        }
        return null;
      })());
    }
  }
  return imgCache.get(name);
}

/* تحميل صورة داخل عنصر <img> (مع إخفائه لو الصورة مش موجودة) */
function loadInto(img, name) {
  return findImage(name).then((url) => {
    if (url) img.src = url;
    else { img.hidden = true; const fb = img.parentElement && img.parentElement.querySelector("[data-fallback]"); if (fb) fb.hidden = false; }
    return url;
  });
}

function bindImages(root = document) {
  root.querySelectorAll("img[data-img]").forEach((img) => {
    if (!img.closest(".hero-card,.site-header,.footer-lockup")) img.loading = "lazy";
    img.decoding = "async";
    loadInto(img, img.dataset.img);
  });
}

findImage("pattern").then((url) => {
  if (url) document.documentElement.style.setProperty("--pattern-url", `url("${new URL(url, document.baseURI).href}")`); /* رابط كامل: الرابط النسبي كان بيتفسّر من مكان ملف الـ CSS */
  else document.querySelectorAll(".pattern-layer").forEach((el) => { el.hidden = true; });
});

/* ---------- 2) كروت الأحياء (من data.js — الترتيب من HOOD_ORDER) ---------- */
function createHoodCard(key) {
  const h = HOODS[key];
  const item = document.createElement("div");
  item.className = "n-item";
  item.innerHTML =
    `<a class="n-card" href="${key}.html">` +
    `<div class="n-media"><img alt=""></div>` +
    `<div class="n-body"><h3></h3><p class="card-kicker"></p><p class="n-blurb"></p><span class="n-more">استكشف الحي ←</span></div></a>`;
  item.querySelector("img").alt = h.name;
  item.querySelector("h3").textContent = h.name;
  item.querySelector(".card-kicker").textContent = h.kind;
  item.querySelector(".n-blurb").textContent = h.blurb;
  const img = item.querySelector("img");
  img.loading = "lazy"; img.decoding = "async";
  loadInto(img, h.img);
  return item;
}

function renderHoodCards(container, exceptKey) {
  if (!container) return;
  container.replaceChildren(...HOOD_ORDER.filter((k) => k !== exceptKey).map(createHoodCard));
}

/* ---------- 3) قائمة الموبايل ---------- */
const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
if (menuToggle && mainNav) {
  const setMenu = (open) => {
    mainNav.classList.toggle("is-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "إغلاق القائمة" : "فتح القائمة");
  };
  menuToggle.addEventListener("click", () => setMenu(!mainNav.classList.contains("is-open")));
  mainNav.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
}

const yearEl = byId("currentYear");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------- 4) حركة الظهور (opacity + transform بس) ---------- */
let revealObserver = null;
function reveal(elements) {
  const list = [...elements];
  if (reduceMotion || !hasIO) { list.forEach((el) => el.classList.add("is-visible")); return; }
  revealObserver = revealObserver || new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add("is-visible"); revealObserver.unobserve(entry.target); }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -30px 0px" });
  list.forEach((el, i) => {
    el.style.setProperty("--d", `${(i % 5) * 70}ms`);
    el.classList.add("motion-ready");
    revealObserver.observe(el);
  });
}

/* ---------- 5) عدّادات الأرقام ---------- */
function runCounter(el) {
  const target = Number(el.dataset.to), start = performance.now(), duration = 1800;
  const tick = (now) => {
    const p = Math.min((now - start) / duration, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))).toLocaleString("en-US");
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function watchCounters(container, counters) {
  if (!container || !counters.length) return;
  if (reduceMotion || !hasIO) { counters.forEach((el) => { el.textContent = Number(el.dataset.to).toLocaleString("en-US"); }); return; }
  counters.forEach((el) => { el.textContent = "0"; });
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) { counters.forEach(runCounter); io.disconnect(); }
  }, { threshold: 0.35 });
  io.observe(container);
}

/* ---------- 6) مشهد الفوتر: بيتحرك بس وهو على الشاشة (توفير للبطارية) ---------- */
const footerScene = document.querySelector(".footer-scene");
if (footerScene) {
  if (hasIO) new IntersectionObserver((entries) => entries.forEach((e) => footerScene.classList.toggle("in-view", e.isIntersecting)), { threshold: 0.12 }).observe(footerScene);
  else footerScene.classList.add("in-view");
}

/* ---------- 7) نافذة معلومات الخدمات (الصفحة الرئيسية) ---------- */
const serviceDialog = byId("serviceDialog");
if (serviceDialog) {
  const mainImg = byId("svcMainImg"), thumbs = byId("svcThumbs");
  let token = 0;

  async function openService(svc) {
    if (!svc) return;
    const mine = ++token;
    byId("svcKind").textContent = svc.kind;
    byId("svcTitle").textContent = svc.name;
    byId("svcDesc").textContent = svc.desc;
    byId("svcFacts").replaceChildren(...svc.facts.map(([label, value]) => {
      const li = document.createElement("li"), b = document.createElement("b"), s = document.createElement("span");
      b.textContent = label; s.textContent = value; li.append(b, s); return li;
    }));
    thumbs.replaceChildren();
    mainImg.removeAttribute("src");
    mainImg.alt = svc.name;
    document.body.classList.add("modal-open");
    serviceDialog.showModal();

    const urls = (await Promise.all(svc.images.map(findImage))).filter(Boolean);
    if (mine !== token || !urls.length) return;
    mainImg.src = urls[0];
    if (urls.length > 1) urls.forEach((url, i) => {
      const btn = document.createElement("button"), t = document.createElement("img");
      btn.type = "button"; btn.setAttribute("aria-label", `صورة ${i + 1}`);
      btn.classList.toggle("is-active", i === 0);
      t.src = url; t.alt = ""; btn.append(t);
      btn.addEventListener("click", () => {
        thumbs.querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b === btn));
        mainImg.src = url;
      });
      thumbs.append(btn);
    });
  }

  document.querySelectorAll(".service-card").forEach((card) => {
    const open = () => openService(SERVICES[card.dataset.service]);
    card.addEventListener("click", open);
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
  });
  serviceDialog.addEventListener("click", (e) => { if (e.target === serviceDialog || e.target.closest("[data-close]")) serviceDialog.close(); });
  serviceDialog.addEventListener("close", () => document.body.classList.remove("modal-open"));
}

/* ---------- 8) الفورم ----------
   ⚠ الفورم هنا بيتحقق من البيانات بس ومبيبعتهاش لأي مكان.
   قبل النشر اربطه بـ: خدمة نماذج (Formspree / Netlify Forms) أو CRM أو واتساب. */
const leadForm = byId("leadForm"), formMessage = byId("formMessage");
if (leadForm && formMessage) {
  leadForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!leadForm.checkValidity()) { leadForm.reportValidity(); return; }
    const data = Object.fromEntries(new FormData(leadForm));
    if (String(data.phone || "").replace(/\D/g, "").length < 8) {
      formMessage.textContent = "من فضلك راجع رقم التليفون واكتبه بشكل صحيح.";
      byId("phone").focus();
      return;
    }
    // TODO: إرسال data إلى وجهة استقبال العملاء (لا تضع مفاتيح سرية في الملف ده).
    formMessage.textContent = "تم التحقق من البيانات. لتفعيل الإرسال الفعلي، اربط النموذج بوجهة استقبال العملاء أولًا.";
  });
}

/* ---------- تشغيل ---------- */
renderHoodCards(byId("hoodGrid"));
bindImages();
reveal(document.querySelectorAll(".reveal, .n-item, .s-item, #about .stat-card"));
watchCounters(document.querySelector("#about .stats-grid"), [...document.querySelectorAll("#about .count")]);

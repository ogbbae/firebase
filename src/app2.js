/* ===== search engine: stems + prefix + typo tolerance ===== */
const STOP = new Set("и в во на по с со к ко о об от до из за для при про как что это все всё мне найди найти покажи показать какие какой какая каких есть был были которых которые которым где когда ли или а но же у не нет его ее её их также так".split(" "));
const ENDS = ["иями","ями","ами","ого","его","ому","ему","ыми","ими","ией","иях","ях","ах","ов","ев","ей","ий","ый","ой","ая","яя","ое","ее","ые","ие","ом","ем","ам","ям","ую","юю","ия","ии","ию","а","я","ы","и","е","у","ю","о","ь"];
const norm = s => String(s || "").toLowerCase().replace(/ё/g, "е");
function stem(w) { if (w.length <= 4) return w; for (const e of ENDS) if (w.endsWith(e) && w.length - e.length >= 3) return w.slice(0, -e.length); return w; }
const toks = s => norm(s).split(/[^a-zа-я0-9]+/i).filter(w => w.length > 1 && !STOP.has(w));
const TYPE_HINT = { книг: "book", книж: "book", литератур: "book", учебник: "book", отчет: "book", документ: "norm", норматив: "norm", приказ: "norm", закон: "norm", регламент: "norm", пожар: "fire", происшеств: "fire", случа: "fire", тест: "test", сценар: "scen", калькулятор: "calc" };
let SIDX = [], VOCAB = new Set();
function buildSearchIndex() {
  SIDX = []; VOCAB = new Set();
  ITEMS.forEach(it => {
    const f = { title: toks(it.title).map(stem), tags: toks(it.tags.join(" ")).map(stem), summary: toks(it.summary).map(stem), text: toks(it.text).map(stem) };
    Object.values(f).forEach(a => a.forEach(t => VOCAB.add(t)));
    SIDX.push({ it, f: { title: new Set(f.title), tags: new Set(f.tags), summary: new Set(f.summary), text: new Set(f.text) } });
  });
}
function lev1(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return false;
  const m = a.length, n = b.length; let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cur = [i]; let best = i; for (let j = 1; j <= n; j++) { cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); best = Math.min(best, cur[j]); } if (best > max) return false; prev = cur; }
  return prev[n] <= max;
}
function expand(q) {
  const out = new Map();
  toks(q).forEach(w => {
    const s = stem(w), set = new Set([s]); let fuzzy = false;
    if (s.length >= 3) VOCAB.forEach(v => { if (v !== s && v.startsWith(s)) set.add(v); });
    if (set.size === 1 && !VOCAB.has(s) && s.length >= 4) VOCAB.forEach(v => { if (lev1(s, v, s.length >= 7 ? 2 : 1)) { set.add(v); fuzzy = true; } });
    out.set(w, { forms: set, fuzzy });
  });
  return out;
}
function search(q, typeFilter) {
  const ex = expand(q); if (!ex.size) return { results: [], hints: [] };
  const hintTypes = new Set(); toks(q).forEach(w => Object.entries(TYPE_HINT).forEach(([k, t]) => { if (stem(w).startsWith(k) || k.startsWith(stem(w)) && stem(w).length >= 4) hintTypes.add(t); }));
  const W = { title: 6, tags: 4, summary: 2, text: 1 }, NAMES = { title: "в названии", tags: "в темах", summary: "в описании", text: "в тексте" };
  const res = [];
  SIDX.forEach(({ it, f }) => {
    if (!visible(it)) return;
    if (typeFilter && typeFilter !== "all" && !(typeFilter === "learn" ? ["test", "scen", "calc", "cards"].includes(it.type) : it.type === typeFilter)) return;
    let score = 0, matched = 0; const why = {}; let fuzzyHit = false; let content = 0;
    ex.forEach(({ forms, fuzzy }, w) => {
      let hit = false; const isTypeWord = Object.keys(TYPE_HINT).some(k => stem(w).startsWith(k));
      for (const fld of ["title", "tags", "summary", "text"]) { for (const v of forms) if (f[fld].has(v)) { score += W[fld]; hit = true; (why[fld] = why[fld] || new Set()).add(w); if (fuzzy) fuzzyHit = true; break; } }
      if (hit) { matched++; if (!isTypeWord) content++; }
    });
    const needed = Math.max(1, Math.ceil([...ex.keys()].filter(w => !Object.keys(TYPE_HINT).some(k => stem(w).startsWith(k))).length * 0.5));
    if (content < needed && !(content === 0 && hintTypes.size && hintTypes.has(it.type) && [...ex.keys()].every(w => Object.keys(TYPE_HINT).some(k => stem(w).startsWith(k))))) return;
    if (hintTypes.has(it.type)) score += 5;
    const reasons = Object.entries(why).map(([k, v]) => NAMES[k] + ": " + [...v].join(", "));
    if (hintTypes.has(it.type)) reasons.push("тип материала соответствует запросу");
    if (fuzzyHit) reasons.push("с учётом возможной опечатки");
    res.push({ it, score, reasons, terms: [...ex.values()].flatMap(x => [...x.forms]) });
  });
  res.sort((a, b) => b.score - a.score);
  return { results: res, fuzzy: res.some(r => r.reasons.some(x => x.includes("опечат"))) };
}
function suggest(q) {
  const n = norm(q).trim(); if (n.length < 2) return [];
  const out = [];
  S.searches.filter(s => norm(s).includes(n) && norm(s) !== n).slice(0, 3).forEach(s => out.push({ kind: "история", label: s, q: s }));
  ITEMS.forEach(it => { if (visible(it) && norm(it.title).includes(n)) out.push({ kind: TYPE[it.type].label, label: it.title, key: it.key }); });
  if (out.length < 6) search(q).results.slice(0, 6 - out.length).forEach(r => { if (!out.find(o => o.key === r.it.key)) out.push({ kind: TYPE[r.it.type].label, label: r.it.title, key: r.it.key }); });
  return out.slice(0, 7);
}
function rememberSearch(q) { q = q.trim(); if (!q) return; S.searches = [q, ...S.searches.filter(s => s !== q)].slice(0, 12); persist(); }

/* autocomplete widget */
function bindAC(input, onSubmit) {
  let box = null, sel = -1, items = [];
  const close = () => { box?.remove(); box = null; sel = -1; input.setAttribute("aria-expanded", "false"); };
  const open = () => {
    const q = input.value; items = q.trim() ? suggest(q) : S.searches.slice(0, 5).map(s => ({ kind: "история", label: s, q: s }));
    if (!items.length) return close();
    if (!box) { box = document.createElement("div"); box.className = "ac"; box.setAttribute("role", "listbox"); box.id = input.id + "-ac"; input.parentElement.appendChild(box); input.setAttribute("aria-controls", box.id); }
    input.setAttribute("aria-expanded", "true");
    box.innerHTML = items.map((x, i) => `<button type="button" role="option" aria-selected="${i === sel}" data-i="${i}"><span class="k">${esc(x.kind)}</span><span>${esc(x.label)}</span></button>`).join("");
  };
  const pick = i => { const x = items[i]; close(); if (!x) return; if (x.key) { rememberSearch(input.value); location.hash = x.key; } else { input.value = x.q; onSubmit(x.q); } };
  input.setAttribute("role", "combobox"); input.setAttribute("aria-autocomplete", "list"); input.setAttribute("aria-expanded", "false");
  input.addEventListener("input", () => { sel = -1; open(); });
  input.addEventListener("focus", open);
  input.addEventListener("keydown", e => {
    if (e.key === "ArrowDown" && box) { e.preventDefault(); sel = Math.min(items.length - 1, sel + 1); open(); }
    else if (e.key === "ArrowUp" && box) { e.preventDefault(); sel = Math.max(-1, sel - 1); open(); }
    else if (e.key === "Enter") { e.preventDefault(); if (sel >= 0) pick(sel); else { close(); onSubmit(input.value); } }
    else if (e.key === "Escape") close();
  });
  input.addEventListener("blur", () => setTimeout(close, 150));
  input.parentElement.addEventListener("mousedown", e => { const b = e.target.closest(".ac button"); if (b) { e.preventDefault(); pick(+b.dataset.i); } });
}

/* ===== router ===== */
const NAV = [["home", "Главная"], ["ref", "Справочник РТП"], ["fires", "Реальные пожары"], ["lib", "Библиотека"], ["norms", "Нормативная база"], ["learn", "Обучение"]];
const SECTION_OF = { read: "lib", mylib: "lib", ref: "ref", fire: "fires", fires: "fires", compare: "fires", map: "fires", lib: "lib", book: "lib", norms: "norms", norm: "norms", learn: "learn", test: "learn", scen: "learn", calc: "learn", results: "learn" };
let CUR = { view: "home", arg: null };
let SEARCH_Q = "", SEARCH_TYPE = "all";
const CATALOG = { ref: { q: "", cat: "all", sort: "title", n: 9 }, fires: { q: "", cat: "all", country: "all", year: "all", scale: "all", sort: "date-desc", view: "cards", n: 9 }, lib: { q: "", shelf: "full", cat: "all", sort: "title", n: 9 }, norms: { q: "", type: "all", status: "all", sort: "adopted-desc", n: 12 } };
let COMPARE = new Set();

function parseHash() {
  const h = decodeURIComponent(location.hash.replace(/^#/, "")) || "home";
  const i = h.indexOf("."); if (i < 0) return { view: h, arg: null };
  return { view: h.slice(0, i), arg: h.slice(i + 1) };
}
const INTERACTIVE = new Set(["test", "scen", "admin", "ai", "calc", "cards", "read"]);
function route(silent) {
  const r = parseHash();
  if (silent && ((INTERACTIVE.has(r.view) && !(r.view === "admin" && !ADM.edit)) || (r.view === "learn" && r.arg === "cards"))) return;
  if (typeof RD !== "undefined" && RD) { RD.off && RD.off(); RD.selFn && document.removeEventListener("selectionchange", RD.selFn); RD = null; }
  CUR = r;
  const main = $("#main"); const y = scrollY;
  const views = { home: vHome, ref: r.arg ? vRefItem : vRefCat, fires: vFireCat, fire: vFire, compare: vCompare, map: vMap, lib: vLibCat, book: vBook, norms: vNormCat, norm: vNorm, learn: r.arg === "cards" ? vCards : vLearn, test: vTest, scen: vScen, calc: vCalc, results: vResults, search: vSearch, ai: vAI, fav: vFav, profile: vProfile, login: vLogin, read: vRead, mylib: vMyLib, community: vCommunity, admin: vAdmin, sitemap: vSitemap, about: vAbout };
  const fn = views[r.view] || vNotFound;
  let html;
  try { html = fn(r.arg); } catch (e) { console.error(e); html = errorView(e); }
  if (html !== undefined) main.innerHTML = html;
  document.documentElement.toggleAttribute("data-noindex", ["profile", "admin", "fav", "results", "login"].includes(r.view));
  $("#robotsMeta").setAttribute("content", ["profile", "admin", "fav", "results"].includes(r.view) ? "noindex,nofollow" : "index,follow");
  renderBar(); afterRender(r);
  if (silent) scrollTo(0, y); else { scrollTo(0, 0); $("#main").focus({ preventScroll: true }); }
}
function setMeta(title, desc) { document.title = title ? title + " — FIREBASE" : "FIREBASE — пожарная база знаний"; const m = $('meta[name="description"]'); if (m && desc) m.setAttribute("content", desc.slice(0, 160)); }
function crumbs(list) { return `<nav class="crumbs" aria-label="Навигация по разделам"><a href="#home">Главная</a>${list.map(([t, h]) => `<span aria-hidden="true">/</span>${h ? `<a href="${h}">${esc(t)}</a>` : `<span aria-current="page">${esc(t)}</span>`}`).join("")}</nav>`; }
function errorView(e) { return `<div class="empty" role="alert"><b>Не удалось открыть страницу</b>Произошла ошибка отображения. Вернитесь на <a href="#home">главную</a> или обновите страницу.<br><span class="small mono">${esc(e && e.message || e)}</span></div>`; }
function vNotFound() { setMeta("Страница не найдена"); return `<div class="empty"><b>Страница не найдена</b>Возможно, материал был перемещён или ссылка набрана с ошибкой. <a href="#home">На главную</a> · <a href="#search">Поиск</a></div>`; }

function renderBar() {
  const sec = SECTION_OF[CUR.view] || CUR.view;
  $("#nav").innerHTML = NAV.map(([k, t]) => `<a href="#${k}" ${sec === k ? 'aria-current="page"' : ""}>${t}</a>`).join("");
  const n = S.favorites.length; $("#favDot").textContent = n; $("#favDot").hidden = !n;
  $("#adminBtn").hidden = !IS_ADMIN;
}
function openDrawer() {
  const sec = SECTION_OF[CUR.view] || CUR.view;
  const d = document.createElement("div"); d.className = "drawer";
  d.innerHTML = `<nav aria-label="Меню">${NAV.map(([k, t]) => `<a href="#${k}" ${sec === k ? 'aria-current="page"' : ""}>${t}</a>`).join("")}<div class="sep"></div><a href="#map">Карта пожаров</a><a href="#compare">Сравнение пожаров</a><a href="#ai">ИИ-помощник</a><a href="#community">Сообщество</a><div class="sep"></div><a href="#search">Поиск</a><a href="#fav">Избранное</a><a href="#profile">Профиль</a><a href="#login">${IS_ADMIN ? "Админ-панель" : "Вход для администратора"}</a></nav>`;
  d.addEventListener("click", e => { if (e.target === d || e.target.closest("a")) d.remove(); });
  document.addEventListener("keydown", function k(e) { if (e.key === "Escape") { d.remove(); document.removeEventListener("keydown", k); } });
  document.body.appendChild(d); d.querySelector("a").focus();
}

/* ===== shared card renderers ===== */
function badge(cls, t) { return `<span class="badge ${cls}">${esc(t)}</span>`; }
function statusBadge(it) { return it.status !== "published" ? badge(it.status === "needs-update" ? "b-prelim" : "b-none", STATUS_LABEL[it.status] || it.status) : ""; }
function cardRef(it) { const o = it.obj; return `<article class="card link"><div class="top"><span class="kind">${esc(catName(REF_CATS, o.cat))}</span>${statusBadge(it)}</div><a class="t" href="${href(it)}">${esc(it.title)}</a><p class="d">${esc(it.summary)}</p><div class="foot"><span class="small muted">Проверено <span class="mono">${fmtDate(o.updated)}</span></span>${favBtn(it.key)}</div></article>`; }
function cardFire(it, withCmp) {
  const o = it.obj;
  return `<article class="card link"><div class="top"><span class="kind">${esc(catName(FIRE_CATS, o.cat))}</span>${statusBadge(it)}</div><a class="t" href="${href(it)}">${esc(it.title)}</a>
  <div class="meta"><span class="mono">${esc(o.dateText)}</span><span>${esc(o.city)}, ${esc(o.country)}</span></div>
  <p class="d">${esc(o.summary)}</p>
  <dl class="kv small"><dt>Погибшие</dt><dd>${esc(o.deathsText)}</dd><dt>Расследование</dt><dd>${esc(o.status)}</dd></dl>
  <div class="foot">${withCmp ? `<label class="cmpck"><input type="checkbox" data-cmp="${esc(o.id)}" ${COMPARE.has(o.id) ? "checked" : ""}> Сравнить</label>` : "<span></span>"}<span class="row"><a class="btn sm" href="${href(it)}" style="position:relative;z-index:1">Изучить разбор</a>${favBtn(it.key)}</span></div></article>`;
}
function cover(o) { return `<div class="cover" aria-hidden="true"><i></i><span>${esc(o.title.slice(0, 60))}</span><span class="mono">${esc(o.year || "")}</span></div>`; }
function cardBook(it) { const o = it.obj; return `<article class="card link" style="flex-direction:row;gap:14px">${cover(o)}<div class="stack" style="gap:8px;min-width:0;flex:1"><span class="kind">${esc(catName(BOOK_CATS, o.cat))}</span><a class="t" href="${href(it)}">${esc(o.title)}</a><div class="meta"><span>${esc(o.author)}</span><span class="mono">${o.year || "год не подтверждён"}</span></div><div class="foot">${accessBadge(o)}${favBtn(it.key)}</div></div></article>`; }
function docStatusBadge(o) { const s = DOC_STATUS[o.docStatus] || ["—", "b-none"]; return badge(s[1], s[0]); }
function cardNorm(it) { const o = it.obj; return `<article class="card link"><div class="top"><span class="kind">${esc(catName(NORM_TYPES, o.type))}</span>${docStatusBadge(o)}${statusBadge(it)}</div><a class="t" href="${href(it)}">${esc(o.number)} от ${fmtDate(o.adopted)}</a><p class="d">${esc(o.title)}</p><div class="foot"><span class="small muted">${o.checked ? "Проверено " + fmtDate(o.checked) : "Не проверялся"}</span>${favBtn(it.key)}</div></article>`; }
function cardLearn(it) { const map = { test: "Тест", scen: "Учебная симуляция", calc: "Калькулятор", cards: "Карточки" }; const o = it.obj; return `<article class="card link"><div class="top"><span class="kind">${map[it.type]}</span>${o.level ? `<span class="tag">${esc(o.level)}</span>` : ""}${it.type === "test" ? `<span class="tag mono">${o.qs.length} вопр.</span>` : ""}</div><a class="t" href="${href(it)}">${esc(it.title)}</a><p class="d">${esc(it.summary)}</p><div class="foot"><span></span>${favBtn(it.key)}</div></article>`; }
function cardAny(it) { return { ref: cardRef, fire: cardFire, book: cardBook, norm: cardNorm }[it.type]?.(it) || cardLearn(it); }

/* ===== HOME ===== */
function vHome() {
  setMeta("", "Профессиональная база знаний о пожаротушении");
  const vis = t => [...ITEMS.values()].filter(x => x.type === t && visible(x));
  const fires = vis("fire").sort((a, b) => b.obj.date.localeCompare(a.obj.date)).slice(0, 3);
  const norms = vis("norm").sort((a, b) => (b.obj.checked || "").localeCompare(a.obj.checked || "") || b.obj.adopted.localeCompare(a.obj.adopted)).slice(0, 3);
  const block = (title, link, linkText, body) => `<section class="sec"><div class="sec-h"><h2 class="h2">${title}</h2><a class="btn ghost sm" href="${link}">${linkText} →</a></div>${body}</section>`;
  const bundle = ["fire.zimnyaya-vishnya", "fire.admiral", "fire.mega-himki", "norm.fz123"].map(resolve).filter(visible);
  return `<section class="hero">
    <span class="eyebrow">FIREBASE · пожарная база знаний</span>
    <h1 class="h1">Профессиональная база знаний о пожаротушении</h1>
    <p class="lead">Справочные материалы, анализ реальных пожаров, профессиональная литература и инструменты для обучения в единой системе.</p>
    <form class="bigsearch" role="search" id="heroForm"><label class="sr" for="heroQ">Поиск по базе</label>${I.search}<input id="heroQ" class="inp" autocomplete="off" placeholder="Найти пожар, документ, книгу или справочный материал..."><button class="btn pri" type="submit">Найти</button></form>
    <div class="row"><a class="chip" href="#ref">Справочник РТП</a><a class="chip" href="#fires">Реальные пожары</a><a class="chip" href="#lib">Книги</a><a class="chip" href="#norms">Нормативные документы</a><a class="chip" href="#learn">Учебные материалы</a></div>
    <div class="banner"><span>${I.info}</span><span>Демонстрационное наполнение: в базе пока немного материалов, и каждый подкреплён источниками. Пометки достоверности показывают, где факт, где версия следствия, а где сведений нет.</span></div>
  </section>
  ${block("Популярные справочные материалы", "#ref", "Весь справочник", `<div class="grid">${vis("ref").slice(0, 3).map(cardRef).join("")}</div>`)}
  ${block("Разборы пожаров", "#fires", "Все пожары", `<div class="grid">${fires.map(f => cardFire(f)).join("")}</div>`)}
  ${block("Рекомендуемые книги", "#lib", "Вся библиотека", `<div class="grid g2">${vis("book").slice(0, 2).map(cardBook).join("")}</div>`)}
  ${block("Последние проверки нормативных документов", "#norms", "Вся нормативная база", `<div class="grid">${norms.map(cardNorm).join("")}</div>`)}
  ${block("Учебные материалы", "#learn", "Раздел «Обучение»", `<div class="grid">${["test.gdzs-ticket3", "scen.rtp-trainer", "learn.cards"].map(resolve).filter(Boolean).map(cardLearn).join("")}</div>`)}
  <section class="sec"><div class="sec-h"><h2 class="h2">Инструменты</h2></div><div class="tiles">
    ${[["#calc.gdzs", I.calc, "Расчёт работы звена ГДЗС", "по приложению 3 к приказу 640"], ["#map", I.map, "Карта пожаров", "документированные происшествия"], ["#compare", I.cmp, "Сравнение пожаров", "таблица различий"], ["#ai", I.ai, "ИИ-помощник", "ответы по материалам базы"], ["#learn.cards", I.cards, "Карточки терминов", "знаю / повторить"], ["#search", I.search, "Поиск", "по всей базе"]].map(([h, ic, b, s]) => `<a class="tile" href="${h}"><span class="ic">${ic}</span><span><b>${b}</b><span>${s}</span></span></a>`).join("")}
  </div></section>
  ${block("Подборка: торговые центры — эвакуация и надзор", "#compare\" data-preset=\"zimnyaya-vishnya,admiral,mega-himki", "Сравнить эти пожары", `<p class="muted" style="margin:-4px 0 14px;max-width:70ch">Три пожара в российских торговых центрах: закрытые эвакуационные выходы, горючая отделка, огневые работы — и регламент, задающий требования пожарной безопасности к зданиям.</p><div class="grid">${bundle.map(cardAny).join("")}</div>`)}`;
}

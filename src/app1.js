/* ===== FIREBASE app: core ===== */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtDate = iso => { if (!iso) return "—"; const p = String(iso).split("-"); if (p.length === 1) return p[0]; if (p.length === 2) return p[1] + "." + p[0]; return p[2] + "." + p[1] + "." + p[0]; };
const catName = (list, k) => (list.find(c => c[0] === k) || [k, k])[1];
const plural = (n, a, b, c) => { const m = n % 10, h = n % 100; return n + " " + (m === 1 && h !== 11 ? a : m >= 2 && m <= 4 && (h < 10 || h >= 20) ? b : c); };

const I = {
  search:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
  user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke-linecap="round"/></svg>',
  menu:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  book:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5"/></svg>',
  map:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/></svg>',
  calc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h2M14 12h2M8 16h2M14 16h2" stroke-linecap="round"/></svg>',
  cmp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="16" rx="1.5"/></svg>',
  ai:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><rect x="7" y="7" width="10" height="10" rx="2"/></svg>',
  test:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M9 11l2 2 4-4"/><rect x="4" y="3" width="16" height="18" rx="2"/></svg>',
  cards:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="6" width="14" height="14" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v12"/></svg>',
  doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>',
  info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5" stroke-linecap="round"/></svg>',
  chat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4 5h16v11H9l-5 4z"/></svg>',
  sun:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg>',
  shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/><path d="m9 12 2 2 4-4" stroke-linecap="round"/></svg>',
  logo:'<svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><rect x="1" y="1" width="30" height="30" rx="7" fill="none" stroke="var(--line2)"/><path d="M16 5c1 4 6 6.5 6 12a6 6 0 0 1-12 0c0-3 1.5-4.6 3-6 .3 2 1.2 3 2.3 3.4C14.6 11 15 8 16 5z" fill="var(--red)"/><path d="M16 15.5c.6 1.8 2.6 2.6 2.6 4.6a2.6 2.6 0 0 1-5.2 0c0-1.3.7-2 1.4-2.6.2.8.6 1.2 1 1.3-.3-1.2-.2-2.3.2-3.3z" fill="var(--bg)"/></svg>'
};

/* ---------- index of all materials ---------- */
const TYPE = {
  ref:{label:"Справочник",many:"Справочник РТП",route:"ref"}, fire:{label:"Пожар",many:"Реальные пожары",route:"fires"},
  book:{label:"Книга",many:"Библиотека",route:"lib"}, norm:{label:"Документ",many:"Нормативная база",route:"norms"},
  test:{label:"Тест",many:"Обучение",route:"learn"}, scen:{label:"Сценарий",many:"Обучение",route:"learn"},
  calc:{label:"Калькулятор",many:"Обучение",route:"learn"}, cards:{label:"Карточки",many:"Обучение",route:"learn"}
};
const PUB = ["published","needs-update"];
const STATUS_LABEL = {draft:"Черновик",review:"На проверке",published:"Опубликовано","needs-update":"Требует актуализации",archive:"Архив"};
let ITEMS = new Map();
let MD_SRC = [];
let IS_ADMIN = false;
let CMS = []; // docs from db

const stripMd = s => String(s || "").replace(/\{\{[^}]+\}\}/g, "").replace(/\[\[([^\]]+)\]\]/g, "").replace(/[#>*|`\-]/g, " ").replace(/\s+/g, " ").trim();
function fireText(f) { return Object.values(f.sections || {}).map(x => x.t).join(" "); }

function buildIndex() {
  ITEMS = new Map();
  const add = (type, o, extra) => ITEMS.set(type + "." + o.id, Object.assign({ type, id: o.id, key: type + "." + o.id, title: o.title, summary: o.summary || o.desc || "", tags: o.tags || [], status: o._status || "published", obj: o }, extra));
  REFS.forEach(o => add("ref", o, { date: o.updated, text: stripMd(o.body), cat: o.cat }));
  FIRES.forEach(o => add("fire", o, { date: o.date, text: stripMd(fireText(o)) + " " + o.city + " " + o.country, cat: o.cat }));
  BOOKS.forEach(o => add("book", o, { date: o.year ? String(o.year) : null, text: o.author + " " + o.publisher + " " + o.summary, cat: o.cat }));
  NORMS.forEach(o => add("norm", o, { date: o.adopted, text: o.number + " " + o.issuer + " " + o.summary + " " + (o.history || ""), cat: o.type }));
  TESTS.forEach(o => add("test", o, { text: o.qs.map(q => q.q + " " + q.e).join(" ") }));
  SCENARIOS.forEach(o => add("scen", o, { summary: o.intro, text: o.steps.map(s => s.q).join(" "), tags: ["учебная симуляция", "сценарий"] }));
  CALCS.forEach(o => add("calc", o, { summary: o.desc, text: o.limits, tags: ["калькулятор", "расчёт"] }));
  ITEMS.set("learn.cards", { type: "cards", id: "cards", key: "learn.cards", title: "Карточки: термины ГДЗС", summary: "Карточки для запоминания терминов и норм Правил использования СИЗОД.", tags: ["карточки", "термины", "гдзс"], status: "published", text: CARDS.map(c => c.f + " " + c.b).join(" "), obj: {} });
  buildSearchIndex();
}
function resolve(ref) {
  if (!ref) return null;
  if (ITEMS.has(ref)) return ITEMS.get(ref);
  for (const t of ["ref", "fire", "book", "norm", "test", "scen", "calc"]) if (ITEMS.has(t + "." + ref)) return ITEMS.get(t + "." + ref);
  return null;
}
const visible = it => it && (PUB.includes(it.status) || IS_ADMIN);
const href = it => "#" + it.key;

/* related: manual links first, then tag overlap (Jaccard) */
function relatedFor(it, limit = 6) {
  const out = [], seen = new Set([it.key]);
  const manual = [...(it.obj.related || []), ...(it.obj.books || []).map(b => "book." + b), ...(it.obj.fires || []).map(f => "fire." + f), ...(it.obj.docs || []), ...(it.obj.refs || [])];
  manual.forEach(r => { const x = resolve(r); if (x && visible(x) && !seen.has(x.key)) { seen.add(x.key); out.push({ it: x, why: "связь задана редакцией" }); } });
  const tags = new Set(it.tags);
  const scored = [];
  ITEMS.forEach(x => {
    if (seen.has(x.key) || !visible(x) || !x.tags.length) return;
    const common = x.tags.filter(t => tags.has(t));
    if (!common.length) return;
    const j = common.length / (new Set([...x.tags, ...tags]).size);
    scored.push({ it: x, j, why: "общие темы: " + common.slice(0, 3).join(", ") });
  });
  scored.sort((a, b) => b.j - a.j).forEach(s => { if (out.length < limit + 3) out.push(s); });
  return out.slice(0, Math.max(limit, out.filter(o => o.why.startsWith("связь")).length));
}

/* ---------- markdown-lite (escapes everything first) ---------- */
function inline(s, ctx) {
  s = esc(s);
  s = s.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\[\[([a-z0-9.\-~_]+)\]\]/gi, (m, k) => { const x = resolve(k); return x ? `<a href="${href(x)}">${esc(x.title)}</a>` : `<span class="muted">${esc(k)}</span>`; });
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/\{\{([a-z0-9_]+)\}\}/gi, (m, id) => {
    if (!ctx) return "";
    if (/^\d+$/.test(id)) { id = MD_SRC[+id - 1]; if (!id) return ""; }
    let n = ctx.indexOf(id); if (n < 0) { ctx.push(id); n = ctx.length - 1; }
    return `<sup class="ref"><a data-src="${esc(id)}" tabindex="0" role="button" aria-label="Источник ${n + 1}">[${n + 1}]</a></sup>`;
  });
  return s;
}
function md(src, ctx) {
  const lines = String(src || "").split("\n"); let out = "", i = 0;
  while (i < lines.length) {
    let l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (l.startsWith("```")) { const buf = []; i++; while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]); i++; out += `<div class="formula">${esc(buf.join("\n"))}</div>`; continue; }
    if (l.startsWith("### ")) { out += `<h3>${inline(l.slice(4), ctx)}</h3>`; i++; continue; }
    if (l.startsWith("## ")) { out += `<h2>${inline(l.slice(3), ctx)}</h2>`; i++; continue; }
    if (l.startsWith("> ")) { const b = []; while (i < lines.length && lines[i].startsWith("> ")) b.push(lines[i++].slice(2)); out += `<p class="note">${inline(b.join(" "), ctx)}</p>`; continue; }
    if (l.startsWith("|")) {
      const rows = []; while (i < lines.length && lines[i].startsWith("|")) rows.push(lines[i++]);
      const cells = r => r.replace(/^\||\|$/g, "").split("|").map(c => c.trim());
      const body = rows.filter((r, k) => !(k === 1 && /^\|[\s\-:|]+\|$/.test(r)));
      out += `<div class="tblw"><table><thead><tr>${cells(body[0]).map(c => `<th>${inline(c, ctx)}</th>`).join("")}</tr></thead><tbody>${body.slice(1).map(r => `<tr>${cells(r).map(c => `<td>${inline(c, ctx)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`; continue;
    }
    if (/^- /.test(l)) { const b = []; while (i < lines.length && /^- /.test(lines[i])) b.push(lines[i++].slice(2)); out += `<ul>${b.map(x => `<li>${inline(x, ctx)}</li>`).join("")}</ul>`; continue; }
    if (/^\d+\. /.test(l)) { const b = []; while (i < lines.length && /^\d+\. /.test(lines[i])) b.push(lines[i++].replace(/^\d+\. /, "")); out += `<ol>${b.map(x => `<li>${inline(x, ctx)}</li>`).join("")}</ol>`; continue; }
    const b = []; while (i < lines.length && lines[i].trim() && !/^(#|>|\||- |\d+\. |```)/.test(lines[i])) b.push(lines[i++]);
    out += `<p>${inline(b.join(" "), ctx)}</p>`;
  }
  return out;
}
function sourcesList(ids) {
  if (!ids.length) return `<p class="muted small">Источники не указаны.</p>`;
  return `<ol class="srcs">${ids.map((id, n) => { const s = SOURCES[id]; if (!s) return ""; return `<li id="src-${esc(id)}"><span class="n">[${n + 1}]</span><div>${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>` : esc(s.title)}<small>${esc(s.org)}${s.date ? " · " + fmtDate(s.date) : ""} · ${esc(s.type)}${s.accessed ? " · обращение " + fmtDate(s.accessed) : ""}</small></div></li>`; }).join("")}</ol>`;
}

/* ---------- user state: db (synced) or browser (demo) ---------- */
const DEFAULT_STATE = () => ({ favorites: [], reading: [], history: [], historyOn: false, searches: [], results: [], cards: {}, settings: { theme: "auto" } });
let S = DEFAULT_STATE();
let STORE = { mode: "loading", name: "", db: null, uid: null, user: null };
let saveTimer = null, saving = false, pendingSave = false;
function lsGet() { try { const r = localStorage.getItem("firebase-state"); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
function lsSet(v) { try { localStorage.setItem("firebase-state", JSON.stringify(v)); } catch (e) {} }
function persist() { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 600); }
async function flush() {
  if (STORE.mode !== "account") { lsSet(S); return; }
  if (saving) { pendingSave = true; return; }
  saving = true;
  try { await STORE.db.doc("data/users/" + STORE.uid + "/state").set(JSON.parse(JSON.stringify(S))); }
  catch (e) { if (e && e.code === "invalid_argument") { STORE.mode = "local"; lsSet(S); toast("Не удалось сохранить в аккаунт — данные сохраняются в этом браузере"); renderBar(); } }
  saving = false; if (pendingSave) { pendingSave = false; flush(); }
}
window.addEventListener("pagehide", () => { if (STORE.mode !== "account") lsSet(S); });
function isFav(key) { return S.favorites.includes(key); }
function toggleFav(key) {
  const i = S.favorites.indexOf(key);
  if (i >= 0) S.favorites.splice(i, 1); else S.favorites.unshift(key);
  persist(); renderBar();
  $$(`[data-fav="${CSS.escape(key)}"]`).forEach(b => favBtnState(b, key));
  toast(i >= 0 ? "Удалено из избранного" : "Добавлено в избранное");
}
function favBtnState(b, key) { const on = isFav(key); b.setAttribute("aria-pressed", on); const lbl = b.querySelector(".lbl2"); if (lbl) lbl.textContent = on ? "В избранном" : "В избранное"; b.setAttribute("aria-label", on ? "Удалить из избранного" : "Добавить в избранное"); }
function favBtn(key, full) { const on = isFav(key); return `<button class="btn ${full ? "" : "sm"} fav-btn" data-fav="${esc(key)}" aria-pressed="${on}" aria-label="${on ? "Удалить из избранного" : "Добавить в избранное"}">${I.star}${full ? `<span class="lbl2">${on ? "В избранном" : "В избранное"}</span>` : ""}</button>`; }
function addHistory(key) { if (!S.historyOn) return; S.history = [{ key, at: new Date().toISOString() }, ...S.history.filter(h => h.key !== key)].slice(0, 40); persist(); }

/* theme */
const THEMES = [["dark", "Тёмная", "графит, по умолчанию", ["#111418", "#1A1F25", "#E53935"]], ["light", "Светлая", "для дневного света и печати", ["#F3F4F6", "#FFFFFF", "#C62828"]], ["contrast", "Контрастная", "максимальная читаемость", ["#000000", "#FFFFFF", "#FF4D4D"]], ["auto", "Как в Claude", "следует теме приложения", ["#111418", "#F3F4F6", "#E53935"]]];
function applyTheme() { const t = S.settings.theme; if (["light", "dark", "contrast"].includes(t)) document.documentElement.setAttribute("data-ui", t); else document.documentElement.removeAttribute("data-ui"); const ic = document.getElementById("themeBtn"); if (ic) { const light = t === "light" || (t === "auto" && document.documentElement.getAttribute("data-theme") === "light"); ic.innerHTML = light ? I.sun : I.moon; } }
function setTheme(t) { S.settings.theme = t; clearTimeout(saveTimer); flush(); applyTheme(); $$("[data-theme-set]").forEach(b => { b.setAttribute("aria-pressed", b.dataset.themeSet === t); b.setAttribute("aria-checked", b.dataset.themeSet === t); }); toast("Тема: " + (THEMES.find(x => x[0] === t) || [, ""])[1]); }
function themeMenu() { return `<div class="thmenu" id="thmenu" role="menu" aria-label="Тема оформления">${THEMES.map(([k, t, d, c]) => `<button role="menuitemradio" aria-checked="${S.settings.theme === k}" data-theme-set="${k}"><span class="sw" aria-hidden="true">${c.map(x => `<i style="background:${x}"></i>`).join("")}</span><span>${t}<small>${d}</small></span></button>`).join("")}</div>`; }

let toastT;
function toast(msg) { let t = $(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); } t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2200); }

/* ---------- capabilities ---------- */
let CAP = { db: null, user: null, sample: null, comments: null };
async function initCaps() {
  const local = lsGet(); if (local) S = Object.assign(DEFAULT_STATE(), local);
  applyTheme();
  if (!window.claude || !window.claude.use) { STORE.mode = "local"; renderBar(); return; }
  const [db, user, sample, comments] = await Promise.all(["db", "user", "sample", "comments"].map(n => window.claude.use(n).catch(() => null)));
  CAP = { db, user, sample, comments };
  if (user) { try { IS_ADMIN = await user.canEdit(); } catch (e) {} }
  if (db) {
    try {
      db.collection("cms").onSnapshot(snap => { CMS = snap.docs.map(d => ({ _id: d.id, ...d.data() })); applyCms(); }, () => {});
    } catch (e) {}
  }
  let uid = null; if (user) { try { uid = await user.id(); } catch (e) {} }
  if (db && uid) {
    STORE = { mode: "account", db, uid, user, name: "" };
    try { const me = await user.me(); STORE.name = me && me.name || ""; } catch (e) {}
    try {
      const snap = await db.doc("data/users/" + uid + "/state").get();
      if (snap.exists) S = Object.assign(DEFAULT_STATE(), snap.data());
      else if (local && (local.favorites?.length || local.results?.length)) { S = Object.assign(DEFAULT_STATE(), local); persist(); }
    } catch (e) { STORE.mode = "local"; }
  } else STORE.mode = "local";
  applyTheme(); renderBar(); route();
}
const SEED = { ref: JSON.parse(JSON.stringify(REFS)), fire: JSON.parse(JSON.stringify(FIRES)), book: JSON.parse(JSON.stringify(BOOKS)), norm: JSON.parse(JSON.stringify(NORMS)) };
function applyCms() {
  const arr = { ref: REFS, fire: FIRES, book: BOOKS, norm: NORMS };
  Object.keys(arr).forEach(k => { arr[k].length = 0; JSON.parse(JSON.stringify(SEED[k])).forEach(x => arr[k].push(x)); });
  CMS.forEach(d => {
    const list = arr[d.kind]; if (!list || !d.data || !d.data.id) return;
    const o = JSON.parse(JSON.stringify(d.data)); o._status = d.status || "draft"; o._cms = d._id; o._updatedAt = d.updatedAt;
    (o.extraSources || []).forEach((x, n) => { const sid = "x_" + d.kind + "_" + o.id.replace(/[^a-z0-9]/g, "_") + "_" + n; SOURCES[sid] = { title: x.title, org: x.org || "добавлено редактором", url: x.url || null, type: "Источник, добавленный редактором", accessed: (x.accessed || "").slice(0, 10) || null }; o.sources = (o.sources || []).filter(s => s !== sid).concat(sid); });
    const i = list.findIndex(x => x.id === o.id);
    if (i >= 0) list[i] = o; else list.push(o);
  });
  buildIndex(); route(true);
}

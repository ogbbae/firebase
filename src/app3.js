/* ===== CATALOGS ===== */
function matchQ(it, q) { if (!q.trim()) return true; const r = search(q).results; return r.some(x => x.it.key === it.key); }
const CAT_DEF = {
  ref: { type: "ref", title: "Справочник РТП", lead: "Структурированные справочные материалы для руководителей тушения пожаров. Каждый материал содержит источники и дату проверки; это учебные материалы, а не официальные инструкции.",
    rail: c => railGroup("Категории", "cat", [["all", "Все материалы"], ...REF_CATS], c.cat, k => count("ref", it => k === "all" || it.obj.cat === k)),
    filter: (it, c) => c.cat === "all" || it.obj.cat === c.cat,
    sorts: [["title", "По названию"], ["updated-desc", "Сначала обновлённые"]],
    sort: (a, b, s) => s === "title" ? a.title.localeCompare(b.title, "ru") : (b.obj.updated || "").localeCompare(a.obj.updated || ""),
    card: cardRef, emptyCat: "В этой категории пока нет материалов. Раздел будет пополняться; предложить материал можно в разделе «Сообщество»." },
  fires: { type: "fire", title: "Реальные пожары", lead: "Документированные происшествия с разделением подтверждённых фактов, предварительных сведений, выводов расследований и интерпретаций.",
    rail: c => railGroup("Тип объекта", "cat", [["all", "Все объекты"], ...FIRE_CATS], c.cat, k => count("fire", it => k === "all" || (it.obj.cats || [it.obj.cat]).includes(k)))
      + railGroup("Страна", "country", [["all", "Все страны"], ...[...new Set(FIRES.map(f => f.country))].map(c => [c, c])], c.country, k => count("fire", it => k === "all" || it.obj.country === k))
      + railGroup("Период", "year", [["all", "Все годы"], ["2025+", "2025–2026"], ["2010+", "2010 и позже"], ["2000-2009", "2000–2009"], ["-1999", "до 2000"]], c.year, k => count("fire", it => yearIn(it.obj.date, k)))
      + railGroup("Последствия", "scale", [["all", "Любые"], ["100+", "100 и более погибших"], ["50-99", "50–99 погибших"], ["unknown", "Число не установлено точно"]], c.scale, k => count("fire", it => scaleIn(it.obj, k))),
    filter: (it, c) => (c.cat === "all" || (it.obj.cats || [it.obj.cat]).includes(c.cat)) && (c.country === "all" || it.obj.country === c.country) && yearIn(it.obj.date, c.year) && scaleIn(it.obj, c.scale),
    sorts: [["date-desc", "Сначала новые"], ["date-asc", "Сначала старые"], ["title", "По названию"]],
    sort: (a, b, s) => s === "title" ? a.title.localeCompare(b.title, "ru") : s === "date-asc" ? a.obj.date.localeCompare(b.obj.date) : b.obj.date.localeCompare(a.obj.date),
    card: it => cardFire(it, true), list: true, emptyCat: "По выбранным фильтрам происшествий нет. Сбросьте часть фильтров." },
  lib: { type: "book", title: "Библиотека", lead: "Книги, учебники и официальные отчёты расследований. Полные тексты защищённых изданий не размещаются — только ссылки на легальные источники.",
    rail: c => railGroup("Тематика", "cat", [["all", "Все темы"], ...BOOK_CATS], c.cat, k => count("book", it => k === "all" || (it.obj.cats || [it.obj.cat]).includes(k))),
    filter: (it, c) => c.cat === "all" || (it.obj.cats || [it.obj.cat]).includes(c.cat),
    sorts: [["title", "По названию"], ["year-desc", "Сначала новые"], ["year-asc", "Сначала старые"]],
    sort: (a, b, s) => s === "title" ? a.title.localeCompare(b.title, "ru") : s === "year-asc" ? (a.obj.year || 9999) - (b.obj.year || 9999) : (b.obj.year || 0) - (a.obj.year || 0),
    card: cardBook, grid: "g2", emptyCat: "Изданий по этой теме пока нет." },
  norms: { type: "norm", title: "Нормативная база", lead: "Нормативные и методические документы. Статус указывается только после проверки; если проверить не удалось, это помечено.",
    rail: c => railGroup("Тип документа", "type", [["all", "Все типы"], ...NORM_TYPES], c.type, k => count("norm", it => k === "all" || it.obj.type === k))
      + railGroup("Статус", "status", [["all", "Любой"], ...Object.entries(DOC_STATUS).map(([k, v]) => [k, v[0]])], c.status, k => count("norm", it => k === "all" || it.obj.docStatus === k)),
    filter: (it, c) => (c.type === "all" || it.obj.type === c.type) && (c.status === "all" || it.obj.docStatus === c.status),
    sorts: [["adopted-desc", "Дата принятия: новые"], ["adopted-asc", "Дата принятия: старые"], ["checked-desc", "Дата проверки"]],
    sort: (a, b, s) => s === "adopted-asc" ? a.obj.adopted.localeCompare(b.obj.adopted) : s === "checked-desc" ? (b.obj.checked || "").localeCompare(a.obj.checked || "") : b.obj.adopted.localeCompare(a.obj.adopted),
    card: cardNorm, numberSearch: true, emptyCat: "Документов по выбранным условиям нет." }
};
function yearIn(d, k) { const y = +String(d).slice(0, 4); return k === "all" || (k === "2025+" && y >= 2025) || (k === "2010+" && y >= 2010) || (k === "2000-2009" && y >= 2000 && y <= 2009) || (k === "-1999" && y < 2000); }
function scaleIn(o, k) { return k === "all" || (k === "100+" && o.deaths >= 100) || (k === "50-99" && o.deaths >= 50 && o.deaths < 100) || (k === "unknown" && o.deaths == null); }
function count(type, pred) { let n = 0; ITEMS.forEach(it => { if (it.type === type && visible(it) && pred(it)) n++; }); return n; }
function railGroup(title, key, opts, cur, cnt) { return `<div class="grp wrapm" role="group" aria-label="${esc(title)}"><span class="eyebrow">${esc(title)}</span>${opts.map(([k, t]) => `<button class="f" data-f="${key}" data-v="${esc(k)}" aria-pressed="${cur === k}"><span>${esc(t)}</span><span class="n">${cnt(k)}</span></button>`).join("")}</div>`; }

function vCatalog(name) {
  const d = CAT_DEF[name], c = CATALOG[name];
  setMeta(d.title, d.lead);
  return `${crumbs([[d.title]])}<h1 class="h1">${d.title}</h1><p class="lead">${d.lead}</p>
  ${name === "fires" ? `<div class="row" style="margin-top:14px"><a class="btn sm" href="#map">${I.map} Карта пожаров</a><a class="btn sm" href="#compare">${I.cmp} Сравнение</a></div>` : ""}${name === "lib" ? `<div class="row" style="margin-top:14px"><a class="btn sm pri" href="#mylib">${I.book} Моя библиотека: прогресс и заметки</a><a class="btn sm" href="#read.pravila-sizod">Читать Правила работы в СИЗОД</a></div>` : ""}
  <div class="cat" data-cat="${name}"><aside class="rail"><details class="railbox" id="railbox" ${matchMedia("(max-width:900px)").matches ? "" : "open"}><summary>Фильтры</summary><div class="in" id="rail">${d.rail(c)}</div></details></aside>
  <div><div class="toolbar"><div class="search-inline">${I.search}<label class="sr" for="catQ">Поиск в разделе</label><input id="catQ" class="inp" value="${esc(c.q)}" placeholder="${d.numberSearch ? "Название или номер документа" : name === "lib" ? "Название или автор" : "Поиск по названию и содержанию"}" autocomplete="off"></div>
  <label class="sr" for="catSort">Сортировка</label><select id="catSort" class="inp">${d.sorts.map(([k, t]) => `<option value="${k}" ${c.sort === k ? "selected" : ""}>${t}</option>`).join("")}</select>
  ${d.list ? `<div class="seg" role="group" aria-label="Вид"><button data-viewmode="cards" aria-pressed="${c.view === "cards"}">Карточки</button><button data-viewmode="list" aria-pressed="${c.view === "list"}">Список</button></div>` : ""}
  </div><div id="results" aria-live="polite">${catResults(name)}</div></div></div>${name === "fires" ? cmpBar() : ""}`;
}
function catResults(name) {
  const d = CAT_DEF[name], c = CATALOG[name];
  let list = [...ITEMS.values()].filter(it => it.type === d.type && visible(it) && d.filter(it, c));
  if (c.q.trim()) {
    const qn = norm(c.q).trim();
    const hits = new Map(search(c.q, d.type).results.map((r, i) => [r.it.key, i]));
    list = list.filter(it => hits.has(it.key) || (d.numberSearch && norm(it.obj.number).includes(qn)) || norm(it.title).includes(qn) || (it.obj.author && norm(it.obj.author).includes(qn)));
  }
  list.sort((a, b) => d.sort(a, b, c.sort));
  if (!list.length) return `<div class="empty"><b>Ничего не найдено</b>${c.q ? "Попробуйте изменить запрос или " : ""}${d.emptyCat} <br><br><button class="btn sm" data-reset>Сбросить фильтры</button></div>`;
  const shown = list.slice(0, c.n);
  const body = name === "fires" && c.view === "list"
    ? `<div class="list">${shown.map(it => `<a class="li" href="${href(it)}"><span class="mono small">${fmtDate(it.obj.date)}</span><span><b>${esc(it.title)}</b><br><span class="small muted">${esc(it.obj.city)}, ${esc(it.obj.country)}</span></span><span class="small">${esc(catName(FIRE_CATS, it.obj.cat))}</span><span class="small muted">Погибших: ${esc(it.obj.deathsText)}</span></a>`).join("")}</div>`
    : `<div class="grid ${d.grid || ""}">${shown.map(d.card).join("")}</div>`;
  return `<div class="row" style="margin-bottom:10px"><span class="count">${plural(list.length, "материал", "материала", "материалов")}</span></div>${body}${list.length > c.n ? `<div style="text-align:center;margin-top:18px"><button class="btn" data-more>Показать ещё (${list.length - c.n})</button></div>` : ""}`;
}
function bindCatalog(name) {
  const c = CATALOG[name], d = CAT_DEF[name];
  const upd = () => { $("#results").innerHTML = catResults(name); $("#rail").innerHTML = d.rail(c); };
  let t; $("#catQ").addEventListener("input", e => { clearTimeout(t); t = setTimeout(() => { c.q = e.target.value; c.n = CATALOG[name].n > 9 ? c.n : c.n; upd(); }, 180); });
  $("#catSort").addEventListener("change", e => { c.sort = e.target.value; upd(); });
  $(".cat").addEventListener("click", e => {
    const f = e.target.closest("button.f"); if (f) { c[f.dataset.f] = f.dataset.v; upd(); return; }
    const vm = e.target.closest("[data-viewmode]"); if (vm) { c.view = vm.dataset.viewmode; $$("[data-viewmode]").forEach(b => b.setAttribute("aria-pressed", b === vm)); upd(); return; }
    if (e.target.closest("[data-more]")) { c.n += 9; upd(); return; }
    if (e.target.closest("[data-reset]")) { Object.assign(c, { q: "", cat: "all", country: "all", year: "all", scale: "all", type: "all", status: "all" }); $("#catQ").value = ""; upd(); }
  });
}
const vRefCat = () => vCatalog("ref"), vFireCat = () => vCatalog("fires"), vLibCat = () => vCatalog("lib"), vNormCat = () => vCatalog("norms");

/* compare bar */
function cmpBar() { return `<div class="cmpbar" id="cmpbar" ${COMPARE.size ? "" : "hidden"}><span class="small">Выбрано для сравнения: <b class="mono" id="cmpN">${COMPARE.size}</b></span><a class="btn pri sm" href="#compare">Сравнить</a><button class="btn ghost sm" data-cmpclear>Очистить</button></div>`; }
function updCmpBar() { const b = $("#cmpbar"); if (!b) return; b.hidden = !COMPARE.size; $("#cmpN").textContent = COMPARE.size; }

/* ===== DETAIL: reference article ===== */
function sidePanel(it, extraTop = "") {
  const rel = relatedFor(it);
  return `<aside class="side">${extraTop}
   <div class="panel"><span class="eyebrow">Связанные материалы</span><div class="rel">${rel.length ? rel.map(r => `<a href="${href(r.it)}"><span class="kind">${TYPE[r.it.type].label}</span><b>${esc(r.it.title)}</b><small>${esc(r.why)}</small></a>`).join("") : '<p class="small muted">Связанных материалов пока нет.</p>'}</div></div>
   <div class="panel"><span class="eyebrow">Действия</span><div class="stack" style="gap:8px">
     <a class="btn sm" href="#ai" data-ask="${esc(it.key)}">${I.ai} Спросить ИИ об этом материале</a>
     ${CAP.comments ? `<button class="btn sm" data-discuss>${I.chat} Обсудить или предложить правку</button>` : ""}
   </div></div></aside>`;
}
function vRefItem(id) {
  const it = resolve("ref." + id); if (!visible(it)) return vNotFound();
  const o = it.obj, ctx = [...(o.sources || [])]; MD_SRC = o.sources || []; const body = md(o.body, ctx);
  setMeta(o.title, o.summary); addHistory(it.key);
  return `${crumbs([["Справочник РТП", "#ref"], [catName(REF_CATS, o.cat), null]])}
  <div class="art"><article id="artMain"><header class="art-head"><span class="kind">${esc(catName(REF_CATS, o.cat))}</span><h1 class="h1">${esc(o.title)}</h1><p class="lead">${esc(o.summary)}</p>
   <div class="row">${favBtn(it.key, true)}${statusBadge(it)}<span class="small muted">Последняя проверка: <span class="mono">${fmtDate(o.updated)}</span></span></div>
   <div class="banner"><span>${I.info}</span><span><b>Актуальность.</b> Материал составлен по указанным источникам на дату проверки. Это учебно-справочное изложение, а не официальная инструкция: при расхождении действует официальный текст документа.</span></div></header>
   <div class="prose">${body}</div>
   <h2 class="h2" style="margin-top:34px" id="srcH">Источники</h2><div style="margin-top:12px">${sourcesList(ctx)}</div></article>
   ${sidePanel(it)}</div>`;
}

/* ===== DETAIL: fire ===== */
function relBadge(s) { const r = REL[s] || REL.none; return badge(r[1], r[0]); }
function vFire(id) {
  const it = resolve("fire." + id); if (!visible(it)) return vNotFound();
  const o = it.obj, ctx = [...(o.sources || [])]; MD_SRC = o.sources || [];
  setMeta(o.title, o.summary); addHistory(it.key);
  const secHtml = INC_SECTIONS.map(([k, t], n) => {
    let inner = "", st = null;
    if (k === "timeline") { inner = timelineHtml(o, ctx); st = o.timeline?.length ? null : "none"; }
    else if (k === "docs") { const docs = relatedFor(it, 8).filter(r => r.it.type === "norm"); inner = docs.length ? `<div class="rel">${docs.map(r => `<a href="${href(r.it)}"><b>${esc(r.it.obj.number)} — ${esc(r.it.title)}</b><small>${esc(r.why)}</small></a>`).join("")}</div>` : '<p class="muted">Связанные документы не указаны.</p>'; }
    else if (k === "books") { const bs = (o.books || []).map(b => resolve("book." + b)).filter(visible); inner = bs.length ? `<div class="rel">${bs.map(b => `<a href="${href(b)}"><b>${esc(b.title)}</b><small>${esc(b.obj.author)}</small></a>`).join("")}</div>` : '<p class="muted">Связанные книги пока не добавлены.</p>'; }
    else if (k === "sources") { inner = '<div id="srcSlot"></div>'; }
    else { const s = o.sections?.[k] || { s: "none", t: "" }; st = s.s; inner = s.t ? `<div class="prose">${md(s.t, ctx)}</div>` : `<p class="muted">Сведения не установлены или не опубликованы в использованных материалах.</p>`; if (!s.t) st = "none"; }
    (o.schemes || []).filter(sc => sc.section === k).forEach(sc => { (sc.src || []).forEach(id => { if (SOURCES[id] && !ctx.includes(id)) ctx.push(id); }); inner += `<figure class="scheme"><figcaption><span class="eyebrow">Схема</span> ${esc(sc.title)}</figcaption>${sc.svg()}${sc.caption ? `<p class="small muted" style="margin:8px 0 0">${esc(sc.caption)}</p>` : ""}<p class="small" style="margin:6px 0 0;color:var(--fg3)">Схема редакции по данным источников ${(sc.src || []).map(id => "[" + (ctx.indexOf(id) + 1) + "]").join(" ")}, не в масштабе.</p></figure>`; });
    return `<section class="isec" id="s-${k}"><div class="isec-h"><span class="num">${String(n + 1).padStart(2, "0")}</span><h2 class="h3">${t}</h2>${st ? relBadge(st) : ""}</div>${inner}</section>`;
  }).join("");
  const html = `${crumbs([["Реальные пожары", "#fires"], [o.title, null]])}
  <div class="art"><article id="artMain"><header class="art-head"><span class="kind">${esc(catName(FIRE_CATS, o.cat))} · разбор происшествия</span><h1 class="h1">${esc(o.title)}</h1><p class="lead">${esc(o.summary)}</p>
   <div class="row">${favBtn(it.key, true)}<label class="cmpck btn sm"><input type="checkbox" data-cmp="${esc(o.id)}" ${COMPARE.has(o.id) ? "checked" : ""}> Добавить к сравнению</label>${statusBadge(it)}</div>
   <dl class="facts"><div><dt>Дата</dt><dd class="mono">${esc(o.dateText)}</dd></div><div><dt>Место</dt><dd>${esc(o.city)}, ${esc(o.country)}</dd></div><div><dt>Тип объекта</dt><dd>${esc(catName(FIRE_CATS, o.cat))}</dd></div><div><dt>Погибшие</dt><dd>${esc(o.deathsText)}</dd></div><div><dt>Пострадавшие</dt><dd>${esc(o.injured)}</dd></div><div><dt>Расследование</dt><dd>${esc(o.status)}</dd></div></dl>
   <div class="legend" aria-label="Обозначения достоверности">${Object.keys(REL).map(relBadge).join("")}</div></header>
   ${secHtml}</article>
   ${sidePanel(it, `<nav class="panel" aria-label="Оглавление разбора"><span class="eyebrow">Оглавление</span><div class="toc">${INC_SECTIONS.map(([k, t], n) => `<button data-scroll="s-${k}"><span class="num">${n + 1}</span>${t}</button>`).join("")}</div></nav>`)}</div>`;
  return html.replace('<div id="srcSlot"></div>', sourcesList(ctx));
}
function timelineHtml(o, ctx) {
  if (!o.timeline?.length) return '<p class="muted">Хронология не опубликована в использованных материалах.</p>';
  return `<p class="small muted" style="margin:0 0 12px">Нажмите на событие, чтобы увидеть источник. Точное время указано только там, где оно опубликовано.</p><ol class="tl">${o.timeline.map((e, i) => { const sid = e.src && SOURCES[e.src] ? e.src : null; if (sid && !ctx.includes(sid)) ctx.push(sid); const s = sid ? SOURCES[sid] : null; return `<li class="k-${e.s}"><button class="tl-head" aria-expanded="false" data-tl="${i}"><span class="tl-when">${esc(e.when)}</span>${relBadge(e.s)}</button><p class="tl-text">${esc(e.text)}</p><div class="tl-body">${s ? "Источник [" + (ctx.indexOf(sid) + 1) + "]: " : "Источник не указан"}${s ? `${s.url ? `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>` : esc(s.title)} — ${esc(s.org)}` : ""}</div></li>`; }).join("")}</ol>`;
}

/* ===== compare ===== */
function vCompare() {
  setMeta("Сравнение пожаров", "Сравнение документированных пожаров в таблице");
  const fires = [...ITEMS.values()].filter(it => it.type === "fire" && visible(it));
  const sel = fires.filter(f => COMPARE.has(f.obj.id));
  const pick = `<div class="panel" style="margin-top:18px"><span class="eyebrow">Выберите два или более происшествия</span><div class="row">${fires.map(f => `<label class="chip" style="cursor:pointer"><input type="checkbox" data-cmp="${esc(f.obj.id)}" ${COMPARE.has(f.obj.id) ? "checked" : ""} style="accent-color:var(--red)"> ${esc(f.title)}</label>`).join("")}</div></div>`;
  let table = "";
  if (sel.length >= 2) {
    const cell = (o, k) => { const s = o.sections?.[k]; if (!s || !s.t) return `${relBadge("none")}<p class="small muted">Не установлено</p>`; return `${relBadge(s.s)}<div class="small" style="margin-top:6px">${md(s.t, null)}</div>`; };
    const rows = [["Тип объекта", o => esc(catName(FIRE_CATS, o.cat))], ["Дата и место", o => `<span class="mono">${esc(o.dateText)}</span><br>${esc(o.city)}, ${esc(o.country)}`], ["Обстоятельства возникновения", o => cell(o, "origin")], ["Факторы распространения", o => cell(o, "spread")], ["Действия подразделений", o => cell(o, "units")], ["Эвакуация", o => cell(o, "evacuation")], ["Последствия", o => cell(o, "consequences")], ["Выводы расследования", o => cell(o, "causes")], ["Статус расследования", o => esc(o.status)]];
    table = `<div class="cmp" style="margin-top:20px"><table><thead><tr><th scope="col">Параметр</th>${sel.map(f => `<th scope="col"><a href="${href(f)}">${esc(f.title)}</a></th>`).join("")}</tr></thead><tbody>${rows.map(([t, fn]) => `<tr><th scope="row">${t}</th>${sel.map(f => `<td>${fn(f.obj)}</td>`).join("")}</tr>`).join("")}</tbody></table></div><p class="small muted" style="margin-top:10px">Ячейки показывают только сведения из источников каждого разбора; ссылки на источники — на страницах разборов.</p>`;
  } else table = `<div class="empty" style="margin-top:20px"><b>Выберите минимум два происшествия</b>Отметьте их выше или в каталоге пожаров флажком «Сравнить».</div>`;
  return `${crumbs([["Реальные пожары", "#fires"], ["Сравнение"]])}<h1 class="h1">Сравнение пожаров</h1><p class="lead">Сопоставление обстоятельств, подтверждённых факторов распространения, действий подразделений и выводов расследований.</p>${pick}${table}`;
}

/* ===== DETAIL: book ===== */
function vBook(id) {
  const it = resolve("book." + id); if (!visible(it)) return vNotFound();
  const o = it.obj; setMeta(o.title, o.summary); addHistory(it.key); const ctx = [...(o.sources || [])];
  const inList = S.reading.includes(it.key);
  const fires = (o.fires || []).map(f => resolve("fire." + f)).filter(visible), docs = (o.docs || []).map(resolve).filter(visible);
  return `${crumbs([["Библиотека", "#lib"], [o.title]])}<div class="art"><article><header class="art-head" style="flex-direction:row;gap:20px;flex-wrap:wrap">
   <div class="cover" style="width:120px;font-size:11px" aria-hidden="true"><i></i><span>${esc(o.title.slice(0, 80))}</span><span class="mono">${o.year || ""}</span></div>
   <div class="stack" style="gap:10px;flex:1;min-width:240px"><span class="kind">${esc(catName(BOOK_CATS, o.cat))}</span><h1 class="h1" style="font-size:clamp(20px,2.6vw,28px)">${esc(o.title)}</h1><p class="muted" style="margin:0">${esc(o.author)}</p>
   <div class="row">${o.access === "full" ? `<a class="btn pri" href="#read.${esc(o.id)}">${I.book} Читать бесплатно</a>` : ""}${favBtn(it.key, true)}<button class="btn" data-reading="${esc(it.key)}" aria-pressed="${inList}">${I.book}<span>${inList ? "В списке для изучения" : "Изучить позже"}</span></button>${o.url ? `<a class="btn ${o.access === "free-pdf" ? "pri" : ""}" href="${esc(o.url)}" target="_blank" rel="noopener">${o.access === "free-pdf" ? "Читать бесплатно (PDF издателя)" : "Открыть источник"}</a>` : ""}</div><div class="row">${accessBadge(o)}<span class="small muted">${esc((ACCESS[o.access] || ACCESS.library)[2])}</span></div></div></header>
   <dl class="facts"><div><dt>Год</dt><dd class="mono">${o.year || "не подтверждён"}</dd></div><div><dt>Издатель</dt><dd>${esc(o.publisher || "не указан")}</dd></div><div><dt>Язык</dt><dd>${esc(o.lang)}</dd></div><div><dt>Объём</dt><dd>${esc(o.pages || "не подтверждён")}</dd></div><div><dt>ISBN / идентификатор</dt><dd class="mono">${esc(o.isbn || o.ids || "нет данных")}</dd></div><div><dt>Доступ</dt><dd>${esc(o.fragment)}</dd></div></dl>
   <div class="prose" style="margin-top:22px"><h2>Описание</h2><p>${esc(o.summary)}</p>
   <h2>Связанные пожары</h2>${fires.length ? `<ul>${fires.map(f => `<li><a href="${href(f)}">${esc(f.title)}</a> — ${esc(f.obj.dateText)}</li>`).join("")}</ul>` : "<p class='muted'>Не указаны.</p>"}
   <h2>Связанные документы</h2>${docs.length ? `<ul>${docs.map(d => `<li><a href="${href(d)}">${esc(d.obj.number || d.title)}</a></li>`).join("")}</ul>` : "<p class='muted'>Не указаны.</p>"}</div>
   ${diaryHtml(it)}<h2 class="h2" style="margin-top:30px">Источники сведений о книге</h2><div style="margin-top:12px">${sourcesList(ctx)}</div></article>${sidePanel(it)}</div>`;
}

/* ===== DETAIL: regulation ===== */
function vNorm(id) {
  const it = resolve("norm." + id); if (!visible(it)) return vNotFound();
  const o = it.obj; setMeta(o.number, o.title); addHistory(it.key); const ctx = [...(o.sources || [])];
  const st = DOC_STATUS[o.docStatus] || ["—", "b-none", ""];
  const refs = (o.refs || []).map(r => resolve("ref." + r)).filter(visible);
  return `${crumbs([["Нормативная база", "#norms"], [o.number]])}<div class="art"><article><header class="art-head"><span class="kind">${esc(catName(NORM_TYPES, o.type))}</span><h1 class="h1" style="font-size:clamp(20px,2.8vw,30px)">${esc(o.number)} от ${fmtDate(o.adopted)}</h1><p class="lead" style="margin-top:0">«${esc(o.title)}»</p>
   <div class="row">${o.id === "p640" ? `<a class="btn pri" href="#read.pravila-sizod">${I.book} Читать полный текст</a>` : ""}${favBtn(it.key, true)}${badge(st[1], st[0])}</div>
   <div class="banner ${o.docStatus === "in-force-unverified" ? "" : "warn"}"><span>${I.info}</span><span>${esc(st[2])} ${o.docStatus === "in-force-unverified" ? "FIREBASE не называет документ действующим без такой сверки." : ""}</span></div></header>
   <dl class="facts"><div><dt>Номер</dt><dd class="mono">${esc(o.number)}</dd></div><div><dt>Дата принятия</dt><dd class="mono">${fmtDate(o.adopted)}</dd></div><div><dt>Вступление в силу</dt><dd>${o.effective ? fmtDate(o.effective) : "не указано"}</dd></div><div><dt>Орган</dt><dd>${esc(o.issuer)}</dd></div><div><dt>Регистрация</dt><dd>${esc(o.reg || "—")}</dd></div><div><dt>Последняя проверка</dt><dd class="mono">${o.checked ? fmtDate(o.checked) : "не проводилась"}</dd></div></dl>
   <div class="prose" style="margin-top:22px"><h2>Краткое содержание</h2><p>${esc(o.summary)}</p><h2>История изменений</h2><p>${esc(o.history || "Нет данных.")}</p>
   <h2>Материалы справочника по документу</h2>${refs.length ? `<ul>${refs.map(r => `<li><a href="${href(r)}">${esc(r.title)}</a></li>`).join("")}</ul>` : "<p class='muted'>Пока нет.</p>"}</div>
   <h2 class="h2" style="margin-top:30px">Где читать текст</h2><div style="margin-top:12px">${sourcesList(ctx)}<p class="small" style="margin-top:12px">Официальная публикация: <a href="${PORTAL.url}" target="_blank" rel="noopener" style="color:var(--red-ink)">${esc(PORTAL.title)}</a></p></div></article>${sidePanel(it)}</div>`;
}

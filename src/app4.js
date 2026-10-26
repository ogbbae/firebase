/* ===== MAP ===== */
const MAPF = { from: 1900, to: 2026, cat: "all", country: "all", scale: "all" };
let MAPV = { x: 0, y: 0, w: 1000, h: 500 }, LAND = null, mapLoading = false;
function vMap() {
  setMeta("Карта пожаров", "Интерактивная карта документированных пожаров");
  const countries = [...new Set(FIRES.map(f => f.country))];
  return `${crumbs([["Реальные пожары", "#fires"], ["Карта"]])}<h1 class="h1">Карта пожаров</h1><p class="lead">Точки ставятся только для происшествий с проверяемым местоположением. Точность указана в карточке: «город» или «район» — точный адрес не отображается.</p>
  <div class="toolbar" style="margin-top:18px">
   <div class="field"><label for="mFrom">Период с</label><input id="mFrom" class="inp mono" type="number" min="1800" max="2026" value="${MAPF.from}" style="width:100px"></div>
   <div class="field"><label for="mTo">по</label><input id="mTo" class="inp mono" type="number" min="1800" max="2026" value="${MAPF.to}" style="width:100px"></div>
   <div class="field"><label for="mCat">Тип объекта</label><select id="mCat" class="inp"><option value="all">Все</option>${FIRE_CATS.map(([k, t]) => `<option value="${k}" ${MAPF.cat === k ? "selected" : ""}>${t}</option>`).join("")}</select></div>
   <div class="field"><label for="mCountry">Страна</label><select id="mCountry" class="inp"><option value="all">Все</option>${countries.map(c => `<option ${MAPF.country === c ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></div>
   <div class="field"><label for="mScale">Масштаб</label><select id="mScale" class="inp"><option value="all">Любой</option><option value="100+">100+ погибших</option><option value="50-99">50–99 погибших</option><option value="unknown">Число не установлено точно</option></select></div>
  </div><p class="ferr" id="mErr" hidden></p>
  <div class="mapwrap" id="mapwrap"><svg id="mapsvg" viewBox="0 0 1000 500" role="img" aria-label="Карта мира с отметками пожаров"><g id="mapLand"></g><g id="mapPts"></g></svg>
   <div class="mapctl"><button data-zoom="in" aria-label="Приблизить">+</button><button data-zoom="out" aria-label="Отдалить">−</button><button data-zoom="reset" aria-label="Показать весь мир" style="font-size:13px">⤢</button></div></div>
  <p class="mapnote" id="mapNote">Загрузка контуров материков…</p>
  <div id="mapList" style="margin-top:18px"></div>`;
}
function proj(lon, lat) { return [(lon + 180) / 360 * 1000, (90 - lat) / 180 * 500]; }
function loadScript(src) { return new Promise((ok, no) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); }); }
async function ensureLand() {
  if (LAND !== null || mapLoading) return;
  mapLoading = true;
  try {
    if (!window.d3) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js");
    if (!window.topojson) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/topojson/1.6.20/topojson.min.js");
    if (!window.Datamap) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/datamaps/0.5.9/datamaps.world.min.js");
    const topo = Datamap.prototype.worldTopo; const key = Object.keys(topo.objects)[0];
    const fc = topojson.feature(topo, topo.objects[key]);
    let d = "";
    fc.features.forEach(f => { const g = f.geometry; if (!g) return; const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates; polys.forEach(p => p.forEach(ring => { ring.forEach((c, i) => { const [x, y] = proj(c[0], c[1]); d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1); }); d += "Z"; })); });
    LAND = d;
  } catch (e) { LAND = ""; }
  mapLoading = false; if (CUR.view === "map") drawMap();
}
function mapFires() { return FIRES.filter(f => f.lat != null && f.lon != null && visible(resolve("fire." + f.id))).filter(f => { const y = +f.date.slice(0, 4); return y >= MAPF.from && y <= MAPF.to && (MAPF.cat === "all" || (f.cats || [f.cat]).includes(MAPF.cat)) && (MAPF.country === "all" || f.country === MAPF.country) && scaleIn(f, MAPF.scale); }); }
function drawMap() {
  const svg = $("#mapsvg"); if (!svg) return;
  svg.setAttribute("viewBox", `${MAPV.x} ${MAPV.y} ${MAPV.w} ${MAPV.h}`);
  let grat = ""; for (let lon = -180; lon <= 180; lon += 30) { const [x] = proj(lon, 0); grat += `M${x} 0V500`; } for (let lat = -60; lat <= 90; lat += 30) { const [, y] = proj(0, lat); grat += `M0 ${y}H1000`; }
  $("#mapLand").innerHTML = `<path class="grat" d="${grat}"/>${LAND ? `<path class="land" d="${LAND}"/>` : ""}`;
  $("#mapNote").textContent = LAND === null ? "Загрузка контуров материков…" : LAND === "" ? "Контуры материков не загрузились (нет доступа к библиотеке карт). Точки показаны на координатной сетке; широта и долгота соответствуют реальным." : "Контуры: Natural Earth через библиотеку Datamaps. Колёсико или кнопки — масштаб, перетаскивание — сдвиг. Близкие точки объединяются в кластер.";
  const list = mapFires(), k = MAPV.w / 1000, svgW = svg.getBoundingClientRect().width || 1000, pxPerUnit = svgW / MAPV.w;
  const clusters = [];
  list.forEach(f => { const [x, y] = proj(f.lon, f.lat); const c = clusters.find(c => Math.hypot((c.x - x) * pxPerUnit, (c.y - y) * pxPerUnit) < 26); if (c) { c.items.push(f); } else clusters.push({ x, y, items: [f] }); });
  const r = 7 * k * (1000 / svgW) * 1.4;
  $("#mapPts").innerHTML = clusters.map((c, i) => c.items.length > 1
    ? `<g data-cluster="${i}" style="cursor:pointer" tabindex="0" role="button" aria-label="Группа из ${c.items.length} пожаров"><circle cx="${c.x}" cy="${c.y}" r="${r * 1.6}" fill="var(--red)" stroke="var(--bg)" stroke-width="${r * .25}"/><text x="${c.x}" y="${c.y}" fill="#fff" font-size="${r * 1.5}" text-anchor="middle" dominant-baseline="central" font-family="JetBrains Mono, monospace" font-weight="600">${c.items.length}</text></g>`
    : `<g data-pt="${esc(c.items[0].id)}" style="cursor:pointer" tabindex="0" role="button" aria-label="${esc(c.items[0].title)}"><circle cx="${c.x}" cy="${c.y}" r="${r * 2.2}" fill="var(--red)" opacity=".18"/><circle cx="${c.x}" cy="${c.y}" r="${r}" fill="var(--red)" stroke="var(--bg)" stroke-width="${r * .3}"/></g>`).join("");
  window.__clusters = clusters;
  $("#mapList").innerHTML = list.length ? `<span class="eyebrow">На карте: ${list.length}</span><div class="list" style="margin-top:8px">${list.map(f => `<a class="li" href="#fire.${esc(f.id)}"><span class="mono small">${fmtDate(f.date)}</span><span><b>${esc(f.title)}</b><br><span class="small muted">${esc(f.city)}, ${esc(f.country)} · точность: ${esc(f.geo)}</span></span><span class="small">${esc(catName(FIRE_CATS, f.cat))}</span><span class="small muted">${esc(f.deathsText)}</span></a>`).join("")}</div>` : `<div class="empty"><b>Нет происшествий по фильтрам</b>Измените период или тип объекта.</div>`;
}
function showPop(f, evt) {
  $(".mpop")?.remove(); const wrap = $("#mapwrap"), rect = wrap.getBoundingClientRect();
  const p = document.createElement("div"); p.className = "mpop"; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", f.title);
  p.innerHTML = `<div class="kind">${esc(catName(FIRE_CATS, f.cat))}</div><b style="display:block;margin:4px 0">${esc(f.title)}</b><div class="small muted mono">${esc(f.dateText)} · ${esc(f.city)}, ${esc(f.country)}</div><p class="small" style="margin:8px 0">${esc(f.summary)}</p><div class="row"><a class="btn sm pri" href="#fire.${esc(f.id)}">Подробный разбор</a><button class="btn sm ghost" data-closepop>Закрыть</button></div>`;
  wrap.appendChild(p);
  const x = Math.min(rect.width - 300, Math.max(8, evt.clientX - rect.left + 10)), y = Math.min(rect.height - p.offsetHeight - 8, Math.max(8, evt.clientY - rect.top + 10));
  p.style.left = Math.max(8, x) + "px"; p.style.top = Math.max(8, y) + "px";
}
function zoomMap(f, cx, cy) {
  const nw = Math.min(1000, Math.max(60, MAPV.w * f)), nh = nw / 2;
  cx = cx ?? MAPV.x + MAPV.w / 2; cy = cy ?? MAPV.y + MAPV.h / 2;
  MAPV = { w: nw, h: nh, x: Math.min(1000 - nw, Math.max(0, cx - nw / 2)), y: Math.min(500 - nh, Math.max(0, cy - nh / 2)) };
  $(".mpop")?.remove(); drawMap();
}
function bindMap() {
  ensureLand(); drawMap();
  const svg = $("#mapsvg"), wrap = $("#mapwrap");
  const upd = () => {
    const a = +$("#mFrom").value, b = +$("#mTo").value, err = $("#mErr");
    if (!a || !b || a > b || a < 1800 || b > 2026) { err.hidden = false; err.textContent = "Укажите период от 1800 до 2026 года; начало не позже конца."; $("#mFrom").classList.toggle("err", true); return; }
    err.hidden = true; $("#mFrom").classList.remove("err");
    Object.assign(MAPF, { from: a, to: b, cat: $("#mCat").value, country: $("#mCountry").value, scale: $("#mScale").value }); drawMap();
  };
  ["mFrom", "mTo", "mCat", "mCountry", "mScale"].forEach(id => $("#" + id).addEventListener("change", upd));
  $("#mScale").value = MAPF.scale;
  const toSvg = e => { const r = svg.getBoundingClientRect(); return [MAPV.x + (e.clientX - r.left) / r.width * MAPV.w, MAPV.y + (e.clientY - r.top) / r.height * MAPV.h]; };
  wrap.addEventListener("click", e => {
    const z = e.target.closest("[data-zoom]"); if (z) { if (z.dataset.zoom === "reset") { MAPV = { x: 0, y: 0, w: 1000, h: 500 }; drawMap(); } else zoomMap(z.dataset.zoom === "in" ? 0.6 : 1.6); return; }
    if (e.target.closest("[data-closepop]")) { $(".mpop")?.remove(); return; }
    if (moved) return;
    const pt = e.target.closest("[data-pt]"); if (pt) { showPop(FIRES.find(f => f.id === pt.dataset.pt), e); return; }
    const cl = e.target.closest("[data-cluster]"); if (cl) { const c = window.__clusters[+cl.dataset.cluster]; zoomMap(0.35, c.x, c.y); return; }
    if (!e.target.closest(".mpop")) $(".mpop")?.remove();
  });
  wrap.addEventListener("keydown", e => { if (e.key !== "Enter" && e.key !== " ") return; const pt = e.target.closest("[data-pt]"); if (pt) { e.preventDefault(); const r = pt.getBoundingClientRect(); showPop(FIRES.find(f => f.id === pt.dataset.pt), { clientX: r.left, clientY: r.top }); } const cl = e.target.closest("[data-cluster]"); if (cl) { e.preventDefault(); const c = window.__clusters[+cl.dataset.cluster]; zoomMap(0.35, c.x, c.y); } });
  svg.addEventListener("wheel", e => { e.preventDefault(); const [x, y] = toSvg(e); zoomMap(e.deltaY < 0 ? 0.8 : 1.25, x, y); }, { passive: false });
  let drag = null, moved = false;
  svg.addEventListener("pointerdown", e => { drag = { x: e.clientX, y: e.clientY, v: { ...MAPV } }; moved = false; });
  window.addEventListener("pointermove", e => { if (!drag) return; const r = svg.getBoundingClientRect(); const dx = (e.clientX - drag.x) / r.width * MAPV.w, dy = (e.clientY - drag.y) / r.height * MAPV.h; if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 4) moved = true; if (!moved) return; MAPV.x = Math.min(1000 - MAPV.w, Math.max(0, drag.v.x - dx)); MAPV.y = Math.min(500 - MAPV.h, Math.max(0, drag.v.y - dy)); svg.setAttribute("viewBox", `${MAPV.x} ${MAPV.y} ${MAPV.w} ${MAPV.h}`); });
  window.addEventListener("pointerup", () => { if (drag && moved) drawMap(); drag = null; setTimeout(() => moved = false, 0); });
}

/* ===== LEARNING ===== */
function vLearn() {
  setMeta("Обучение", "Тесты, карточки, учебные сценарии, тренажёр РТП и учебные расчёты");
  const tests = TESTS.map(t => resolve("test." + t.id)).filter(visible);
  const sc = SCENARIOS.map(s => resolve("scen." + s.id));
  const best = id => { const r = S.results.filter(x => x.id === id); return r.length ? Math.max(...r.map(x => Math.round(x.score / x.total * 100))) : null; };
  return `${crumbs([["Обучение"]])}<h1 class="h1">Обучение</h1><p class="lead">Тесты с объяснениями, карточки для запоминания, учебные симуляции и калькуляторы. Учебные модели не являются оперативными инструкциями.</p>
  <div class="row" style="margin-top:16px">${[["#learn-tests", "Тесты"], ["#learn-cards", "Карточки"], ["#learn-scen", "Сценарии и тренажёр РТП"], ["#learn-calc", "Учебные расчёты"], ["#learn-res", "Результаты"]].map(([h, t]) => `<button class="chip" data-scroll="${h.slice(1)}">${t}</button>`).join("")}</div>
  <section class="sec" id="learn-tests"><div class="sec-h"><h2 class="h2">Тесты и проверка знаний</h2></div><div class="grid">${tests.map(it => { const b = best(it.obj.id); return `<article class="card link"><div class="top"><span class="kind">Тест</span><span class="tag">${esc(it.obj.level)}</span><span class="tag mono">${it.obj.qs.length} вопр.</span>${b != null ? badge(b >= 80 ? "b-fact" : "b-prelim", "лучший: " + b + "%") : ""}</div><a class="t" href="${href(it)}">${esc(it.title)}</a><p class="d">${esc(it.obj.desc)}</p><div class="foot"><span></span>${favBtn(it.key)}</div></article>`; }).join("")}</div></section>
  <section class="sec" id="learn-cards"><div class="sec-h"><h2 class="h2">Карточки для запоминания</h2><a class="btn ghost sm" href="#learn.cards">Открыть →</a></div>${(() => { const k = Object.values(S.cards).filter(v => v === "know").length, r = Object.values(S.cards).filter(v => v === "repeat").length; return `<div class="panel row" style="justify-content:space-between"><span>${CARDS.length} карточек по Правилам использования СИЗОД · знаю: <b class="mono">${k}</b> · повторить: <b class="mono">${r}</b></span><a class="btn pri sm" href="#learn.cards">Тренироваться</a></div>`; })()}</section>
  <section class="sec" id="learn-scen"><div class="sec-h"><h2 class="h2">Учебные сценарии и тренажёр РТП</h2></div><div class="grid">${sc.map(it => `<article class="card link"><div class="top"><span class="simlabel">Учебная симуляция</span><span class="tag">${esc(it.obj.kind)}</span></div><a class="t" href="${href(it)}">${esc(it.title)}</a><p class="d">${esc(it.obj.intro)}</p><div class="foot"><span class="small muted">${plural(it.obj.steps.length, "шаг", "шага", "шагов")}</span>${favBtn(it.key)}</div></article>`).join("")}</div></section>
  <section class="sec" id="learn-calc"><div class="sec-h"><h2 class="h2">Учебные расчёты</h2></div><div class="grid">${CALCS.map(c => `<article class="card link"><div class="top"><span class="kind">Калькулятор</span></div><a class="t" href="#calc.${c.id}">${esc(c.title)}</a><p class="d">${esc(c.desc)}</p><div class="foot"><span class="small muted">Источник формулы указан</span>${favBtn("calc." + c.id)}</div></article>`).join("")}</div>
   <p class="small muted" style="margin-top:10px">Новые калькуляторы добавляются в описание <code class="mono">CALCS</code> (название, исходные данные, формула, ограничения, источник) и функцию расчёта; интерфейс строится автоматически.</p></section>
  <section class="sec" id="learn-res"><div class="sec-h"><h2 class="h2">История результатов</h2><a class="btn ghost sm" href="#results">Вся история →</a></div>${resultsTable(5)}</section>`;
}
function resultsTable(limit) {
  const r = S.results.slice(0, limit || 200);
  if (!r.length) return `<div class="empty"><b>Результатов пока нет</b>Пройдите любой тест — результат сохранится ${STORE.mode === "account" ? "в вашем аккаунте" : "в этом браузере"}.</div>`;
  return `<div class="tblw"><table><thead><tr><th>Дата</th><th>Тест</th><th>Результат</th></tr></thead><tbody>${r.map(x => `<tr><td class="mono">${new Date(x.at).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}</td><td><a href="#test.${esc(x.id)}" style="color:var(--red-ink)">${esc(x.title)}</a></td><td class="mono">${x.score} / ${x.total} (${Math.round(x.score / x.total * 100)}%)</td></tr>`).join("")}</tbody></table></div>`;
}
function vResults() { setMeta("Результаты обучения"); const n = S.results.length, avg = n ? Math.round(S.results.reduce((a, x) => a + x.score / x.total, 0) / n * 100) : 0; return `${crumbs([["Обучение", "#learn"], ["Результаты"]])}<h1 class="h1">История результатов</h1><p class="lead">${n ? `Попыток: ${n}. Средний результат: ${avg}%.` : "Здесь появятся результаты тестов."}</p><div style="margin-top:18px">${resultsTable()}</div>`; }

/* test runner */
let RUN = null;
function vTest(id) {
  const it = resolve("test." + id); if (!visible(it)) return vNotFound();
  setMeta(it.title, it.obj.desc); addHistory(it.key);
  RUN = { t: it.obj, i: -1, score: 0, answers: [] };
  return `${crumbs([["Обучение", "#learn"], [it.title]])}<div id="testBox" style="max-width:760px"></div>`;
}
function drawTest() {
  const box = $("#testBox"); if (!box || !RUN) return; const t = RUN.t;
  if (RUN.i < 0) { box.innerHTML = `<h1 class="h1">${esc(t.title)}</h1><p class="lead">${esc(t.desc)}</p><dl class="facts" style="margin:18px 0"><div><dt>Вопросов</dt><dd class="mono">${t.qs.length}</dd></div><div><dt>Сложность</dt><dd>${esc(t.level)}</dd></div><div><dt>Объяснения</dt><dd>после каждого ответа</dd></div></dl><div class="row"><button class="btn pri" data-start>Начать тест</button>${favBtn("test." + t.id, true)}</div>${t.refs?.length ? `<p class="small muted" style="margin-top:18px">Материалы для подготовки: ${t.refs.map(r => resolve(r)).filter(Boolean).map(r => `<a href="${href(r)}" style="color:var(--red-ink)">${esc(r.title)}</a>`).join(", ")}</p>` : ""}`; return; }
  if (RUN.i >= t.qs.length) {
    const pct = Math.round(RUN.score / t.qs.length * 100);
    box.innerHTML = `<h1 class="h1">Результат: ${RUN.score} из ${t.qs.length}</h1><div class="result" style="margin:18px 0"><div class="v">${pct}%</div><div>${pct >= 80 ? "Хороший результат." : pct >= 60 ? "Есть пробелы — разберите ошибки ниже." : "Стоит повторить материал и пройти тест ещё раз."}</div></div>
    <h2 class="h2">Разбор ошибок</h2><div class="stack" style="margin-top:12px">${RUN.answers.map((a, i) => a.ok ? "" : `<div class="q"><span class="eyebrow">Вопрос ${i + 1}</span><h3>${esc(t.qs[i].q)}</h3><p class="small">Ваш ответ: ${esc(t.qs[i].o[a.pick])}<br><b>Правильно: ${esc(t.qs[i].o[t.qs[i].a])}</b></p><div class="expl">${esc(t.qs[i].e)}</div></div>`).join("") || '<p class="muted">Ошибок нет.</p>'}</div>
    <div class="row" style="margin-top:18px"><button class="btn pri" data-restart>Пройти заново</button><a class="btn" href="#learn">К обучению</a><a class="btn ghost" href="#results">История результатов</a></div>`;
    return;
  }
  const q = t.qs[RUN.i], a = RUN.answers[RUN.i];
  box.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:8px"><span class="eyebrow">${esc(t.title)}</span><span class="mono small">${RUN.i + 1} / ${t.qs.length}</span></div><div class="prog" aria-hidden="true"><i style="width:${RUN.i / t.qs.length * 100}%"></i></div>
  <div class="q" style="margin-top:16px"><span class="eyebrow">Вопрос ${RUN.i + 1}</span><h3>${esc(q.q)}</h3><div class="opts" role="group" aria-label="Варианты ответа">${q.o.map((o, k) => `<button class="opt ${a ? (k === q.a ? "right" : k === a.pick ? "wrong" : "") : ""}" data-pick="${k}" ${a ? "disabled" : ""}><span class="l">${"абвгде"[k]}</span><span>${esc(o)}</span></button>`).join("")}</div>
  ${a ? `<div class="expl" role="status"><b>${a.ok ? "Верно." : "Неверно."}</b> ${esc(q.e)}</div><div style="margin-top:14px;text-align:right"><button class="btn pri" data-next>${RUN.i + 1 < t.qs.length ? "Следующий вопрос" : "Показать результат"}</button></div>` : ""}</div>`;
  (a ? $("[data-next]", box) : $(".opt", box))?.focus();
}
function testClick(e) {
  if (!RUN) return; const t = RUN.t;
  if (e.target.closest("[data-start]") || e.target.closest("[data-restart]")) { RUN.i = 0; RUN.score = 0; RUN.answers = []; drawTest(); return; }
  const p = e.target.closest("[data-pick]"); if (p && !RUN.answers[RUN.i]) { const k = +p.dataset.pick, ok = k === t.qs[RUN.i].a; RUN.answers[RUN.i] = { pick: k, ok }; if (ok) RUN.score++; drawTest(); return; }
  if (e.target.closest("[data-next]")) { RUN.i++; if (RUN.i >= t.qs.length) { S.results.unshift({ id: t.id, title: t.title, score: RUN.score, total: t.qs.length, at: new Date().toISOString() }); S.results = S.results.slice(0, 200); persist(); } drawTest(); }
}

/* flashcards */
let DECK = null;
function vCards() {
  setMeta("Карточки", "Карточки для запоминания терминов ГДЗС"); addHistory("learn.cards");
  DECK = { mode: "all", order: CARDS.map(c => c.id), i: 0, flipped: false };
  return `${crumbs([["Обучение", "#learn"], ["Карточки"]])}<h1 class="h1">Карточки: термины ГДЗС</h1><p class="lead">Нажмите на карточку или пробел, чтобы перевернуть. Отмечайте «Знаю» или «Повторить»; режим «Сложные» показывает только карточки для повторения.</p>
  <div class="row" style="margin:16px 0"><div class="seg" role="group" aria-label="Набор"><button data-deck="all" aria-pressed="true">Все</button><button data-deck="repeat" aria-pressed="false">Сложные</button></div><span class="count" id="deckStat"></span></div><div id="deck"></div>`;
}
function drawDeck() {
  const box = $("#deck"); if (!box) return;
  const ids = DECK.mode === "repeat" ? CARDS.filter(c => S.cards[c.id] === "repeat").map(c => c.id) : DECK.order;
  const k = Object.values(S.cards).filter(v => v === "know").length, r = Object.values(S.cards).filter(v => v === "repeat").length;
  $("#deckStat").textContent = `знаю: ${k} · повторить: ${r} · всего: ${CARDS.length}`;
  if (!ids.length) { box.innerHTML = `<div class="empty"><b>Сложных карточек нет</b>Отметьте «Повторить» на карточках, которые вызывают затруднения.</div>`; return; }
  if (DECK.i >= ids.length) DECK.i = 0;
  const c = CARDS.find(x => x.id === ids[DECK.i]), st = S.cards[c.id];
  box.innerHTML = `<div class="flip ${DECK.flipped ? "on" : ""}" id="flip" tabindex="0" role="button" aria-label="Перевернуть карточку" aria-pressed="${DECK.flipped}"><div class="inner"><div class="face"><span class="eyebrow">${DECK.i + 1} / ${ids.length}${st ? " · " + (st === "know" ? "знаю" : "повторить") : ""}</span><div style="font:600 21px/1.35 var(--f-body)">${esc(c.f)}</div><span class="small muted">нажмите, чтобы увидеть ответ</span></div><div class="face back" aria-hidden="${!DECK.flipped}">${esc(c.b)}</div></div></div>
  <div class="row" style="justify-content:center;margin-top:16px"><button class="btn" data-cprev>← Назад</button><button class="btn" data-mark="repeat" style="border-color:var(--warn)">Повторить</button><button class="btn" data-mark="know" style="border-color:var(--ok)">Знаю</button><button class="btn" data-cnext>Далее →</button></div>`;
}
function cardsClick(e) {
  if (!DECK) return;
  const d = e.target.closest("[data-deck]"); if (d) { DECK.mode = d.dataset.deck; DECK.i = 0; DECK.flipped = false; $$("[data-deck]").forEach(b => b.setAttribute("aria-pressed", b === d)); drawDeck(); return; }
  if (e.target.closest("#flip")) { DECK.flipped = !DECK.flipped; drawDeck(); $("#flip").focus(); return; }
  const ids = DECK.mode === "repeat" ? CARDS.filter(c => S.cards[c.id] === "repeat").map(c => c.id) : DECK.order;
  const m = e.target.closest("[data-mark]"); if (m) { S.cards[ids[DECK.i]] = m.dataset.mark; persist(); if (DECK.mode !== "repeat" || m.dataset.mark === "repeat") DECK.i++; DECK.flipped = false; drawDeck(); return; }
  if (e.target.closest("[data-cnext]")) { DECK.i = (DECK.i + 1) % ids.length; DECK.flipped = false; drawDeck(); }
  if (e.target.closest("[data-cprev]")) { DECK.i = (DECK.i - 1 + ids.length) % ids.length; DECK.flipped = false; drawDeck(); }
}

/* scenarios */
let SC = null;
function vScen(id) {
  const it = resolve("scen." + id); if (!it) return vNotFound(); const o = it.obj; setMeta(o.title, o.intro); addHistory(it.key);
  SC = { o, step: 0, picks: [] };
  return `${crumbs([["Обучение", "#learn"], [o.title]])}<div style="max-width:820px"><span class="simlabel">Учебная симуляция — не оперативная инструкция</span><h1 class="h1" style="margin-top:12px">${esc(o.title)}</h1><p class="lead">${esc(o.intro)}</p>
  <div class="grid g2" style="margin-top:16px"><div class="panel"><span class="eyebrow">Доступные сведения</span><ul style="margin:0;padding-left:18px">${o.known.map(k => `<li>${esc(k)}</li>`).join("")}</ul></div><div class="panel"><span class="eyebrow">Ограничения модели</span><ul style="margin:0;padding-left:18px">${o.limits.map(k => `<li>${esc(k)}</li>`).join("")}</ul></div></div>
  <div id="scBox" style="margin-top:20px"></div></div>`;
}
function drawScen() {
  const box = $("#scBox"); if (!box || !SC) return; const o = SC.o;
  box.innerHTML = o.steps.map((st, n) => { if (n > SC.step) return ""; const p = SC.picks[n];
    return `<div class="q" style="margin-bottom:14px"><span class="eyebrow">Решение ${n + 1} из ${o.steps.length}</span><h3>${esc(st.q)}</h3><div class="opts">${st.o.map((op, k) => `<button class="opt ${p != null ? (op.ok ? "right" : k === p ? "wrong" : "") : ""}" data-sc="${n}:${k}" ${p != null ? "disabled" : ""}><span class="l">${"абвг"[k]}</span><span>${esc(op.t)}</span></button>`).join("")}</div>
    ${p != null ? `<div class="expl"><b>${st.o[p].ok ? "Верное решение." : "Неверное решение."}</b> ${esc(st.o[p].why)}${st.o[p].out ? `<br><span class="muted">Последствия в учебной модели: ${esc(st.o[p].out)}</span>` : ""}<details style="margin-top:8px"><summary style="cursor:pointer">Разбор остальных вариантов</summary><ul style="margin:6px 0 0;padding-left:18px">${st.o.map((op, k) => k === p ? "" : `<li><b>${esc(op.t)}</b> — ${esc(op.why)}</li>`).join("")}</ul></details></div>` : ""}</div>`; }).join("")
    + (SC.picks.length === o.steps.length ? `<div class="result"><b>Сценарий завершён.</b> Верных решений: ${SC.picks.filter((p, n) => o.steps[n].o[p].ok).length} из ${o.steps.length}.<div class="row" style="margin-top:10px"><button class="btn sm" data-screset>Пройти заново</button>${o.refs.map(resolve).filter(Boolean).map(r => `<a class="btn sm ghost" href="${href(r)}">${esc(r.title)}</a>`).join("")}</div></div>` : "");
}
function scenClick(e) {
  if (!SC) return;
  const b = e.target.closest("[data-sc]"); if (b) { const [n, k] = b.dataset.sc.split(":").map(Number); if (SC.picks[n] == null) { SC.picks[n] = k; if (n === SC.step && n + 1 < SC.o.steps.length) SC.step++; drawScen(); } return; }
  if (e.target.closest("[data-screset]")) { SC.step = 0; SC.picks = []; drawScen(); }
}

/* calculators */
function vCalc(id) {
  const c = CALCS.find(x => x.id === id); if (!c) return vNotFound(); setMeta(c.title, c.desc); addHistory("calc." + id);
  const src = SOURCES[c.src];
  const form = id === "gdzs"
    ? `<div class="field"><label for="cP">Давление в баллонах звена при включении, кгс/см² (через запятую)</label><input id="cP" class="inp mono" value="280, 280, 280" inputmode="decimal"></div><div class="field"><label for="cV">Общая вместимость баллона(ов) аппарата V б, л</label><input id="cV" class="inp mono" value="13.6" inputmode="decimal"></div><div class="field"><label for="cT">Время включения T вкл, ч:мин</label><input id="cT" class="inp mono" value="10:10" placeholder="10:10"></div>`
    : `<div class="field"><label for="cS">Площадь тушения S т, м²</label><input id="cS" class="inp mono" value="50" inputmode="decimal"></div><div class="field"><label for="cI">Требуемая интенсивность I тр, л/(с·м²)</label><input id="cI" class="inp mono" value="" placeholder="из справочных данных" inputmode="decimal"></div><div class="field"><label for="cQ">Расход одного ствола q ст, л/с</label><input id="cQ" class="inp mono" value="" placeholder="по характеристике ствола" inputmode="decimal"></div>`;
  return `${crumbs([["Обучение", "#learn"], [c.title]])}<h1 class="h1">${esc(c.title)}</h1><p class="lead">${esc(c.desc)}</p>
  <div class="calc" style="margin-top:20px"><form class="panel stack" id="calcForm" novalidate><span class="eyebrow">Исходные данные</span>${form}<p class="ferr" id="calcErr" role="alert" hidden></p><button class="btn pri" type="submit">Рассчитать</button></form>
  <div class="stack"><div id="calcOut"><div class="empty"><b>Введите данные и нажмите «Рассчитать»</b>Каждый шаг расчёта будет показан с формулой.</div></div>
  <div class="panel"><span class="eyebrow">Ограничения применимости</span><p class="small" style="margin:0">${esc(c.limits)}</p></div>
  <div class="panel"><span class="eyebrow">Источник формулы</span><p class="small" style="margin:0"><a href="${esc(src.url)}" target="_blank" rel="noopener" style="color:var(--red-ink)">${esc(src.title)}</a> — ${esc(src.org)}</p>${c.refs.map(r => resolve(r)).filter(Boolean).map(r => `<a class="btn sm ghost" style="margin-top:8px" href="${href(r)}">Пояснение: ${esc(r.title)}</a>`).join("")}</div></div></div>`;
}
const num = v => { const n = Number(String(v).replace(",", ".").trim()); return Number.isFinite(n) ? n : NaN; };
function calcSubmit(e) {
  e.preventDefault(); const id = CUR.arg, err = $("#calcErr"); $$(".inp", e.target).forEach(i => i.classList.remove("err"));
  const fail = (msg, el) => { err.hidden = false; err.textContent = msg; el?.classList.add("err"); el?.focus(); };
  err.hidden = true; let steps = [], result = "";
  if (id === "gdzs") {
    const ps = $("#cP").value.split(/[;,\s]+/).filter(Boolean).map(num);
    if (!ps.length || ps.some(p => !(p >= 1 && p <= 350))) return fail("Укажите давления числами от 1 до 350 кгс/см² через запятую, например: 280, 275, 290.", $("#cP"));
    const V = num($("#cV").value); if (!(V > 0 && V <= 30)) return fail("Вместимость — число от 0 до 30 л (для двух баллонов по 6,8 л укажите 13,6).", $("#cV"));
    const m = /^([01]?\d|2[0-3])[:.]([0-5]\d)$/.exec($("#cT").value.trim()); if (!m) return fail("Время включения укажите в формате ЧЧ:ММ, например 10:10.", $("#cT"));
    const t0 = +m[1] * 60 + +m[2]; const P = Math.min(...ps); const pad = P / 3, kvyh = P - pad;
    const dt = Math.floor(pad * V / 45), tot = Math.floor(P * V / 45);
    const hm = x => { x = ((x % 1440) + 1440) % 1440; return String(Math.floor(x / 60)).padStart(2, "0") + ":" + String(x % 60).padStart(2, "0"); };
    steps = [["Наименьшее давление при включении", `P min.вкл = min(${ps.join("; ")})`, P + " кгс/см²"], ["Максимальное падение давления", `P max.пад = ${P} / 3`, pad.toFixed(1) + " кгс/см²"], ["Контрольное давление на выход", `P к.вых = ${P} − ${pad.toFixed(1)}`, kvyh.toFixed(1) + " кгс/см²"], ["Время до команды на возвращение", `Δt = ${pad.toFixed(1)} × ${V} / 45 = ${(pad * V / 45).toFixed(2)} → вниз`, dt + " мин"], ["Время подачи команды постовым", `T вых = ${hm(t0)} + ${dt} мин`, hm(t0 + dt)], ["Общее время работы", `T общ = ${P} × ${V} / 45 = ${(P * V / 45).toFixed(2)} → вниз`, tot + " мин"], ["Время обязательного возвращения", `T возвр = ${hm(t0)} + ${tot} мин`, hm(t0 + tot)]];
    result = `Команда на возвращение — <b class="mono">${hm(t0 + dt)}</b>; звено обязано вернуться к <b class="mono">${hm(t0 + tot)}</b>.`;
  } else {
    const Sv = num($("#cS").value), Iv = num($("#cI").value), q = num($("#cQ").value);
    if (!(Sv > 0 && Sv <= 100000)) return fail("Площадь тушения — положительное число, м².", $("#cS"));
    if (!(Iv > 0 && Iv <= 5)) return fail("Интенсивность — положительное число до 5 л/(с·м²). Возьмите значение из справочных данных для горючего материала.", $("#cI"));
    if (!(q > 0 && q <= 200)) return fail("Расход ствола — положительное число до 200 л/с, по характеристике ствола.", $("#cQ"));
    const Q = Sv * Iv, N = Math.ceil(Q / q - 1e-9);
    steps = [["Требуемый расход", `Q тр = ${Sv} × ${Iv}`, Q.toFixed(2) + " л/с"], ["Число стволов", `N = ${Q.toFixed(2)} / ${q} = ${(Q / q).toFixed(2)} → вверх`, N + " шт."]];
    result = `Требуемый расход <b class="mono">${Q.toFixed(2)} л/с</b>, минимально <b class="mono">${N}</b> ${N === 1 ? "ствол" : N < 5 ? "ствола" : "стволов"} на тушение.`;
  }
  $("#calcOut").innerHTML = `<div class="result" role="status">${result}</div><h2 class="h3" style="margin:16px 0 10px">Пошаговое решение</h2><ol class="steps">${steps.map(([t, f, v]) => `<li><div><b>${esc(t)}</b><div class="f">${esc(f)}</div><div class="v">${esc(v)}</div></div></li>`).join("")}</ol>`;
}

/* ===== SEARCH PAGE ===== */
function hl(text, terms) {
  let s = esc(text); const words = norm(text).split(/[^a-zа-я0-9]+/i);
  const hit = new Set(words.filter(w => w.length > 1 && terms.some(t => stem(w) === t || (t.length >= 3 && stem(w).startsWith(t)))));
  hit.forEach(w => { s = s.replace(new RegExp("(^|[^а-яёa-z0-9])(" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi"), "$1<mark>$2</mark>"); });
  return s;
}
function vSearch() {
  setMeta("Поиск", "Единый поиск по справочнику, пожарам, книгам, документам и учебным материалам");
  return `${crumbs([["Поиск"]])}<h1 class="h1">Поиск по базе</h1><p class="lead">Поиск по всем разделам с учётом словоформ, частичных совпадений и опечаток. Можно писать обычной фразой, например «пожары в торговых центрах с проблемами эвакуации».</p>
  <form class="bigsearch" role="search" id="sForm" style="margin-top:18px"><label class="sr" for="sQ">Запрос</label>${I.search}<input id="sQ" class="inp" autocomplete="off" value="${esc(SEARCH_Q)}" placeholder="Найти пожар, документ, книгу или справочный материал..."><button class="btn pri" type="submit">Найти</button></form>
  <div class="row" style="margin-top:14px" role="group" aria-label="Тип материала">${[["all", "Все"], ["ref", "Справочник"], ["fire", "Пожары"], ["book", "Книги"], ["norm", "Документы"], ["learn", "Обучение"]].map(([k, t]) => `<button class="chip" data-stype="${k}" aria-pressed="${SEARCH_TYPE === k}">${t}</button>`).join("")}</div>
  <div id="sOut" aria-live="polite" style="margin-top:6px">${searchOut()}</div>`;
}
function searchOut() {
  if (!SEARCH_Q.trim()) {
    const ex = ["пожары в торговых центрах", "пожары в жилых домах", "документы о СИЗОД", "проблемы с эвакуацией", "контрольное давление"];
    return `<div class="sec" style="margin-top:22px"><span class="eyebrow">Примеры запросов</span><div class="row" style="margin-top:10px">${ex.map(e => `<button class="chip" data-sq="${esc(e)}">${esc(e)}</button>`).join("")}</div>${S.searches.length ? `<span class="eyebrow" style="display:block;margin-top:22px">История запросов</span><div class="row" style="margin-top:10px">${S.searches.map(e => `<button class="chip" data-sq="${esc(e)}">${esc(e)}</button>`).join("")}<button class="btn ghost sm" data-sclear>Очистить историю</button></div>` : ""}</div>`;
  }
  const { results } = search(SEARCH_Q, SEARCH_TYPE);
  if (!results.length) return `<div class="empty" style="margin-top:20px"><b>Ничего не найдено по запросу «${esc(SEARCH_Q)}»</b>Проверьте написание, используйте более общие слова или задайте вопрос <a href="#ai" data-askq="${esc(SEARCH_Q)}" style="color:var(--red-ink)">ИИ-помощнику</a>.</div>`;
  const groups = {}; results.forEach(r => { const g = TYPE[r.it.type].many; (groups[g] = groups[g] || []).push(r); });
  return `<p class="small muted" style="margin-top:16px">Найдено: ${results.length}. Результаты сгруппированы по разделам; под каждым — почему он найден.</p>` + Object.entries(groups).map(([g, rs]) => `<section class="res-grp"><h2 class="eyebrow" style="font-size:12px">${esc(g)} · ${rs.length}</h2>${rs.map(r => { const it = r.it, date = it.type === "fire" ? it.obj.dateText : it.type === "norm" ? fmtDate(it.obj.adopted) : it.type === "book" ? (it.obj.year || "") : it.type === "ref" ? "проверено " + fmtDate(it.obj.updated) : ""; const src = (it.obj.sources || [])[0] ? SOURCES[it.obj.sources[0]]?.org : null;
    return `<a class="res" href="${href(it)}"><span class="kind">${TYPE[it.type].label}${date ? " · " + esc(date) : ""}${src ? " · источник: " + esc(src) : ""}</span><div class="t">${hl(it.title, r.terms)}</div><div class="small muted" style="margin-top:3px">${hl(it.summary.slice(0, 220), r.terms)}${it.summary.length > 220 ? "…" : ""}</div><div class="why">Почему найдено: ${esc(r.reasons.join("; "))}</div></a>`; }).join("")}</section>`).join("");
}

/* ===== AI ASSISTANT ===== */
let CHAT = { turns: [], ctl: null, busy: false, context: null };
const AI_RULES = `Ты — помощник профессиональной базы знаний о пожаротушении FIREBASE. Отвечай по-русски, кратко и по существу.
Правила:
1. Отвечай ТОЛЬКО на основе материалов платформы, полученных через инструменты (или приведённых ниже). Не используй сведения, которых нет в материалах.
2. Ссылайся на материалы в формате [[ключ]], например [[fire.grenfell]] или [[ref.gdzs-calc]]; ключи берутся из результатов инструментов.
3. Чётко разделяй: подтверждённые факты, выводы официального расследования, предварительные сведения и интерпретации. Пометки достоверности есть в материалах.
4. Если информации недостаточно — прямо скажи об этом и предложи, где искать (официальный текст документа, отчёт).
5. Не выдумывай цитаты, числа, документы, причины пожаров. Не выдавай учебные материалы за официальные инструкции.
Формат: обычный текст, допустимы короткие списки с «- » и **жирный**.`;
function itemDoc(it) {
  const o = it.obj; let txt = "";
  if (it.type === "fire") txt = INC_SECTIONS.filter(([k]) => o.sections?.[k]).map(([k, t]) => `${t} [${REL[o.sections[k].s][0]}]: ${stripMd(o.sections[k].t) || "не установлено"}`).join("\n") + "\nХронология: " + (o.timeline || []).map(e => `${e.when} — ${e.text} [${REL[e.s][0]}]`).join("; ");
  else if (it.type === "ref") txt = stripMd(o.body);
  else if (it.type === "norm") txt = `${o.number} от ${o.adopted}. ${o.title}. Статус: ${DOC_STATUS[o.docStatus][0]} (${DOC_STATUS[o.docStatus][2]}). ${o.summary} История: ${o.history}`;
  else if (it.type === "book") txt = `${o.author}, ${o.year || "год не подтверждён"}, ${o.publisher}. ${o.summary}`;
  else txt = it.summary + " " + it.text;
  const srcs = (o.sources || []).map(s => SOURCES[s]).filter(Boolean).map(s => `${s.title} (${s.org})`);
  return { key: it.key, type: TYPE[it.type].label, title: it.title, text: txt.slice(0, 7000), sources: srcs };
}
const AI_TOOLS = [
  { name: "search_materials", description: "Ищет материалы платформы FIREBASE (справочник, пожары, книги, нормативные документы, обучение) по ключевым словам. Возвращает до 8 результатов: ключ, тип, название, краткое описание.", inputSchema: { type: "object", properties: { query: { type: "string", description: "ключевые слова на русском" }, type: { type: "string", enum: ["all", "ref", "fire", "book", "norm", "learn"] } }, required: ["query"] },
    execute: (inp) => { setAIStatus("Ищу в базе: «" + String(inp.query) + "»…"); return search(String(inp.query || ""), String(inp.type || "all")).results.slice(0, 8).map(r => ({ key: r.it.key, type: TYPE[r.it.type].label, title: r.it.title, summary: r.it.summary.slice(0, 300) })); } },
  { name: "get_material", description: "Возвращает полный текст материала по ключу (например fire.grenfell): разделы с пометками достоверности и список источников.", inputSchema: { type: "object", properties: { key: { type: "string" } }, required: ["key"] },
    execute: (inp) => { const it = resolve(String(inp.key)); if (!visible(it)) throw new Error("Материал не найден: " + inp.key); setAIStatus("Читаю: " + it.title + "…"); return itemDoc(it); } }
];
function setAIStatus(t) { const s = $("#aiStatus"); if (s) s.innerHTML = `<span class="spin"></span>${esc(t)}`; }
/* --- AI: two modes. "claude" = inside Claude (viewer's own account via sample);
       "key" = standalone app, each visitor brings their own Anthropic API key (stored only in their browser). --- */
const BYOK_MODELS = [["claude-sonnet-5-5", "Claude Sonnet 5.5 — баланс качества и цены"], ["claude-haiku-5-5", "Claude Haiku 5.5 — быстрее и дешевле"], ["claude-opus-5-5", "Claude Opus 5.5 — самый точный, дороже"]];
const BYOK = { key: "", model: "claude-sonnet-5-5", remember: false };
(function loadKey() { try { const r = localStorage.getItem("firebase-ai"); if (r) Object.assign(BYOK, JSON.parse(r), { remember: true }); } catch (e) {} try { const k = sessionStorage.getItem("firebase-ai-key"); if (k && !BYOK.key) BYOK.key = k; } catch (e) {} })();
function saveKey() { try { if (BYOK.remember) localStorage.setItem("firebase-ai", JSON.stringify({ key: BYOK.key, model: BYOK.model })); else { localStorage.removeItem("firebase-ai"); sessionStorage.setItem("firebase-ai-key", BYOK.key); } } catch (e) {} }
function forgetKey() { BYOK.key = ""; try { localStorage.removeItem("firebase-ai"); sessionStorage.removeItem("firebase-ai-key"); } catch (e) {} }
const IN_CLAUDE = !!(window.claude && window.claude.use);
const aiMode = () => CAP.sample ? "claude" : IN_CLAUDE ? "none" : "key";
const aiReady = () => aiMode() === "claude" || (aiMode() === "key" && !!BYOK.key);
const maskKey = k => k ? k.slice(0, 10) + "…" + k.slice(-4) : "";
function keyPanel() {
  if (aiMode() === "claude") return "";
  if (aiMode() === "none") return `<div class="banner warn" style="margin-top:14px"><span>${I.info}</span><span>Доступ к Claude для этой страницы не разрешён в вашем аккаунте. Разрешение можно выдать в меню разрешений артефакта; ответы не подменяются заготовками — пока используйте <a href="#search" style="color:var(--red-ink)">поиск</a>.</span></div>`;
  if (BYOK.key && !CHAT.editKey) return `<div class="banner" style="margin-top:14px"><span>${I.shield}</span><span>Подключён ваш ключ <span class="mono">${esc(maskKey(BYOK.key))}</span> · ${esc((BYOK_MODELS.find(m => m[0] === BYOK.model) || [, BYOK.model])[1])}. Запросы оплачиваются с вашего аккаунта Anthropic. ${BYOK.remember ? "Ключ сохранён на этом устройстве." : "Ключ будет забыт при закрытии вкладки."} <button class="btn ghost sm" data-key-edit>Изменить</button> <button class="btn ghost sm" data-key-forget>Удалить ключ</button></span></div>`;
  return `<form class="panel stack" id="keyForm" style="margin-top:16px;max-width:720px" novalidate>
   <span class="eyebrow">Подключите свой ключ, чтобы задавать вопросы</span>
   <p class="small" style="margin:0">ИИ-помощник работает на модели Claude через <b>ваш собственный ключ API Anthropic</b>. Владелец сайта не платит за ваши вопросы и не видит ваш ключ: он хранится только в вашем браузере и отправляется напрямую в Anthropic, минуя любые другие серверы.</p>
   <ol class="small" style="margin:0;padding-left:20px"><li>Зарегистрируйтесь на <a href="https://console.anthropic.com/" target="_blank" rel="noopener" style="color:var(--red-ink)">console.anthropic.com</a> и пополните баланс.</li><li>В разделе <b>API Keys</b> создайте ключ — он начинается с <span class="mono">sk-ant-</span>.</li><li>Вставьте ключ ниже. Совет: задайте в консоли Anthropic лимит расходов для этого ключа.</li></ol>
   <div class="formgrid"><div class="field wide"><label for="keyInp">Ключ API Anthropic</label><input id="keyInp" class="inp mono" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" value="${esc(BYOK.key)}"></div>
   <div class="field"><label for="keyModel">Модель</label><select id="keyModel" class="inp">${BYOK_MODELS.map(([k, t]) => `<option value="${k}" ${BYOK.model === k ? "selected" : ""}>${t}</option>`).join("")}</select></div></div>
   <label class="row small" style="gap:8px;cursor:pointer"><input type="checkbox" id="keyRemember" ${BYOK.remember ? "checked" : ""} style="accent-color:var(--red);width:16px;height:16px"> Запомнить ключ на этом устройстве (не включайте на чужом или общем компьютере)</label>
   <p class="ferr" id="keyErr" role="alert" hidden></p>
   <div class="row"><button class="btn pri" type="submit" id="keySave">Подключить</button>${BYOK.key ? '<button class="btn" type="button" data-key-cancel>Отмена</button>' : ""}</div></form>`;
}
function vAI() {
  setMeta("ИИ-помощник", "Вопросы по материалам базы знаний FIREBASE");
  const ctx = CHAT.context ? resolve(CHAT.context) : null, ready = aiReady();
  const lead = aiMode() === "claude" ? "Отвечает только по материалам FIREBASE и ссылается на них. Каждый запрос использует лимиты вашего аккаунта Claude; при первом запросе платформа попросит разрешение." : "Отвечает только по материалам FIREBASE и ссылается на них. Работает через ваш личный ключ Anthropic — каждый посетитель платит только за свои вопросы.";
  return `${crumbs([["ИИ-помощник"]])}<h1 class="h1">ИИ-помощник по базе знаний</h1><p class="lead">${lead}</p>
  ${keyPanel()}
  ${ctx ? `<div class="banner" style="margin-top:14px"><span>${I.doc}</span><span>Контекст вопроса: <a href="${href(ctx)}" style="color:var(--red-ink)">${esc(ctx.title)}</a> <button class="btn ghost sm" data-ctxclear>Убрать</button></span></div>` : ""}
  <div class="chat" id="chat" style="margin-top:20px">${CHAT.turns.length ? "" : `<div class="panel"><span class="eyebrow">Примеры вопросов</span><div class="row" style="margin-top:8px">${["Сделай краткий разбор пожара на Чернобыльской АЭС", "Какие нарушения установил суд по пожару в ТЦ «Адмирал»?", "Чем осложнялось тушение Останкинской телебашни?", "Сравни пожары в «Зимней вишне» и «Адмирале»", "Какие документы связаны с расчётом ГДЗС?"].map(q => `<button class="chip" data-aiq="${esc(q)}">${esc(q)}</button>`).join("")}</div></div>`}</div>
  <form class="composer" id="aiForm"><label class="sr" for="aiQ">Вопрос</label><textarea id="aiQ" class="inp" placeholder="${ready ? "Задайте вопрос по материалам базы…" : "Сначала подключите ключ выше"}" ${ready ? "" : "disabled"} maxlength="2000"></textarea><button class="btn pri" type="submit" id="aiSend" ${ready ? "" : "disabled"}>Спросить</button><button class="btn" type="button" id="aiStop" hidden>Стоп</button></form>
  <p class="small muted" style="margin-top:10px">Ответы формирует модель на основе материалов; проверяйте их по ссылкам на источники. Поиск и чтение материалов выполняются функциями этой страницы; в коде сайта нет ничьих ключей.</p>`;
}
async function keySubmit(e) {
  e.preventDefault(); const err = $("#keyErr"), k = $("#keyInp").value.trim();
  const fail = m => { err.hidden = false; err.textContent = m; $("#keyInp").classList.add("err"); $("#keyInp").focus(); };
  if (!/^sk-ant-[A-Za-z0-9_\-]{20,}$/.test(k)) return fail("Ключ должен начинаться с sk-ant- — скопируйте его целиком из console.anthropic.com → API Keys.");
  $("#keySave").disabled = true; $("#keySave").textContent = "Проверяю ключ…";
  const model = $("#keyModel").value;
  try { await anthropicCall({ key: k, model, max_tokens: 16, messages: [{ role: "user", content: "Ответь одним словом: готово" }] }); }
  catch (ex) { $("#keySave").disabled = false; $("#keySave").textContent = "Подключить"; return fail(ex.message); }
  Object.assign(BYOK, { key: k, model, remember: $("#keyRemember").checked }); saveKey(); CHAT.editKey = false; toast("Ключ подключён"); route();
}
async function anthropicCall({ key, model, max_tokens = 2048, system, messages, tools, signal }) {
  let r;
  try {
    r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", signal, headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify(Object.assign({ model, max_tokens, messages }, system ? { system } : {}, tools ? { tools } : {})) });
  } catch (e) { if (e.name === "AbortError") throw Object.assign(new Error("Ответ остановлен."), { code: "cancelled" }); throw new Error("Нет связи с сервером Anthropic. Проверьте интернет; в некоторых сетях доступ к api.anthropic.com может быть закрыт."); }
  let j = null; try { j = await r.json(); } catch (e) {}
  if (r.ok) return j;
  const m = j && j.error && j.error.message || "";
  if (r.status === 401) throw new Error("Ключ не принят: проверьте, что он скопирован полностью и не отозван.");
  if (r.status === 403) throw new Error("У ключа нет доступа к этой модели или API. " + m);
  if (r.status === 404) throw new Error("Модель не найдена для вашего ключа. Выберите другую модель.");
  if (r.status === 429) throw new Error("Слишком много запросов или достигнут лимит ключа. Подождите и попробуйте снова.");
  if (r.status === 529 || r.status >= 500) throw new Error("Сервис Anthropic временно перегружен. Попробуйте через минуту.");
  if (/credit|balance|billing/i.test(m)) throw new Error("На аккаунте Anthropic недостаточно средств. Пополните баланс в console.anthropic.com.");
  throw new Error("Запрос отклонён (" + r.status + "). " + m);
}
async function askViaKey(q, ctxIt) {
  const tools = AI_TOOLS.map(t => ({ name: t.name, description: t.description, input_schema: t.inputSchema }));
  const sys = AI_RULES + "\n\nИспользуй инструменты search_materials и get_material, прежде чем отвечать.";
  const msgs = CHAT.turns.slice(-8).map(t => ({ role: t.role, content: t.sent || t.content }));
  let shown = "";
  for (let round = 0; round < 6; round++) {
    const res = await anthropicCall({ key: BYOK.key, model: BYOK.model, system: sys, messages: msgs, tools, signal: CHAT.ctl.signal });
    const text = (res.content || []).filter(b => b.type === "text").map(b => b.text).join("\n").trim();
    if (text) { shown = shown ? shown + "\n\n" + text : text; drawChat(shown); }
    const calls = (res.content || []).filter(b => b.type === "tool_use");
    if (res.stop_reason !== "tool_use" || !calls.length) return { text: shown || "Модель не дала ответа. Попробуйте переформулировать вопрос.", truncated: res.stop_reason === "max_tokens" };
    msgs.push({ role: "assistant", content: res.content });
    const results = [];
    for (const c of calls) {
      const tool = AI_TOOLS.find(t => t.name === c.name); let out, isErr = false;
      try { out = tool ? await tool.execute(c.input || {}, { signal: CHAT.ctl.signal }) : "Неизвестный инструмент"; } catch (e) { out = "Ошибка: " + e.message; isErr = true; }
      results.push({ type: "tool_result", tool_use_id: c.id, content: typeof out === "string" ? out : JSON.stringify(out).slice(0, 30000), is_error: isErr || undefined });
    }
    msgs.push({ role: "user", content: results });
  }
  return { text: shown || "Не удалось завершить ответ за отведённое число шагов. Уточните вопрос.", truncated: true };
}
function drawChat(liveText) {
  const box = $("#chat"); if (!box) return;
  box.innerHTML = CHAT.turns.map(t => t.role === "user" ? `<div class="msg me"><div class="who">Вы</div>${esc(t.content)}</div>` : `<div class="msg"><div class="who">FIREBASE · ИИ-помощник</div><div class="prose">${md(t.content, null)}</div></div>`).join("")
    + (liveText != null ? `<div class="msg"><div class="who">FIREBASE · ИИ-помощник</div>${liveText ? `<div class="prose">${md(liveText, null)}</div>` : ""}<div class="thinking" id="aiStatus"><span class="spin"></span>Думаю…</div></div>` : "");
}
async function askAI(q) {
  if (!aiReady() || CHAT.busy || !q.trim()) return;
  CHAT.busy = true; $("#aiSend").disabled = true; $("#aiStop").hidden = false;
  const ctxIt = CHAT.context ? resolve(CHAT.context) : null;
  const userMsg = (ctxIt ? `[Вопрос задан со страницы материала ${ctxIt.key} — «${ctxIt.title}»]\n` : "") + q.trim();
  CHAT.turns.push({ role: "user", content: q.trim(), sent: userMsg });
  drawChat("");
  CHAT.ctl = new AbortController();
  try {
    let res;
    if (aiMode() === "key") res = await askViaKey(q, ctxIt);
    else {
      let canTools = false; try { canTools = !!(await CAP.sample.limits()).tools; } catch (e) {}
      let preamble = AI_RULES;
      if (!canTools) { const hits = search(q).results.slice(0, 4).map(r => itemDoc(r.it)); if (ctxIt) hits.unshift(itemDoc(ctxIt)); preamble += "\n\nМатериалы платформы по запросу:\n" + JSON.stringify(hits).slice(0, 60000); }
      else preamble += "\n\nИспользуй инструменты search_materials и get_material, прежде чем отвечать.";
      const turns = [{ role: "user", content: preamble }, ...CHAT.turns.slice(-8).map(t => ({ role: t.role, content: t.sent || t.content }))];
      const opts = { signal: CHAT.ctl.signal, onText: ({ text }) => drawChat(text) };
      if (canTools) opts.tools = AI_TOOLS; else opts.cache = false;
      res = await CAP.sample(turns, opts);
    }
    CHAT.turns.push({ role: "assistant", content: res.text + (res.truncated ? "\n\n> Ответ обрезан по длине — уточните вопрос." : "") });
  } catch (e) {
    const msg = aiMode() === "key" ? (e && e.message || "Не удалось получить ответ.") : ({ cancelled: "Ответ остановлен.", not_granted: "Доступ к Claude для этой страницы не разрешён. Разрешение можно выдать в меню разрешений артефакта.", sampling_disabled: "Claude недоступен для этого аккаунта.", rate_limited: "Слишком много запросов или исчерпан лимит. Попробуйте позже.", session_expired: "Сессия истекла — войдите в Claude снова.", refused: "Модель отказалась отвечать на этот запрос. Переформулируйте вопрос.", prompt_too_large: "Запрос слишком большой — сократите вопрос.", empty_completion: "Пустой ответ — попробуйте упростить вопрос." }[e && e.code] || "Не удалось получить ответ из-за временной ошибки. Попробуйте ещё раз.");
    CHAT.turns.push({ role: "assistant", content: (e && e.text ? e.text + "\n\n" : "") + "> " + msg });
    if (aiMode() === "claude" && e && (e.code === "not_granted" || e.code === "sampling_disabled")) CAP.sample = null;
  }
  CHAT.busy = false; drawChat(); if ($("#aiSend")) { $("#aiSend").disabled = !aiReady(); $("#aiStop").hidden = true; }
}

/* ===== FAVORITES & PROFILE ===== */
function storageBanner() {
  return STORE.mode === "account"
    ? `<div class="banner"><span>${I.user}</span><span>Данные сохраняются в вашем аккаунте Claude${STORE.name ? " (" + esc(STORE.name) + ")" : ""} и доступны на других устройствах, где вы открываете FIREBASE. Они видны только вам.</span></div>`
    : `<div class="banner warn"><span>${I.info}</span><span><b>Демонстрационный режим.</b> Избранное, история и результаты хранятся только в этом браузере и не синхронизируются между устройствами. Синхронизация включается автоматически, если открыть FIREBASE в Claude под своим аккаунтом.</span></div>`;
}
function vFav() {
  setMeta("Избранное");
  const items = S.favorites.map(resolve).filter(Boolean), reading = S.reading.map(resolve).filter(Boolean);
  const grp = (t, list) => list.length ? `<section class="sec"><h2 class="h2" style="margin-bottom:12px">${t} · ${list.length}</h2><div class="grid">${list.map(cardAny).join("")}</div></section>` : "";
  return `${crumbs([["Избранное"]])}<h1 class="h1">Избранное</h1><div style="margin-top:14px">${storageBanner()}</div>
  ${items.length ? grp("Разборы пожаров", items.filter(i => i.type === "fire")) + grp("Справочник", items.filter(i => i.type === "ref")) + grp("Книги", items.filter(i => i.type === "book")) + grp("Документы", items.filter(i => i.type === "norm")) + grp("Обучение", items.filter(i => ["test", "scen", "calc", "cards"].includes(i.type))) : `<div class="empty" style="margin-top:20px"><b>В избранном пока пусто</b>Нажмите на звёздочку на любой карточке, чтобы сохранить материал.</div>`}
  <section class="sec"><h2 class="h2" style="margin-bottom:12px">Книги для изучения · ${reading.length}</h2>${reading.length ? `<div class="grid g2">${reading.map(cardBook).join("")}</div>` : '<p class="muted">Добавляйте книги кнопкой «Изучить позже» на странице книги.</p>'}</section>`;
}
function vProfile() {
  setMeta("Профиль");
  const hist = S.history.map(h => ({ ...h, it: resolve(h.key) })).filter(h => h.it);
  const tests = new Set(S.results.map(r => r.id)).size, know = Object.values(S.cards).filter(v => v === "know").length;
  return `${crumbs([["Профиль"]])}<h1 class="h1">Профиль</h1>
  <div class="grid g2" style="margin-top:18px">
   <div class="panel stack"><span class="eyebrow">Учётная запись</span>${STORE.mode === "account" ? `<p style="margin:0"><b>${esc(STORE.name || "Пользователь Claude")}</b><br><span class="small muted">Вход выполнен через ваш аккаунт Claude. Регистрация и выход управляются в Claude; FIREBASE не хранит пароли.</span></p>${IS_ADMIN ? `<p class="small" style="margin:0">Роль: <b>редактор</b> — доступна <a href="#admin" style="color:var(--red-ink)">админ-панель</a>.</p>` : `<p class="small muted" style="margin:0">Роль: читатель. <a href="#login" style="color:var(--red-ink)">Как получить права редактора</a></p>`}` : `<p style="margin:0"><b>Гость (демо-режим)</b><br><span class="small muted">Отдельной регистрации в FIREBASE нет: учётной записью служит аккаунт Claude. Откройте страницу в Claude, чтобы данные сохранялись в аккаунте.</span></p>`}${storageBanner()}</div>
   <div class="panel stack"><span class="eyebrow">Прогресс обучения</span><dl class="facts"><div><dt>Пройдено тестов</dt><dd class="mono">${tests} из ${TESTS.length}</dd></div><div><dt>Попыток</dt><dd class="mono">${S.results.length}</dd></div><div><dt>Карточек «знаю»</dt><dd class="mono">${know} из ${CARDS.length}</dd></div><div><dt>В избранном</dt><dd class="mono">${S.favorites.length}</dd></div></dl><a class="btn sm" href="#results">История результатов</a><a class="btn sm" href="#mylib">Моя библиотека</a></div>
  </div>
  <section class="sec"><h2 class="h2">Настройки интерфейса</h2><div class="panel stack" style="margin-top:12px;max-width:560px">
   <div class="field"><span class="lbl" id="thL">Тема оформления</span><div class="thgrid" role="group" aria-labelledby="thL">${THEMES.map(([k, t, d, c]) => `<button class="thcard" data-theme-set="${k}" aria-pressed="${S.settings.theme === k}"><span class="pv" style="background:${c[0]}"><i style="background:${c[1]};width:70%"></i><i style="background:${c[2]};width:35%"></i></span><b>${t}</b><span class="small muted">${d}</span></button>`).join("")}</div><span class="small muted">Тему также можно переключить кнопкой в верхней панели. Выбор сохраняется ${STORE.mode === "account" ? "в вашем аккаунте" : "в этом браузере"}.</span></div>
   <label class="row" style="gap:10px;cursor:pointer"><input type="checkbox" id="histOn" ${S.historyOn ? "checked" : ""} style="accent-color:var(--red);width:18px;height:18px"> Сохранять историю просмотров</label>
  </div></section>
  <section class="sec"><div class="sec-h"><h2 class="h2">История просмотров</h2>${hist.length ? '<button class="btn ghost sm" data-histclear>Очистить</button>' : ""}</div>${!S.historyOn ? '<p class="muted">История не сохраняется. Включите её в настройках выше, если хотите.</p>' : hist.length ? `<div class="list">${hist.map(h => `<a class="li" href="${href(h.it)}" style="grid-template-columns:150px 1fr"><span class="mono small">${new Date(h.at).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" })}</span><span><span class="kind">${TYPE[h.it.type].label}</span> ${esc(h.it.title)}</span></a>`).join("")}</div>` : '<p class="muted">Пока пусто.</p>'}</section>`;
}

/* ===== ADMIN LOGIN ===== */
function vLogin() {
  setMeta("Вход для администратора");
  const inClaude = !!CAP.db;
  let body;
  if (IS_ADMIN) body = `<div class="panel stack" style="max-width:620px;border-color:var(--ok)"><span class="eyebrow" style="color:var(--ok)">Вход выполнен</span><p style="margin:0"><b>${esc(STORE.name || "Владелец FIREBASE")}</b> — у вас права администратора.</p><p class="small muted" style="margin:0">Можно добавлять и редактировать пожары, статьи справочника, книги и документы, менять статусы публикации и смотреть журнал изменений.</p><div class="row"><a class="btn pri" href="#admin">${I.shield} Открыть админ-панель</a><button class="btn" data-new-go="fire">+ Добавить пожар</button></div></div>`;
  else if (inClaude) body = `<div class="panel stack" style="max-width:620px"><span class="eyebrow">Вы вошли, но без прав администратора</span><p style="margin:0">Аккаунт: <b>${esc(STORE.name || "пользователь Claude")}</b>. Права редактора выдаёт владелец FIREBASE.</p><ol style="margin:0;padding-left:20px"><li>Владелец открывает FIREBASE в Claude и нажимает «Поделиться».</li><li>Добавляет ваш аккаунт с уровнем доступа «Редактор».</li><li>Вы обновляете страницу — в верхней панели появится значок админ-панели.</li></ol></div>`;
  else body = `<div class="panel stack" style="max-width:620px"><span class="eyebrow">Как войти</span><p style="margin:0">Вход администратора — это ваш аккаунт Claude. Отдельный пароль не нужен: права проверяет сервер хранилища, поэтому их нельзя подделать в браузере.</p><ol style="margin:0;padding-left:20px"><li>Откройте FIREBASE в Claude (по ссылке артефакта), войдя в аккаунт владельца.</li><li>Страница сама определит, что вы владелец, и покажет значок щита в верхней панели.</li><li>Нажмите его — откроется админ-панель.</li></ol><p class="small muted" style="margin:0">Сейчас страница открыта вне Claude, поэтому вход недоступен.</p></div>`;
  return `${crumbs([["Вход для администратора"]])}<h1 class="h1">Вход для администратора</h1><p class="lead">Добавление и редактирование материалов доступно владельцу и редакторам.</p><div style="margin-top:18px">${body}</div>`;
}

/* ===== COMMUNITY ===== */
function vCommunity() {
  setMeta("Сообщество", "Обсуждения материалов и предложения по исправлению справочника");
  return `${crumbs([["Сообщество"]])}<h1 class="h1">Сообщество</h1><p class="lead">Обсуждение материалов, рецензии и предложения по исправлению справочника. На текущем этапе обсуждения ведутся в комментариях к материалам.</p>
  <div class="grid g2" style="margin-top:20px">
   <div class="panel stack"><span class="eyebrow">Работает сейчас</span><ul style="margin:0;padding-left:18px"><li>Кнопка «Обсудить или предложить правку» на странице любого материала открывает комментарий, привязанный к этому материалу.</li><li>Комментарии видят все, у кого есть доступ к FIREBASE; автор указывается автоматически.</li><li>Модерация (скрытие, удаление, закрытие обсуждений) выполняется владельцем и редакторами в панели комментариев Claude.</li></ul>${CAP.comments ? `<button class="btn pri sm" data-discuss style="align-self:start">${I.chat} Оставить общий отзыв о платформе</button>` : `<p class="small muted" style="margin:0">Комментарии доступны, когда FIREBASE открыт в Claude участником с правом комментирования.</p>`}</div>
   <div class="panel stack"><span class="eyebrow">Следующий этап</span><ul style="margin:0;padding-left:18px"><li>Публикации специалистов и пользовательские подборки</li><li>Рецензии на книги с оценками</li><li>Жалобы на публикации и защита от спама</li><li>Редактирование собственных публикаций и разграничение прав</li></ul><p class="small muted" style="margin:0">Структура данных для этого предусмотрена в схеме серверной версии (таблицы Comments, AuditLogs, роли пользователей).</p></div>
  </div>`;
}

/* ===== SITEMAP / ABOUT ===== */
function vSitemap() {
  setMeta("Карта сайта");
  const g = t => [...ITEMS.values()].filter(x => x.type === t && visible(x));
  const lst = (title, h, items) => `<section class="sec"><h2 class="h3"><a href="${h}">${title}</a></h2><ul style="margin:8px 0 0;padding-left:18px">${items.map(it => `<li><a href="${href(it)}" style="color:var(--red-ink)">${esc(it.title)}</a></li>`).join("")}</ul></section>`;
  return `${crumbs([["Карта сайта"]])}<h1 class="h1">Карта сайта</h1>${lst("Справочник РТП", "#ref", g("ref"))}${lst("Реальные пожары", "#fires", g("fire"))}${lst("Библиотека", "#lib", g("book"))}${lst("Нормативная база", "#norms", g("norm"))}${lst("Обучение", "#learn", [...g("test"), ...g("scen"), ...g("calc"), resolve("learn.cards")])}
  <section class="sec"><h2 class="h3">Сервисы</h2><ul style="margin:8px 0 0;padding-left:18px">${[["#search", "Поиск"], ["#map", "Карта пожаров"], ["#compare", "Сравнение пожаров"], ["#ai", "ИИ-помощник"], ["#community", "Сообщество"], ["#about", "О проекте и достоверности"]].map(([h, t]) => `<li><a href="${h}" style="color:var(--red-ink)">${t}</a></li>`).join("")}</ul></section>`;
}
function vAbout() {
  setMeta("О проекте", "Принципы достоверности FIREBASE");
  return `${crumbs([["О проекте"]])}<h1 class="h1">О проекте и принципах достоверности</h1><div class="prose" style="margin-top:16px">
  <p>FIREBASE — база знаний для руководителей тушения пожаров, личного состава пожарно-спасательных подразделений, курсантов, преподавателей и специалистов по пожарной безопасности.</p>
  <h2>Пометки достоверности</h2><div class="legend">${Object.keys(REL).map(relBadge).join("")}</div>
  <ul><li><b>Подтверждённый факт</b> — сведения, одинаково изложенные в источниках.</li><li><b>Вывод расследования / суда</b> — версия следствия, приговор или вывод официального отчёта.</li><li><b>Предварительные сведения</b> — данные СМИ на раннем этапе или вторичных источников, требующие сверки.</li><li><b>Интерпретация редакции</b> — учебные вопросы и комментарии, не являющиеся выводами расследования.</li><li><b>Не установлено</b> — сведения отсутствуют в использованных материалах.</li></ul>
  <h2>Нормативные документы</h2><p>Документ не называется действующим, пока его статус не сверен с официальным порталом. Утратившие силу документы помечаются отдельно.</p>
  <h2>Текущее наполнение</h2><p>Это стартовая версия с небольшим набором материалов. Все сведения о реальных пожарах взяты из указанных источников ${fmtDate(VERIFIED)}. Статистика по количеству пожаров или пользователей не публикуется.</p>
  <h2>Изображения</h2><p>Фотографии реальных пожаров не размещаются, пока не подтверждено право на их использование.</p></div>`;
}

/* ===== ADMIN ===== */
let ADM = { edit: null, confirm: null, audit: [] };
const KIND_LABEL = { ref: "Справочная статья", fire: "Происшествие", book: "Книга", norm: "Нормативный документ" };
const FORM = {
  ref: [["id", "Идентификатор (латиница, дефисы)"], ["title", "Название"], ["cat", "Категория", REF_CATS], ["summary", "Краткое описание", "area"], ["updated", "Дата проверки (ГГГГ-ММ-ДД)"], ["tags", "Теги через запятую"], ["related", "Связанные материалы (ключи через запятую)"], ["body", "Основной текст (разметка: ## заголовок, - список, | таблица |, [[ключ]])", "big"]],
  fire: [["id", "Идентификатор"], ["title", "Название"], ["cat", "Тип объекта", FIRE_CATS], ["date", "Дата (ГГГГ-ММ-ДД)"], ["dateText", "Дата текстом"], ["city", "Город"], ["region", "Регион"], ["country", "Страна"], ["lat", "Широта (пусто, если неизвестна)"], ["lon", "Долгота"], ["geo", "Точность координат (город/район)"], ["deathsText", "Погибшие (текст)"], ["deaths", "Погибшие (число или пусто)"], ["injured", "Пострадавшие"], ["status", "Статус расследования"], ["summary", "Краткое описание", "area"], ["tags", "Теги"], ["related", "Связанные материалы (ключи)"]],
  book: [["id", "Идентификатор"], ["title", "Название"], ["author", "Автор"], ["year", "Год (пусто, если не подтверждён)"], ["publisher", "Издательство"], ["cat", "Тематика", BOOK_CATS], ["lang", "Язык"], ["pages", "Объём"], ["isbn", "ISBN"], ["url", "Ссылка на легальный источник"], ["fragment", "Доступность фрагмента"], ["summary", "Описание", "area"], ["tags", "Теги"], ["fires", "Связанные пожары (идентификаторы)"]],
  norm: [["id", "Идентификатор"], ["number", "Номер"], ["title", "Название"], ["type", "Тип", NORM_TYPES], ["adopted", "Дата принятия"], ["effective", "Вступление в силу"], ["issuer", "Орган"], ["reg", "Регистрация"], ["docStatus", "Статус документа", Object.entries(DOC_STATUS).map(([k, v]) => [k, v[0]])], ["checked", "Дата проверки"], ["summary", "Краткое содержание", "area"], ["history", "История изменений", "area"], ["tags", "Теги"], ["related", "Связанные (ключи)"]]
};
const LISTF = ["tags", "related", "fires"];
function vAdmin() {
  setMeta("Админ-панель");
  if (!CAP.db) return `${crumbs([["Админ-панель"]])}<h1 class="h1">Админ-панель</h1><div class="empty" style="margin-top:20px"><b>Недоступно в этом окне</b>Админ-панель работает, когда FIREBASE открыт в Claude. <a href="#login" style="color:var(--red-ink)">Как войти как администратор</a></div>`;
  if (!IS_ADMIN) return `${crumbs([["Админ-панель"]])}<h1 class="h1">Админ-панель</h1><div class="empty" style="margin-top:20px"><b>Нет доступа</b>Редактирование доступно владельцу и редакторам FIREBASE. <a href="#login" style="color:var(--red-ink)">Как получить доступ</a></div>`;
  if (ADM.edit) return adminForm();
  const rows = [...ITEMS.values()].filter(it => KIND_LABEL[it.type]).sort((a, b) => a.type.localeCompare(b.type) || a.title.localeCompare(b.title, "ru"));
  return `${crumbs([["Админ-панель"]])}<h1 class="h1">Админ-панель</h1><p class="lead">Добавление и редактирование материалов, статусы публикации, связи и журнал изменений. Запись разрешена только редакторам — правило задано на сервере хранилища.</p>
  <div class="row" style="margin-top:16px">${Object.entries(KIND_LABEL).map(([k, t]) => `<button class="btn sm" data-new="${k}">+ ${t}</button>`).join("")}</div>
  <div class="tblw" style="margin-top:18px"><table class="admin-tbl"><thead><tr><th>Тип</th><th>Название</th><th>Статус</th><th>Источник записи</th><th></th></tr></thead><tbody>${rows.map(it => `<tr><td class="small">${KIND_LABEL[it.type]}</td><td><a href="${href(it)}">${esc(it.title)}</a></td><td>${badge(it.status === "published" ? "b-fact" : it.status === "needs-update" ? "b-prelim" : "b-none", STATUS_LABEL[it.status])}</td><td class="small muted">${it.obj._cms ? "изменено в админ-панели" + (it.obj._updatedAt ? " · " + new Date(it.obj._updatedAt).toLocaleDateString("ru-RU") : "") : "исходное наполнение"}</td><td style="white-space:nowrap"><button class="btn sm" data-edit="${esc(it.key)}">Изменить</button> ${ADM.confirm === it.key ? `<span class="confirm" style="display:inline-flex;padding:4px 8px">${it.obj._cms && !SEED[it.type].some(x => x.id === it.obj.id) ? "Удалить навсегда?" : "Перевести в архив?"} <button class="btn sm pri" data-del-yes="${esc(it.key)}">Да</button><button class="btn sm" data-del-no>Нет</button></span>` : `<button class="btn sm ghost" data-del="${esc(it.key)}">Удалить</button>`}</td></tr>`).join("")}</tbody></table></div>
  <section class="sec"><div class="sec-h"><h2 class="h2">Журнал изменений</h2><button class="btn ghost sm" data-audit>Обновить</button></div><div id="auditBox">${auditHtml()}</div></section>
  <section class="sec"><h2 class="h2">Роли и модерация</h2><div class="prose small" style="margin-top:8px"><ul><li>Роли назначаются в меню «Поделиться» FIREBASE в Claude: «Редактор» — правка материалов, «Участник» и «Читатель» — чтение и личные данные.</li><li>Комментарии модерируются в панели комментариев Claude.</li><li>Загрузка изображений и файлов, управление тегами и категориями отдельными справочниками — следующий этап; сейчас теги и категории задаются в форме материала.</li></ul></div></section>`;
}
function auditHtml() { return ADM.audit.length ? `<div class="tblw"><table class="admin-tbl"><thead><tr><th>Когда</th><th>Действие</th><th>Материал</th><th>Кто</th></tr></thead><tbody>${ADM.audit.map(a => `<tr><td class="mono small">${new Date(a.at).toLocaleString("ru-RU")}</td><td>${esc(a.action)}</td><td>${esc(a.title)}</td><td class="small">${esc(a.byName || "редактор")}</td></tr>`).join("")}</tbody></table></div>` : '<p class="muted">Записей пока нет.</p>'; }
async function loadAudit() { try { const s = await CAP.db.collection("audit").orderBy("at", "desc").limit(50).get(); ADM.audit = s.docs.map(d => d.data()); const b = $("#auditBox"); if (b) b.innerHTML = auditHtml(); } catch (e) {} }
function adminForm() {
  const { kind, key } = ADM.edit, it = key ? resolve(key) : null, o = it ? it.obj : {};
  const val = (f) => { const v = o[f]; return Array.isArray(v) ? v.join(", ") : v ?? ""; };
  const fields = FORM[kind].map(([f, label, opt]) => {
    const id = "af-" + f;
    if (Array.isArray(opt)) return `<div class="field"><label for="${id}">${label}</label><select id="${id}" class="inp">${opt.map(([k, t]) => `<option value="${k}" ${o[f] === k ? "selected" : ""}>${t}</option>`).join("")}</select></div>`;
    if (opt === "area" || opt === "big") return `<div class="field wide"><label for="${id}">${label}</label><textarea id="${id}" class="inp" ${opt === "big" ? 'style="min-height:300px"' : ""}>${esc(val(f))}</textarea></div>`;
    return `<div class="field"><label for="${id}">${label}</label><input id="${id}" class="inp" value="${esc(val(f))}" ${f === "id" && it ? "readonly" : ""}></div>`;
  }).join("");
  const secs = kind === "fire" ? `<div class="wide"><h2 class="h3" style="margin:10px 0">Разделы разбора</h2><p class="small muted">Для каждого раздела укажите уровень достоверности. Ссылки на источники — {{id_источника}}.</p>${INC_SECTIONS.filter(([k]) => !["timeline", "docs", "books", "sources"].includes(k)).map(([k, t]) => { const s = o.sections?.[k] || { s: "none", t: "" }; return `<div class="formgrid" style="margin-top:10px"><div class="field"><label for="as-${k}">${t}: достоверность</label><select id="as-${k}" class="inp">${Object.entries(REL).map(([rk, rv]) => `<option value="${rk}" ${s.s === rk ? "selected" : ""}>${rv[0]}</option>`).join("")}</select></div><div class="field wide"><label for="at-${k}">${t}: текст</label><textarea id="at-${k}" class="inp">${esc(s.t)}</textarea></div></div>`; }).join("")}</div>` : "";
  const own = (o.sources || []).map((sid, n) => SOURCES[sid] ? `<li><code>{{${n + 1}}}</code> — ${esc(SOURCES[sid].title)}</li>` : "").join("");
  const extra = (o.extraSources || []).map(x => [x.title, x.url || "", x.org || ""].join(" | ")).join("\n");
  const tl = kind === "fire" ? (o.timeline || []).map(t => [t.when, t.text, { fact: "факт", official: "офиц", prelim: "предв" }[t.s] || "факт", t.src && (o.sources || []).indexOf(t.src) >= 0 ? (o.sources.indexOf(t.src) + 1) : ""].join(" | ")).join("\n") : "";
  const srcBlock = `<div class="wide"><h2 class="h3" style="margin:10px 0">Источники</h2>${own ? `<p class="small muted" style="margin:0 0 6px">Уже привязанные источники. Чтобы сослаться в тексте, вставьте номер в двойных фигурных скобках:</p><ul class="small" style="margin:0 0 10px;padding-left:18px">${own}</ul>` : ""}<div class="field"><label for="af-_src">Добавить источники — по одному в строке: Название | ссылка | организация</label><textarea id="af-_src" class="inp" placeholder="Приговор по делу о пожаре | https://example.ru/news | Название издания">${esc(extra)}</textarea><span class="small muted">Новые источники получают следующие номера после уже привязанных.</span></div></div>`;
  const tlBlock = kind === "fire" ? `<div class="wide"><h2 class="h3" style="margin:10px 0">Хронология</h2><div class="field"><label for="af-_tl">По одному событию в строке: дата/время | событие | факт, офиц или предв | номер источника</label><textarea id="af-_tl" class="inp" placeholder="23.10.2026, 14:10 | Обрушение стены | факт | 1">${esc(tl)}</textarea></div></div>` : "";
  return `${crumbs([["Админ-панель", "#admin"], [it ? "Редактирование" : "Новый материал"]])}<h1 class="h1">${it ? "Редактирование" : "Новый материал"}: ${KIND_LABEL[kind]}</h1>
  <form id="admForm" class="panel" style="margin-top:18px" novalidate><div class="formgrid">${fields}<div class="field"><label for="af-_status">Статус публикации</label><select id="af-_status" class="inp">${Object.entries(STATUS_LABEL).map(([k, t]) => `<option value="${k}" ${(it ? it.status : "draft") === k ? "selected" : ""}>${t}</option>`).join("")}</select></div>${secs}${srcBlock}${tlBlock}</div>
  <p class="ferr" id="admErr" role="alert" hidden></p><div class="row" style="margin-top:16px"><button class="btn pri" type="submit" id="admSave">Сохранить</button><button class="btn" type="button" data-cancel>Отмена</button></div></form>`;
}
async function adminSave(e) {
  e.preventDefault(); const { kind, key } = ADM.edit, it = key ? resolve(key) : null, err = $("#admErr");
  const o = it ? JSON.parse(JSON.stringify(it.obj)) : {};
  FORM[kind].forEach(([f]) => { let v = $("#af-" + f).value.trim(); if (LISTF.includes(f)) v = v ? v.split(",").map(x => x.trim()).filter(Boolean) : []; if (["lat", "lon", "deaths", "year"].includes(f)) v = v === "" ? null : Number(v.replace(",", ".")); o[f] = v; });
  if (kind === "fire") { o.sections = o.sections || {}; INC_SECTIONS.forEach(([k]) => { if ($("#as-" + k)) o.sections[k] = { s: $("#as-" + k).value, t: $("#at-" + k).value.trim() }; }); o.cats = o.cats?.length ? o.cats : [o.cat]; o.timeline = o.timeline || []; o.sources = o.sources || []; o.books = o.books || []; }
  if (kind === "ref") { o.sources = o.sources || []; } if (kind === "norm") { o.refs = o.refs || []; o.sources = o.sources || []; } if (kind === "book") { o.cats = [o.cat]; o.docs = o.docs || []; o.sources = o.sources || []; }
  const fail = (m, id) => { err.hidden = false; err.textContent = m; if (id) $("#" + id)?.focus(); };
  o.sources = (o.sources || []).filter(s => !s.startsWith("x_"));
  const srcLines = $("#af-_src").value.split("\n").map(l => l.trim()).filter(Boolean);
  o.extraSources = [];
  for (const l of srcLines) { const [title, url, org] = l.split("|").map(x => (x || "").trim()); if (!title) return fail("В строке источника нет названия: «" + l + "».", "af-_src"); if (url && !/^https?:\/\//.test(url)) return fail("Ссылка источника должна начинаться с http:// или https://: «" + url + "».", "af-_src"); o.extraSources.push({ title, url: url || null, org: org || "", accessed: new Date().toISOString() }); }
  if (kind === "fire") {
    const allSrc = [...o.sources, ...o.extraSources.map((x, n) => "x_fire_" + (o.id || "").replace(/[^a-z0-9]/g, "_") + "_" + n)];
    const M = { "факт": "fact", "офиц": "official", "предв": "prelim" };
    o.timeline = [];
    for (const l of $("#af-_tl").value.split("\n").map(x => x.trim()).filter(Boolean)) { const [when, text, rel, num] = l.split("|").map(x => (x || "").trim()); if (!when || !text) return fail("В строке хронологии нужны дата и событие: «" + l + "».", "af-_tl"); const s = M[(rel || "факт").toLowerCase()]; if (!s) return fail("Достоверность в хронологии — «факт», «офиц» или «предв»: «" + l + "».", "af-_tl"); const n = num ? parseInt(num, 10) : 0; if (num && !(n >= 1 && n <= allSrc.length)) return fail("Номер источника в хронологии должен быть от 1 до " + allSrc.length + ": «" + l + "».", "af-_tl"); o.timeline.push({ when, text, s, src: n ? allSrc[n - 1] : null }); }
  }
  if (!/^[a-z0-9][a-z0-9-]{1,60}$/.test(o.id || "")) return fail("Идентификатор: 2–60 символов, латиница в нижнем регистре, цифры и дефисы.", "af-id");
  if (!o.title || o.title.length < 3) return fail("Укажите название.", "af-title");
  if (!it && ITEMS.has(kind + "." + o.id)) return fail("Материал с таким идентификатором уже есть.", "af-id");
  for (const f of ["lat", "lon", "deaths", "year"]) if (f in o && o[f] !== null && !Number.isFinite(o[f])) return fail("Поле «" + f + "» должно быть числом или пустым.", "af-" + f);
  if (kind === "fire" && o.lat != null && (o.lat < -90 || o.lat > 90 || o.lon == null || o.lon < -180 || o.lon > 180)) return fail("Координаты: широта от −90 до 90 и долгота от −180 до 180. Если местоположение неизвестно, оставьте оба поля пустыми.", "af-lat");
  for (const d of ["date", "updated", "adopted", "checked", "effective"]) if (o[d] && !/^\d{4}(-\d{2}){0,2}$/.test(o[d])) return fail("Даты в формате ГГГГ-ММ-ДД.", "af-" + d);
  if (kind === "book" && o.url && !/^https?:\/\//.test(o.url)) return fail("Ссылка должна начинаться с http:// или https://.", "af-url");
  const status = $("#af-_status").value; delete o._status; delete o._cms; delete o._updatedAt;
  $("#admSave").disabled = true;
  try {
    const now = new Date().toISOString(); const uid = STORE.uid;
    await CAP.db.collection("cms").doc(kind + "~" + o.id).set({ kind, status, data: o, updatedAt: now, by: uid || null });
    try { await CAP.db.collection("audit").add({ at: now, action: it ? "изменение (" + STATUS_LABEL[status] + ")" : "создание (" + STATUS_LABEL[status] + ")", title: o.title, key: kind + "." + o.id, by: uid || null, byName: STORE.name || "" }); } catch (e2) {}
    ADM.edit = null; toast("Сохранено"); location.hash = "admin"; route();
  } catch (ex) { $("#admSave").disabled = false; fail(ex && ex.code === "invalid_argument" ? "Сервер отклонил запись: нет прав редактора или данные некорректны." : ex && ex.code === "quota_exceeded" ? "Хранилище заполнено — удалите ненужные материалы." : "Не удалось сохранить. Попробуйте ещё раз."); }
}
async function adminDelete(key) {
  const it = resolve(key); if (!it) return; const docId = it.type + "~" + it.obj.id; const seed = SEED[it.type].some(x => x.id === it.obj.id);
  try {
    if (seed) await CAP.db.collection("cms").doc(docId).set({ kind: it.type, status: "archive", data: Object.fromEntries(Object.entries(it.obj).filter(([k]) => !k.startsWith("_"))), updatedAt: new Date().toISOString(), by: STORE.uid || null });
    else await CAP.db.collection("cms").doc(docId).delete();
    try { await CAP.db.collection("audit").add({ at: new Date().toISOString(), action: seed ? "перевод в архив" : "удаление", title: it.title, key, by: STORE.uid || null, byName: STORE.name || "" }); } catch (e2) {}
    toast(seed ? "Переведено в архив" : "Удалено");
  } catch (e) { toast("Не удалось: нет прав или ошибка сети"); }
  ADM.confirm = null; route(true);
}

/* ===== after render, events, init ===== */
function afterRender(r) {
  if (CAT_DEF[r.view] && !r.arg) bindCatalog(r.view);
  if (r.view === "map") bindMap();
  if (r.view === "book" && $("#diary")) diaryBind("book." + r.arg);
  if (r.view === "read" && RD) readerBind();
  if (r.view === "test") drawTest();
  if (r.view === "learn" && r.arg === "cards") drawDeck();
  if (r.view === "scen") drawScen();
  if (r.view === "calc") $("#calcForm")?.addEventListener("submit", calcSubmit);
  if (r.view === "home") { bindAC($("#heroQ"), q => { if (!q.trim()) return; SEARCH_Q = q; rememberSearch(q); location.hash = "search"; }); $("#heroForm").addEventListener("submit", e => e.preventDefault()); }
  if (r.view === "search") { const i = $("#sQ"); const go = q => { SEARCH_Q = q; rememberSearch(q); $("#sOut").innerHTML = searchOut(); }; bindAC(i, go); $("#sForm").addEventListener("submit", e => e.preventDefault()); if (!SEARCH_Q) i.focus(); }
  if (r.view === "ai") { $("#keyForm")?.addEventListener("submit", keySubmit); drawChat(); if (CHAT.turns.length) drawChat(); $("#aiForm")?.addEventListener("submit", e => { e.preventDefault(); const q = $("#aiQ").value; if (!q.trim()) return; $("#aiQ").value = ""; askAI(q); }); $("#aiQ")?.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); $("#aiForm").requestSubmit(); } }); $("#aiStop")?.addEventListener("click", () => CHAT.ctl?.abort()); if (!CHAT.turns.length && CHAT.pending) { $("#aiQ").value = CHAT.pending; CHAT.pending = null; } }
  if (r.view === "admin") { if (ADM.edit) $("#admForm")?.addEventListener("submit", adminSave); else if (IS_ADMIN && CAP.db) loadAudit(); }
  if (r.view === "profile") $("#histOn")?.addEventListener("change", e => { S.historyOn = e.target.checked; if (!S.historyOn) S.history = []; persist(); route(true); });
}
document.addEventListener("click", e => {
  const fav = e.target.closest("[data-fav]"); if (fav) { e.preventDefault(); toggleFav(fav.dataset.fav); return; }
  const sc = e.target.closest("[data-scroll]"); if (sc) { const el = document.getElementById(sc.dataset.scroll); if (el) { el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); el.setAttribute("tabindex", "-1"); el.focus({ preventScroll: true }); } return; }
  const src = e.target.closest("[data-src]"); if (src) { const li = document.getElementById("src-" + src.dataset.src); if (li) { li.scrollIntoView({ behavior: "smooth", block: "center" }); li.classList.add("hl"); setTimeout(() => li.classList.remove("hl"), 1800); } return; }
  const tl = e.target.closest("[data-tl]"); if (tl) { const li = tl.closest("li"); li.classList.toggle("open"); tl.setAttribute("aria-expanded", li.classList.contains("open")); return; }
  const pre = e.target.closest("[data-preset]"); if (pre) { COMPARE = new Set(pre.dataset.preset.split(",")); }
  if (e.target.closest("[data-cmpclear]")) { COMPARE.clear(); $$("[data-cmp]").forEach(c => c.checked = false); updCmpBar(); return; }
  const rd = e.target.closest("[data-reading]"); if (rd) { const k = rd.dataset.reading, i = S.reading.indexOf(k); if (i >= 0) S.reading.splice(i, 1); else S.reading.unshift(k); persist(); rd.setAttribute("aria-pressed", i < 0); rd.querySelector("span").textContent = i < 0 ? "В списке для изучения" : "Изучить позже"; toast(i < 0 ? "Добавлено в список для изучения" : "Убрано из списка"); return; }
  const ask = e.target.closest("[data-ask]"); if (ask) { CHAT.context = ask.dataset.ask; return; }
  const askq = e.target.closest("[data-askq]"); if (askq) { CHAT.pending = askq.dataset.askq; return; }
  if (e.target.closest("[data-ctxclear]")) { CHAT.context = null; route(); return; }
  const aiq = e.target.closest("[data-aiq]"); if (aiq) { if (aiReady()) askAI(aiq.dataset.aiq); else { toast("Сначала подключите ключ Anthropic"); $("#keyInp")?.focus(); } return; }
  if (e.target.closest("[data-key-edit]")) { CHAT.editKey = true; route(); return; }
  if (e.target.closest("[data-key-cancel]")) { CHAT.editKey = false; route(); return; }
  if (e.target.closest("[data-key-forget]")) { forgetKey(); toast("Ключ удалён с этого устройства"); route(); return; }
  const disc = e.target.closest("[data-discuss]"); if (disc && CAP.comments) { const target = $("#artMain header") || $("h1"); CAP.comments.openComposer({ element: target }).then(r => { if (!r.opened) toast("Откройте комментарий ещё раз, кликнув по странице"); }).catch(() => toast("Комментарии недоступны в этом окне")); return; }
  const st = e.target.closest("[data-stype]"); if (st) { SEARCH_TYPE = st.dataset.stype; $$("[data-stype]").forEach(b => b.setAttribute("aria-pressed", b === st)); $("#sOut").innerHTML = searchOut(); return; }
  const sq = e.target.closest("[data-sq]"); if (sq) { SEARCH_Q = sq.dataset.sq; $("#sQ").value = SEARCH_Q; rememberSearch(SEARCH_Q); $("#sOut").innerHTML = searchOut(); return; }
  if (e.target.closest("[data-sclear]")) { S.searches = []; persist(); $("#sOut").innerHTML = searchOut(); return; }
  const th = e.target.closest("[data-theme-set]"); if (th) { setTheme(th.dataset.themeSet); closeThemeMenu(); return; }
  if (e.target.closest("#themeBtn")) { toggleThemeMenu(); return; }
  if (!e.target.closest("#thmenu")) closeThemeMenu();
  if (e.target.closest("[data-histclear]")) { S.history = []; persist(); route(true); return; }
  const ng = e.target.closest("[data-new-go]"); if (ng) { ADM.edit = { kind: ng.dataset.newGo, key: null }; location.hash = "admin"; return; }
  if (CUR.view === "test") testClick(e);
  if (CUR.view === "learn" && CUR.arg === "cards") cardsClick(e);
  if (CUR.view === "scen") scenClick(e);
  if (CUR.view === "admin") {
    const n = e.target.closest("[data-new]"); if (n) { ADM.edit = { kind: n.dataset.new, key: null }; route(); return; }
    const ed = e.target.closest("[data-edit]"); if (ed) { const it = resolve(ed.dataset.edit); ADM.edit = { kind: it.type, key: it.key }; route(); return; }
    if (e.target.closest("[data-cancel]")) { ADM.edit = null; route(); return; }
    const d = e.target.closest("[data-del]"); if (d) { ADM.confirm = d.dataset.del; route(true); return; }
    if (e.target.closest("[data-del-no]")) { ADM.confirm = null; route(true); return; }
    const dy = e.target.closest("[data-del-yes]"); if (dy) { adminDelete(dy.dataset.delYes); return; }
    if (e.target.closest("[data-audit]")) { loadAudit(); return; }
  }
});
document.addEventListener("change", e => {
  const c = e.target.closest("[data-cmp]"); if (!c) return;
  const id = c.dataset.cmp; if (c.checked) COMPARE.add(id); else COMPARE.delete(id);
  $$(`[data-cmp="${CSS.escape(id)}"]`).forEach(x => x.checked = c.checked);
  updCmpBar(); if (CUR.view === "compare") route(true);
});
document.addEventListener("keydown", e => {
  if ((e.key === " " || e.key === "Enter") && e.target.id === "flip") { e.preventDefault(); e.target.click(); }
  if ((e.key === "Enter" || e.key === " ") && e.target.matches("[data-src]")) { e.preventDefault(); e.target.click(); }
  if (e.key === "/" && !e.target.closest("input,textarea,select")) { e.preventDefault(); location.hash = "search"; }
});
function toggleThemeMenu() { const m = $("#thmenu"); if (m) return closeThemeMenu(); $(".tools").insertAdjacentHTML("beforeend", themeMenu()); $("#themeBtn").setAttribute("aria-expanded", "true"); $("#thmenu button[aria-checked=true]")?.focus(); }
function closeThemeMenu() { const m = $("#thmenu"); if (!m) return; m.remove(); $("#themeBtn").setAttribute("aria-expanded", "false"); }
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#thmenu")) { closeThemeMenu(); $("#themeBtn").focus(); } });
window.addEventListener("hashchange", () => { closeThemeMenu(); if (parseHash().view !== "admin") ADM.edit = null; route(); $(".mpop")?.remove(); });
window.addEventListener("resize", () => { if (CUR.view === "map") drawMap(); });

buildIndex();
$("#burger").addEventListener("click", openDrawer);
route();
initCaps();

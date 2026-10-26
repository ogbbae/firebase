/* ===== Библиотека: доступ, читалка, заметки, дневник чтения ===== */
BOOKS.unshift({ id: "pravila-sizod", title: "Правила использования средств индивидуальной защиты органов дыхания и зрения личным составом подразделений пожарной охраны", author: "МЧС России", year: 2022, publisher: "Официальный документ: приказ МЧС России от 27.06.2022 № 640",
  cat: "edu", cats: ["edu", "work", "safety"], lang: "русский", pages: "147 пунктов + приложение № 3", isbn: null, ids: "Приказ МЧС России № 640", fragment: "Полный текст доступен в FIREBASE бесплатно", url: null, text: "p640", access: "full",
  summary: "Полный текст Правил работы в СИЗОД: допуск, звено ГДЗС, пост безопасности и КПП, обязанности газодымозащитника, командира звена и постового, проверки СИЗОД и расчёт параметров работы. Официальные документы не являются объектами авторского права, поэтому текст можно читать прямо здесь.",
  tags: ["гдзс", "сизод", "приказ 640", "полный текст", "читать онлайн"], fires: [], docs: ["norm.p640"], sources: ["p640"] });
const ACCESS = {
  full: ["Читать в FIREBASE", "b-fact", "Полный текст доступен прямо здесь, бесплатно."],
  "free-pdf": ["Бесплатно у издателя", "b-official", "Издатель бесплатно опубликовал полный текст на своём сайте — откроется в новой вкладке."],
  library: ["Через библиотеку или магазин", "b-none", "Полный текст защищён авторским правом и не размещается в FIREBASE. Можно вести дневник чтения и заметки по бумажной или купленной книге."]
};
BOOKS.forEach(b => { if (!b.access) b.access = (b.id === "bobkov-physchem" || b.id === "mchs-volunteer") ? "free-pdf" : "library"; });

const bookState = key => { S.books = S.books || {}; return S.books[key] || (S.books[key] = { status: "", pos: null, pct: 0, maxPct: 0, page: "", pages: "", notes: [], summary: "", updated: null }); };
const touch = st => { st.updated = new Date().toISOString(); persist(); };
const STATUS_BOOK = [["", "Не начата"], ["want", "Хочу прочитать"], ["reading", "Читаю"], ["done", "Прочитано"]];
const nid = () => Math.random().toString(36).slice(2, 10);
function pctOf(st, b) { if (b.access === "full") return Math.round(st.maxPct || 0); const p = +st.page, t = +st.pages; return p > 0 && t > 0 ? Math.min(100, Math.round(p / t * 100)) : (st.status === "done" ? 100 : 0); }
function accessBadge(b) { const a = ACCESS[b.access] || ACCESS.library; return badge(a[1], a[0]); }

/* --- book page additions: diary --- */
function diaryHtml(it) {
  const b = it.obj, st = bookState(it.key), pct = pctOf(st, b);
  return `<section class="panel stack" id="diary" style="margin-top:22px">
   <div class="row" style="justify-content:space-between"><span class="eyebrow">Мой дневник чтения</span><span class="small muted">${st.updated ? "сохранено " + new Date(st.updated).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" }) : "ещё ничего не сохранено"}</span></div>
   <div class="prog" aria-label="Прочитано ${pct}%"><i style="width:${pct}%"></i></div><span class="small muted">Прочитано: <b class="mono">${pct}%</b></span>
   <div class="formgrid">
    <div class="field"><label for="dStatus">Статус</label><select id="dStatus" class="inp">${STATUS_BOOK.map(([k, t]) => `<option value="${k}" ${st.status === k ? "selected" : ""}>${t}</option>`).join("")}</select></div>
    ${b.access === "full" ? "" : `<div class="field"><label for="dPage">Прочитано страниц</label><input id="dPage" class="inp mono" inputmode="numeric" value="${esc(st.page)}"></div><div class="field"><label for="dPages">Всего страниц</label><input id="dPages" class="inp mono" inputmode="numeric" value="${esc(st.pages)}"></div>`}
   </div>
   <div class="field"><label for="dNote">Новая заметка</label><textarea id="dNote" class="inp" placeholder="Мысль, вывод или цитата…" maxlength="4000"></textarea></div>
   <div class="row">${b.access === "full" ? "" : `<input id="dNotePage" class="inp mono" placeholder="стр." style="width:90px" inputmode="numeric" aria-label="Страница">`}<button class="btn sm pri" data-dnote="${esc(it.key)}">Добавить заметку</button><span class="ferr" id="dErr" hidden></span></div>
   ${notesList(it.key)}
   <div class="field"><label for="dSum">Итоги прочитанного: главное, что запомнить</label><textarea id="dSum" class="inp" placeholder="Например: 3–5 выводов, которые пригодятся на службе или на зачёте" maxlength="8000">${esc(st.summary)}</textarea></div>
   <div class="row"><button class="btn sm" data-dsave="${esc(it.key)}">Сохранить дневник</button><a class="btn sm ghost" href="#mylib">Моя библиотека</a></div>
  </section>`;
}
function notesList(key, jump) {
  const st = bookState(key); if (!st.notes.length) return `<p class="small muted" style="margin:0">Заметок пока нет.</p>`;
  return `<ul class="notes">${st.notes.map(n => `<li><div>${n.quote ? `<blockquote>${esc(n.quote)}</blockquote>` : ""}${n.text ? `<p>${esc(n.text)}</p>` : ""}<span class="small muted">${n.pid ? esc(noteLabel(n)) : n.page ? "стр. " + esc(n.page) : ""} · ${new Date(n.at).toLocaleDateString("ru-RU")}</span></div><span class="row" style="gap:4px;flex-wrap:nowrap">${jump && n.pid ? `<button class="btn sm ghost" data-rjump="${esc(n.pid)}">Перейти</button>` : ""}<button class="btn sm ghost" data-ndel="${esc(key)}|${esc(n.id)}" aria-label="Удалить заметку">✕</button></span></li>`).join("")}</ul>`;
}
function diaryBind(key) {
  const st = bookState(key);
  const save = () => { st.status = $("#dStatus").value; if ($("#dPage")) { const p = $("#dPage").value.trim(), t = $("#dPages").value.trim(); if ((p && !/^\d{1,5}$/.test(p)) || (t && !/^\d{1,5}$/.test(t))) { $("#dErr").hidden = false; $("#dErr").textContent = "Страницы — целые числа."; return false; } if (p && t && +p > +t) { $("#dErr").hidden = false; $("#dErr").textContent = "Прочитано не может быть больше, чем всего страниц."; return false; } st.page = p; st.pages = t; } st.summary = $("#dSum").value; $("#dErr").hidden = true; touch(st); return true; };
  $("#dStatus").addEventListener("change", () => { save(); });
  $("#diary").addEventListener("click", e => {
    if (e.target.closest("[data-dsave]")) { if (save()) { toast("Дневник сохранён"); $("#diary").outerHTML = diaryHtml(resolve(key)); diaryBind(key); } }
    if (e.target.closest("[data-dnote]")) { const t = $("#dNote").value.trim(), pg = $("#dNotePage")?.value.trim() || ""; if (!t) { $("#dErr").hidden = false; $("#dErr").textContent = "Введите текст заметки."; $("#dNote").focus(); return; } if (pg && !/^\d{1,5}$/.test(pg)) { $("#dErr").hidden = false; $("#dErr").textContent = "Страница — целое число."; return; } st.notes.unshift({ id: nid(), text: t, page: pg, at: new Date().toISOString() }); if (!st.status) st.status = "reading"; save(); toast("Заметка сохранена"); $("#diary").outerHTML = diaryHtml(resolve(key)); diaryBind(key); }
  });
}

/* --- reader --- */
let RD = null;
function vRead(id) {
  const it = resolve("book." + id); if (!visible(it) || it.obj.access !== "full") return vNotFound();
  const T = TEXTS[it.obj.text]; const st = bookState(it.key); setMeta("Читать: " + it.obj.title.slice(0, 50), T.sub); addHistory(it.key);
  RD = { key: it.key, size: (S.settings.readSize || 17) };
  let n = 0; const total = T.parts.reduce((a, p) => a + p[1].length, 0); RD.total = total; RD.order = [];
  const body = T.parts.map(([h, ps], i) => `<h2 class="r-h" id="rh-${i}">${esc(h)}</h2>${ps.map((p, j) => { const pid = i + "." + j; RD.order.push(pid); n++; return `<p class="rp" id="rp-${pid.replace(".", "-")}" data-pid="${pid}" data-n="${n}">${hlText(p, pid, st)}</p>`; }).join("")}`).join("");
  const resume = st.pos && RD.order.indexOf(st.pos) > 2 ? `<div class="banner" id="resume" style="margin:0 0 16px"><span>${I.book}</span><span>Вы остановились на ${esc(paraLabel(T, st.pos))}. <button class="btn sm pri" data-rjump="${esc(st.pos)}">Продолжить чтение</button></span></div>` : "";
  return `${crumbs([["Библиотека", "#lib"], [it.obj.title.slice(0, 40) + "…", href(it)], ["Чтение"]])}
  <div class="reader-bar" id="rbar"><div class="prog" style="flex:1"><i id="rprog" style="width:${st.maxPct || 0}%"></i></div><span class="mono small" id="rpct">${Math.round(st.maxPct || 0)}%</span><button class="btn sm ghost" data-rsize="-1" aria-label="Уменьшить шрифт">A−</button><button class="btn sm ghost" data-rsize="1" aria-label="Увеличить шрифт">A+</button></div>
  <div class="art"><article class="reader" id="reader" style="font-size:${RD.size}px">
   <header class="art-head"><span class="kind">Полный текст · бесплатно</span><h1 class="h1" style="font-size:clamp(20px,2.6vw,28px)">${esc(T.title)}</h1><p class="lead" style="margin:0">${esc(T.sub)}</p><p class="small muted" style="margin:0">${esc(T.note)}</p>
   <p class="small" style="margin:0;color:var(--fg2)">Выделите фрагмент текста, чтобы отметить его или добавить заметку.</p></header>
   ${resume}${body}
   <section class="panel stack" style="margin-top:30px"><span class="eyebrow">Итоги прочитанного</span>
    <label class="row" style="gap:8px;cursor:pointer"><input type="checkbox" id="rDone" ${st.status === "done" ? "checked" : ""} style="accent-color:var(--red);width:18px;height:18px"> Прочитано полностью</label>
    <div class="field"><label for="rSum">Главное, что нужно запомнить</label><textarea id="rSum" class="inp" maxlength="8000" placeholder="3–5 главных выводов: что пригодится на службе, на зачёте или в жизни">${esc(st.summary)}</textarea></div>
    <div class="row"><button class="btn pri sm" data-rsave>Сохранить итоги</button>${T.test ? `<a class="btn sm" href="${T.test.href}">${esc(T.test.label)}</a>` : ""}<a class="btn sm ghost" href="#mylib">Моя библиотека</a></div></section>
  </article>
  <aside class="side"><nav class="panel" aria-label="Оглавление"><span class="eyebrow">Оглавление</span><div class="toc">${T.parts.map(([h], i) => `<button data-scroll="rh-${i}"><span class="num">${i || "—"}</span>${esc(h)}</button>`).join("")}</div></nav>
   <div class="panel"><span class="eyebrow">Мои заметки</span><div id="rnotes">${notesList(it.key, true)}</div></div>
   <div class="panel small muted">Прогресс и заметки сохраняются ${STORE.mode === "account" ? "в вашем аккаунте и доступны на других устройствах" : "в этом браузере"}.</div></aside></div>
  <div class="selbar" id="selbar" hidden><button class="btn sm" data-sel="hl">Отметить</button><button class="btn sm pri" data-sel="note">Заметка</button></div>
  <div class="notebox" id="notebox" hidden><blockquote id="nbQuote"></blockquote><label class="sr" for="nbText">Текст заметки</label><textarea id="nbText" class="inp" placeholder="Ваша заметка (необязательно)" maxlength="4000"></textarea><div class="row"><button class="btn sm pri" data-nb="save">Сохранить</button><button class="btn sm" data-nb="cancel">Отмена</button></div></div>`;
}
function noteLabel(n) { const l = n.label || n.pid; return /^\d/.test(l) ? "п. " + l : l.replace(/^статье /, "ст. ").replace(/^приложении /, "прил. ").replace(/^разделе /, ""); }
function paraLabel(T, pid) { const [i, j] = pid.split(".").map(Number); const t = T.parts[i][1][j] || "", h = T.parts[i][0]; const m = t.match(/^(\d+)\./); const ap = h.match(/^Приложение\s*(?:N|№)\s*(\d+)/); const art = h.match(/^Статья ([\d.]+?)\.? /); return ap ? "приложении № " + ap[1] + (m ? ", п. " + m[1] : "") : art ? "статье " + art[1] + (j ? ", абз. " + (j + 1) : "") : m ? "п. " + m[1] : "разделе «" + (h.length > 60 ? h.slice(0, 57) + "…" : h) + "», абз. " + (j + 1); }
function hlText(p, pid, st) {
  let h = esc(p); st.notes.filter(n => n.pid === pid && n.quote).forEach(n => { const q = esc(n.quote); const k = h.indexOf(q); if (k >= 0) h = h.slice(0, k) + `<mark class="hl" data-nid="${esc(n.id)}" title="${esc(n.text || "Отмечено")}">${q}</mark>` + h.slice(k + q.length); });
  return h;
}
function readerBind() {
  const T = TEXTS[resolve(RD.key).obj.text], st = bookState(RD.key);
  let last = null, tm = null;
  const onScroll = () => { clearTimeout(tm); tm = setTimeout(() => {
    const ps = $$(".rp"); const top = ($("#rbar")?.getBoundingClientRect().bottom || 60) + 10;
    const cur = ps.find(p => p.getBoundingClientRect().bottom > top); if (!cur) return;
    const n = +cur.dataset.n, pct = Math.min(100, n / RD.total * 100), atEnd = innerHeight + scrollY >= document.body.scrollHeight - 40;
    const p2 = atEnd ? 100 : pct;
    if (cur.dataset.pid !== last || p2 > (st.maxPct || 0)) { last = cur.dataset.pid; st.pos = last; st.pct = p2; st.maxPct = Math.max(st.maxPct || 0, p2); if (!st.status) st.status = "reading"; touch(st); $("#rprog").style.width = st.maxPct + "%"; $("#rpct").textContent = Math.round(st.maxPct) + "%"; }
  }, 250); };
  window.addEventListener("scroll", onScroll, { passive: true }); RD.off = () => window.removeEventListener("scroll", onScroll);
  const showBar = () => {
    const sel = getSelection(); const bar = $("#selbar"); if (!bar) return;
    if (!sel || sel.isCollapsed || !sel.toString().trim()) { bar.hidden = true; return; }
    const a = sel.anchorNode && sel.anchorNode.parentElement && sel.anchorNode.parentElement.closest(".rp"), b = sel.focusNode && sel.focusNode.parentElement && sel.focusNode.parentElement.closest(".rp");
    if (!a || a !== b) { bar.hidden = true; return; }
    const q = sel.toString().replace(/\s+/g, " ").trim().slice(0, 600); RD.sel = { pid: a.dataset.pid, quote: q };
    const r = sel.getRangeAt(0).getBoundingClientRect(); bar.hidden = false; bar.style.left = Math.max(8, Math.min(innerWidth - 200, r.left + r.width / 2 - 90)) + "px"; bar.style.top = Math.max(70, r.top - 48) + "px";
  };
  document.addEventListener("selectionchange", RD.selFn = () => { clearTimeout(RD.st); RD.st = setTimeout(showBar, 200); });
  $("#reader").addEventListener("click", e => { const m = e.target.closest("mark.hl"); if (m) { const n = st.notes.find(x => x.id === m.dataset.nid); if (n) toast(n.text ? "Заметка: " + n.text.slice(0, 120) : "Отмеченный фрагмент"); } });
}
function addNote(text) {
  const st = bookState(RD.key), T = TEXTS[resolve(RD.key).obj.text];
  st.notes.unshift({ id: nid(), pid: RD.sel.pid, label: paraLabel(T, RD.sel.pid).replace(/^п\. /, ""), quote: RD.sel.quote, text: text || "", at: new Date().toISOString() });
  if (!st.status) st.status = "reading"; touch(st);
  const p = document.querySelector(`.rp[data-pid="${CSS.escape(RD.sel.pid)}"]`); if (p) { const raw = T.parts[+RD.sel.pid.split(".")[0]][1][+RD.sel.pid.split(".")[1]]; p.innerHTML = hlText(raw, RD.sel.pid, st); }
  $("#rnotes").innerHTML = notesList(RD.key, true); getSelection().removeAllRanges(); $("#selbar").hidden = true; toast(text ? "Заметка сохранена" : "Фрагмент отмечен");
}
document.addEventListener("click", e => {
  if (CUR.view === "read" && RD) {
    const s = e.target.closest("[data-sel]"); if (s) { if (!RD.sel) return; if (s.dataset.sel === "hl") addNote(""); else { $("#nbQuote").textContent = RD.sel.quote; $("#nbText").value = ""; $("#notebox").hidden = false; $("#selbar").hidden = true; $("#nbText").focus(); } return; }
    const nb = e.target.closest("[data-nb]"); if (nb) { if (nb.dataset.nb === "save") addNote($("#nbText").value.trim()); $("#notebox").hidden = true; return; }
    const sz = e.target.closest("[data-rsize]"); if (sz) { RD.size = Math.max(14, Math.min(24, RD.size + +sz.dataset.rsize)); $("#reader").style.fontSize = RD.size + "px"; S.settings.readSize = RD.size; persist(); return; }
    if (e.target.closest("[data-rsave]")) { const st = bookState(RD.key); st.summary = $("#rSum").value; st.status = $("#rDone").checked ? "done" : (st.status === "done" ? "reading" : st.status || "reading"); if ($("#rDone").checked) st.maxPct = 100; touch(st); toast("Итоги сохранены"); $("#rprog").style.width = st.maxPct + "%"; $("#rpct").textContent = Math.round(st.maxPct) + "%"; return; }
  }
  const j = e.target.closest("[data-rjump]"); if (j) { const el = document.getElementById("rp-" + j.dataset.rjump.replace(".", "-")); if (el) { el.scrollIntoView({ block: "center" }); el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 1600); $("#resume")?.remove(); } return; }
  const d = e.target.closest("[data-ndel]"); if (d) { const [k, id] = d.dataset.ndel.split("|"); const st = bookState(k); st.notes = st.notes.filter(n => n.id !== id); touch(st); toast("Заметка удалена"); if (CUR.view === "read") { const T = TEXTS[resolve(k).obj.text]; $$(".rp").forEach(p => { if (p.querySelector(`mark[data-nid="${CSS.escape(id)}"]`)) { const [a, b] = p.dataset.pid.split(".").map(Number); p.innerHTML = hlText(T.parts[a][1][b], p.dataset.pid, st); } }); $("#rnotes").innerHTML = notesList(k, true); } else if ($("#diary")) { $("#diary").outerHTML = diaryHtml(resolve(k)); diaryBind(k); } else route(); return; }
  if (e.target.closest("[data-copynotes]")) { const t = exportNotes(); navigator.clipboard?.writeText(t).then(() => toast("Заметки скопированы"), () => { $("#exportTxt").hidden = false; $("#exportTxt").value = t; $("#exportTxt").select(); toast("Выделите текст и скопируйте"); }); if (!navigator.clipboard) { $("#exportTxt").hidden = false; $("#exportTxt").value = t; $("#exportTxt").select(); } return; }
  if (e.target.closest("[data-dlnotes]")) { const blob = new Blob([exportNotes()], { type: "text/plain;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "firebase-zametki.txt"; document.body.appendChild(a); a.click(); a.remove(); return; }
});

/* --- my library --- */
function exportNotes() {
  const out = ["FIREBASE — мои заметки и итоги чтения", "Выгружено: " + new Date().toLocaleString("ru-RU"), ""];
  Object.entries(S.books || {}).forEach(([k, st]) => { const it = resolve(k); if (!it || (!st.notes.length && !st.summary && !st.status)) return; out.push("=== " + it.title, it.obj.author + " · статус: " + (STATUS_BOOK.find(s => s[0] === st.status) || ["", "не начата"])[1] + " · прочитано " + pctOf(st, it.obj) + "%"); if (st.summary) out.push("", "Итоги:", st.summary); if (st.notes.length) { out.push("", "Заметки:"); st.notes.slice().reverse().forEach(n => out.push("— " + (n.pid ? "[п. " + (n.label || n.pid) + "] " : n.page ? "[стр. " + n.page + "] " : "") + (n.quote ? "«" + n.quote + "» " : "") + (n.text || ""))); } out.push(""); });
  return out.join("\n");
}
function vMyLib() {
  setMeta("Моя библиотека");
  const rows = BOOKS.map(b => resolve("book." + b.id)).filter(visible).map(it => ({ it, st: (S.books || {})[it.key] })).filter(r => r.st && (r.st.status || r.st.notes.length || r.st.summary || r.st.maxPct));
  const done = rows.filter(r => r.st.status === "done").length, notes = rows.reduce((a, r) => a + r.st.notes.length, 0);
  return `${crumbs([["Библиотека", "#lib"], ["Моя библиотека"]])}<h1 class="h1">Моя библиотека</h1><p class="lead">Прогресс чтения, заметки и итоги по всем книгам. Сохраняется ${STORE.mode === "account" ? "в вашем аккаунте" : "в этом браузере"}.</p>
  <dl class="facts" style="margin-top:18px"><div><dt>Книг в работе</dt><dd class="mono">${rows.length}</dd></div><div><dt>Прочитано</dt><dd class="mono">${done}</dd></div><div><dt>Заметок</dt><dd class="mono">${notes}</dd></div></dl>
  ${rows.length ? `<div class="stack" style="margin-top:18px">${rows.map(({ it, st }) => { const pct = pctOf(st, it.obj); return `<article class="card"><div class="top"><span class="kind">${esc((STATUS_BOOK.find(s => s[0] === st.status) || ["", "Не начата"])[1])}</span>${accessBadge(it.obj)}</div><a class="t" href="${it.obj.access === "full" ? "#read." + esc(it.obj.id) : href(it)}">${esc(it.title)}</a><div class="prog"><i style="width:${pct}%"></i></div><div class="meta"><span class="mono">${pct}%</span><span>заметок: ${st.notes.length}</span>${st.updated ? `<span>изменено ${new Date(st.updated).toLocaleDateString("ru-RU")}</span>` : ""}</div>${st.summary ? `<p class="d" style="-webkit-line-clamp:4">${esc(st.summary)}</p>` : ""}<div class="foot"><span></span><span class="row">${it.obj.access === "full" ? `<a class="btn sm pri" href="#read.${esc(it.obj.id)}" style="position:relative;z-index:1">Читать</a>` : ""}<a class="btn sm" href="${href(it)}" style="position:relative;z-index:1">Дневник</a></span></div></article>`; }).join("")}</div>
  <div class="row" style="margin-top:18px"><button class="btn" data-copynotes>Скопировать все заметки</button>${IN_CLAUDE ? "" : '<button class="btn" data-dlnotes>Скачать заметки (.txt)</button>'}</div><textarea id="exportTxt" class="inp" hidden style="margin-top:10px;min-height:200px" readonly aria-label="Текст заметок"></textarea>`
  : `<div class="empty" style="margin-top:20px"><b>Пока пусто</b>Откройте книгу в <a href="#lib" style="color:var(--red-ink)">библиотеке</a>: начните читать полный текст или ведите дневник чтения.</div>`}`;
}

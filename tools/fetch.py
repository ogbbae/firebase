import json, os, re, urllib.request, urllib.parse, ssl
os.makedirs("raw", exist_ok=True)
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"}
log = []
def get(url, name):
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60, context=ctx)
        b = r.read(); open("raw/"+name, "wb").write(b); log.append([name, url, r.status, len(b), r.headers.get("Content-Type")])
    except Exception as e:
        log.append([name, url, "ERR", str(e)[:200]])
FILES = {
 "444_mchs85.docx": "https://85.mchs.gov.ru/uploads/document/2024-08-29/4566c9c251be8c127a4b5fb1565148c1.docx",
 "444_rulaws.html": "https://rulaws.ru/acts/Prikaz-MCHS-Rossii-ot-16.10.2017-N-444/",
 "444_legalacts.html": "https://legalacts.ru/doc/prikaz-mchs-rossii-ot-16102017-n-444-ob-utverzhdenii/",
 "69fz_mchs73.docx": "https://73.mchs.gov.ru/uploads/resource/2024-02-26/a1161c3e0c5c27a9dfb2eff808a33da0.docx",
 "69fz_mchs33.doc": "https://33.mchs.gov.ru/uploads/resource/2022-04-07/e903cc052a614be371ada3657785bc0c.doc",
 "69fz_mchs78.docx": "https://78.mchs.gov.ru/uploads/resource/2023-04-11/99e56e4e6227936714c24ab841fe682e.docx",
 "69fz_consultant.html": "https://www.consultant.ru/document/cons_doc_LAW_5438/",
 "1479_mchs55.doc": "https://55.mchs.gov.ru/uploads/resource/2022-03-30/1_1648623728265432487.doc",
 "1479_mchs33.doc": "https://33.mchs.gov.ru/uploads/resource/2021-02-20/87cf30de7db6f4b1ae56ccb811c08044.doc",
 "640_rulaws.html": "https://rulaws.ru/acts/Prikaz-MCHS-Rossii-ot-27.06.2022-N-640/",
}
for n,u in FILES.items(): get(u, n)
API = "https://ru.wikisource.org/w/api.php?"
def api(**p):
    p.update(format="json", formatversion="2")
    return json.loads(urllib.request.urlopen(urllib.request.Request(API+urllib.parse.urlencode(p), headers=UA), timeout=60).read())
try:
    cm = api(action="query", list="categorymembers", cmtitle="Категория:Москва и москвичи (Гиляровский)", cmlimit="500")
    json.dump(cm, open("raw/ws_gil_cat.json","w"), ensure_ascii=False, indent=1)
    for q in ["Под каланчой Гиляровский", "Пожарные собаки Толстой", "Пожар Толстой рассказ", "Гиляровский пожарные"]:
        s = api(action="query", list="search", srsearch=q, srlimit="20")
        json.dump(s, open("raw/ws_search_"+re.sub(r"\W+","_",q)+".json","w"), ensure_ascii=False, indent=1)
    titles = [m["title"] for m in cm["query"]["categorymembers"] if "каланч" in m["title"].lower()]
    for t in titles:
        p = api(action="parse", page=t, prop="text|revid|displaytitle")
        json.dump(p, open("raw/ws_"+re.sub(r"\W+","_",t)[:80]+".json","w"), ensure_ascii=False)
        log.append(["ws", t, "ok"])
except Exception as e:
    log.append(["ws", "ERR", str(e)[:300]])
json.dump(log, open("raw/log.json","w"), ensure_ascii=False, indent=1)
print(json.dumps(log, ensure_ascii=False, indent=1))

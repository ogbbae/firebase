import json, os, re, time, urllib.request, urllib.parse, ssl
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36", "Accept-Language": "ru"}
log = []
def get(url):
    err=None
    for a in range(3):
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60, context=ctx); return r.read()
        except Exception as e: err = e; time.sleep(3)
    log.append([url, "ERR", str(err)[:200]]); return b""
for doc in ["502763"]:
    base = f"https://www.consultant.ru/document/cons_doc_LAW_{doc}/"
    b = get(base); d = f"raw/cons/{doc}"; os.makedirs(d, exist_ok=True)
    open(d+"/index.html","wb").write(b)
    links = list(dict.fromkeys(re.findall(rf'href="(/document/cons_doc_LAW_{doc}/[0-9a-f]{{40}}/)"', b.decode("utf-8","ignore"))))
    log.append([doc, len(b), len(links)])
    for i,l in enumerate(links):
        open(f"{d}/{i:03d}.html","wb").write(get("https://www.consultant.ru"+l)); time.sleep(0.7)
for n,u in {"777_rulaws.html":"https://rulaws.ru/acts/Prikaz-MCHS-Rossii-ot-16.09.2024-N-777/",
            "777_legalacts.html":"https://legalacts.ru/doc/prikaz-mchs-rossii-ot-16092024-n-777-ob-utverzhdenii/"}.items():
    open("raw/"+n,"wb").write(get(u))
API = "https://ru.wikisource.org/w/api.php?"
def api(**p):
    p.update(format="json", formatversion="2")
    return json.loads(get(API+urllib.parse.urlencode(p)) or b"{}")
os.makedirs("raw/ws", exist_ok=True)
s = api(action="query", list="search", srsearch='"Пожарные собаки"', srlimit="20")
json.dump(s, open("raw/ws/search_dogs.json","w"), ensure_ascii=False, indent=1)
titles = ["Москва и москвичи (Гиляровский)/Под каланчой", "Москва и москвичи (Гиляровский)/Пожарный", "Пожар на море (Тургенев)", "Москва и москвичи (Гиляровский)"]
titles += [r["title"] for r in s.get("query",{}).get("search",[]) if "Толстой" in r["title"]][:3]
for t in titles:
    p = api(action="parse", page=t, prop="text|revid|displaytitle|categories")
    json.dump(p, open("raw/ws/"+re.sub(r"\W+","_",t)[:90]+".json","w"), ensure_ascii=False); log.append(["ws", t, bool(p.get("parse"))])
json.dump(log, open("raw/log3.json","w"), ensure_ascii=False, indent=1); print(log)

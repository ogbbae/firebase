import json, os, re, time, urllib.request, ssl
os.makedirs("raw/cons", exist_ok=True)
ctx = ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36", "Accept-Language": "ru"}
log = []
def get(url):
    for a in range(3):
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60, context=ctx); return r.read()
        except Exception as e: err = e; time.sleep(3)
    log.append([url, "ERR", str(err)[:200]]); return b""
for doc in ["5438", "498201", "363263"]:
    base = f"https://www.consultant.ru/document/cons_doc_LAW_{doc}/"
    b = get(base); d = f"raw/cons/{doc}"; os.makedirs(d, exist_ok=True)
    open(d+"/index.html","wb").write(b)
    links = list(dict.fromkeys(re.findall(rf'href="(/document/cons_doc_LAW_{doc}/[0-9a-f]{{40}}/)"', b.decode("utf-8","ignore"))))
    log.append([doc, len(b), len(links)])
    for i,l in enumerate(links):
        open(f"{d}/{i:03d}.html","wb").write(get("https://www.consultant.ru"+l)); time.sleep(0.7)
for n,u in {"444_garant.html":"https://base.garant.ru/56878104/"}.items():
    open("raw/"+n,"wb").write(get(u))
json.dump(log, open("raw/log2.json","w"), ensure_ascii=False, indent=1); print(log)

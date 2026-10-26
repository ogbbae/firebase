"""Собирает index.html из файлов в src/. Запуск: python3 build.py"""
from pathlib import Path
ROOT = Path(__file__).parent
SRC = ROOT / "src"
JS = ["data.js", "ru_fires.js", "world_fires.js", "fires_2025_26.js", "fires_batch1.js", "fires_detail.js", "fires_detail2.js", "texts.js", "texts_lib.js", "reader.js", "library_full.js", "app1.js", "app2.js", "app3.js", "app4.js", "app5.js"]
js = "".join((SRC / f).read_text(encoding="utf-8") + "\n" for f in JS)
js += '\n[["logoMark","logo"],["icS","search"],["icF","star"],["icU","user"],["icM","menu"],["icA","shield"]].forEach(([id,k])=>{const e=document.getElementById(id);if(e)e.outerHTML=I[k];});applyTheme();\n'
page = (SRC / "head.html").read_text(encoding="utf-8") + (SRC / "body.html").read_text(encoding="utf-8") + "<script>\n" + js + "</script>\n"
html = ('<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<link rel="manifest" href="manifest.webmanifest">\n<meta name="theme-color" content="#111418">\n'
        '<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">\n<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
        '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-title" content="FIREBASE">\n'
        '<style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n'
        '</head>\n<body>\n' + page + '<script>if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("sw.js").catch(()=>{});</script>\n</body>\n</html>\n')
(ROOT / "index.html").write_text(html, encoding="utf-8")
print("index.html:", len(html), "bytes")

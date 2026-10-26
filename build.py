"""Собирает index.html из файлов в src/. Запуск: python3 build.py"""
from pathlib import Path
ROOT = Path(__file__).parent
SRC = ROOT / "src"
JS = ["data.js", "ru_fires.js", "world_fires.js", "fires_2025_26.js", "app1.js", "app2.js", "app3.js", "app4.js", "app5.js"]
js = "".join((SRC / f).read_text(encoding="utf-8") + "\n" for f in JS)
js += '\n[["logoMark","logo"],["icS","search"],["icF","star"],["icU","user"],["icM","menu"],["icA","shield"]].forEach(([id,k])=>{const e=document.getElementById(id);if(e)e.outerHTML=I[k];});applyTheme();\n'
page = (SRC / "head.html").read_text(encoding="utf-8") + (SRC / "body.html").read_text(encoding="utf-8") + "<script>\n" + js + "</script>\n"
html = ('<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<style>body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>\n'
        '</head>\n<body>\n' + page + '</body>\n</html>\n')
(ROOT / "index.html").write_text(html, encoding="utf-8")
print("index.html:", len(html), "bytes")

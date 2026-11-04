"""Ayrıntılı konu anlatımlarını uygulamaya hazırlar.

icerik-kaynak/anlatim/<sınıf>-<konu kodu>.html dosyalarını okur ve her sınıf
için public/icerik/<sınıf>/anlatim-detay.json dosyasını yazar ({konu kodu: html}).

Kullanım: python tools/anlatim_derle.py
"""

import json
import re
from collections import defaultdict
from pathlib import Path

KOK = Path(__file__).resolve().parent.parent
KAYNAK = KOK / "icerik-kaynak" / "anlatim"
HEDEF = KOK / "public" / "icerik"


def main():
    sinif = defaultdict(dict)
    for path in sorted(KAYNAK.glob("*.html")):
        m = re.match(r"^(\d+)-(.+)\.html$", path.name)
        if not m:
            continue
        html = path.read_text(encoding="utf-8")
        html = re.sub(r"<!--.*?-->", "", html, flags=re.S).strip()
        sinif[m.group(1)][m.group(2)] = html
    for g, konular in sinif.items():
        out = HEDEF / g / "anlatim-detay.json"
        out.write_text(json.dumps(konular, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        print(g, "sınıf:", ", ".join(sorted(konular)))


if __name__ == "__main__":
    main()

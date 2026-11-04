"""Sarmal ve karma test sorularına kazanım etiketi ekler (tahmini).

Kaynak verilerde sarmal/karma sorularının kazanımı yazmıyor. Konu ve bağlam
testlerindeki soruların kazanımı ise biliniyor. Bu betik o etiketli soruları
örnek alarak (TF-IDF + kosinüs benzerliği) her sarmal/karma sorusuna en yakın
kazanımı bulur ve soruya "k" alanı olarak yazar.

- Sarmal testlerde adaylar yalnızca o bölümün kazanımlarıdır.
- Karma testlerde adaylar sınıfın bütün kazanımlarıdır.

Kullanım: python tools/kazanim_etiketle.py public/icerik src/data/mufredat.json
"""

import json
import math
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

STOP = set(
    "ve ile bir bu şu o da de için ise ki mi mı mu mü gibi olan olarak hangi hangisi hangileri "
    "aşağıdaki aşağıdakilerden verilen verilmiştir yukarıdaki buna göre göre yalnız i ii iii iv v "
    "a b c d e en daha çok az her bazı tüm olur olduğu olduğunu olmaz değildir doğrudur yanlıştır "
    "yapılan yapılır ifadelerden ifade hakkında ilgili kadar sonra önce arasında üzerinde".split()
)


def tokens(html: str) -> list[str]:
    text = re.sub(r"<[^>]+>", " ", html or "").lower().replace("i̇", "i")
    words = re.findall(r"[a-zçğıöşü]+", text)
    return [w[:7] for w in words if len(w) > 2 and w not in STOP]  # kaba kök: ilk 7 harf


def soru_metni(q: dict) -> str:
    return " ".join([q.get("s", ""), " ".join(q.get("sik", [])), q.get("c", "") or ""])


def main(icerik: Path, mufredat_path: Path):
    mufredat = json.loads(mufredat_path.read_text(encoding="utf-8"))
    rapor = {}
    for g, m in mufredat.items():
        path = icerik / g / "testler.json"
        testler = json.loads(path.read_text(encoding="utf-8"))

        # Etiketli örnekler: konu testleri (konunun kazanımı) ve bağlam testleri
        ornek: list[tuple[str, list[str]]] = []
        for t in m["temalar"]:
            for b in t["bolumler"]:
                for k in b["konular"]:
                    if len(k["kazanimlar"]) == 1 and k["test"] in testler:
                        for lv in testler[k["test"]]["testler"]:
                            for q in lv["sorular"]:
                                ornek.append((k["kazanimlar"][0], tokens(soru_metni(q))))
                    for bt in k["baglam"]:
                        if bt.get("kazanim") and bt["id"] in testler:
                            for lv in testler[bt["id"]]["testler"]:
                                for q in lv["sorular"]:
                                    ornek.append((bt["kazanim"], tokens(soru_metni(q))))
        # Kazanım metni ve anahtar kelimeleri de örneğe katılır
        for code, ad in m["kazanimlar"].items():
            ornek.append((code, tokens(ad + " " + " ".join(m.get("kelimeler", {}).get(code, [])))))

        df = Counter()
        for _, ws in ornek:
            df.update(set(ws))
        n = len(ornek)
        idf = {w: math.log((n + 1) / (c + 1)) + 1 for w, c in df.items()}

        def vec(ws):
            tf = Counter(ws)
            v = {w: c * idf.get(w, math.log(n + 1) + 1) for w, c in tf.items()}
            norm = math.sqrt(sum(x * x for x in v.values())) or 1
            return {w: x / norm for w, x in v.items()}

        merkez: dict[str, dict] = defaultdict(lambda: defaultdict(float))
        for code, ws in ornek:
            for w, x in vec(ws).items():
                merkez[code][w] += x
        for code, v in merkez.items():
            norm = math.sqrt(sum(x * x for x in v.values())) or 1
            for w in v:
                v[w] /= norm

        def en_yakin(q, adaylar):
            v = vec(tokens(soru_metni(q)))
            puan = {c: sum(x * merkez[c].get(w, 0) for w, x in v.items()) for c in adaylar if c in merkez}
            return max(puan, key=puan.get) if puan else None

        # Doğruluk tahmini: etiketli konu sorularında bölüm içi sınıflandırma
        dogru = toplam = 0
        for t in m["temalar"]:
            for b in t["bolumler"]:
                adaylar = sorted({c for k in b["konular"] for c in k["kazanimlar"]})
                if len(adaylar) < 2:
                    continue
                for k in b["konular"]:
                    if len(k["kazanimlar"]) != 1 or k["test"] not in testler:
                        continue
                    for lv in testler[k["test"]]["testler"]:
                        for q in lv["sorular"]:
                            toplam += 1
                            dogru += en_yakin(q, adaylar) == k["kazanimlar"][0]

        etiket = 0
        for t in m["temalar"]:
            for b in t["bolumler"]:
                adaylar = sorted({c for k in b["konular"] for c in k["kazanimlar"]})
                for s in b["sarmal"]:
                    for lv in testler.get(s["id"], {}).get("testler", []):
                        for q in lv["sorular"]:
                            q["k"] = adaylar[0] if len(adaylar) == 1 else en_yakin(q, adaylar)
                            etiket += 1
        hepsi = sorted(m["kazanimlar"])
        for kt in m["karma"]:
            for lv in testler.get(kt["id"], {}).get("testler", []):
                for q in lv["sorular"]:
                    q["k"] = en_yakin(q, hepsi)
                    etiket += 1

        path.write_text(json.dumps(testler, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        rapor[g] = {"etiketlenen": etiket, "dogruluk_tahmini": round(100 * dogru / toplam) if toplam else None}
        print(g, rapor[g])
    return rapor


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__)
        sys.exit(1)
    main(Path(sys.argv[1]), Path(sys.argv[2]))

"""Shercan Kimya içeriğini ve kazanım listesini Kimya Koçum'a aktarır.

Kullanım:
    python tools/icerik_aktar.py <shercan-kimya klasörü> <kazanımlar/config.py> <çıktı klasörü> <müfredat json>

Örnek (Windows):
    python tools/icerik_aktar.py "C:/Users/LENOVO/Desktop/shercan-kimya" ^
        "C:/Users/LENOVO/Desktop/kimya klasör/kazanımlar/config.py" public/icerik src/data/mufredat.json

config.py çalıştırılmaz; içindeki sözlükler yalnızca okunur (ast).
"""

import ast
import json
import re
import shutil
import sys
from pathlib import Path

GRADES = [9, 10, 11]

UNITE = {
    9: {
        "1.1": ("Kimya Bilimi ve Laboratuvar Güvenliği", "Günlük hayatta kimya, alt disiplinler, kariyer, kimyasalların güvenli kullanımı"),
        "1.2": ("Atomun Yapısı ve Periyodik Tablo", "Atom teorileri, orbitaller, periyodik tablo, iyonlar, periyodik özellikler"),
        "2.1": ("Kimyasal Türler Arası Güçlü Etkileşimler", "Metalik, iyonik ve kovalent bağ, Lewis yapısı, polarlık, adlandırma"),
        "2.2": ("Zayıf Etkileşimler ve Sıvıların Özellikleri", "Moleküller arası kuvvetler, katılar, buhar basıncı, kaynama, viskozite, yüzey gerilimi"),
        "3.1": ("Nanoteknoloji ve Yeşil Kimya", "Metal nanoparçacıklar, atık önleme, metal ve alaşımların çevresel etkileri"),
    },
    10: {
        "1.1": ("Kimyasal Tepkimeler", "Kimyasal değişim, tepkime türleri, mol, denkleştirme, stokiyometri"),
        "1.2": ("Gazlar", "Gazların özellikleri, gaz yasaları, ideal gaz, difüzyon ve efüzyon"),
        "2.1": ("Çözeltiler", "Çözünme, çözünürlük, derişim birimleri, koligatif özellikler"),
        "3.1": ("Yeşil Kimya", "Mikro ölçekli deneyler, atmosferdeki tepkimeler ve küresel sorunlar"),
    },
    11: {
        "1.1": ("Kimyasal Tepkimelerde Enerji", "Ekzotermik ve endotermik tepkimeler, bağ enerjisi, oluşum entalpisi"),
        "1.2": ("Kimyasal Tepkimelerde Hız", "Çarpışma teorisi, ortalama hız, hıza etki eden faktörler, hız denklemi"),
        "2.1": ("Kimyasal Denge", "Tersinir tepkimeler, denge sabiti, tepkime oranı, Le Chatelier ilkesi"),
        "2.2": ("Asit-Baz Dengesi", "Suyun iyonlaşması, asit-baz teorileri, pH, nötralleşme, titrasyon"),
        "2.3": ("Çözünürlük Dengesi", "Molar çözünürlük, çözünürlük çarpımı, ortak iyon etkisi"),
        "3.1": ("Sürdürülebilirlik", "Yeşil hidrojen, nanoteknolojik ürünler, mikro ve nanoplastikler"),
    },
}

# Kendi bağlam testi olmayan konular için öğretmen onaylı kazanım eşlemesi (2 Kasım 2026).
KAZANIM_DUZELTME = {
    9: {"3.1.2": ["KİM.9.3.2"]},
}

TEMA_AD = {1: "Etkileşim", 2: "Çeşitlilik", 3: "Sürdürülebilirlik"}


def read_config(path: Path):
    tree = ast.parse(path.read_text(encoding="utf-8"))
    out = {}
    for node in tree.body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            name = node.targets[0].id
            if name in ("KONULAR", "KONU_ANAHTAR_KELIMELERI"):
                out[name] = ast.literal_eval(node.value)
    return out


def main(src: Path, config_path: Path, out: Path, mufredat_path: Path):
    cfg = read_config(config_path)
    konular = {**cfg["KONULAR"]["TYT"], **cfg["KONULAR"]["AYT"]}
    anahtar = {**cfg["KONU_ANAHTAR_KELIMELERI"].get("TYT", {}), **cfg["KONU_ANAHTAR_KELIMELERI"].get("AYT", {})}

    if out.exists():
        shutil.rmtree(out)
    (out / "img").mkdir(parents=True)

    summary = {}
    mufredat = {}
    for g in GRADES:
        gdir = out / str(g)
        gdir.mkdir(parents=True)
        test_files, konu_files, etk_files = {}, {}, {}

        # Kazanımlar ve kilit kelimeler
        kazanim, kelime, tema_kazanim = {}, {}, {}
        for tema in (1, 2, 3):
            key = next((k for k in konular if k.startswith(f"{g} TEMA {tema} ")), None)
            if not key:
                continue
            tema_kazanim[tema] = []
            for i, line in enumerate(konular[key]):
                m = re.match(r"\s*(KİM\.\d+\.\d+\.\d+)\.?\s*(.*)", line)
                if not m:
                    continue
                code, text = m.group(1), m.group(2).strip()
                kazanim[code] = text
                tema_kazanim[tema].append(code)
                kelime[code] = anahtar.get(key, {}).get(i, [])

        groups = json.loads((src / "veri" / f"{g}.json").read_text(encoding="utf-8"))
        etk = json.loads((src / "veri" / f"etk{g}.json").read_text(encoding="utf-8"))

        # Konu anlatımları: <section id="k-1-1-1"> bölümlerine ayır
        sections = {}
        for f in sorted((src / "konu" / str(g)).glob("*.html")):
            html = f.read_text(encoding="utf-8")
            for m in re.finditer(r'<section id="k-([^"]+)">(.*?)</section>', html, re.S):
                body = re.sub(r"<div class=\"testbag\"[^>]*></div>", "", m.group(2)).strip()
                sections[m.group(1).replace("-", ".", 2)] = body

        bolumler, konu_by_kod, karma, sarmal = {}, {}, [], {}
        last_konu = None

        def write_test(group):
            tests = [
                {"seviye": t.get("seviye"), "sorular": t["sorular"]}
                for t in group["testler"]
            ]
            test_files[group["id"]] = {"id": group["id"], "baslik": group["baslik"], "tur": group["tur"], "testler": tests}
            return sum(len(t["sorular"]) for t in tests)

        for grp in groups:
            tur = grp["tur"]
            if tur == "karma":
                n = write_test(grp)
                karma.append({"id": grp["id"], "baslik": grp["baslik"], "soru": n})
                continue
            unite = grp["unite"]
            b = bolumler.setdefault(unite, {
                "kod": unite,
                "tema": int(unite.split(".")[0]),
                "ad": UNITE[g][unite][0],
                "ozet": UNITE[g][unite][1],
                "konular": [],
                "sarmal": [],
            })
            n = write_test(grp)
            if tur == "kazanim":
                kod = grp["baslik"].split(" ")[0]
                ad = re.sub(r"^\S+\s*(–\s*\S+\s*)?", "", grp["baslik"]).strip()
                konu = {
                    "kod": kod,
                    "ad": ad,
                    "kazanimlar": [],
                    "test": grp["id"],
                    "seviyeler": [t.get("seviye") for t in grp["testler"]],
                    "soru": n,
                    "baglam": [],
                    "anlatim": kod in sections,
                    "etkinlik": 0,
                }
                if kod in sections:
                    konu_files[kod] = sections[kod]
                b["konular"].append(konu)
                konu_by_kod[kod] = konu
                last_konu = konu
            elif tur == "baglam":
                code = re.match(r"(KİM\.\d+\.\d+\.\d+)", grp["baslik"])
                code = code.group(1) if code else None
                entry = {"id": grp["id"], "baslik": grp["baslik"].split("—", 1)[-1].strip(), "kazanim": code, "soru": n}
                target = last_konu if last_konu and last_konu["kod"].startswith(unite + ".") else None
                if target:
                    target["baglam"].append(entry)
                    if code and code not in target["kazanimlar"]:
                        target["kazanimlar"].append(code)
            elif tur == "sarmal":
                b["sarmal"].append({"id": grp["id"], "baslik": grp["baslik"], "soru": n})

        # Kendi bağlam testi olmayan konular: aynı kodlu kardeşi (1.2.4-A → 1.2.4-C),
        # yoksa bölümdeki bir önceki konunun kazanımı.
        for b in bolumler.values():
            for i, konu in enumerate(b["konular"]):
                if konu["kazanimlar"]:
                    continue
                base = konu["kod"].split("-")[0]
                sibling = next((k for k in b["konular"] if k is not konu and k["kod"].split("-")[0] == base and k["kazanimlar"]), None)
                prev = next((k for k in reversed(b["konular"][:i]) if k["kazanimlar"]), None)
                nxt = next((k for k in b["konular"][i + 1:] if k["kazanimlar"]), None)
                source = sibling or prev or nxt
                if source:
                    konu["kazanimlar"] = source["kazanimlar"][:1]

        # Öğretmenin (Hasan) onayladığı düzeltmeler — tahmin kuralını ezer.
        for kod, kazanimlar in KAZANIM_DUZELTME.get(g, {}).items():
            if kod in konu_by_kod:
                konu_by_kod[kod]["kazanimlar"] = kazanimlar

        # Etkinlikler: kod "1.1.2-3" → konu "1.1.2"
        for kit in etk:
            kod = kit["kod"]
            konu = konu_by_kod.get(kod) or konu_by_kod.get(re.sub(r"-\d+$", "", kod))
            if not konu:
                print(f"  ! {g}. sınıf etkinlik {kod} bir konuya bağlanamadı")
                continue
            etk_files[konu["kod"]] = kit
            konu["etkinlik"] = len(kit["etkinlikler"])

        temalar = []
        for tema in (1, 2, 3):
            items = [b for k, b in sorted(bolumler.items()) if b["tema"] == tema]
            if items:
                temalar.append({"no": tema, "ad": TEMA_AD[tema], "bolumler": items})

        index = {"sinif": g, "temalar": temalar, "karma": karma, "kazanimlar": kazanim, "kelimeler": kelime}
        mufredat[str(g)] = index
        # Sınıf başına üç dosya: testler, konu anlatımları, etkinlikler
        for name, data in (("testler", test_files), ("konular", konu_files), ("etkinlikler", etk_files)):
            (gdir / f"{name}.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

        n_konu = sum(len(b["konular"]) for b in bolumler.values())
        n_soru = sum(k["soru"] + sum(x["soru"] for x in k["baglam"]) for b in bolumler.values() for k in b["konular"]) \
            + sum(s["soru"] for b in bolumler.values() for s in b["sarmal"]) + sum(k["soru"] for k in karma)
        summary[g] = {"konu": n_konu, "soru": n_soru, "kazanim": len(kazanim), "etkinlik": sum(k["etkinlik"] for b in bolumler.values() for k in b["konular"])}
        print(g, summary[g])
        for b in bolumler.values():
            for k in b["konular"]:
                if not k["kazanimlar"]:
                    print(f"  ! {g}. sınıf {k['kod']} için kazanım bulunamadı")

    # Yazılıya hazırlık: yalnızca veri/ayar.json'da açık olan yazılılar
    # (ör. "1-1" = 1. dönem 1. yazılı) ve onların PDF'leri yayımlanır.
    ayar_path = src / "veri" / "ayar.json"
    ayar = json.loads(ayar_path.read_text(encoding="utf-8")) if ayar_path.exists() else {}
    aktif = (ayar.get("yazili") or {}).get("aktif") or ["1-1"]
    (out / "yazili-ayar.json").write_text(json.dumps({"aktif": aktif}, ensure_ascii=False), encoding="utf-8")
    for g in GRADES:
        ypath = src / "veri" / f"yazili{g}.json"
        if not ypath.exists():
            continue
        data = json.loads(ypath.read_text(encoding="utf-8"))
        tumu = [{"donem": s["donem"], "yazili": s["yazili"]} for s in data["sinavlar"]]
        acik = [s for s in data["sinavlar"] if f"{s['donem']}-{s['yazili']}" in aktif]
        (out / str(g) / "yazili.json").write_text(
            json.dumps({"sinavlar": acik, "tumu": tumu, "kazanimlar": data.get("kazanimlar", {})}, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        for s in acik:
            ad = f"{g}-sinif-{s['donem']}-donem-{s['yazili']}-yazili-senaryo-{s['senaryo']}"
            for suffix in ("", "-cevap-anahtari"):
                pdf = src / "pdf" / str(g) / f"{ad}{suffix}.pdf"
                if pdf.exists():
                    target = out / "pdf" / str(g) / pdf.name
                    target.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(pdf, target)
                else:
                    print(f"  ! PDF yok: {pdf.name}")
        print(g, "yazılı:", len(acik), "senaryo")

    # Görseller
    for path in (src / "img").rglob("*"):
        if path.is_file():
            target = out / "img" / path.relative_to(src / "img")
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)

    (out / "ozet.json").write_text(json.dumps(summary, ensure_ascii=False), encoding="utf-8")
    mufredat_path.write_text(json.dumps(mufredat, ensure_ascii=False, indent=1), encoding="utf-8")

    # Sarmal ve karma sorularına tahmini kazanım etiketi
    sys.path.insert(0, str(Path(__file__).parent))
    import kazanim_etiketle
    kazanim_etiketle.main(out, mufredat_path)


if __name__ == "__main__":
    if len(sys.argv) != 5:
        print(__doc__)
        sys.exit(1)
    main(Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3]), Path(sys.argv[4]))

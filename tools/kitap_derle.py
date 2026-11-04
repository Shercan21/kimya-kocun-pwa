#!/usr/bin/env python3
"""Ayrıntılı konu anlatımlarını tek kitap hâline getirir: HTML -> PDF (Playwright) ve DOCX (pandoc).
Kullanım: python3 tools/kitap_derle.py 9 [cikti_klasoru]
"""
import json, re, sys, subprocess, pathlib, html

KOK = pathlib.Path(__file__).resolve().parent.parent
SINIF = sys.argv[1] if len(sys.argv) > 1 else '9'
CIKTI = pathlib.Path(sys.argv[2] if len(sys.argv) > 2 else f'/home/claude/kitap/{SINIF}')
CIKTI.mkdir(parents=True, exist_ok=True)
(CIKTI / 'img').mkdir(exist_ok=True)

konular = json.load(open(KOK / f'public/icerik/{SINIF}/konular.json'))
css = (KOK / 'icerik-kaynak/anlatim/anlatim.css').read_text()

_muf = json.load(open(KOK / 'src/data/mufredat.json'))[SINIF]
TEMA = {str(t['no']): t['ad'] + ' · ' + ', '.join(b['ad'] for b in t['bolumler']) for t in _muf['temalar']}

def baslik(kod):
    m = re.search(r'<h2>(.*?)</h2>', konular[kod], re.S)
    t = re.sub(r'<span class="k">.*?</span>', '', m.group(1)) if m else kod
    k = re.search(r'<span class="k">(.*?)</span>', m.group(1)) if m else None
    return (k.group(1) if k else kod), html.unescape(re.sub('<[^>]+>', '', t)).strip()

def anahtar(kod):
    p = re.split(r'[.\-]', kod)
    return [int(x) if x.isdigit() else x for x in p]

parcalar, icindekiler, eksik = [], [], []
son_tema = None
for kod in sorted(konular, key=anahtar):
    f = KOK / f'icerik-kaynak/anlatim/{SINIF}-{kod}.html'
    if not f.exists():
        eksik.append(kod); continue
    s = f.read_text()
    s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
    # Soruları sırayla numarala, cevapları açık göster
    n = [0]
    def num(m):
        n[0] += 1
        return f'<summary>{n[0]}. '
    s = re.sub(r'<summary>\s*\d+\.\s*', num, s)
    s = s.replace('<details class="ka-soru">', '<details class="ka-soru" open>')
    # SVG id çakışmasını önle
    s = re.sub(r'id="([^"]+)"', lambda m: f'id="{kod}-{m.group(1)}"', s)
    s = re.sub(r'url\(#([^)]+)\)', lambda m: f'url(#{kod}-{m.group(1)})', s)
    s = re.sub(r'href="#([^"]+)"', lambda m: f'href="#{kod}-{m.group(1)}"', s)
    tema = kod.split('.')[0]
    if tema != son_tema:
        son_tema = tema
        parcalar.append(f'<div class="tema-kapak"><div class="tema-no">{tema}. TEMA</div><div class="tema-ad">{TEMA.get(tema, "").split(" · ")[0]}</div><div class="tema-alt">{TEMA.get(tema, "").split(" · ")[-1]}</div></div>')
        icindekiler.append(f'<li class="ic-tema">{tema}. Tema · {TEMA.get(tema, "")}</li>')
    kk, ad = baslik(kod)
    parcalar.append(f'<article class="konu" id="k-{kod}"><h2><span class="kod">{kk}</span> {html.escape(ad)}</h2>{s}</article>')
    icindekiler.append(f'<li><a href="#k-{kod}"><span>{kk}</span> {html.escape(ad)}</a></li>')

kitap_css = css + '''
@page { size: A4; margin: 16mm 14mm 18mm; }
body { font-family: "Noto Sans", Arial, sans-serif; color: #2c2c2a; margin: 0; }
.kapak { height: 255mm; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;
  background: linear-gradient(160deg, #26215c, #534ab7 60%, #1d9e75); color: #fff; border-radius: 18px; page-break-after: always; }
.kapak h1 { font-size: 46px; margin: 10px 0; } .kapak p { font-size: 20px; opacity: .9; margin: 4px; }
.kapak img { width: 120px; }
.icindekiler { page-break-after: always; } .icindekiler h1 { color: #3c3489; }
.icindekiler ol { list-style: none; padding: 0; font-size: 15px; } .icindekiler li { padding: 5px 0; border-bottom: 1px dotted #c9c5ee; }
.icindekiler li.ic-tema { font-weight: 700; color: #534ab7; border: 0; padding-top: 14px; }
.icindekiler a { color: inherit; text-decoration: none; } .icindekiler a span { display: inline-block; min-width: 70px; color: #534ab7; font-weight: 700; }
.tema-kapak { page-break-before: always; page-break-after: always; height: 240mm; display: flex; flex-direction: column; justify-content: center; align-items: center;
  background: linear-gradient(135deg, #eeedfe, #e1f5ee); border-radius: 18px; }
.tema-alt { font-size: 20px; color: #534ab7; margin-top: 14px; text-align: center; padding: 0 30px; }
.tema-no { font-size: 26px; font-weight: 700; color: #534ab7; letter-spacing: 3px; } .tema-ad { font-size: 38px; font-weight: 800; color: #26215c; text-align: center; padding: 0 20px; }
article.konu { page-break-before: always; }
.tema-kapak + article.konu { page-break-before: auto; }
article.konu > h2 { font-size: 26px; color: #26215c; border-bottom: 4px solid #534ab7; padding-bottom: 6px; margin: 0 0 12px; }
article.konu > h2 .kod { background: #534ab7; color: #fff; border-radius: 10px; padding: 2px 10px; font-size: 18px; vertical-align: middle; }
.ka-gorsel, .ka-kutu, .ka-tablo, .ka-model, .ka-soru, .ka-mini { break-inside: avoid; }
.ka h3 { break-after: avoid; }
.ka-gorsel svg { max-height: 120mm; }
details.ka-soru summary { list-style: none; } details.ka-soru summary::-webkit-details-marker { display: none; }
details.ka-soru > p::before { content: "Cevap: "; font-weight: 700; color: #1d9e75; }
'''

ikon = (KOK / 'public/icon.svg').resolve()
html_doc = f'''<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Kimya Koçum {SINIF}. Sınıf Konu Anlatımı</title>
<style>{kitap_css}</style></head><body>
<div class="kapak"><img src="file://{ikon}" alt=""><h1>Kimya Koçum</h1><p>{SINIF}. Sınıf · Ayrıntılı ve Görselli Konu Anlatımı</p><p>Maarif Modeli kazanımlarına göre</p></div>
<div class="icindekiler"><h1>İçindekiler</h1><ol>{''.join(icindekiler)}</ol></div>
{''.join(parcalar)}
</body></html>'''
(CIKTI / 'kitap.html').write_text(html_doc)
print('konu:', len(parcalar), 'eksik:', eksik)

# ---- PDF ve DOCX için görseller ----
from playwright.sync_api import sync_playwright
pdf_yol = CIKTI / f'Kimya-Kocum-{SINIF}-sinif-konu-anlatimi.pdf'
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 794, 'height': 1123})
    pg.goto(f'file://{CIKTI / "kitap.html"}')
    pg.wait_for_timeout(500)
    pg.pdf(path=str(pdf_yol), format='A4', print_background=True, display_header_footer=True,
           header_template='<div></div>',
           footer_template=f'<div style="font-size:9px;width:100%;text-align:center;color:#888">Kimya Koçum · {SINIF}. Sınıf · <span class="pageNumber"></span></div>',
           margin={'top': '16mm', 'bottom': '18mm', 'left': '14mm', 'right': '14mm'})
    # Her SVG'yi PNG olarak al (Word için)
    sayi = pg.evaluate('''() => { const s=[...document.querySelectorAll('.ka svg')]; s.forEach((e,i)=>e.setAttribute('data-no', i)); return s.length; }''')
    pg2 = b.new_page(viewport={'width': 700, 'height': 900}, device_scale_factor=2)
    pg2.set_content(f'<html><head><meta charset="utf-8"><style>{css} body{{margin:0;background:#fff}} .ka svg{{width:640px;height:auto;display:block}}</style></head><body><div class="ka" id="r"></div></body></html>')
    for i in range(sayi):
        svg = pg.evaluate(f'() => document.querySelector(\'.ka svg[data-no="{i}"]\').outerHTML')
        pg2.evaluate('(h)=>{document.getElementById("r").innerHTML=h}', svg)
        pg2.locator('#r svg').screenshot(path=str(CIKTI / 'img' / f'g{i}.png'))
    b.close()
print('PDF:', pdf_yol)

# DOCX için HTML: svg -> img, details -> düz paragraf, kutular -> alıntı
d = html_doc
i = [0]
def svg2img(m):
    k = i[0]; i[0] += 1
    vb = re.search(r'viewBox="[\d.]+ [\d.]+ ([\d.]+)', m.group(0))
    gen = min(15.0, float(vb.group(1)) / 640 * 15) if vb else 15.0
    return f'<img src="img/g{k}.png" style="width:{gen:.1f}cm">'
d = re.sub(r'<svg.*?</svg>', svg2img, d, flags=re.S)
d = re.sub(r'<details class="ka-soru" open><summary>(.*?)</summary>\s*<p>(.*?)</p></details>',
           r'<p><b>\1</b></p><p><i>Cevap:</i> \2</p>', d, flags=re.S)
d = re.sub(r'<div class="ka-kutu[^"]*">(.*?)</div>', r'<blockquote>\1</blockquote>', d, flags=re.S)
d = re.sub(r'<div class="(kapak|tema-kapak)">.*?</div></div>', '', d, flags=re.S)
d = re.sub(r'<div class="icindekiler">.*?</ol></div>', '', d, flags=re.S)
d = d.replace('<h2>', '<h1>').replace('</h2>', '</h1>').replace('<h3>', '<h2>').replace('</h3>', '</h2>')
(CIKTI / 'kitap-docx.html').write_text(d)
docx_yol = CIKTI / f'Kimya-Kocum-{SINIF}-sinif-konu-anlatimi.docx'
subprocess.run(['pandoc', 'kitap-docx.html', '-f', 'html', '-t', 'docx', '--toc', '--toc-depth=1',
                '-M', 'toc-title=İçindekiler', '-M', f'title=Kimya Koçum {SINIF}. Sınıf Ayrıntılı Konu Anlatımı', 
                '-o', docx_yol.name], cwd=CIKTI, check=True)

# Word görünümünü güzelleştir
from docx import Document
from docx.shared import Pt, RGBColor
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
doc = Document(docx_yol)
st = doc.styles
for ad, boy, renk in [('Normal', 11, None), ('Heading 1', 18, '26215C'), ('Heading 2', 14, '3C3489'), ('Title', 26, '534AB7')]:
    try:
        s = st[ad]; s.font.name = 'Calibri'; s.font.size = Pt(boy)
        if renk: s.font.color.rgb = RGBColor.from_string(renk)
    except KeyError: pass
for t in doc.tables:
    t.style = doc.styles['Table Grid'] if 'Table Grid' in [s.name for s in doc.styles] else t.style
    tblPr = t._tbl.tblPr
    borders = OxmlElement('w:tblBorders')
    for e in ('top', 'left', 'bottom', 'right', 'insideH', 'insideV'):
        el = OxmlElement(f'w:{e}'); el.set(qn('w:val'), 'single'); el.set(qn('w:sz'), '4'); el.set(qn('w:color'), 'C9C5EE'); borders.append(el)
    tblPr.append(borders)
    for c in t.rows[0].cells:
        sh = OxmlElement('w:shd'); sh.set(qn('w:fill'), '534AB7'); c._tc.get_or_add_tcPr().append(sh)
        for pp in c.paragraphs:
            for r in pp.runs: r.font.color.rgb = RGBColor(255, 255, 255); r.bold = True
# Her konu başlığı yeni sayfada
first = True
for pp in doc.paragraphs:
    if pp.style.name == 'Heading 1':
        if not first: pp.paragraph_format.page_break_before = True
        first = False
doc.save(docx_yol)
print('DOCX:', docx_yol)

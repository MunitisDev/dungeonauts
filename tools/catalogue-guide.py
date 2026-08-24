"""Builds CATALOGO.png: every non-empty 16x16 cell, numbered per sheet.

Run against the folder of source sheets, which is never committed:
    SP=<dir-containing-tileset/> python3 tools/catalogue-guide.py

The output carries the artwork, so it stays out of the repository too — it is a
working document to look at, not something to publish.
"""
from PIL import Image, ImageDraw, ImageFont
import os, json, hashlib

SP = os.environ['SP']; SRC = f"{SP}/tileset"; OUT = f"{SP}/guide"; TILE = 16

# prefix, file, what it holds
SHEETS = [
    ('TIL', 'Tileset.png',            'Hoja maestra: contiene todo lo demás'),
    ('WAL', 'Walls-export.png',       'Muros: dos juegos completos (violeta y azul)'),
    ('FLO', 'Floor-export.png',       'Suelos: variantes, agujero y escaleras'),
    ('DOR', 'Doors.png',              'Puertas de arco y postes con gema'),
    ('CHE', 'Chests.png',             'Cofres grandes y pequeños'),
    ('FLA', 'Flasks.png',             'Pociones'),
    ('ENE', 'Enemy.png',              'Enemigos: murciélago, serpiente, fantasmas'),
    ('CHR', 'Animation Character.png','Caballero: animaciones de 32×32'),
    ('TOR', 'Torchlight.png',         'Antorcha de pared animada'),
    ('SPK', 'Spike Trap.png',         'Trampa de pinchos'),
    ('LEV', 'Lever.png',              'Palanca'),
    ('BTN', 'PlatformButton.png',     'Botón de suelo'),
    ('GLD', 'GoldCoin.png',           'Moneda de oro'),
    ('SLV', 'SilverCoin.png',         'Moneda de plata'),
    ('BRZ', 'BronzeCoin.png',         'Moneda de bronce'),
]

BG=(18,22,32,255); INK=(232,236,245,255); DIM=(122,134,158,255)
GOLD=(247,197,84,255); MINT=(122,199,178,255); GRID=(58,68,90,255); CARD=(29,35,49,255)
F = lambda s, b=False: ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/DejaVuSans{'-Bold' if b else ''}.ttf", s)

def collect():
    out, first = [], {}
    for prefix, name, desc in SHEETS:
        im = Image.open(f"{SRC}/{name}").convert('RGBA')
        cols, rows = im.width // TILE, im.height // TILE
        entries, n = [], 0
        for r in range(rows):
            for c in range(cols):
                cell = im.crop((c*TILE, r*TILE, (c+1)*TILE, (r+1)*TILE))
                if cell.getchannel('A').getextrema()[1] == 0:
                    continue
                n += 1
                h = hashlib.sha1(cell.tobytes()).hexdigest()
                tid = f"{prefix}-{n:03d}"
                same = first.get(h)
                if same is None:
                    first[h] = tid
                entries.append({'id': tid, 'col': c, 'row': r, 'hash': h,
                                'sameAs': same, 'image': cell})
        out.append({'prefix': prefix, 'sheet': name, 'desc': desc,
                    'cols': cols, 'rows': rows, 'tiles': entries})
    return out

def render(sheets, per_row=16, scale=4, path='CATALOGO.png'):
    cell, label, pad, gap = TILE*scale, 18, 12, 12
    box = cell + label + gap
    head, sec = 62, 46
    rows_total = sum((len(s['tiles']) + per_row - 1)//per_row for s in sheets)
    W = pad*2 + per_row*box
    H = head + rows_total*box + len(sheets)*sec + pad
    out = Image.new('RGBA', (W, H), BG)
    d = ImageDraw.Draw(out)
    d.text((pad+2, 16), 'DUNGEONAUTS · catálogo del tileset', fill=GOLD, font=F(24, True))
    d.text((pad+2, 44), 'Celdas de 16×16 · el identificador es la forma de referirse a cada pieza',
           fill=DIM, font=F(13))
    y = head
    for s in sheets:
        y += 10
        d.text((pad+2, y+8), f"{s['prefix']} · {s['sheet']}", fill=MINT, font=F(17, True))
        d.text((pad+2, y+28), f"{s['desc']}  ·  rejilla {s['cols']}×{s['rows']}  ·  {len(s['tiles'])} celdas con dibujo",
               fill=DIM, font=F(12))
        y += sec
        for i, t in enumerate(s['tiles']):
            cx = pad + (i % per_row)*box
            cy = y + (i // per_row)*box
            d.rectangle([cx, cy, cx+cell, cy+cell], fill=CARD, outline=GRID)
            out.alpha_composite(t['image'].resize((cell, cell), Image.NEAREST), (cx, cy))
            dup = t['sameAs'] is not None
            d.text((cx+cell/2, cy+cell+label/2+1), t['id'].split('-')[1],
                   fill=DIM if dup else INK, font=F(12, not dup), anchor='mm')
        y += ((len(s['tiles']) + per_row - 1)//per_row)*box
    out.save(f"{OUT}/{path}")
    return out.size

if __name__ == '__main__':
    sheets = collect()
    total = sum(len(s['tiles']) for s in sheets)
    uniq = len({t['hash'] for s in sheets for t in s['tiles']})
    print(f"{total} celdas con dibujo, {uniq} piezas únicas")
    print('guía:', render(sheets))
    json.dump([{**s, 'tiles': [{k: v for k, v in t.items() if k != 'image'} for t in s['tiles']]}
               for s in sheets], open(f"{SP}/catalogue.json", 'w'), indent=1, ensure_ascii=False)

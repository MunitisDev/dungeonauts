"""Builds OBJETOS.png: each sprite at its true frame size, with its frames.

The 16x16 grid halves anything taller, and the knight is 32x32, so the cell
guide alone is not enough to talk about a sprite. Same caveat as the other:
the output carries the artwork and is not committed.
"""
from PIL import Image, ImageDraw, ImageFont
import os, json
SP=os.environ['SP']; SRC=f"{SP}/tileset"; OUT=f"{SP}/guide"
BG=(18,22,32,255); INK=(232,236,245,255); DIM=(122,134,158,255)
GOLD=(247,197,84,255); MINT=(122,199,178,255); GRID=(58,68,90,255); CARD=(29,35,49,255)
F=lambda s,b=False: ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/DejaVuSans{'-Bold' if b else ''}.ttf", s)
sheets = {}
def sheet(n):
    if n not in sheets: sheets[n] = Image.open(f"{SRC}/{n}").convert('RGBA')
    return sheets[n]

def row_frames(name, row, fw=16, fh=16):
    """Every non-empty frame in a row, left to right."""
    im = sheet(name); out = []
    for i in range(im.width // fw):
        f = im.crop((i*fw, row*fh, (i+1)*fw, row*fh+fh))
        if f.getchannel('A').getextrema()[1] > 0: out.append((i, f))
    return out

# id, sheet, row, frame size, label
ROWS = [
 ('CHR.idle_a','Animation Character.png',0,(32,32),'Caballero · reposo, frente'),
 ('CHR.idle_b','Animation Character.png',1,(32,32),'Caballero · reposo, espalda'),
 ('CHR.guard_a','Animation Character.png',2,(32,32),'Caballero · con escudo, frente'),
 ('CHR.guard_b','Animation Character.png',3,(32,32),'Caballero · con escudo, espalda'),
 ('CHR.attack_a','Animation Character.png',4,(32,32),'Caballero · ataque, frente'),
 ('CHR.attack_b','Animation Character.png',5,(32,32),'Caballero · ataque, espalda'),
 ('CHR.walk_a','Animation Character.png',6,(32,32),'Caballero · andar, frente'),
 ('CHR.walk_b','Animation Character.png',7,(32,32),'Caballero · andar, espalda'),
 ('CHR.extra','Animation Character.png',8,(32,32),'Caballero · fila extra'),

 ('ENE.bat_1','Enemy.png',0,(16,16),'Murciélago · aleteo A'),
 ('ENE.bat_2','Enemy.png',1,(16,16),'Murciélago · aleteo B'),
 ('ENE.bat_3','Enemy.png',2,(16,16),'Murciélago · aleteo C + desaparecer'),
 ('ENE.bat_4','Enemy.png',3,(16,16),'Murciélago · aleteo D + desaparecer'),
 ('ENE.snake_1','Enemy.png',4,(16,16),'Serpiente · erguida A'),
 ('ENE.snake_2','Enemy.png',5,(16,16),'Serpiente · erguida B'),
 ('ENE.snake_3','Enemy.png',6,(16,16),'Serpiente · reptar A'),
 ('ENE.snake_4','Enemy.png',7,(16,16),'Serpiente · reptar B'),
 ('ENE.snake_5','Enemy.png',8,(16,16),'Serpiente · agachada A'),
 ('ENE.snake_6','Enemy.png',9,(16,16),'Serpiente · agachada B'),
 ('ENE.ghost_w1','Enemy.png',10,(16,16),'Fantasma blanco · flotar A'),
 ('ENE.ghost_w2','Enemy.png',11,(16,16),'Fantasma blanco · flotar B'),
 ('ENE.ghost_w3','Enemy.png',12,(16,16),'Fantasma blanco · girar A'),
 ('ENE.ghost_w4','Enemy.png',13,(16,16),'Fantasma blanco · girar B'),
 ('ENE.ghost_d1','Enemy.png',14,(16,16),'Fantasma oscuro · A'),
 ('ENE.ghost_d2','Enemy.png',15,(16,16),'Fantasma oscuro · B'),

 ('TOR.wall','Torchlight.png',0,(16,16),'Antorcha de pared (animada)'),
 ('TOR.stand','Torchlight.png',1,(16,16),'Antorcha de pie (animada)'),
 ('SPK.clean','Spike Trap.png',0,(16,16),'Pinchos · limpios'),
 ('SPK.blood','Spike Trap.png',1,(16,16),'Pinchos · con sangre'),
 ('LEV.lever','Lever.png',0,(16,16),'Palanca · apagada / encendida'),
 ('BTN.button','PlatformButton.png',0,(16,16),'Botón de suelo'),

 ('FLA.row1','Flasks.png',0,(16,16),'Pociones · fila 1'),
 ('FLA.row2','Flasks.png',1,(16,16),'Pociones · fila 2'),
 ('CHE.big','Chests.png',0,(32,16),'Cofre grande · cerrado / con oro / vacío'),
 ('CHE.small_1','Chests.png',1,(16,16),'Cofre pequeño · madera clara'),
 ('CHE.small_2','Chests.png',2,(16,16),'Cofre pequeño · madera oscura'),
 ('CHE.small_3','Chests.png',3,(16,16),'Cofre pequeño · dorado'),

 ('FLO.slate_1','Floor-export.png',0,(16,16),'Suelo pizarra · lisos'),
 ('FLO.slate_2','Floor-export.png',1,(16,16),'Suelo pizarra · con grava'),
 ('FLO.slate_3','Floor-export.png',2,(16,16),'Suelo pizarra · muy gastados'),
 ('FLO.slate_4','Floor-export.png',3,(16,16),'Pizarra · agujero y escaleras'),
 ('FLO.wood_1','Floor-export.png',4,(16,16),'Suelo madera · lisos'),
 ('FLO.wood_2','Floor-export.png',5,(16,16),'Suelo madera · con grava'),
 ('FLO.wood_3','Floor-export.png',6,(16,16),'Suelo madera · muy gastados'),
 ('FLO.wood_4','Floor-export.png',7,(16,16),'Madera · agujero y escaleras'),
]

# Fixed-rect groups that are not a whole row.
RECTS = [
 ('DOR.door_blue','Doors.png',112,0,32,16,1,'Puerta de arco · gema azul'),
 ('DOR.door_ring','Doors.png',80,16,32,16,1,'Puerta de arco · aro'),
 ('DOR.door_green','Doors.png',112,16,32,16,1,'Puerta de arco · gema verde'),
 ('DOR.door_red','Doors.png',80,32,32,16,1,'Puerta de arco · gema roja'),
 ('DOR.door_gold','Doors.png',112,32,32,16,1,'Puerta de arco · gema dorada'),
 ('DOR.pillars','Doors.png',0,0,16,64,4,'Pilares de madera (16×64)'),
 ('DOR.posts','Doors.png',80,64,16,32,4,'Postes con gema (16×32)'),
 ('GLD.coin','GoldCoin.png',0,0,16,16,4,'Moneda de oro · giro (en columna)'),
 ('SLV.coin','SilverCoin.png',0,0,16,16,4,'Moneda de plata · giro (en columna)'),
 ('BRZ.coin','BronzeCoin.png',0,0,16,16,4,'Moneda de bronce · giro (en columna)'),
]

groups = []
for gid, name, row, (fw, fh), label in ROWS:
    fr = row_frames(name, row, fw, fh)
    if fr: groups.append({'id': gid, 'sheet': name, 'row': row, 'fw': fw, 'fh': fh,
                          'label': label, 'frames': [f for _, f in fr],
                          'cols': [c for c, _ in fr]})
for gid, name, x, y, fw, fh, n, label in RECTS:
    im = sheet(name)
    vertical = gid.endswith('.coin')
    fr = [im.crop((x + (0 if vertical else i*fw), y + (i*fh if vertical else 0),
                   x + (0 if vertical else i*fw) + fw, y + (i*fh if vertical else 0) + fh)) for i in range(n)]
    groups.append({'id': gid, 'sheet': name, 'row': y // 16, 'fw': fw, 'fh': fh,
                   'label': label, 'frames': fr, 'cols': [x // 16 + i for i in range(n)]})

S=4; PAD=14; LABEL=190
heights = [max(g['fh']*S, 46) + 22 for g in groups]
W = LABEL + PAD*2 + max(g['fw']*S*len(g['frames']) + 6*(len(g['frames'])-1) for g in groups) + PAD
H = 78 + sum(heights) + PAD
img = Image.new('RGBA',(W,H),BG); d = ImageDraw.Draw(img)
d.text((PAD,18),'DUNGEONAUTS · guía de objetos', fill=GOLD, font=F(23,True))
d.text((PAD,48),'Tamaño real de cada fotograma. Todo es 16×16 salvo donde se indica.', fill=DIM, font=F(13))
y = 78
for g, bh in zip(groups, heights):
    d.text((PAD, y+2), g['id'], fill=MINT, font=F(14,True))
    d.text((PAD, y+20), g['label'], fill=DIM, font=F(11))
    d.text((PAD, y+36), f"{g['fw']}×{g['fh']} · {len(g['frames'])} fotogramas", fill=(90,100,124,255), font=F(11))
    for i, f_ in enumerate(g['frames']):
        cx = LABEL + PAD + i*(g['fw']*S + 6); cy = y
        d.rectangle([cx,cy,cx+g['fw']*S,cy+g['fh']*S], fill=CARD, outline=GRID)
        img.alpha_composite(f_.resize((g['fw']*S, g['fh']*S), Image.NEAREST),(cx,cy))
    y += bh
img.save(f"{OUT}/OBJETOS.png")
json.dump([{k: v for k, v in g.items() if k != 'frames'} | {'frameCount': len(g['frames'])}
           for g in groups], open(f"{SP}/groups.json",'w'), indent=1, ensure_ascii=False)
print(img.size, len(groups), 'grupos,', sum(len(g['frames']) for g in groups), 'fotogramas')

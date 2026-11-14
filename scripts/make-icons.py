"""Laver app-ikonerne: mørkt ikon med en telefon i midten.
Kør: python3 scripts/make-icons.py"""
from PIL import Image, ImageDraw, ImageFilter

S = 1024  # tegnes stort og skaleres ned (pæne kanter)


def icon(scale=1.0):
    im = Image.new('RGB', (S, S))
    d = ImageDraw.Draw(im)
    # Mørk, svag gradient som iOS' mørke ikoner
    for y in range(S):
        t = y / S
        c = tuple(int(a + (b - a) * t) for a, b in zip((44, 44, 48), (8, 8, 10)))
        d.line([(0, y), (S, y)], fill=c)
    # Telefonen (iPhone-silhuet): afrundet ramme, Dynamic Island og en svag skærm
    pw, ph = int(S * 0.36 * scale), int(S * 0.64 * scale)
    x0, y0 = (S - pw) // 2, (S - ph) // 2
    r = int(pw * 0.2)
    sw = int(S * 0.034 * scale)
    glow = Image.new('L', (S, S), 0)
    ImageDraw.Draw(glow).rounded_rectangle([x0, y0, x0 + pw, y0 + ph], r, fill=90)
    glow = glow.filter(ImageFilter.GaussianBlur(S * 0.05))
    im.paste((120, 140, 200), (0, 0), glow.point(lambda v: v // 3))
    # skærm med svag blå gradient
    scr = Image.new('RGB', (pw, ph))
    sd = ImageDraw.Draw(scr)
    for y in range(ph):
        t = y / ph
        sd.line([(0, y), (pw, y)], fill=tuple(int(a + (b - a) * t) for a, b in zip((52, 64, 104), (18, 20, 34))))
    mask = Image.new('L', (pw, ph), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, pw - 1, ph - 1], r, fill=255)
    im.paste(scr, (x0, y0), mask)
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([x0, y0, x0 + pw, y0 + ph], r, outline=(242, 242, 247), width=sw)
    # Dynamic Island
    iw, ih = int(pw * 0.3), int(sw * 1.05)
    d.rounded_rectangle([(S - iw) // 2, y0 + sw * 2, (S + iw) // 2, y0 + sw * 2 + ih], ih // 2, fill=(242, 242, 247))
    return im


big = icon()
for name, size in [('icon-512.png', 512), ('icon-192.png', 192), ('apple-touch-icon.png', 180), ('favicon-32.png', 32)]:
    big.resize((size, size), Image.LANCZOS).save(f'icons/{name}')
icon(0.8).resize((512, 512), Image.LANCZOS).save('icons/maskable-512.png')
print('ok')

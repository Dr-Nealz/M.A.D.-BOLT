#!/usr/bin/env python3
"""
M.A.D. BOLT-REMIX brand asset generator (Dr. Neal / M.A.D. LABS).

Builds:
  1. README hero banner -> public/social_preview_index.jpg (1280x640)
     = GALVANI brand-sheet backdrop + M.A.D. BOLT-REMIX lockup + GALVANI badge.
  2. Favicon + logo mark PNGs (favicon-32, apple-touch-icon, logo-192/512,
     logo-light/dark-styled, apple-touch-icon-precomposed) from the GALVANI
     slab-tile spark-bolt brand mark.
  3. favicon.ico (16/32/48/64) + Electron assets/icons/icon.png + icon.ico.

The bolt mark is rasterized pixel-perfect from the GALVANI SVG via headless
Edge; all layout/type/gradients are composited with Pillow.
"""
import os
import subprocess
import glob
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
ASSETS = os.path.join(ROOT, "assets", "icons")
BUILD = os.path.join(ROOT, "build")
FONTS = "C:/Windows/Fonts"
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

# ---- GALVANI / M.A.D. palette -------------------------------------------
SPARK = (44, 229, 184)
VIOLET = (124, 92, 255)
SLAB = (34, 38, 42)
NAVY2 = (24, 31, 61)
AURORA = (107, 140, 255)
AURORA_TEAL = (45, 212, 191)
AURORA_PINK = (236, 72, 153)
AURORA_STOPS = [(0, AURORA), (0.5, AURORA_TEAL), (1, AURORA_PINK)]
GALVANI_STOPS = [(0, SPARK), (1, VIOLET)]

SVG_MARK_TEMPLATE = """<!doctype html><html><head><meta charset="utf-8"><style>
html,body{{margin:0;padding:0;width:__SIZE__px;height:__SIZE__px;overflow:hidden;background:transparent}}</style></head>
<body><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="__SIZE__" height="__SIZE__">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1" gradientUnits="objectBoundingBox">
<stop offset="0%" stop-color="#2CE5B8"/><stop offset="100%" stop-color="#7C5CFF"/></linearGradient></defs>
<rect width="32" height="32" rx="7" fill="#22262A"/>
<rect x="0.5" y="0.5" width="31" height="31" rx="6.5" fill="none" stroke="url(#g)" stroke-opacity="0.6" stroke-width="1"/>
<path d="M17.5 5.5h-2l-1.6 7H9.8c-1.1 0-1.1.6-.72 1.24.37.65.1.16.14.23 1.46 2.56 4.2 7.16 6.28 9.53h2l-1.6-7h4.9c.92 0 1.05.62.88 1.11l-.13.28c-1.44 2.9-3.05 4.61-3.05 4.61 1.87-2.9 4.18-6.2 5.9-9.2.58-1.02.1-1.8-1.2-1.8h-4.5l1.28-6z" fill="url(#g)"/></svg></body></html>"""


def _svg_for_size(size):
    return SVG_MARK_TEMPLATE.replace("__SIZE__", str(size))


def rasterize_mark(size):
    """Render the GALVANI bolt mark at `size` px via headless Edge."""
    os.makedirs(BUILD, exist_ok=True)
    html_path = os.path.join(BUILD, f"_mark_{size}.html")
    out_path = os.path.join(BUILD, f"_mark_{size}.png")
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(_svg_for_size(size))
    subprocess.run(
        [
            EDGE, "--headless=new", "--disable-gpu",
            f"--screenshot={out_path}",
            f"--window-size={size},{size}",
            "--hide-scrollbars",
            "--default-background-color=00000000",
            f"file:///{html_path.replace(os.sep, '/')}",
        ],
        check=True, capture_output=True, timeout=60,
    )
    im = Image.open(out_path).convert("RGBA")
    if im.size != (size, size):
        im = im.resize((size, size), Image.LANCZOS)
    return im


def _font(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)


F_DISPLAY = lambda s: _font("bahnschrift.ttf", s)
F_BOLD = lambda s: _font("arialbd.ttf", s)
F_SEMI = lambda s: _font("seguisb.ttf", s)
F_MONO = lambda s: _font("consola.ttf", s)


def _tw(d, text, font):
    b = d.textbbox((0, 0), text, font=font)
    return b[2] - b[0]


def _th(d, text, font):
    b = d.textbbox((0, 0), text, font=font)
    return b[3] - b[1]


def vgradient(size, stops):
    """Vertical linear gradient as RGBA. stops = [(pos, (r,g,b[,a])), ...]."""
    w, h = size
    img = Image.new("RGBA", (1, h), (0, 0, 0, 255))
    px = img.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        for i in range(len(stops) - 1):
            p0, c0 = stops[i]
            p1, c1 = stops[i + 1]
            if p0 <= t <= p1:
                f = (t - p0) / max(p1 - p0, 1e-6)
                ch = max(len(c0), len(c1))
                px[0, y] = tuple(
                    int((c0[k] if k < len(c0) else 255) + ((c1[k] if k < len(c1) else 255) - (c0[k] if k < len(c0) else 255)) * f)
                    for k in range(ch)
                )
                break
        else:
            c = stops[-1][1]
            px[0, y] = c
    return img.resize((w, h))


def hgradient(size, stops):
    w, h = size
    grad = vgradient((h, w), stops).transpose(Image.ROTATE_90)
    return grad.resize((w, h))


def aurora_gradient(size, diag=True):
    w, h = size
    base = hgradient((w, h), AURORA_STOPS)
    if diag:
        base = base.rotate(15, resample=Image.BICUBIC, expand=False)
    return base


def galvani_gradient(size, diag=True):
    w, h = size
    base = hgradient((w, h), GALVANI_STOPS)
    if diag:
        base = base.rotate(10, resample=Image.BICUBIC, expand=False)
    return base


def radial_glow(size, center, color, radius=None):
    w, h = size
    radius = radius or max(w, h)
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    steps = 48
    for i in range(steps, 0, -1):
        t = i / steps
        r = int(radius * (1 - t * 0.7))
        alpha = int(140 * t * t)
        d.ellipse([center[0] - r, center[1] - r, center[0] + r, center[1] + r],
                  fill=(color[0], color[1], color[2], alpha))
    return layer


def fit_font(d, base_font, max_w, max_h, text):
    size = base_font.size
    while size > 10:
        f = base_font.font_variant(size=size)
        if _tw(d, text, f) <= max_w and _th(d, text, f) <= max_h:
            return f
        size -= 2
    return base_font.font_variant(size=size)


def build_hero(src_path, out_path):
    W, H = 1280, 640
    bg = Image.open(src_path).convert("RGB")
    bw, bh = bg.size
    scale = max(W / bw, H / bh)
    bg = bg.resize((int(bw * scale), int(bh * scale)), Image.LANCZOS)
    bw, bh = bg.size
    x, y = (bw - W) // 2, (bh - H) // 2
    bg = bg.crop((x, y, x + W, y + H)).convert("RGBA")
    base = bg

    # darken + navy tint
    tint = vgradient((W, H), [(0, (6, 9, 18, 70)), (0.6, (8, 12, 24, 170)), (1, (12, 17, 34, 240))])
    base = Image.alpha_composite(base, tint)
    # ambient glows
    base = Image.alpha_composite(base, radial_glow((W, H), (W * 0.5, H * 0.42), VIOLET, radius=H * 0.75))
    base = Image.alpha_composite(base, radial_glow((W, H), (W * 0.5, H * 0.45), SPARK, radius=H * 0.5))

    d = ImageDraw.Draw(base)

    # ---- top-left chip ----
    chip_text = "M.A.D. LABORATORY :: EST. MULTIVERSE 2026"
    chip_font = F_MONO(15)
    chip_tw = _tw(d, chip_text, chip_font) + 36
    chip_grad = galvani_gradient((chip_tw, 40), diag=False)
    chip_mask = Image.new("L", (chip_tw, 40), 0)
    ImageDraw.Draw(chip_mask).rounded_rectangle([0, 0, chip_tw - 1, 39], radius=20, fill=255)
    chip = Image.new("RGBA", (chip_tw, 40), (0, 0, 0, 0))
    chip.paste(chip_grad, (0, 0), chip_mask)
    chip.putalpha(chip_mask)
    base.alpha_composite(chip, (28, 28))
    d = ImageDraw.Draw(base)
    d.text((28 + 18, 28 + 11), chip_text, font=chip_font, fill=(255, 255, 255, 245))

    # ---- top-right GALVANI badge ----
    mark = rasterize_mark(40)
    base.alpha_composite(mark, (W - 40 - 260, 26))
    d.text((W - 40 - 260 + 50, 29), "GALVANI", font=F_BOLD(18), fill=(255, 255, 255, 245))
    d.text((W - 40 - 260 + 50, 51), "BY M.A.D. LABS — ANIMATE YOUR STACK", font=F_MONO(10), fill=(185, 190, 200, 225))

    # ---- center lockup ----
    cy_start = 148
    d.text((W // 2, cy_start), "— THE MAD SCIENTIST PRESENTS —", font=F_MONO(14), fill=(205, 208, 220, 235))
    headline = "M.A.D."
    font_main = fit_font(d, F_DISPLAY(150), W * 0.9, 190, headline)
    hw, hh = _tw(d, headline, font_main), _th(d, headline, font_main)
    grad_head = aurora_gradient((W, H), diag=True)
    txt_mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(txt_mask).text((W // 2 - hw / 2, cy_start + 20), headline, font=font_main, fill=255)
    base.paste(grad_head, (0, 0), txt_mask)
    d = ImageDraw.Draw(base)
    sub = "BOLT-REMIX"
    font_sub = fit_font(d, F_DISPLAY(64), W * 0.7, 80, sub)
    sw, sh = _tw(d, sub, font_sub), _th(d, sub, font_sub)
    y_sub = cy_start + 20 + hh + 6
    d.text((W // 2 - sw / 2, y_sub), sub, font=font_sub, fill=(255, 255, 255, 250))

    y_sig = y_sub + sh + 26
    sig = "BY: DR. NEAL (THE M.A.D. DOCTOR)"
    d.text((W // 2, y_sig), sig, font=F_SEMI(20), fill=(255, 255, 255, 235))

    y_tag = y_sig + 34
    tag = "WHERE IDEAS BECOME MULTIVERSES  ·  GALVANI BY M.A.D. LABS"
    d.text((W // 2, y_tag), tag, font=F_MONO(13), fill=(190, 195, 210, 230))

    div_y = y_tag + 44
    div_w = 360
    div = galvani_gradient((div_w, 3), diag=False)
    base.alpha_composite(div, (W // 2 - div_w // 2, div_y))

    # ---- bottom-left ----
    mark2 = rasterize_mark(56)
    base.alpha_composite(mark2, (48, H - 56 - 40))
    dl = ImageDraw.Draw(base)
    dl.text((48 + 56 + 18, H - 56 - 36), "M.A.D. BOLT-REMIX", font=F_BOLD(20), fill=(255, 255, 255, 240))
    dl.text((48 + 56 + 18, H - 56 - 10), "AI-POWERED FULL-STACK DEVELOPMENT IN THE BROWSER", font=F_MONO(11), fill=(172, 177, 190, 220))

    # ---- bottom-right ----
    dl.text((W - 380, H - 62), "CREATED & ENGINEERED BY", font=F_MONO(11), fill=(172, 177, 190, 220))
    dl.text((W - 380, H - 44), "DR. NEAL — THE M.A.D. DOCTOR", font=F_BOLD(17), fill=(255, 255, 255, 240))
    dl.text((W - 380, H - 24), "CREATRIX · AGENTIC AI OF THE M.A.D. LABORATORY", font=F_MONO(10), fill=(150, 155, 170, 210))

    # vignette
    vd = ImageDraw.Draw(base)
    vd.rectangle([0, 0, W, H], outline=(0, 0, 0, 110), width=6)

    base.convert("RGB").save(out_path, "JPEG", quality=90)
    print(f"[hero] {out_path} {Image.open(out_path).size}")


def build_icons():
    img32 = rasterize_mark(32)
    img32.save(os.path.join(PUBLIC, "favicon-32.png"))
    img180 = rasterize_mark(180)
    img180.save(os.path.join(PUBLIC, "apple-touch-icon.png"))
    img180.save(os.path.join(PUBLIC, "apple-touch-icon-precomposed.png"))
    img192 = rasterize_mark(192)
    img192.save(os.path.join(PUBLIC, "logo-192.png"))
    img512 = rasterize_mark(512)
    img512.save(os.path.join(PUBLIC, "logo-512.png"))

    for name, bg in (("logo-light-styled.png", (245, 247, 255)), ("logo-dark-styled.png", NAVY2)):
        tile = Image.new("RGBA", (690, 197), bg)
        m = rasterize_mark(197)
        tile.alpha_composite(m, (0, 0))
        tile.save(os.path.join(PUBLIC, name))

    # favicon.ico (multi-size: PIL resizes one source to each requested size)
    rasterize_mark(256).save(
        os.path.join(PUBLIC, "favicon.ico"),
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )

    os.makedirs(ASSETS, exist_ok=True)
    rasterize_mark(512).save(os.path.join(ASSETS, "icon.png"))
    rasterize_mark(256).save(
        os.path.join(ASSETS, "icon.ico"),
        format="ICO",
        sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    print("[icons] favicon.ico, apple-touch-icon, logo PNGs, electron icon.ico/icon.png written")


if __name__ == "__main__":
    gals = [g for g in sorted(glob.glob(r"C:\Users\Dr.Neal\Downloads\GALVANI\*.png"))
            if "BACKGROUND" not in g.upper()]
    src = max(gals, key=os.path.getsize) if gals else None
    if not src:
        raise SystemExit("No GALVANI brand-sheet renders found")
    build_hero(src, os.path.join(PUBLIC, "social_preview_index.jpg"))
    build_icons()

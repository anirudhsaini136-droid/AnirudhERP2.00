from PIL import Image, ImageDraw, ImageFilter


SIZE = 1024


def lerp(a, b, t):
    return int(a + (b - a) * t)


def vertical_gradient(size, top_rgb, bottom_rgb):
    w, h = size
    im = Image.new("RGB", size, top_rgb)
    px = im.load()
    for y in range(h):
        t = y / max(h - 1, 1)
        r = lerp(top_rgb[0], bottom_rgb[0], t)
        g = lerp(top_rgb[1], bottom_rgb[1], t)
        b = lerp(top_rgb[2], bottom_rgb[2], t)
        for x in range(w):
            px[x, y] = (r, g, b)
    return im


def draw_icon(path):
    bg = vertical_gradient((SIZE, SIZE), (8, 14, 28), (4, 8, 18)).convert("RGBA")
    draw = ImageDraw.Draw(bg, "RGBA")

    # Rounded inner panel
    panel_pad = 74
    panel = (panel_pad, panel_pad, SIZE - panel_pad, SIZE - panel_pad)
    draw.rounded_rectangle(panel, radius=220, fill=(12, 20, 38, 255), outline=(46, 67, 108, 170), width=3)

    # Gold ring glow
    glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow, "RGBA")
    gd.ellipse((168, 168, SIZE - 168, SIZE - 168), outline=(212, 175, 55, 170), width=20)
    glow = glow.filter(ImageFilter.GaussianBlur(6))
    bg.alpha_composite(glow)

    # Main ring
    draw.ellipse((178, 178, SIZE - 178, SIZE - 178), outline=(212, 175, 55, 210), width=12)

    # Stylized N
    n = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    nd = ImageDraw.Draw(n, "RGBA")
    x0, y0 = 305, 248
    x1, y1 = 719, 776
    w = 86
    gold_top = (248, 221, 132, 255)
    gold_bot = (188, 138, 14, 255)

    # Left stroke
    for i in range(w):
        t = i / max(w - 1, 1)
        c = (
            lerp(gold_top[0], gold_bot[0], t),
            lerp(gold_top[1], gold_bot[1], t),
            lerp(gold_top[2], gold_bot[2], t),
            255,
        )
        nd.line((x0 + i, y0, x0 + i, y1), fill=c, width=1)

    # Right stroke
    for i in range(w):
        t = i / max(w - 1, 1)
        c = (
            lerp(gold_top[0], gold_bot[0], t),
            lerp(gold_top[1], gold_bot[1], t),
            lerp(gold_top[2], gold_bot[2], t),
            255,
        )
        nd.line((x1 - i, y0, x1 - i, y1), fill=c, width=1)

    # Diagonal stroke
    nd.polygon(
        [
            (x0 + 78, y0),
            (x0 + 166, y0),
            (x1 - 78, y1),
            (x1 - 166, y1),
        ],
        fill=(214, 166, 36, 255),
    )
    nd.polygon(
        [
            (x0 + 96, y0 + 12),
            (x0 + 152, y0 + 12),
            (x1 - 98, y1 - 14),
            (x1 - 154, y1 - 14),
        ],
        fill=(245, 214, 115, 255),
    )

    # Soft shadow + composite
    shadow = n.filter(ImageFilter.GaussianBlur(8))
    sh = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    sh.alpha_composite(shadow, (0, 6))
    bg.alpha_composite(sh, (0, 0))
    bg.alpha_composite(n)

    bg.save(path, "PNG")


if __name__ == "__main__":
    draw_icon("assets/icon.png")
    draw_icon("assets/adaptive-icon.png")
    print("Generated premium app icons in assets/")


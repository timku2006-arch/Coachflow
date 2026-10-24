"""Procedural render: empty gym at dawn, slow push-in on a wall clock.

Output: public/videos/gym-clock.mp4 — 1080x1920 (9:16), 24 fps, 4 s, no audio.
Requires: python3, numpy, Pillow, ffmpeg.
"""

import math
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT_W, OUT_H = 1080, 1920
FPS, SECONDS = 24, 4
FRAMES = FPS * SECONDS
W, H = 1620, 2880  # world canvas (1.5x output)
HORIZON = int(H * 0.70)  # wall/floor line
CLOCK = (int(W * 0.60), int(H * 0.30))
CLOCK_R = int(W * 0.105)
ZOOM_END = 2.1
rng = np.random.default_rng(7)


def noise(w, h, scale, seed):
    r = np.random.default_rng(seed)
    small = r.random((max(2, h // scale), max(2, w // scale))).astype(np.float32)
    img = Image.fromarray((small * 255).astype(np.uint8)).resize((w, h), Image.BICUBIC)
    return np.asarray(img, dtype=np.float32) / 255.0


def blur(arr, radius):
    img = Image.fromarray(np.clip(arr * 255, 0, 255).astype(np.uint8))
    return np.asarray(img.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32) / 255.0


def mask(draw_fn, radius=0):
    m = Image.new("L", (W, H), 0)
    draw_fn(ImageDraw.Draw(m))
    if radius:
        m = m.filter(ImageFilter.GaussianBlur(radius))
    return np.asarray(m, dtype=np.float32) / 255.0


def paint(img, m, color, alpha=1.0):
    c = np.array(color, dtype=np.float32) / 255.0
    a = (m * alpha)[..., None]
    return img * (1 - a) + c * a


def build_world():
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    img = np.zeros((H, W, 3), np.float32)

    # Wall: cool painted plaster, brighter toward the window on the left.
    plaster = 0.6 * noise(W, H, 90, 1) + 0.3 * noise(W, H, 18, 2) + 0.1 * noise(W, H, 4, 3)
    side = np.clip(1.0 - xx / W, 0, 1) ** 1.6
    wall_l = 0.16 + 0.20 * side + 0.035 * (plaster - 0.5)
    wall = np.stack([wall_l * 0.88, wall_l * 0.97, wall_l * 1.10], -1)
    img[:HORIZON] = wall[:HORIZON]

    # Floor: dark rubber with perspective seams and a soft reflection.
    floor_t = (yy - HORIZON) / (H - HORIZON)
    rubber = 0.07 + 0.03 * floor_t + 0.02 * (noise(W, H, 6, 4) - 0.5)
    floor = np.stack([rubber * 0.92, rubber * 0.98, rubber * 1.05], -1)
    img[HORIZON:] = floor[HORIZON:]
    vp = (W * 0.62, HORIZON - H * 0.25)

    def seams(d):
        for i in range(-14, 22):
            x0 = W * 0.62 + i * 300
            d.line([(vp[0] + (x0 - vp[0]) * 0.18, HORIZON), (x0, H)], fill=255, width=3)
        y = HORIZON + 40
        step = 50
        while y < H:
            d.line([(0, y), (W, y)], fill=255, width=3)
            step *= 1.45
            y += step

    img = paint(img, mask(seams, 1.2), (8, 9, 11), 0.55)

    # Skirting line.
    img = paint(img, mask(lambda d: d.rectangle([0, HORIZON - 22, W, HORIZON], fill=255), 1.5), (30, 33, 38), 0.9)

    # Window on the left wall: cold daylight with mullions.
    wx0, wx1, wy0, wy1 = -40, int(W * 0.24), int(H * 0.10), int(H * 0.58)
    glow = mask(lambda d: d.rectangle([wx0, wy0, wx1, wy1], fill=255), 0)
    sky = np.clip(0.75 + 0.2 * (1 - (yy - wy0) / (wy1 - wy0)), 0, 1)
    pane = np.stack([sky * 0.80, sky * 0.88, sky * 0.98], -1)
    img = img * (1 - glow[..., None]) + pane * glow[..., None]

    def frame(d):
        d.rectangle([wx0, wy0, wx1, wy1], outline=255, width=34)
        d.rectangle([wx0, (wy0 + wy1) // 2 - 12, wx1, (wy0 + wy1) // 2 + 12], fill=255)
        d.rectangle([wx1 // 2 - 12, wy0, wx1 // 2 + 12, wy1], fill=255)

    img = paint(img, mask(frame, 1.5), (40, 45, 52), 1.0)
    bloom = blur(glow, 120)
    img += np.stack([bloom * 0.20, bloom * 0.24, bloom * 0.30], -1)

    # Light patch on the floor and a faint one on the wall.
    def floor_patch(d):
        d.polygon([(0, HORIZON + 30), (W * 0.42, HORIZON + 70), (W * 0.98, H), (0, H)], fill=255)

    fp = mask(floor_patch, 70) * np.clip((yy - HORIZON) / 60, 0, 1)
    img += np.stack([fp * 0.16, fp * 0.19, fp * 0.23], -1)

    # Dumbbell rack along the right wall.
    rack_y = HORIZON - 260
    rack = mask(lambda d: (
        d.rectangle([W * 0.40, rack_y + 40, W * 1.05, rack_y + 70], fill=255),
        d.rectangle([W * 0.40, rack_y + 170, W * 1.05, rack_y + 200], fill=255),
        [d.rectangle([x, rack_y + 40, x + 26, HORIZON + 30], fill=255) for x in (W * 0.42, W * 0.72, W * 1.0)],
    ), 1.5)
    img = paint(img, rack, (22, 24, 28), 1.0)
    for row, (y, r) in enumerate(((rack_y + 20, 34), (rack_y + 148, 40))):
        x = W * 0.45
        while x < W + 60:
            def bell(d, x=x, y=y, r=r):
                d.ellipse([x, y - r, x + 2 * r * 0.75, y + r], fill=255)
                d.rectangle([x + r * 1.4, y - 7, x + r * 2.1, y + 7], fill=255)
                d.ellipse([x + r * 1.9, y - r, x + r * 1.9 + 2 * r * 0.75, y + r], fill=255)
            img = paint(img, mask(bell, 1.2), (14, 15, 18), 1.0)
            rim = mask(lambda d, x=x, y=y, r=r: d.arc([x, y - r, x + 2 * r * 0.75, y + r], 150, 250, fill=255, width=4), 2)
            img = paint(img, rim, (95, 108, 125), 0.6)
            x += r * 4.4 + row * 6

    # Flat bench in the left foreground.
    bench = mask(lambda d: (
        d.polygon([(W * 0.06, H * 0.80), (W * 0.52, H * 0.775), (W * 0.56, H * 0.80), (W * 0.08, H * 0.83)], fill=255),
        d.rectangle([W * 0.12, H * 0.825, W * 0.15, H * 0.90], fill=255),
        d.rectangle([W * 0.46, H * 0.795, W * 0.49, H * 0.87], fill=255),
        d.rectangle([W * 0.07, H * 0.895, W * 0.22, H * 0.905], fill=255),
        d.rectangle([W * 0.40, H * 0.865, W * 0.55, H * 0.875], fill=255),
    ), 2)
    img = paint(img, bench, (12, 13, 15), 1.0)
    edge = mask(lambda d: d.line([(W * 0.06, H * 0.80), (W * 0.52, H * 0.775)], fill=255, width=6), 3)
    img = paint(img, edge, (120, 135, 155), 0.55)
    shadow = mask(lambda d: d.ellipse([W * 0.02, H * 0.86, W * 0.62, H * 0.93], fill=255), 40)
    img *= 1 - 0.35 * shadow[..., None]

    # Clock body (face/hands are drawn per frame) with a soft shadow to the lower right.
    cx, cy = CLOCK
    sh = mask(lambda d: d.ellipse([cx - CLOCK_R + 30, cy - CLOCK_R + 36, cx + CLOCK_R + 30, cy + CLOCK_R + 36], fill=255), 28)
    img *= 1 - 0.45 * sh[..., None]

    # Volumetric shaft from the window toward the lower right.
    def shaft(d):
        d.polygon([(wx1 - 20, wy0 + 80), (wx1 - 20, wy1 - 40), (W * 0.95, H * 0.98), (W * 0.62, H * 0.98)], fill=255)

    vol = mask(shaft, 110) * (0.6 + 0.4 * noise(W, H, 140, 9))
    img += np.stack([vol * 0.085, vol * 0.100, vol * 0.125], -1)
    return np.clip(img, 0, 1), vol


def clock_patch(t_sec):
    s = 4  # supersample
    r = CLOCK_R
    size = int(r * 2.3)
    big = Image.new("RGBA", (size * s, size * s), (0, 0, 0, 0))
    d = ImageDraw.Draw(big)
    c = size * s / 2
    R = r * s
    d.ellipse([c - R, c - R, c + R, c + R], fill=(28, 30, 34, 255))
    d.ellipse([c - R * 0.985, c - R * 0.985, c + R * 0.985, c + R * 0.985], fill=(70, 74, 80, 255))
    d.ellipse([c - R * 0.92, c - R * 0.92, c + R * 0.92, c + R * 0.92], fill=(214, 216, 214, 255))
    for i in range(60):
        a = math.radians(i * 6)
        major = i % 5 == 0
        r0 = R * (0.74 if major else 0.82)
        w = int(s * (6 if major else 2))
        d.line([(c + math.sin(a) * r0, c - math.cos(a) * r0),
                (c + math.sin(a) * R * 0.86, c - math.cos(a) * R * 0.86)], fill=(30, 31, 34, 255), width=w)

    # 06:12:40 at frame 0; second hand ticks once per second.
    sec = 40 + math.floor(t_sec)
    minute = 12 + sec / 60
    hour = 6 + minute / 60

    def hand(angle_deg, length, width, color, tail=0.0):
        a = math.radians(angle_deg)
        dx, dy = math.sin(a), -math.cos(a)
        d.line([(c - dx * R * tail, c - dy * R * tail), (c + dx * R * length, c + dy * R * length)],
               fill=color, width=int(width * s))

    hand(hour * 30, 0.48, 11, (22, 23, 26, 255), 0.08)
    hand(minute * 6, 0.72, 7, (22, 23, 26, 255), 0.10)
    hand(sec * 6, 0.80, 2.2, (170, 52, 38, 255), 0.22)
    d.ellipse([c - 9 * s, c - 9 * s, c + 9 * s, c + 9 * s], fill=(170, 52, 38, 255))

    patch = big.resize((size, size), Image.LANCZOS)
    arr = np.asarray(patch, dtype=np.float32) / 255.0
    # Glass: cold light from the left, darker toward the right edge.
    yy, xx = np.mgrid[0:size, 0:size].astype(np.float32)
    shade = 1.0 - 0.28 * (xx / size) ** 1.3
    arr[..., :3] *= shade[..., None]
    arr[..., 0] *= 0.92
    arr[..., 2] *= 1.04
    glare = np.clip(1 - np.hypot(xx - size * 0.36, yy - size * 0.34) / (size * 0.32), 0, 1) ** 2
    arr[..., :3] += glare[..., None] * 0.10
    return np.clip(arr, 0, 1)


def ease(t):
    return t * t * (3 - 2 * t) * 0.35 + t * 0.65  # mostly linear, softened ends


def main(out_path):
    world, vol = build_world()
    cx, cy = CLOCK

    # Dust: world-space particles with depth (parallax + defocus).
    n = 1600
    px = rng.uniform(0, W, n)
    py = rng.uniform(0, H * 0.95, n)
    depth = rng.uniform(0.0, 1.0, n)  # 0 = near camera, 1 = at wall
    vx = rng.normal(0.0, 3.0, n)
    vy = rng.normal(-1.5, 2.5, n)
    phase = rng.uniform(0, 2 * math.pi, n)
    vol_full = np.clip(vol, 0, 1)

    ff = subprocess.Popen([
        "ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
        "-s", f"{OUT_W}x{OUT_H}", "-r", str(FPS), "-i", "-",
        "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", "-an", out_path,
    ], stdin=subprocess.PIPE)

    oy, ox = np.mgrid[0:OUT_H, 0:OUT_W].astype(np.float32)
    vign = 1 - 0.55 * np.clip(np.hypot((ox / OUT_W - 0.5) * 1.1, (oy / OUT_H - 0.45) * 0.9) * 1.6, 0, 1) ** 2.2

    for f in range(FRAMES):
        t = f / (FRAMES - 1)
        tsec = f / FPS
        frame = world.copy()
        patch = clock_patch(tsec)
        ps = patch.shape[0]
        x0, y0 = cx - ps // 2, cy - ps // 2
        a = patch[..., 3:4]
        frame[y0:y0 + ps, x0:x0 + ps] = frame[y0:y0 + ps, x0:x0 + ps] * (1 - a) + patch[..., :3] * a

        # Camera: crop shrinks toward the clock.
        z = 1 + (ZOOM_END - 1) * ease(t)
        cw, ch = W / z, H / z
        k = ease(t)
        ccx = W / 2 + (cx - W / 2) * k
        ccy = H / 2 + (cy - H / 2) * k
        ccx = min(max(ccx, cw / 2), W - cw / 2)
        ccy = min(max(ccy, ch / 2), H - ch / 2)
        box = (ccx - cw / 2, ccy - ch / 2, ccx + cw / 2, ccy + ch / 2)
        img = Image.fromarray((frame * 255).astype(np.uint8)).resize((OUT_W, OUT_H), Image.LANCZOS, box=box)
        out = np.asarray(img, dtype=np.float32) / 255.0

        # Dust layers.
        sharp = Image.new("L", (OUT_W, OUT_H), 0)
        soft = Image.new("L", (OUT_W, OUT_H), 0)
        ds, dsoft = ImageDraw.Draw(sharp), ImageDraw.Draw(soft)
        scale = OUT_W / cw
        for i in range(n):
            wxp = px[i] + vx[i] * tsec + 6 * math.sin(tsec * 0.9 + phase[i])
            wyp = py[i] + vy[i] * tsec + 4 * math.cos(tsec * 0.7 + phase[i])
            # Near particles get extra parallax from the dolly.
            par = 1 + (1 - depth[i]) * 0.6 * (z - 1)
            sx = OUT_W / 2 + (wxp - ccx) * scale * par
            sy = OUT_H / 2 + (wyp - ccy) * scale * par
            if not (-20 < sx < OUT_W + 20 and -20 < sy < OUT_H + 20):
                continue
            lit = vol_full[int(min(max(wyp, 0), H - 1)), int(min(max(wxp, 0), W - 1))]
            b = (0.15 + 2.6 * lit) * (0.6 + 0.4 * math.sin(tsec * 2 + phase[i]))
            if b <= 0.05:
                continue
            if depth[i] < 0.25:
                rr = 3 + (0.25 - depth[i]) * 26
                dsoft.ellipse([sx - rr, sy - rr, sx + rr, sy + rr], fill=int(min(255, 45 * b)))
            else:
                rr = 0.9 + (1 - depth[i]) * 1.4
                ds.ellipse([sx - rr, sy - rr, sx + rr, sy + rr], fill=int(min(255, 150 * b)))
        dust = (np.asarray(sharp.filter(ImageFilter.GaussianBlur(0.8)), np.float32)
                + np.asarray(soft.filter(ImageFilter.GaussianBlur(6)), np.float32)) / 255.0
        out += dust[..., None] * np.array([0.55, 0.62, 0.70], np.float32)

        # Grade: lifted cold blacks, gentle highlight rolloff, vignette, grain.
        out = out * vign[..., None]
        out = out / (1 + 0.25 * out)
        out = out * 0.94 + np.array([0.020, 0.028, 0.040], np.float32)
        grain = rng.normal(0, 0.008, (OUT_H, OUT_W, 1)).astype(np.float32)
        out = np.clip(out + grain, 0, 1)

        ff.stdin.write((out * 255 + 0.5).astype(np.uint8).tobytes())
        print(f"\rframe {f + 1}/{FRAMES}", end="", file=sys.stderr)

    ff.stdin.close()
    ff.wait()
    print(file=sys.stderr)


if __name__ == "__main__":
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "public/videos/gym-clock.mp4")
    out.parent.mkdir(parents=True, exist_ok=True)
    main(str(out))

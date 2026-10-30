"""Remove only the edge-connected white matte from the two cat stickers.

Usage: python3 scripts/transparent-cats.py
Requires Pillow, NumPy and SciPy. Preserves every source frame and its timing.
The other three GIFs have photographic backgrounds and are intentionally intact.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageSequence
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1] / "assets" / "cats"


def convert(name):
    source = Image.open(ROOT / f"{name}.gif")
    frames = []
    durations = []
    for frame in ImageSequence.Iterator(source):
        rgba = np.array(frame.convert("RGBA"))
        rgb = rgba[:, :, :3].astype(np.int16)
        # Only flood-fill near-neutral white from the canvas edges. A simple
        # chroma-key would also erase the white fur in the feeding-cat sticker.
        # GIF edge antialiasing is often light gray rather than exact white.
        white = (rgb.min(axis=2) >= 210) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 42)
        seeds = np.zeros(white.shape, dtype=bool)
        seeds[0, :] = seeds[-1, :] = True
        seeds[:, 0] = seeds[:, -1] = True
        background = ndimage.binary_propagation(seeds & white, mask=white)
        # Feather the last edge pixel to avoid a bright/jagged halo on dark XP
        # wallpapers. Keep interior white fur and facial highlights opaque.
        distance = ndimage.distance_transform_edt(~background)
        rgba[:, :, 3] = np.minimum(rgba[:, :, 3], np.clip(distance * 127, 0, 255).astype(np.uint8))
        edge = (rgba[:, :, 3] > 0) & (rgba[:, :, 3] < 255)
        if edge.any():
            opaque = rgba[:, :, 3] == 255
            nearest = ndimage.distance_transform_edt(~opaque, return_distances=False, return_indices=True)
            rgba[edge, :3] = rgba[nearest[0][edge], nearest[1][edge], :3]
        rgba[rgba[:, :, 3] == 0, :3] = 0
        frames.append(Image.fromarray(rgba, "RGBA"))
        durations.append(frame.info.get("duration", source.info.get("duration", 60)))
    frames[0].save(
        ROOT / f"{name}-transparent.webp",
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        quality=86,
        method=5,
    )
    print(f"{name}: {len(frames)} frames, alpha WebP saved")


if __name__ == "__main__":
    for sticker in ("feeding", "jump"):
        convert(sticker)

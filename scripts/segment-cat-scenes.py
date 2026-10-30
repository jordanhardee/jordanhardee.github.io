"""Cut moving cats out of photographic GIF scenes without changing source GIFs.

Requires Pillow, NumPy, and rembg with its small ``u2netp`` model:
  python3 -m pip install 'rembg[cpu]' pillow numpy
  python3 scripts/segment-cat-scenes.py

The resulting animated WebP files keep each GIF frame's duration and looping.
The input GIFs remain unchanged for archival/reprocessing purposes.
"""

from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageSequence
from rembg import new_session, remove


ASSETS = Path(__file__).resolve().parents[1] / "assets" / "cats"
CAT_SCENES = ("hands", "hilarious", "giphy")
MAX_EDGE = 380  # Website displays the floating cats at 175–195 CSS pixels.


def process(name, session):
    source = Image.open(ASSETS / f"{name}.gif")
    frames = []
    durations = []

    for index, frame in enumerate(ImageSequence.Iterator(source)):
        # Pillow composites GIF disposal/partial updates into the full canvas.
        rgba = frame.convert("RGBA")
        rgba.thumbnail((MAX_EDGE, MAX_EDGE), Image.Resampling.LANCZOS)
        cutout = remove(rgba, session=session, alpha_matting=False)
        pixels = np.array(cutout.convert("RGBA"))

        # Suppress low-confidence isolated haze from the room background.
        alpha = pixels[:, :, 3]
        alpha[alpha < 18] = 0
        if name == "hilarious":
            # The unrelated upright object behind the pair occasionally
            # gets selected as foreground. Its upper end sits above the
            # cats' silhouettes; avoid cutting holes through paws below.
            height = alpha.shape[0]
            alpha[: round(height * 0.27), :] = 0
        pixels[:, :, 3] = alpha
        pixels[alpha == 0, :3] = 0
        frames.append(Image.fromarray(pixels, "RGBA"))
        durations.append(frame.info.get("duration", source.info.get("duration", 60)))
        if (index + 1) % 20 == 0:
            print(f"{name}: segmented {index + 1}/{source.n_frames}", flush=True)

    output = ASSETS / f"{name}-transparent.webp"
    frames[0].save(
        output,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        quality=81,
        method=5,
    )
    print(f"{name}: wrote {len(frames)} transparent frames to {output.name}", flush=True)


if __name__ == "__main__":
    selected = sys.argv[1:] or CAT_SCENES
    if any(scene not in CAT_SCENES for scene in selected):
        raise SystemExit(f"Known scenes: {', '.join(CAT_SCENES)}")
    # Full U2Net holds on to the white cat's fur as it moves; ISNet leaves
    # less of the furniture behind the two high-fiving cats.
    sessions = {}
    for scene in selected:
        model = "isnet-general-use" if scene == "hilarious" else "u2net"
        if model not in sessions:
            sessions[model] = new_session(model)
        process(scene, sessions[model])

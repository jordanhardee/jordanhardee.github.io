# Cursor Mania / CursorPhreak assets

The Cursor Mania window browses **all 11,145 cursors** from Jordan Hardee's
[CursorPhreak](https://github.com/jordanhardee/CursorPhreak) catalog, using its
23 main categories and 153 subcategories. The application logo (`logo.png`) is
copied from `src/renderer/logo.png` in that project. The gallery lazily retrieves
the original GIF/PNG previews and selected cursor frames using HTTP byte-range
requests to `catalog.json`, `previews.pak`, and `frames.pak` at pinned revision
`c04b94cfeed1f12d6aa580ce7e8c669e4d671c02`. The public GitHub raw CDN
must be reachable for the complete catalog to work. No visitors' cursor
selections or favorites are persisted, and no extension is installed.

## Previously exported small icons

The 16 PNG files in this directory are first-frame, 32×32 RGBA exports from
[CursorPhreak](https://github.com/jordanhardee/CursorPhreak), by Jordan Hardee.
They were decoded from that repository's `assets/catalog.json` and
`assets/frames.pak` without redrawing or generating the original designs.

Source IDs, in filename order:

| Filename | CursorPhreak catalog ID |
| --- | --- |
| `alien-2.png` | `13318a` |
| `arrow-1.png` | `13333a` |
| `arrow-2.png` | `13153a` |
| `cat-1.png` | `13321a` |
| `cat-2.png` | `13316a` |
| `cat-3.png` | `13317a` |
| `colorful-1.png` | `3921` |
| `colorful-2.png` | `3922` |
| `creature-1.png` | `13212a` |
| `creature-2.png` | `13193a` |
| `dog-2.png` | `11662a` |
| `fun-1.png` | `13176a` |
| `popular-4.png` | `7211[1]` |
| `popular-5.png` | `7213[1]` |
| `popular-6.png` | `8764a[1]` |
| `smiley-2.png` | `12354a` |

CursorPhreak is published under GPL-3.0; the upstream license text is copied
to `LICENSE` in this directory. The historical cursor artwork predates the
CursorPhreak application and may have separate underlying rights.

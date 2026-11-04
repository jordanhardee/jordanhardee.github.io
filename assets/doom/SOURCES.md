# Original DOOM shareware in the browser

This is the original 1993 DOOM shareware Episode 1, running in Chocolate Doom
compiled to WebAssembly. It runs entirely in your browser; there is no game
server, matchmaking, account, or telemetry.

- Engine glue (`websockets-doom.js`) and WebAssembly (`websockets-doom.wasm`):
  [danborden1/doom-web at e0ba810](https://github.com/danborden1/doom-web/tree/e0ba81004e27e7d66141925dfebb091a558e2fe8).
  The binaries are unmodified. Its README identifies the corresponding source
  as [Saketh-Chandra/doom-wasm-pwa at a77edfd](https://github.com/Saketh-Chandra/doom-wasm-pwa/tree/a77edfd8bbc7),
  descended from Cloudflare's `doom-wasm` and Chocolate Doom.
- Engine license: GNU GPL v2; see [COPYING](COPYING).
- `doom1.wad`: original v1.9 shareware IWAD, fetched from
  [theMagicalKarp/wasmdoom at dd321b5](https://github.com/theMagicalKarp/wasmdoom/tree/dd321b50b89b5085698cfbf2ff01b2f741da8206/wads),
  MD5 `f0cefca49926d00903cf57551d901abe`. The game artwork and data remain
  copyright id Software / their rightsholders, separate from the GPL engine.
- `doom.html`: local integration and mobile control layer adapted from the
  [danborden1/doom-web](https://github.com/danborden1/doom-web) browser launcher.

The Pages workflow downloads the pinned upstream binaries and verifies hashes,
so the Git repository itself does not contain binary game files. The published
site serves the resulting assets from the same origin as the website.

The original shareware game has sound effects. In-engine MIDI is disabled with
`-nomusic` to avoid a WebAssembly startup hang; the website's own music pauses
while its DOOM window is open. Save slots are mirrored into local browser
storage and are not uploaded.

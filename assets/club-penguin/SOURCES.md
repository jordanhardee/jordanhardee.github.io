# Original Club Penguin assets

These assets are original archived Club Penguin Flash files/artwork, **not**
recreated drawings. They are used for a single-room, offline nostalgia viewer.

- `../clubpenguin/coffee.swf`: original Coffee Shop room (2010), at the
  public URL `/assets/clubpenguin/coffee.swf`, retrieved from
  [barichello/cp-swf-archive](https://gitlab.com/barichello/cp-swf-archive/-/blob/master/2010/default/coffee.swf).
  The same SWF remains at `club-penguin/coffee.swf` temporarily for visitors
  whose browsers have cached an earlier version of the player script.
- `blue-puffle.swf`: original blue puffle sprite collection, preserved by
  [Club Penguin Archives mirror](https://toolbox.solero.me/cparchives/static/images/archives/0/00/PuffleSpritesBlue.swf).
- `blue-puffle-walk.swf`: original blue puffle walking sprite collection from
  [Club Penguin Archives mirror](https://toolbox.solero.me/cparchives/static/images/archives/a/a2/PuffleSpritesWalkPuffle_blue_walk.swf).
- `blue-puffle-idle.webp`: the **original eight animation frames** of
  `DefineSprite_8` extracted from `blue-puffle-walk.swf` using
  [JPEXS Free Flash Decompiler](https://github.com/jindrapetrik/jpexs-decompiler)
  26.4.0. The frames retain the original drawings and timing.
- `../clubpenguin/avatar/idle-{1..5}.webp` and `walk-{1..5}.webp`:
  original Club Penguin penguin poses and eight-frame walking cycles from the
  [Penguin extraction by iChibi at The Spriters Resource](https://www.spriters-resource.com/browser_games/clubpenguin/asset/80978/).
  Each render composites the archived **Color, Belly, and Body** PNG layers,
  bottom-aligned on a transparent 460×480 canvas and resized to 360×376.
  Directions 1–5 are front, front-side, side, back-side, and back; right-facing
  directions are mirrored client-side. The artwork is not redrawn or generated.

The room SWF is rendered by [Ruffle](https://ruffle.rs/), which is free and
open source. The static site's build bundles Ruffle 0.7.1 locally, so no
external Ruffle CDN is used at runtime.

Disney's Club Penguin characters, game assets, and related trademarks are **not**
open source, despite the archive repositories or Ruffle being available. No
affiliation with or endorsement from Disney is implied. This project does not
provide accounts, currency, multiplayer, servers, or the original game's
backend. The displayed coin balance is a local visual label only. The playable
penguin, its walkable floor bounds, and its click/keyboard movement are entirely
local JavaScript and do not attempt to recreate multiplayer or server features.

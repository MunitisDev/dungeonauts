# assets/

Approved production artwork only. **Claude Code does not create files here.**

Artwork is produced externally and dropped in at the exact path listed in
`docs/art/ASSET_MANIFEST.md`. Nothing else is needed: the game loads every asset
by manifest id, and `AssetRegistry` swaps the temporary placeholder for the real
texture as soon as a file exists at the expected path.

Before adding a file, check it against `docs/art/SPRITE_SPEC.md`:

- exact canvas and frame dimensions
- correct frame count and row/column order (rows are `down, left, right, up`)
- transparent background
- no anti-aliasing, no stray semi-transparent pixels
- bottom-center alignment for world entities

Directory layout mirrors the manifest:

```text
assets/
├── characters/hero/        32x40 gameplay sheets
├── characters/portraits/   128x128 character-select UI art
├── enemies/slime/
├── dungeon/tiles/
├── dungeon/doors/
├── dungeon/props/
└── ui/icons/
```

## Portraits are not sprites

`characters/portraits/` holds 128×128 UI art for character selection. It must
never be used for movement, idle or combat — those come from the 32×40 sheets in
`characters/hero/`. The manifest marks portraits `post-slice`, so they are
tracked and dimension-checked but never downloaded at boot.

## Automated checks

`tests/assetFiles.test.ts` reads the PNG header of every committed asset and
fails if its dimensions do not match the manifest. Art that has not arrived yet
is skipped, so the suite stays green while production is under way. A wrong-size
spritesheet is the most common delivery error, and this catches it in CI rather
than on screen.

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
├── characters/hero/
├── enemies/slime/
├── dungeon/tiles/
├── dungeon/doors/
├── dungeon/props/
└── ui/icons/
```

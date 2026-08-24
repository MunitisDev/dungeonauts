import type { CharacterId } from '../../engine/assets/assetManifest'

/**
 * Which characters have gameplay art of their own.
 *
 * None of them, currently. The six portraits on the selection screen are real,
 * but the sprite that walks the dungeon is the knight from the packed tileset,
 * whoever the child picked. The selection screen says so on every card rather
 * than letting a child pick the mage and be handed a knight in silence.
 *
 * This stops being empty the day a character's own 16x16 sheet arrives.
 */
const WITH_OWN_SPRITES: ReadonlySet<CharacterId> = new Set()

/** True when this character has its own gameplay sprite rather than the knight's. */
export function hasOwnSprites(character: CharacterId): boolean {
  return WITH_OWN_SPRITES.has(character)
}

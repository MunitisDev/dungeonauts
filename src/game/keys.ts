/** Scene identifiers, kept in one place so scene transitions never use literals. */
export const SCENE_KEYS = {
  boot: 'boot',
  room: 'room',
} as const

/** Phaser global-registry key holding the shared `AssetRegistry`. */
export const REGISTRY_KEY_ASSETS = 'assets'

import type { MusicPlayer } from '../audio/MusicPlayer'
import type { Sfx } from '../audio/sfx'
import type { ChallengePanel } from '../ui/ChallengePanel'
import type { CompletionPanel } from '../ui/CompletionPanel'
import type { Feedback } from '../ui/Feedback'
import type { Hud } from '../ui/Hud'
import type { Progression } from './state/Progression'
import type { SaveStore } from './state/SaveStore'
import type { Settings } from './state/Settings'

/**
 * The DOM-side pieces the world needs to talk to.
 *
 * Passed in rather than reached for, so the scene depends on a small interface
 * instead of on the page. It also keeps the direction of dependency honest: the
 * world asks the UI to show something; the UI never drives the world.
 */
export interface GameServices {
  readonly challengePanel: ChallengePanel
  readonly completionPanel: CompletionPanel
  readonly feedback: Feedback
  readonly hud: Hud
  readonly progression: Progression
  readonly save: SaveStore
  readonly settings: Settings
  readonly music: MusicPlayer
  readonly sfx: Sfx
}

import type { ChallengePanel } from '../ui/ChallengePanel'
import type { CompletionPanel } from '../ui/CompletionPanel'
import type { Feedback } from '../ui/Feedback'
import type { Hud } from '../ui/Hud'
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
  readonly settings: Settings
}

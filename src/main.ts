import './ui/overlay.css'
import { createGame } from './engine/createGame'
import type { GameServices } from './game/services'
import { Settings } from './game/state/Settings'
import { ChallengePanel } from './ui/ChallengePanel'
import { CompletionPanel } from './ui/CompletionPanel'
import { Feedback } from './ui/Feedback'
import { Hud } from './ui/Hud'
import { LocaleSwitch } from './ui/LocaleSwitch'
import { createOverlay } from './ui/overlay'

interface RoomReadyPayload {
  roomId: string
  roomName: string
  placeholders: string[]
  approved: string[]
}

const mount = document.getElementById('app')
if (!mount) throw new Error('Missing #app mount point in index.html')

const overlay = createOverlay(mount)
const settings = new Settings()

// The DOM layer is built first and handed to the world, so the world depends on
// a small interface rather than reaching into the page.
const hud = new Hud(overlay.hud, settings.ui)
new LocaleSwitch(overlay.hud, settings)

const services: GameServices = {
  challengePanel: new ChallengePanel(overlay.challenge, (message) => overlay.announce(message)),
  completionPanel: new CompletionPanel(overlay.completion),
  feedback: new Feedback(overlay.feedback, (message) => overlay.announce(message)),
  hud,
  settings,
}

const game = createGame(overlay.canvasHost, services)

let lastRoom: RoomReadyPayload | undefined

/** Rewrites the dev strip, so it follows the interface language too. */
function renderDevBanner(): void {
  if (!lastRoom) return
  const { placeholders, approved, roomName, roomId } = lastRoom
  if (placeholders.length === 0) {
    overlay.devBanner.textContent = ''
    return
  }
  const locale = settings.ui
  const total = placeholders.length + approved.length
  overlay.devBanner.innerHTML =
    locale === 'es'
      ? `<strong>ARTE PROVISIONAL</strong> — ${placeholders.length} de ${total} assets sin arte ` +
        `aprobada. Sala: ${roomName} (${roomId}). Muévete con las flechas o WASD, o toca una ` +
        `casilla. Camina contra el slime, la puerta o el cofre para interactuar. G alterna la rejilla.`
      : `<strong>PLACEHOLDER ART</strong> — ${placeholders.length} of ${total} assets have no ` +
        `approved art. Room: ${roomName} (${roomId}). Move with the arrows or WASD, or tap a ` +
        `tile. Walk into the slime, the door or the chest to interact. G toggles the grid.`
}

game.events.on('dungeonauts:room-ready', (payload: RoomReadyPayload) => {
  lastRoom = payload
  renderDevBanner()
  overlay.announce(payload.roomName)
})

settings.onChange(() => {
  hud.setLocale(settings.ui)
  renderDevBanner()
})

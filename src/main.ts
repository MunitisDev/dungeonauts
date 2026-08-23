import './ui/overlay.css'
import { createGame } from './engine/createGame'
import type { GameServices } from './game/services'
import { DEFAULT_LOCALE } from './i18n/locales'
import { ChallengePanel } from './ui/ChallengePanel'
import { Feedback } from './ui/Feedback'
import { Hud } from './ui/Hud'
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

// The DOM layer is built first and handed to the world, so the world depends on
// a small interface rather than reaching into the page.
const services: GameServices = {
  challengePanel: new ChallengePanel(overlay.challenge, (message) => overlay.announce(message)),
  feedback: new Feedback(overlay.feedback, (message) => overlay.announce(message)),
  hud: new Hud(overlay.hud, DEFAULT_LOCALE),
}

const game = createGame(overlay.canvasHost, services)

// Temporary development strip. It disappears on its own once every manifest
// entry resolves to approved art.
game.events.on('dungeonauts:room-ready', (payload: RoomReadyPayload) => {
  const { placeholders, approved, roomName, roomId } = payload
  if (placeholders.length === 0) {
    overlay.devBanner.textContent = ''
    return
  }
  overlay.devBanner.innerHTML =
    `<strong>ARTE PROVISIONAL</strong> — ${placeholders.length} de ` +
    `${placeholders.length + approved.length} assets sin arte aprobada. ` +
    `Sala: ${roomName} (${roomId}). ` +
    `Muévete con las flechas o WASD, o toca una casilla. ` +
    `Camina contra el slime, la puerta o el cofre para interactuar. G alterna la rejilla.`
  overlay.announce(`Has entrado en ${roomName}`)
})

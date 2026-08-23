import './ui/overlay.css'
import { createGame } from './engine/createGame'
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
const game = createGame(overlay.canvasHost)

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
    `Sala: ${roomName} (${roomId}). Pulsa G para la rejilla de depuración.`
  overlay.announce(`Sala de pruebas cargada: ${roomName}`)
})

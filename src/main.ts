import './ui/overlay.css'
import { AudioEngine } from './audio/AudioEngine'
import { MusicPlayer } from './audio/MusicPlayer'
import { Sfx } from './audio/sfx'
import { createGame } from './engine/createGame'
import type { GameServices } from './game/services'
import { Settings } from './game/state/Settings'
import { ChallengePanel } from './ui/ChallengePanel'
import { CompletionPanel } from './ui/CompletionPanel'
import { Feedback } from './ui/Feedback'
import { FullscreenButton } from './ui/FullscreenButton'
import { Hud } from './ui/Hud'
import { LocaleSwitch } from './ui/LocaleSwitch'
import { SoundToggle } from './ui/SoundToggle'
import { TitleScreen } from './ui/TitleScreen'
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

const audio = new AudioEngine()
const music = new MusicPlayer(audio)
const sfx = new Sfx(audio)
audio.setEnabled(settings.soundEnabled)

const hud = new Hud(overlay.hud, settings.ui)
new LocaleSwitch(overlay.hud, settings)
new SoundToggle(overlay.hud, settings, (enabled) => {
  audio.setEnabled(enabled)
  if (enabled) sfx.play('ui')
})

const services: GameServices = {
  challengePanel: new ChallengePanel(overlay.challenge, (message) => overlay.announce(message), sfx),
  completionPanel: new CompletionPanel(overlay.completion),
  feedback: new Feedback(overlay.feedback, (message) => overlay.announce(message)),
  hud,
  settings,
  music,
  sfx,
}

const game = createGame(overlay.canvasHost, services)

let started = false

/**
 * Audio cannot start without a genuine user gesture, so it is unlocked by the
 * first interaction of any kind — a click anywhere, a key, a touch.
 *
 * Unlocking on the Play button alone would mean the title theme never actually
 * played on the title screen: it would start and be replaced in the same
 * moment. Hooking the first interaction instead means a child who pauses to
 * read the tagline, or to pick a language, hears the theme it was written for.
 */
function startAudio(): void {
  audio.unlock()
  audio.setEnabled(settings.soundEnabled)
  if (!started) music.play('title')
}

for (const type of ['pointerdown', 'keydown', 'touchstart'] as const) {
  window.addEventListener(type, startAudio, { once: false, capture: true, passive: true })
}

// Counters mean nothing before the run begins, so the title screen shows only
// the controls a child might want first: language and sound.
overlay.hud.dataset['stage'] = 'title'

const title = new TitleScreen(overlay.title, settings, () => {
  started = true
  overlay.hud.dataset['stage'] = 'playing'
  startAudio()
  sfx.play('ui')
  music.play('dungeon')
})

// Full screen is offered on the title screen, where there is room to explain
// it, and again in the HUD so it can be left without ending the run.
new FullscreenButton(title.controls, overlay.root, settings)
new FullscreenButton(overlay.hud, overlay.root, settings)

let lastRoom: RoomReadyPayload | undefined

/** Rewrites the dev strip, so it follows the interface language too. */
function renderDevBanner(): void {
  if (!lastRoom) return
  const { placeholders, approved, roomName, roomId } = lastRoom
  if (placeholders.length === 0) {
    overlay.devBanner.textContent = ''
    return
  }
  const total = placeholders.length + approved.length
  overlay.devBanner.innerHTML =
    settings.ui === 'es'
      ? `<strong>ARTE PROVISIONAL</strong> — ${placeholders.length} de ${total} assets sin arte ` +
        `aprobada. Sala: ${roomName} (${roomId}). Toca una casilla para ir; toca el slime, la ` +
        `puerta o el cofre para interactuar. Las flechas también funcionan. G alterna la rejilla.`
      : `<strong>PLACEHOLDER ART</strong> — ${placeholders.length} of ${total} assets have no ` +
        `approved art. Room: ${roomName} (${roomId}). Tap a tile to walk there; tap the slime, ` +
        `the door or the chest to interact. Arrow keys work too. G toggles the grid.`
}

game.events.on('dungeonauts:room-ready', (payload: RoomReadyPayload) => {
  lastRoom = payload
  renderDevBanner()
  if (started) overlay.announce(payload.roomName)
})

settings.onChange(() => {
  hud.setLocale(settings.ui)
  renderDevBanner()
})

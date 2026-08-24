import './ui/overlay.css'
import { AudioEngine } from './audio/AudioEngine'
import { MusicPlayer } from './audio/MusicPlayer'
import { Sfx } from './audio/sfx'
import { createGame } from './engine/createGame'
import type { GameServices } from './game/services'
import {
  EVENT_ROOM_READY,
  EVENT_RUN_SAVED,
  EVENT_START_RUN,
  EVENT_TILESET_READY,
  EVENT_WORLD_READY,
  type RunRequest,
} from './game/run'
import type { TilePack } from './engine/assets/tilepack'
import { publishHudIcons } from './ui/icons'
import type { Profile } from './game/state/Profile'
import { Progression } from './game/state/Progression'
import { SaveStore } from './game/state/SaveStore'
import { Settings } from './game/state/Settings'
import type { CharacterId } from './engine/assets/assetManifest'
import { t } from './i18n/strings'
import { ChallengePanel } from './ui/ChallengePanel'
import { CharacterSelect } from './ui/CharacterSelect'
import { OnboardingPanel } from './ui/OnboardingPanel'
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
  /** False when the packed tileset failed to load and the room is bare. */
  tileset: boolean
}

const mount = document.getElementById('app')
if (!mount) throw new Error('Missing #app mount point in index.html')

const overlay = createOverlay(mount)
const settings = new Settings()
const save = new SaveStore()
const progression = new Progression(save.xp)

const audio = new AudioEngine()
const music = new MusicPlayer(audio)
const sfx = new Sfx(audio)
audio.setEnabled(settings.soundEnabled)

const hud = new Hud(overlay.hud, settings.ui)
hud.setProgress(progression.progress)
progression.onChange((next) => hud.setProgress(next))
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
  progression,
  save,
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

const onboarding = new OnboardingPanel(overlay.onboarding, settings)
const characterSelect = new CharacterSelect(overlay.select, settings)

/** A fresh seed per run, so two children on one browser get different maps. */
function newSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0
}

/** Hands the world a profile and a seed, and gets out of the way. */
function beginRun(profile: Profile, seed: number, restore = false): void {
  started = true
  overlay.hud.dataset['stage'] = 'playing'
  startAudio()
  sfx.play('ui')
  music.play('dungeon')
  hud.setPlayer(profile.name)
  const run = restore ? save.run : undefined
  requestRun({ profile, seed, ...(run ? { restore: run } : {}) })
}

let worldReady = false
let pendingRun: RunRequest | undefined

/** Sends the request now, or holds it until the world exists. */
function requestRun(request: RunRequest): void {
  if (worldReady) game.events.emit(EVENT_START_RUN, request)
  else pendingRun = request
}

game.events.on(EVENT_WORLD_READY, () => {
  worldReady = true
  if (!pendingRun) return
  const request = pendingRun
  pendingRun = undefined
  game.events.emit(EVENT_START_RUN, request)
})

/**
 * New game: ask who is playing, then who they want to be.
 *
 * Both answers are remembered, so a second run offers them back rather than
 * making a child retype their name to change nothing.
 */
function startNewGame(): void {
  startAudio()
  const known = save.profile
  onboarding.open({ ...(known ? { name: known.name, age: known.age } : {}) }, (introduction) => {
    characterSelect.open(known?.character, (character: CharacterId) => {
      const profile: Profile = { ...introduction, character }
      save.setProfile(profile)
      beginRun(profile, newSeed())
    })
  })
}

const title = new TitleScreen(overlay.title, settings, {
  onNewGame: startNewGame,
  onContinue: () => {
    const profile = save.profile
    const run = save.run
    if (!profile || !run) {
      startNewGame()
      return
    }
    beginRun(profile, run.seed, true)
  },
})
title.setResumable(save.hasRun)

// Full screen is offered on the title screen, where there is room to explain
// it, and again in the HUD so it can be left without ending the run.
new FullscreenButton(title.controls, overlay.root, settings)
new FullscreenButton(overlay.hud, overlay.root, settings)

let lastRoom: RoomReadyPayload | undefined

/**
 * The strip under the canvas, which now says nothing unless something is wrong.
 *
 * It used to carry the control hints, and appeared only once a run started —
 * so the moment a child pressed Play the whole game jumped to a smaller size to
 * make room for it. The hints belong on the title screen, where there is space
 * and where a child is actually reading. What is left here is the one message
 * worth interrupting for: the artwork failed to load.
 */
function renderDevBanner(): void {
  if (!lastRoom || lastRoom.tileset) {
    overlay.devBanner.textContent = ''
    return
  }
  overlay.devBanner.innerHTML =
    settings.ui === 'es'
      ? '<strong>SIN TILESET</strong> — el pack de gráficos no se ha podido abrir.'
      : '<strong>NO TILESET</strong> — the artwork pack could not be unpacked.'
}

game.events.on(EVENT_ROOM_READY, (payload: RoomReadyPayload) => {
  lastRoom = payload
  renderDevBanner()
  if (started) overlay.announce(payload.roomName)
})

settings.onChange(() => {
  hud.setLocale(settings.ui)
  renderDevBanner()
})

// The coin, the key and — as a red potion — the heart come out of the tileset.
// Nothing in it is star-shaped, so stars keep their lettered placeholder.
game.events.on(EVENT_TILESET_READY, (pack: TilePack) => {
  void publishHudIcons(pack, document.documentElement).then((done) => {
    if (done.length > 0) console.info('[dungeonauts] HUD icons from the tileset:', done.join(', '))
  })
})

// A quiet confirmation rather than a dialog: saving happens constantly, so it
// must never interrupt. Suppressed for the write that begins a run, which the
// child did not ask for and would only find confusing.
game.events.on(EVENT_RUN_SAVED, () => {
  if (started) overlay.announce(t(settings.ui, 'save.saved'))
})

import type { MapModel, MapRoom } from '../game/world/minimap'
import type { Locale } from '../i18n/locales'
import { t } from '../i18n/strings'

const SVG = 'http://www.w3.org/2000/svg'

/** Room box and the gap around it, in the drawing's own units. */
const ROOM_W = 13
const ROOM_H = 9
const GAP = 5
const PITCH_X = ROOM_W + GAP
const PITCH_Y = ROOM_H + GAP

/**
 * The map of the floor, in the corner and full-screen.
 *
 * Drawn as SVG rather than as boxes, for two reasons: the corridors between
 * rooms are lines and lines are what SVG is for, and the same markup scales to
 * a thumbnail or to a whole phone screen without a second drawing.
 *
 * It is a button. Tapping it opens the same map big enough to study, which is
 * what a small child will want the moment the floor stops fitting in their head.
 */
export class Minimap {
  private model: MapModel | undefined
  private locale: Locale = 'es'
  private readonly button: HTMLButtonElement
  private readonly modal: HTMLElement
  private readonly modalTitle: HTMLElement
  private readonly modalFigure: HTMLElement
  private readonly closeButton: HTMLButtonElement

  constructor(
    private readonly root: HTMLElement,
    modalRoot: HTMLElement,
  ) {
    this.button = document.createElement('button')
    this.button.type = 'button'
    this.button.className = 'minimap-button'
    this.button.addEventListener('click', () => this.open())
    this.root.append(this.button)
    this.root.hidden = true

    this.modal = modalRoot
    this.modal.className = 'minimap-modal'
    this.modal.hidden = true

    this.modalTitle = document.createElement('h2')
    this.modalTitle.className = 'minimap-title'

    this.modalFigure = document.createElement('div')
    this.modalFigure.className = 'minimap-figure'

    this.closeButton = document.createElement('button')
    this.closeButton.type = 'button'
    this.closeButton.className = 'minimap-close'
    this.closeButton.addEventListener('click', () => this.close())

    this.modal.append(this.modalTitle, this.modalFigure, this.closeButton)
    this.modal.addEventListener('click', (event) => {
      // Anywhere off the map closes it: a child should not have to find a
      // button, and there is nothing here to lose by tapping.
      if (event.target === this.modal) this.close()
    })
  }

  get isOpen(): boolean {
    return !this.modal.hidden
  }

  setLocale(locale: Locale): void {
    this.locale = locale
    if (this.model) this.update(this.model)
  }

  /** Redraws from a fresh model. Called on every room and every room finished. */
  update(model: MapModel): void {
    this.model = model
    const empty = model.rooms.length === 0
    this.root.hidden = empty
    if (empty) {
      this.close()
      return
    }

    this.button.textContent = ''
    this.button.append(this.draw(model))
    this.button.setAttribute('aria-label', this.summary(model))

    if (this.isOpen) this.paintModal(model)
  }

  private summary(model: MapModel): string {
    return `${t(this.locale, 'map.title')}: ${String(model.done)}/${String(model.visited)}`
  }

  open(): void {
    if (!this.model) return
    this.paintModal(this.model)
    this.modal.hidden = false
    this.closeButton.focus()
  }

  close(): void {
    this.modal.hidden = true
    this.modalFigure.textContent = ''
  }

  private paintModal(model: MapModel): void {
    this.modalTitle.textContent = t(this.locale, 'map.title')
    this.closeButton.textContent = t(this.locale, 'map.close')
    this.modalFigure.textContent = ''
    this.modalFigure.append(this.draw(model, true))
  }

  /**
   * One drawing, used at both sizes.
   *
   * Rooms are boxes and doorways are the lines between them, so the map has the
   * shape of the dungeon rather than a grid of unrelated squares. A line is only
   * drawn once, from the lower id, or every corridor would be drawn twice.
   */
  private draw(model: MapModel, large = false): SVGSVGElement {
    const svg = document.createElementNS(SVG, 'svg')
    const width = model.width * PITCH_X - GAP
    const height = model.height * PITCH_Y - GAP
    svg.setAttribute('viewBox', `-2 -2 ${String(width + 4)} ${String(height + 4)}`)
    svg.setAttribute('class', large ? 'minimap-svg is-large' : 'minimap-svg')
    svg.setAttribute('role', 'img')
    svg.setAttribute('aria-label', this.summary(model))

    const centre = (room: MapRoom) => ({
      x: room.gx * PITCH_X + ROOM_W / 2,
      y: room.gy * PITCH_Y + ROOM_H / 2,
    })
    const byId = new Map(model.rooms.map((room) => [room.id, room]))

    for (const room of model.rooms) {
      for (const link of room.links) {
        const other = byId.get(link)
        if (!other || room.id > link) continue
        const from = centre(room)
        const to = centre(other)
        const line = document.createElementNS(SVG, 'line')
        line.setAttribute('x1', String(from.x))
        line.setAttribute('y1', String(from.y))
        line.setAttribute('x2', String(to.x))
        line.setAttribute('y2', String(to.y))
        line.setAttribute('class', 'minimap-link')
        svg.append(line)
      }
    }

    for (const room of model.rooms) {
      const box = document.createElementNS(SVG, 'rect')
      box.setAttribute('x', String(room.gx * PITCH_X))
      box.setAttribute('y', String(room.gy * PITCH_Y))
      box.setAttribute('width', String(ROOM_W))
      box.setAttribute('height', String(ROOM_H))
      box.setAttribute('rx', '2')
      box.setAttribute('class', 'minimap-room')
      box.dataset['state'] = state(room)
      svg.append(box)

      // The way down, once it has been found. Never before: a map that points
      // at the exit from the first room is a map that ends the game.
      if (room.exit && room.visited) {
        const mark = document.createElementNS(SVG, 'circle')
        mark.setAttribute('cx', String(room.gx * PITCH_X + ROOM_W / 2))
        mark.setAttribute('cy', String(room.gy * PITCH_Y + ROOM_H / 2))
        mark.setAttribute('r', '2')
        mark.setAttribute('class', 'minimap-exit')
        svg.append(mark)
      }
    }

    return svg
  }
}

/**
 * Four states, and they have to differ by shape as well as by colour.
 *
 * `GAME_DESIGN.md` rules out carrying anything critical by colour alone, which
 * is why the stylesheet gives each of these its own outline as well as its own
 * fill: a child who cannot tell the mint from the coral can still tell a dashed
 * box from a solid one.
 */
function state(room: MapRoom): 'current' | 'done' | 'pending' | 'known' {
  if (room.current) return 'current'
  if (!room.visited) return 'known'
  return room.done ? 'done' : 'pending'
}

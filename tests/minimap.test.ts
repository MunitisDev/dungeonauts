// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { buildMap } from '../src/game/world/minimap'
import { floorSeed, generateDungeon } from '../src/game/world/generateDungeon'
import { Minimap } from '../src/ui/Minimap'

const plan = generateDungeon({ seed: floorSeed(78, 1), difficulty: 2 })
const startId = plan.startRoomId

const build = (visited: string[], currentId = visited[visited.length - 1] ?? startId, resolved: string[] = []) =>
  buildMap({
    layout: plan.layout,
    rooms: plan.rooms,
    visited: new Set(visited),
    currentId,
    exitRoomId: plan.exitRoomId,
    isResolved: (id) => resolved.includes(id),
  })

describe('the floor map', () => {
  /*
   * The rule the whole thing turns on. A map that shows the dungeon from the
   * first step is a walkthrough: a child would see where the way down is before
   * setting off, and there would be nothing left to explore.
   */
  it('shows only where you have been and what leads off it', () => {
    const model = build([startId])
    const ids = model.rooms.map((r) => r.id)
    expect(ids).toContain(startId)

    const start = plan.layout.find((p) => p.id === startId)!
    for (const link of start.links) expect(ids, `neighbour ${link}`).toContain(link)

    // And nothing beyond that: every room shown is either visited or next door.
    for (const room of model.rooms) {
      if (room.visited) continue
      const touchesVisited = room.links.includes(startId)
      expect(touchesVisited, `${room.id} is on the map but nowhere near`).toBe(true)
    }
    expect(model.rooms.length).toBeLessThan(plan.rooms.length)
  })

  it('is empty before the first room is entered', () => {
    const model = build([])
    expect(model.rooms).toEqual([])
    expect(model.visited).toBe(0)
    expect(model.total).toBe(plan.rooms.length)
  })

  it('marks the room you are standing in, and only that one', () => {
    const second = plan.layout.find((p) => p.id === startId)!.links[0] as string
    const model = build([startId, second], second)
    expect(model.rooms.filter((r) => r.current).map((r) => r.id)).toEqual([second])
  })

  /*
   * "Done" has to mean the child finished the room, not that the room happened
   * to ask for nothing. An unentered room's demand is met from the start, and
   * showing it green would give away the shape of the floor.
   */
  it('never calls a room done before it has been entered', () => {
    const model = build([startId])
    for (const room of model.rooms) {
      if (room.visited) continue
      expect(room.done, `${room.id}`).toBe(false)
    }
  })

  it('turns a room from pending to done when its demand is met', () => {
    const room = plan.rooms.find((r) => r.id === startId)!
    expect(room.objective.length).toBeGreaterThan(0)

    const before = build([startId]).rooms.find((r) => r.id === startId)!
    expect(before.done).toBe(false)

    const after = build([startId], startId, [...room.objective]).rooms.find((r) => r.id === startId)!
    expect(after.done).toBe(true)
  })

  // The generator's grid is centred on the entrance and runs negative, and a
  // drawing wants to start at zero.
  it('shifts the grid so the corner it draws is the origin', () => {
    const model = build(plan.rooms.map((r) => r.id))
    expect(Math.min(...model.rooms.map((r) => r.gx))).toBe(0)
    expect(Math.min(...model.rooms.map((r) => r.gy))).toBe(0)
    expect(model.width).toBe(Math.max(...model.rooms.map((r) => r.gx)) + 1)
    expect(model.height).toBe(Math.max(...model.rooms.map((r) => r.gy)) + 1)
  })

  it('counts what it shows', () => {
    const room = plan.rooms.find((r) => r.id === startId)!
    const model = build([startId], startId, [...room.objective])
    expect(model.visited).toBe(1)
    expect(model.done).toBe(1)
    expect(model.total).toBe(plan.rooms.length)
  })

  it('finds the way down only once its room has been entered', () => {
    const early = build([startId]).rooms.find((r) => r.id === plan.exitRoomId)
    // Either it is not on the map yet, or it is and has not been visited.
    expect(early?.visited ?? false).toBe(false)

    const late = build([startId, plan.exitRoomId], plan.exitRoomId).rooms.find(
      (r) => r.id === plan.exitRoomId,
    )!
    expect(late.exit).toBe(true)
    expect(late.visited).toBe(true)
  })

  it('gives every room a position of its own', () => {
    const model = build(plan.rooms.map((r) => r.id))
    const seen = model.rooms.map((r) => `${String(r.gx)},${String(r.gy)}`)
    expect(new Set(seen).size).toBe(seen.length)
  })
})

describe('the map widget', () => {
  const mount = () => {
    document.body.innerHTML = '<div id="m"></div><div id="modal" hidden></div>'
    const root = document.getElementById('m') as HTMLElement
    const modal = document.getElementById('modal') as HTMLElement
    return { widget: new Minimap(root, modal), root, modal }
  }

  it('stays out of the way until there is something to show', () => {
    const { widget, root } = mount()
    widget.update(build([]))
    expect(root.hidden).toBe(true)
  })

  it('draws a box per room and a line per corridor', () => {
    const { widget, root } = mount()
    const model = build([startId])
    widget.update(model)
    expect(root.hidden).toBe(false)
    expect(root.querySelectorAll('rect')).toHaveLength(model.rooms.length)
    // One line per corridor, not two: a corridor joins two rooms and would
    // otherwise be drawn once from each end.
    const links = new Set(
      model.rooms.flatMap((room) =>
        room.links
          .filter((other) => model.rooms.some((r) => r.id === other))
          .map((other) => [room.id, other].sort().join('|')),
      ),
    )
    expect(root.querySelectorAll('line')).toHaveLength(links.size)
  })

  // GAME_DESIGN.md: nothing critical by colour alone. The state is on the
  // element, so the stylesheet can give each one its own outline as well.
  it('puts each room state in the markup, not only in the colour', () => {
    const { widget, root } = mount()
    widget.update(build([startId]))
    const states = [...root.querySelectorAll('rect')].map((n) => (n as SVGElement).dataset['state'])
    expect(states).toContain('current')
    expect(states.every((s) => s !== undefined)).toBe(true)
  })

  it('opens the big map and closes it again', () => {
    const { widget, root, modal } = mount()
    widget.update(build([startId]))
    expect(widget.isOpen).toBe(false)

    root.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(widget.isOpen).toBe(true)
    expect(modal.querySelectorAll('rect').length).toBeGreaterThan(0)

    modal.querySelector('.minimap-close')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(widget.isOpen).toBe(false)
  })

  it('keeps the big map in step with the floor while it is open', () => {
    const { widget, root, modal } = mount()
    widget.update(build([startId]))
    root.querySelector('button')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    const before = modal.querySelectorAll('rect').length

    const second = plan.layout.find((p) => p.id === startId)!.links[0] as string
    widget.update(build([startId, second], second))
    expect(modal.querySelectorAll('rect').length).toBeGreaterThanOrEqual(before)
    expect([...modal.querySelectorAll('rect')].some((n) => (n as SVGElement).dataset['state'] === 'current')).toBe(true)
  })

  it('speaks its state, for a reader that cannot see it', () => {
    const { widget, root } = mount()
    widget.update(build([startId]))
    const label = root.querySelector('button')?.getAttribute('aria-label') ?? ''
    expect(label).toMatch(/Mapa del piso/)
  })
})

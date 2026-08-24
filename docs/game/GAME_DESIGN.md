# Dungeonauts — Game Design v1

## Core loop
1. Enter a room.
2. Explore.
3. Discover an obstacle/enemy.
4. Interact.
5. Solve an educational challenge.
6. Receive immediate game-world feedback.
7. Earn access, treasure, or progress.
8. Continue deeper into the dungeon.

The challenge should feel like the verb that powers the action, not a detached quiz.

## Camera and navigation
Preferred:
- top-down / slightly front-facing retro RPG view
- tile-based environment
- logical tile size: 16×16 px
- rooms of 13×9 tiles
- the whole room on screen at once, in any orientation, on any device
- obvious exits and interactables

While a room's demand is unmet, every one of its doorways holds a door — drawn
for the wall it stands in, not a marker painted over the art. Meeting the demand
takes all of them away at once, which is both the reward and the instruction.
Nothing else is drawn on a doorway: no square, no tint, no outline.

The camera does not move. A room is exactly as big as the screen can show, and
the screen shows all of it: a child cannot plan a route through a room they can
only see part of, and a camera that pans for them is worse on a small screen
than on a large one, not better. That is what fixes the room at 13×9 — the
width is what runs out first on a phone held upright, and every extra tile of
width shrinks the whole picture.

Avoid precision platforming.

## Room design
Each room should communicate a simple visual story.

Example:
- locked door blocks exit
- slime guards a key
- chest is visible
- player understands the objective quickly

Usually introduce one primary gameplay problem per room.

## Initial interactables
- Door
- Key
- Chest
- Enemy
- Rune/pedestal

## Combat — MVP
Recommended:
1. player encounters one enemy;
2. challenge appears;
3. correct answer triggers a successful action;
4. enemy reacts;
5. after enough successes, enemy is defeated/retreats;
6. player receives reward/progress.

Incorrect answer:
- no successful attack
- gentle feedback
- optional hint
- retry or equivalent challenge — the challenge never closes on a wrong answer
- costs one heart
- no violent or humiliating punishment

## Non-combat educational interactions
Examples:
- Door → solve problem → unlock
- Chest → complete sequence → open
- Spell → choose correct word → cast
- Trap → identify correct answer → disable
- Rune → order words/numbers → activate

## Rewards
MVP:
- stars
- coins
- keys
- hearts (capped; see Health / failure)

Do not build a complex economy initially.

## Health / failure
A small heart-based HUD, and hearts are spent: a wrong answer or a timed-out
answer costs one. Hearts are recoverable — chests and defeated creatures drop
them, up to a maximum of five.

Running out is a restart, not a defeat: the same dungeon begins again from its
entrance with full hearts, no score and nothing a child can read as a grade.
Experience and level are never lost this way.

Avoid long punishment loops.

## Feedback
Correct:
- near-immediate
- satisfying game action
- stars/highlight/short sound

A defeated creature blinks twice, fades out, and leaves behind what it gave —
a coin, or a potion where it gave a heart. The room must never change silently:
what is on the floor afterwards is the record of what the child did.

Incorrect:
- soft shake
- neutral sound
- thinking reaction
- retry

Avoid full-screen red failure states.

## Progression
- room → room → room → down a floor
- visible progress
- a small reward at the end of each floor

### Going down

A floor ends at a **trapdoor** in its last room. The trapdoor is shut, and two
things open it:

1. a **lever** thrown somewhere else in the maze — always the deepest room that
   is not the entrance and not the last one, so it has to be looked for; and
2. that last room's own demand being met, which is the same rule that keeps
   every doorway shut. The demand there is the locked treasure chest, so the
   key a child has carried all the way is spent before they go down.

The trapdoor is drawn from the first moment a child walks into the room: a
ladder in shadow when shut, lit when open. Seeing the way out and seeing that
it is not ready is what sends them looking for the lever.

There is no last floor. Each one is a fresh maze from the same run seed, and
the questions step up one level of difficulty every second floor, to the top of
the scale. Hearts, keys, coins and stars go down the ladder with the child;
nothing else does.

No full RPG progression system required for first slice.

## Initial biome
### Stone Dungeon
- teal/navy stone
- muted purple floor
- wooden doors
- torches
- gold keys
- chests
- green slime

## Accessibility
- large readable text
- clear focus
- large controls
- high contrast
- no critical information by color alone
- a visible answer clock, and a generous one: the time allowed scales with the
  player's age, from 30 seconds at six to 18 at twelve. It measures reading
  speed more than understanding, so it must never be the hard part.

## Vertical slice definition
- controllable hero
- 2–3 rooms
- green slime
- locked door
- key
- chest
- math interaction
- language interaction
- simple HUD
- correct/incorrect feedback
- room completion
- Spanish/English-ready content layer
- approved art with nearest-neighbor rendering

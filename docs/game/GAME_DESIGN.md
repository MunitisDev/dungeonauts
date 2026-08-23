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
- logical tile size: 32×32 px
- compact rooms
- obvious exits and interactables

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
- retry or equivalent challenge
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

Do not build a complex economy initially.

## Health / failure
A small heart-based HUD is appropriate, but failure should be gentle.
Avoid long punishment loops.

## Feedback
Correct:
- near-immediate
- satisfying game action
- stars/highlight/short sound

Incorrect:
- soft shake
- neutral sound
- thinking reaction
- retry

Avoid full-screen red failure states.

## Progression
MVP:
- room → room → room
- simple dungeon completion
- visible progress
- small end reward

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
- minimal time pressure

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

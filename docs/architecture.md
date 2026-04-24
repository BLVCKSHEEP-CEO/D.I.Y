# D.I.Y x Horizons Architecture

## Frontend Layers

1. App shell
- `App` mounts one primary route-level view (`DiyThreadView`).

2. Thread feed layer
- `DiyThreadView` owns the page composition: hero, feed card stack, and action controls.
- Thread cards are rendered as tactile paper blocks (`.diy-card`, `.diy-card-void`).

3. Recursive discussion layer
- `Comment` is a recursive component that renders one reply plus its children.
- Child depth drives vertical connector accent color and indentation.

4. Styling system
- Tailwind theme defines fonts, high-contrast colors, and hard shadows.
- Reusable component classes enforce Horizons visual rules.

## Design Tokens

- Surface: `paper` (#F9F9F7), `ink` (#070707)
- Accents: `action` (#FF3B30), `electric` (#0466FF), `neon` (#20E070), `amber` (#FFBB00)
- Border baseline: `border-2 border-black`
- Hard shadow baseline: `shadow-hard` = `4px 4px 0 0 rgba(0,0,0,1)`
- Header font: Space Grotesk
- Technical font: JetBrains Mono

## Interaction Patterns

- Pressable controls
- Buttons use `.pressable`; active state removes hard shadow and translates by 1px for a depress effect.

- Flash transition
- `.flash-enter` keyframe creates quick thread-dive feedback with minimal motion.

- Sticker tags
- `.sticker-tag` provides category and tech metadata chips ([GPU], [React], [Soldering]).

## Data Model Mapping

- `topics`
- Root repair post metadata and content.

- `replies`
- Adjacency-list threading (`parent_reply_id`) supports infinite nesting.

- Rendering flow
- Query top-level replies for a topic, recursively join children (CTE), map to nested JSON, pass into recursive `Comment`.









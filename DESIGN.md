---
contentType: Reference
name: Broadcast Desk
description: AI Q&A over news video with timestamps you can trust.
colors:
  desk-charcoal: 'oklch(0.205 0 0)'
  ink: 'oklch(0.145 0 0)'
  paper: 'oklch(1 0 0)'
  mist: 'oklch(0.97 0 0)'
  slate-mute: 'oklch(0.556 0 0)'
  hairline: 'oklch(0.922 0 0)'
  focus-ring: 'oklch(0.708 0 0)'
  alert-red: 'oklch(0.577 0.245 27.325)'
  on-charcoal: 'oklch(0.985 0 0)'
typography:
  display:
    fontFamily: 'Newsreader, ui-serif, Georgia, serif'
    fontSize: '3rem'
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: '-0.025em'
  headline:
    fontFamily: 'Newsreader, ui-serif, Georgia, serif'
    fontSize: '1.5rem'
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: '-0.02em'
  title:
    fontFamily: 'Geist, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 500
    lineHeight: 1.375
    letterSpacing: 'normal'
  body:
    fontFamily: 'Geist, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 'normal'
  label:
    fontFamily: 'Geist, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.75rem'
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: 'normal'
rounded:
  sm: '6px'
  md: '8px'
  lg: '10px'
  xl: '14px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '16px'
  lg: '24px'
  xl: '40px'
components:
  button-primary:
    backgroundColor: '{colors.desk-charcoal}'
    textColor: '{colors.on-charcoal}'
    rounded: '{rounded.lg}'
    padding: '6px 10px'
    height: '32px'
  button-primary-hover:
    backgroundColor: 'oklch(0.205 0 0 / 0.8)'
    textColor: '{colors.on-charcoal}'
  button-outline:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.lg}'
    padding: '6px 10px'
    height: '32px'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    rounded: '{rounded.lg}'
    padding: '6px 10px'
    height: '32px'
  input-default:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    rounded: '{rounded.lg}'
    padding: '4px 10px'
    height: '32px'
  card-default:
    backgroundColor: '{colors.paper}'
    textColor: '{colors.ink}'
    rounded: '{rounded.xl}'
    padding: '16px'
  badge-default:
    backgroundColor: '{colors.mist}'
    textColor: '{colors.ink}'
    rounded: '9999px'
    padding: '2px 8px'
    height: '20px'
---

# Design system: Broadcast Desk

Broadcast Desk is a research tool, not a magazine and not a chat novelty. This reference defines palette, type, elevation, and component rules so timestamps, headlines, and footage stay primary.

## 1. Creative north star: the evidence desk

The visual system should disappear into the task: upload a broadcast, scan stories, ask a question, jump to the clip. Keep surfaces quiet so timestamps, headlines, and footage stay readable. Density and pace take cues from Linear: compact controls, fast state changes, no decorative chrome.

The palette is restrained neutrals: pure white paper, desk charcoal for primary actions, mist for quiet fills. Typography pairs a sharp sans (Geist) for UI with a serif (Newsreader) reserved for story-level display, never for buttons, labels, or data. Elevation is flat by default; structure comes from hairline borders and subtle rings, not stacked shadows.

This system explicitly rejects generic AI chat dashboards (purple glow, soft blobs, empty “Ask anything” states), broadsheet / newspaper pastiche (dense columns, hairline rules, “edition” cosplay), and consumer video apps (YouTube-style theater, recommendations, entertainment chrome).

**Key characteristics:**

- Restrained neutrals; one ink-dark primary used sparingly for action
- Compact, decisive controls (32px default height)
- Flat surfaces; borders and rings over drop shadows
- Serif only for story/display; sans everywhere else
- Evidence and timestamps outrank decoration

## 2. Colors

A monochrome research palette: paper, ink, and charcoal. Reserve chroma for destructive alerts only.

### Primary

- **Desk charcoal** (`oklch(0.205 0 0)`): Primary buttons, key selected states, and the darkest interactive fills. Rarity is the point: not a wash across the UI.

### Neutral

- **Paper** (`oklch(1 0 0)`): Page and card backgrounds.
- **Ink** (`oklch(0.145 0 0)`): Body and heading text.
- **Mist** (`oklch(0.97 0 0)`): Secondary fills, muted surfaces, badge backgrounds, hover washes.
- **Slate mute** (`oklch(0.556 0 0)`): Secondary labels, timestamps, helper text. Keep at or above AA contrast on paper.
- **Hairline** (`oklch(0.922 0 0)`): Borders, input strokes, dividers.
- **Focus ring** (`oklch(0.708 0 0)`): Focus-visible rings on interactive controls.
- **On-charcoal** (`oklch(0.985 0 0)`): Text on primary fills.

### Tertiary

- **Alert red** (`oklch(0.577 0.245 27.325)`): Destructive and invalid states only, never brand decoration.

### Named rules

**The One Ink Rule.** Desk charcoal appears on primary actions and hard selection, never as ambient background tint or decorative accent.

**The No Neon Rule.** No purple, glow, or saturated brand washes. The only chroma on the desk is alert red for errors.

## 3. Typography

**Display font:** Newsreader (with ui-serif, Georgia)
**Body font:** Geist (with ui-sans-serif, system-ui)

**Character:** Geist sets the desk voice: dense, technical, fast. Newsreader marks story headlines and page display only, so editorial voice never leaks into tool chrome.

### Hierarchy

- **Display** (600, ~3rem / `text-4xl` to `text-5xl`, tight leading): Home and broadcast titles. `text-wrap: balance`.
- **Headline** (600, ~1.5rem, snug): Story titles in grids and cards.
- **Title** (500, 1rem, snug): Card titles, section labels in UI.
- **Body** (400, 0.875rem, 1.5): Summaries, chat prose, descriptions. Cap line length ~65 to 75ch for long copy.
- **Label** (500, 0.75rem): Badges, meta, form hints. Sentence case preferred; avoid tracked uppercase eyebrows as a system habit.

### Named rules

**The Serif Boundary Rule.** Newsreader is for story/display headings only. Buttons, nav, badges, inputs, and timestamps stay Geist.

**The Fixed Scale Rule.** Product type uses fixed rem steps, not fluid clamp hero sizing. Clamp is reserved for rare marketing-scale moments if any, not the desk itself.

## 4. Elevation

Flat by default. Depth is tonal and structural: white cards on white paper separated by hairline borders (`oklch(0.922 0 0)`) or a faint ring (`ring-foreground/10`). Drop shadows appear only on floating overlays (popover, hover-card, dropdown), never on resting cards or the page shell.

### Shadow vocabulary

- **Overlay** (`shadow-md` / equivalent soft elevation): Popovers, menus, command palette. Structural float only.
- **None at rest:** Cards, panels, story tiles, chat aside: border or ring only.

### Named rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. If a resting card needs a shadow to feel “finished,” the hierarchy is wrong: tighten border contrast or spacing instead.

## 5. Components

Controls are compact and decisive: short heights, medium radius (~10px), fast 150 to 250ms state transitions, no decorative chrome.

### Buttons

- **Shape:** Gently curved (`rounded-lg`, ~10px)
- **Primary:** Desk charcoal fill, on-charcoal text, height 32px (`h-8`), horizontal padding ~10px
- **Hover / Focus:** Primary softens to ~80% opacity; focus-visible uses ring at 3px with focus-ring color
- **Outline / Ghost / Secondary:** Hairline border or mist hover wash; same height vocabulary
- **Destructive:** Alert-red tinted fill/text, never charcoal with a red stripe

### Cards / containers

- **Corner style:** Softer than controls (`rounded-xl`, ~14px)
- **Background:** Paper
- **Shadow strategy:** None at rest; ring or border for edge
- **Border:** Hairline or `ring-foreground/10`
- **Internal padding:** 12 to 16px; story/broadcast tiles use 12px (`p-3`)

### Inputs / fields

- **Style:** Transparent or subtle fill, hairline border, `rounded-lg`, height 32px
- **Focus:** Border shifts to focus-ring + 3px ring at 50% opacity
- **Error / Disabled:** Alert-red ring/border when invalid; muted opacity and mist fill when disabled

### Badges

- **Style:** Pill (`rounded-full`), mist or outline, 20px height, 12px type: status and story counts, not decoration

### Navigation

- Minimal chrome. Back links and text buttons over heavy app shells. Sticky chat aside uses paper + border, not a tinted sidebar theme.

### Broadcast card (signature)

- Interactive tile: paper, border, 12px padding, aspect-video still. Hover deepens border toward focus-ring; thumbnail may scale slightly (`1.02`) with `motion-reduce` disabled. Badge reports pipeline or story count.

### Chat / timestamps (signature)

- Chat is a bordered paper panel, sticky on large screens. Citations and timestamps are first-class controls: clickable, Geist, muted until interactive, never ornamental chips.

## 6. Do's and don'ts

### Do

- **Do** keep primary actions in desk charcoal and rare.
- **Do** make every answer reach footage with a visible, actionable timestamp.
- **Do** use compact 32px controls and dense, scannable layouts.
- **Do** prefer borders/rings over shadows for resting surfaces.
- **Do** reserve Newsreader for story and page display headings.
- **Do** honor `prefers-reduced-motion` on thumbnail and overlay motion.
- **Do** meet WCAG 2.2 AA for text, focus, and keyboard paths.

### Don't

- **Don't** ship generic AI chat dashboards (purple glow, soft blobs, empty “Ask anything” states).
- **Don't** cosplay broadsheet / newspaper pastiche (dense columns, hairline rules as decoration, “edition” cosplay).
- **Don't** borrow consumer video app theater (YouTube-style chrome, recommendations, entertainment framing).
- **Don't** use tracked uppercase eyebrows as a section system.
- **Don't** put serif type in buttons, labels, badges, or data.
- **Don't** use side-stripe borders (`border-left` / `border-right` > 1px) as accent.
- **Don't** use gradient text, glassmorphism as default, or neon accents.
- **Don't** invent decorative elevation on resting cards.

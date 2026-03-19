# Design System: Gunner Stone — Applied Scientist Portfolio

## 1. Visual Theme & Atmosphere

The portfolio radiates a **scholarly-yet-modern** sensibility — clean, purposeful, and restrained. The overall density is **airy and spacious**, with generous whitespace that lets each content block breathe. The aesthetic philosophy is "academic credibility meets contemporary web design": there is no visual clutter, no gratuitous ornamentation — every element earns its place.

The site is built around a **dual-theme system** (light and dark) with seamless, instant switching. The dark theme evokes a late-night research lab — deep slate-navy backgrounds with cool blue accents that recall terminal screens and data visualizations. The light theme shifts to a bright, paper-white workspace with the same structural clarity. Both themes share identical spatial rhythm and component structure; only color values change.

Two immersive **canvas-rendered hero animations** anchor the landing and personal pages, reinforcing the nature/technology duality at the heart of the research (forest ecology × machine learning):
- **Low-poly forest** (index.html) — a parallax-layered, procedurally generated landscape with real-time lighting, particles, and theme-aware palettes. Typeset in **Space Grotesk** with cinematic text-shadows.
- **Pixel-art forest** (personal.html) — a retro, 5px-grid pixel scene with layered terrain, mushrooms, and floating particles. Typeset in **Press Start 2P** for nostalgic character.

## 2. Color Palette & Roles

### Core Design Tokens

#### Light Mode (Default)

| Descriptive Name | Hex Code | Functional Role |
|---|---|---|
| Paper White | `#fafafa` | Primary background — the canvas everything sits on |
| Pure White | `#ffffff` | Elevated surfaces (cards, navbar, modals) |
| Whisper Gray | `#f3f4f6` | Alternate section backgrounds for visual rhythm |
| Near-Black Ink | `#111827` | Primary headings and high-emphasis text |
| Slate Gray | `#6b7280` | Body copy and secondary text |
| Muted Silver | `#9ca3af` | Captions, timestamps, and de-emphasized labels |
| Deep Teal | `#0d9488` | Primary accent — links, buttons, active states. Bridges nature (green) and technology (blue), reflecting the forest ecology × ML identity |
| Forest Teal | `#0f766e` | Accent hover state — darkened for clear affordance |
| Mint Frost | `#ccfbf1` | Accent tint — tag backgrounds, active nav highlighting, icon containers |
| Cool Border | `#e5e7eb` | Subtle dividers and card outlines |
| Emerald Success | `#059669` | Success states and positive indicators |
| Teal Mist Tag Background | `#f0fdfa` | Tag pill background |
| Deep Pine Tag Text | `#115e59` | Tag pill text for contrast against light pill |

#### Dark Mode

| Descriptive Name | Hex Code | Functional Role |
|---|---|---|
| Deep Slate Navy | `#0f172a` | Primary background — the dark canvas |
| Charcoal Slate | `#1e293b` | Elevated surfaces (cards, navbar) |
| Midnight Slate | `#1a2332` | Alternate section backgrounds |
| Snow White | `#f1f5f9` | Primary headings and high-emphasis text |
| Cool Pewter | `#94a3b8` | Body copy and secondary text |
| Dim Slate | `#64748b` | De-emphasized text and muted labels |
| Luminous Teal | `#2dd4bf` | Primary accent — links, interactive cues, and data highlights. Glows vividly against the dark navy canvas |
| Pale Aqua | `#5eead4` | Accent hover — lightened against dark background |
| Abyssal Teal | `#134e4a` | Accent tint — tag backgrounds, active nav, icon containers |
| Steel Border | `#334155` | Subtle dividers and card outlines |
| Abyssal Teal Tag Background | `#134e4a` | Tag pill background |
| Luminous Teal Tag Text | `#5eead4` | Tag pill text for readability |

### Hero Canvas Palettes

#### Low-Poly Forest (index.html)

**Dark theme:** A gradient sky from Abyss Black (`#050c18`) to Deep Slate Navy (`#0f172a`). Five terrain layers progress from near-black blue-greens (HSL 220/58/9) to mid-slate teals (HSL 210/48/30). Trees are desaturated teal-navy (HSL 200/40/14). Particle fireflies glow in Sky Blue `rgb(96, 165, 250)`.

**Light theme:** A watercolor sky from Soft Aqua (`#a8d8ea`) to Mint Cream (`#e8f5e9`). Terrain layers shift from pale sage (HSL 140/28/78) through verdant forest (HSL 120/40/36). Trees are deep emerald (HSL 135/45/26). Particles are muted Nature Green `rgb(80, 140, 60)`.

#### Pixel Forest (personal.html)

**Dark theme:** Deep navy scene — Sky from `#070d1a` to `#0f172a`. Trees range from near-black blue (`#0a1628`) to Ocean Depth (`#1e3a5f`). Mushroom caps glow Sky Blue (`#60a5fa`). Particles shimmer in `#60a5fa` and `#93c5fd`.

**Light theme:** Bright, saturated nature scene — Sky from `#bfdbfe` to `#e0f2fe`. Trees are vivid greens (`#1d6b3a` through `#5bc47a`). Ground layers are lush lawn greens (`#7cb342`, `#8bc34a`). Mushroom caps are bold red (`#e53935`). Particles glow warm yellow (`#ffeb3b`, `#fff176`).

### Functional Colors (Overlays & Stat Displays)

| Descriptive Name | Value | Role |
|---|---|---|
| Campfire Orange | `#ff8c42` | Fire stat values in dark mode |
| Burnt Sienna | `#c85000` | Fire stat values in light mode |
| Amber Ember | `#ffa366` | Fire quip text in dark mode |
| Deep Rust | `#b34700` | Fire quip text in light mode |

## 3. Typography Rules

### Font Families

- **Inter** — the primary typeface. A clean, geometric sans-serif optimized for screen readability. Used for all body content, navigation, cards, and UI elements. Loaded with weights 300–700.
- **Space Grotesk** — the display/hero typeface for the low-poly forest landing page. A technical, slightly quirky grotesque that nods to data visualization and engineering. Weights 400, 600, 700.
- **Press Start 2P** — the pixel-art hero typeface on the personal page. A monospaced bitmap font that matches the retro pixel canvas aesthetic.

### Type Scale (Modular Scale 1.25×)

| Token | Size | Usage |
|---|---|---|
| `--fs-xs` | 0.75rem (12px) | Tags, tool labels, fine print |
| `--fs-sm` | 0.875rem (14px) | Nav links, card body text, button text, footer |
| `--fs-base` | 1rem (16px) | Base body text |
| `--fs-md` | 1.125rem (18px) | Section subheadings, hero descriptions |
| `--fs-lg` | 1.25rem (20px) | Card titles, nav logo, page header descriptions |
| `--fs-xl` | 1.5rem (24px) | Feature card titles, h4 headings |
| `--fs-2xl` | 1.875rem (30px) | h3 headings |
| `--fs-3xl` | 2.25rem (36px) | h2 section headings |
| `--fs-4xl` | 3rem (48px) | h1 page headings |
| `--fs-5xl` | 3.75rem (60px) | Hero headline |

### Weight Hierarchy

- **700 (Bold)** — all headings (h1–h6), nav logo, hero headlines
- **600 (Semibold)** — section labels, buttons, education pill emphasis
- **500 (Medium)** — nav links, tag labels, hero subtitle
- **400 (Normal)** — body copy, descriptions, paragraphs

### Line Heights

- **Tight (1.2)** — headings and display text
- **Normal (1.6)** — general body content
- **Relaxed (1.75)** — paragraph blocks for comfortable reading

### Letter Spacing

- Section labels: widened `0.1em` with `text-transform: uppercase` for small-caps effect
- Hero subtitle (forest): widened `0.12em` uppercase for cinematic breadth
- Hero headline (forest): tightened `-0.02em` for display impact
- Pixel hero: subtle `0.04em` to complement bitmap letterforms

## 4. Component Stylings

### Buttons

- **Primary** (`btn-primary`): Cobalt Blue (`#2563eb`) fill with white text. Subtly rounded corners (`0.5rem`). On hover, deepens to Deep Cobalt (`#1d4ed8`), lifts 1px with a whisper-soft medium shadow. Used for primary CTAs like "View Research."
- **Outline** (`btn-outline`): Transparent background with semi-transparent white border (`rgba(255,255,255,0.4)`). Used exclusively on the dark hero canvas. Hover fills with frosted glass `rgba(255,255,255,0.1)` and solidifies the border.
- **Secondary** (`btn-secondary`): White surface background with light border. On hover, border and text shift to accent blue, lifts 1px. Used for supplementary actions.
- **Size variants**: `btn-sm` for compact inline actions, `btn-lg` for hero-level CTAs. All share the same border-radius and transition timing (150ms ease).

### Cards / Containers

- **Standard Card** (`card`): White surface with a single-pixel Cool Border outline and subtly rounded corners (`0.75rem`). On hover, lifts 2px with a generous diffused shadow (`shadow-lg`) — the interaction feels like picking up a paper card. Images clip flush to the top with `overflow: hidden`.
- **Publication Card** (`pub-card`): A two-column grid layout (image left, text right) with `0.75rem` radius and generous internal padding (`2rem`). Hover behavior matches standard cards.
- **Feature Card** (`feature-card`): Full-bleed image header with body below. Larger image area (`22rem` height) for visual impact. Hover gains shadow but no lift — feels grounded.
- **Contact Card** (`contact-card`): Horizontal flex layout with an icon container (Frost Blue background, Cobalt icon) and text. Hover shifts the border to accent blue with a medium shadow.

### Tags

- **Pill-shaped** with fully rounded ends (`border-radius: 9999px`). Ice Blue background with Navy text in light mode; Twilight Blue background with Powder Blue text in dark mode. Compact padding (`0.25rem` × `0.75rem`), extra-small font weight 500.

### Inputs / Forms

- No dedicated form components in the current system. The design language implies inputs would follow card conventions: white surface, single-pixel border, `0.5rem` radius, accent-blue focus ring.

### Theme Toggle

- A compact `2.25rem` square button with a single-pixel border. Houses sun/moon SVG icons. On hover, border and icon color shift to accent blue with a tinted background. Clean, minimal, no label — icon-only.

### Divider

- A short accent-colored bar (`3rem` wide, `3px` tall) with fully rounded ends. Used below section headings for visual punctuation. Centered in section headers, left-aligned elsewhere.

## 5. Layout Principles

### Whitespace Strategy

The design follows an **8px base grid** with spacing tokens from `0.25rem` to `8rem`. The rhythm is generous and unhurried:
- **Sections** breathe with `6rem` (96px) vertical padding — `4rem` (64px) on mobile.
- **Content blocks** within sections use `2rem` (32px) gaps.
- **Cards** sit in `2rem`-gapped grids.
- **Internal card padding** is `1.5rem` (24px) for standard cards, `2rem` (32px) for publications and features.

### Max Widths & Containment

- **Page container**: `72rem` (1152px) max-width, centered with `1.5rem` side padding. Wide enough for three-column grids but never sprawling.
- **Content width**: `48rem` (768px) for prose-heavy sections — maintains a comfortable 65-75 character line length.
- **Section header descriptions**: capped at `40rem` (640px) for focused readability.
- **Hero text block**: `40rem` max-width, left-aligned, for strong visual hierarchy.

### Grid System

- **2-column** (`grid-2`): Side-by-side content (about section, horizontal cards). Collapses to single-column at `48rem`.
- **3-column** (`grid-3`): Research cards, teaching cards. Collapses to single-column at `48rem`.
- **Auto-fill** (`grid-auto`): `minmax(20rem, 1fr)` for responsive, content-aware layouts that self-organize.
- **Contact grid**: `auto-fit, minmax(14rem, 1fr)` for fluid wrap without explicit breakpoint.

### Navigation

- Fixed top navbar at `4rem` (64px) height. Full-width with centered container. Logo left, links center-right, theme toggle rightmost. On mobile (< `48rem`), collapses to hamburger with full-screen slide-in panel from the right.

### Elevation & Depth

The design is predominantly **flat with interaction-driven elevation**. At rest, cards and surfaces have no shadow — just a 1px border provides subtle definition. On hover, elements gain layered, diffused shadows that create a gentle floating effect:
- **Small shadow** (`shadow-sm`): `0 1px 2px` — barely perceptible, for subtle lift.
- **Medium shadow** (`shadow-md`): `0 4px 6px` — used for scrolled navbar and hovered buttons.
- **Large shadow** (`shadow-lg`): `0 10px 15px` — primary hover state for cards.
- **Extra-large shadow** (`shadow-xl`): `0 20px 25px` — reserved for modals or dramatic emphasis.

All shadows use low-opacity black (`6–10%` in light mode, `30–40%` in dark mode) for a natural, whisper-soft quality.

### Transitions & Motion

- **Fast (150ms ease)**: Hover color changes, link interactions, button micro-animations.
- **Normal (250ms ease)**: Card hover lifts, navbar shadow appearance, mobile menu slide.
- **Slow (400ms ease)**: Reserved for more deliberate transitions.
- **Scroll reveal**: Elements enter with a `1.5rem` upward slide and `0.6s` ease opacity fade, triggered at 10% intersection with a `-40px` bottom margin.
- **Hero fog**: A `1.5s` ease opacity transition that dissolves to reveal the canvas animation beneath.

### Responsive Breakpoints

- **`48rem` (768px)**: Primary breakpoint — grids collapse to single-column, typography scales down one step, hero text shrinks, mobile nav activates.
- **`30rem` (480px)**: Secondary breakpoint — hero headline scales down one additional step for narrow phones.

### Accessibility

- **Skip-to-content** link hidden off-screen, visible on focus.
- **Focus-visible** outlines: 2px solid accent blue with 2px offset on all interactive elements.
- **Reduced motion**: Canvas animations use `requestAnimationFrame` with performance-conscious rendering (DPR capped at 1).
- **Semantic HTML**: Proper heading hierarchy, ARIA labels on icon-only buttons (theme toggle, hamburger menu).

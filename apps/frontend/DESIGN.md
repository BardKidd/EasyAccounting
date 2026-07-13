---
name: EasyAccounting
description: Calm, premium personal finance & asset management — a quiet emerald-glass ledger.
colors:
  emerald-primary: "oklch(0.62 0.16 150)"
  emerald-primary-dark: "oklch(0.7 0.17 150)"
  teal-accent: "oklch(0.72 0.16 175)"
  bg-light: "oklch(0.984 0.003 247.858)"
  bg-dark: "oklch(0.208 0.042 265.755)"
  surface-abyss: "#060c15"
  glass-slate: "#0f172a"
  ink-light: "oklch(0.208 0.042 265.755)"
  ink-dark: "oklch(0.985 0.002 247.839)"
  muted-light: "oklch(0.554 0.046 257.417)"
  muted-dark: "oklch(0.704 0.04 256.788)"
  border-light: "oklch(0.896 0.016 263.295)"
  border-dark: "oklch(0.338 0.042 262.181)"
  rose-destructive: "oklch(0.57 0.21 27)"
typography:
  display:
    fontFamily: "Outfit, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Outfit, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'Work Sans', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Outfit, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.2em"
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  3xl: "24px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.emerald-primary}"
    textColor: "{colors.ink-dark}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
    height: "36px"
  button-gradient:
    backgroundColor: "{colors.emerald-primary}"
    textColor: "{colors.ink-dark}"
    rounded: "{rounded.xl}"
    padding: "0 32px"
    height: "48px"
  card:
    backgroundColor: "{colors.glass-slate}"
    textColor: "{colors.ink-dark}"
    rounded: "{rounded.xl}"
    padding: "24px"
  input:
    rounded: "{rounded.lg}"
    padding: "4px 12px"
    height: "36px"
---

# Design System: EasyAccounting

## 1. Overview

**Creative North Star: "The Quiet Ledger"**

EasyAccounting is a personal finance and asset-management app, and its interface behaves the way a good ledger should: calm, ordered, and quietly premium. Money is stressful; the UI is the opposite. A near-black abyss (`#060c15`) or a bright slate-50 canvas holds a slow field of emerald/teal ambient glow, and the app's chrome — a floating glass header, a slide-in glass sidebar — hovers over it like frosted panels. The mood is **Calm · Premium · Trustworthy**: nothing shouts, everything is legible, and the single emerald accent does the pointing.

The system is restrained on purpose. Emerald is the one voice — a saturated green that carries "money, growth, go" — and it is spent sparingly on the things that matter (primary actions, the active nav item, focus rings, positive signals). Everything else is a slate neutral ramp doing quiet structural work. Depth is built from translucency and soft light, not hard drop shadows. Type pairs a geometric display (Outfit) against a humanist body (Work Sans) so headings feel engineered and body copy feels human.

What this explicitly rejects: dashboard maximalism (every panel a glass card, every number a gradient), heavy skeuomorphic shadows, and neon "fintech-crypto" energy. Glass is a chrome material here, never a decorative default on content.

**Key Characteristics:**
- One accent (emerald→teal), spent sparingly; slate neutrals carry the rest.
- Glass + ambient glow is the *chrome* signature — not applied to content cards.
- Depth via translucency, blur, and tonal layering, not dark drop shadows.
- OKLCH tokens, dark-default with a fully-realized light theme.
- Geometric display (Outfit) vs. humanist body (Work Sans).

## 2. Colors

A slate-neutral system lit by a single emerald→teal accent family. All tokens are OKLCH (project doctrine); hex appears only for the two literal shell surfaces that live outside the token ramp.

### Primary
- **Vault Emerald** (`oklch(0.62 0.16 150)` light / `oklch(0.7 0.17 150)` dark): The one accent voice. Primary buttons, active navigation, focus rings, the avatar/CTA gradient, positive/synced states. Its rarity is what makes it read as "the action".
- **Teal Horizon** (`oklch(0.72 0.16 175)`): The gradient partner and chart lead. Emerald→teal runs across CTAs, the logo mark, and the ambient glow. Never used as a second independent accent — it is emerald's lighter twin.

### Neutral
- **Abyss** (`#060c15`): The dark app-shell canvas behind the chrome. Deeper than the token `bg-dark` so glass panels separate from it.
- **Glass Slate** (`#0f172a`): The tint behind frosted chrome (used at 60–85% alpha with `backdrop-blur`).
- **Canvas** (`oklch(0.984 0.003 247.858)` slate-50 light / `oklch(0.208 0.042 265.755)` slate-900 dark): Page background.
- **Ink** (`oklch(0.208 0.042 265.755)` light / `oklch(0.985 0.002 247.839)` dark): Primary text.
- **Muted Ink** (`oklch(0.554 0.046 257.417)` slate-500 light / `oklch(0.704 0.04 256.788)` slate-400 dark): Secondary text — the floor for body contrast, never lighter.
- **Hairline** (`oklch(0.896 0.016 263.295)` slate-200 light / `oklch(0.338 0.042 262.181)` slate-700 dark): Borders and dividers, often at low alpha (`/10`–`/50`) on glass.

### Tertiary
- **Signal Rose** (`oklch(0.57 0.21 27)` light / `oklch(0.63 0.22 25)` dark): Destructive actions and error/offline states only. Never decorative.

### Named Rules
**The One Voice Rule.** Emerald (and its teal twin) is the only accent. If a screen needs a second "color to mean something", the answer is weight, size, or a neutral — not a new hue. Emerald stays on ≤10–15% of any screen.

**The Ghost Border Rule.** On glass chrome, borders are the neutral hairline at low alpha (`border-white/10`, `border-slate-200/50`), never a solid opaque line. The frosted edge is a whisper.

## 3. Typography

**Display Font:** Outfit (with 'Helvetica Neue', Arial, sans-serif)
**Body Font:** Work Sans (with system-ui, sans-serif)

**Character:** A deliberate contrast pairing — Outfit is geometric, even, and slightly rounded (headings feel engineered and confident); Work Sans is humanist and warm (body copy stays readable and calm). Because they sit on different axes, they never blur together.

### Hierarchy
- **Display** (Outfit 700, 1.875rem / `text-3xl`, tracking -0.02em): Page-level titles and empty-state headlines (e.g. the offline "偵測不到網路連線"). This is product scale, not a marketing hero — it never balloons past ~2.5rem.
- **Headline** (Outfit 700, 1.25rem / `text-xl`): Section and card titles, sheet titles.
- **Title** (600, 1rem / `text-base`): Sub-section headers, list-row leads.
- **Body** (Work Sans 400, 0.875rem / `text-sm`, line-height 1.6): Default reading text. Cap prose at 65–75ch.
- **Label** (Outfit 700, 0.625rem / `text-[10px]`, tracking 0.2em, uppercase): The brand wordmark tail ("ACCOUNTING") and small overline markers. Used sparingly.

### Named Rules
**The Outfit-For-Voice Rule.** Outfit is reserved for brand and headings (`font-outfit`). Body and dense data stay in Work Sans. Don't set paragraphs in the display face.

## 4. Elevation

This system conveys depth through **translucency and soft light, not hard shadows.** Chrome is frosted glass (`backdrop-blur-2xl`) floating over an ambient glow field; content sits flat on the canvas. Shadows, when present, are large, soft, and low-opacity — ambient, never hard-edged — and emerald glow is used as a "lift" on interactive accents.

### Shadow Vocabulary
- **Ambient Chrome** (`box-shadow: 0 10px 25px rgba(15,23,42,0.2)` dark / `rgba(148,163,184,0.2)` light): Under the floating header and sidebar. Diffuse, barely-there.
- **Emerald Lift** (`box-shadow: 0 10px 25px rgba(16,185,129,0.25)`): Under primary gradient CTAs and the avatar — the accent literally glows.
- **Card Whisper** (`box-shadow: 0 1px 2px rgba(0,0,0,0.05)` light, none in dark): Content cards get a hairline shadow in light mode and go flat (tonal `slate-800`) in dark.

### Named Rules
**The Frosted-Chrome Rule.** `backdrop-blur` belongs to structural chrome (header, sidebar, sheets, dialogs) — the things that float over content. It is forbidden as decoration on content cards, rows, or metrics.

**The Glow-Is-Interactive Rule.** Colored (emerald) shadow means "this is an action". Neutral ambient shadow means "this floats". Don't put emerald glow on non-interactive surfaces.

## 5. Components

### Buttons
- **Shape:** Gently rounded (`rounded-lg`, 8px); larger CTAs go `rounded-xl` (12px).
- **Primary:** Solid `emerald-primary` background, white text, `hover:bg-primary/90`. Default height 36px (`h-9`), padding 8×16px.
- **Gradient (signature CTA):** `linear-gradient(to bottom-right, emerald-500, teal-400)`, white text, `rounded-xl`, height 48px, **Emerald Lift** shadow, `hover:scale-[1.02]`. Used for the highest-intent action on a surface (offline retry, install confirm).
- **Secondary:** White / `slate-800` surface with a `slate-300 / slate-700` border, subtle hover tint.
- **Ghost / Link:** Transparent; hover uses `accent`. Link uses emerald text + underline.
- **Focus:** 3px `ring-ring/50` (emerald) — consistent across all interactive controls.

### Cards / Containers
- **Corner Style:** `rounded-xl` (12px).
- **Background:** `card` token — white (light) / `slate-800` (dark). **Flat, not glass.**
- **Border:** `slate-200 / slate-700`, 1px.
- **Shadow Strategy:** Card Whisper in light, flat in dark (see Elevation).
- **Internal Padding:** 24px (`p-6`).

### Inputs / Fields
- **Style:** 1px `border-input`, transparent background (`dark:bg-input/30`), `rounded-lg`, height 36px.
- **Focus:** border shifts to `ring` + 3px emerald `ring-ring/50` glow. Transition on color + box-shadow only.
- **Error / Disabled:** `aria-invalid` → rose ring; disabled → 50% opacity, no pointer.

### Navigation (Sidebar)
- **Style:** Frosted glass panel (`backdrop-blur-2xl`, `bg-white/40 dark:bg-[#0f172a]/40`), ghost-hairline right border. Slides in as a drawer on mobile, fixed rail (64px→250px) on desktop.
- **Active item:** `bg-gradient` emerald/15→teal/5, emerald text, a 2px emerald left border, `rounded-lg`. The left border is a **state indicator, not decoration**.
- **Pending item:** a small emerald dot (`NavPendingIndicator`) appears while the destination route loads — instant tap feedback.

### The Glass Chrome (signature)
The defining pattern: a floating glass **Header** pill (`sticky`, `rounded-2xl`, `backdrop-blur-2xl`, `bg-white/60 dark:bg-[#0f172a]/60`) and the glass **Sidebar**, both hovering over an **ambient glow field** — three slow `animate-pulse` emerald/teal blobs (`blur-[100–120px]`) behind everything. The avatar and hero CTAs echo the emerald→teal gradient. This chrome-over-glow is the product's fingerprint.

## 6. Do's and Don'ts

### Do:
- **Do** spend emerald sparingly (≤10–15% of a screen). It marks the one action that matters.
- **Do** reserve `backdrop-blur` glass for chrome (header, sidebar, sheets, dialogs).
- **Do** build depth from translucency, soft ambient shadow, and emerald glow on interactive accents.
- **Do** keep body text at Muted Ink or darker — bump toward Ink if contrast is even close to 4.5:1.
- **Do** use OKLCH tokens from `globals.css`; add insets via the `--safe-area-*` vars on mobile.
- **Do** use the 3px emerald focus ring on every interactive control.
- **Do** set headings in Outfit, body in Work Sans.

### Don't:
- **Don't** put glassmorphism on content cards, data rows, or metric tiles. Chrome only.
- **Don't** introduce a second accent hue. If something needs emphasis, use weight, size, or a neutral.
- **Don't** use gradient *text* (`background-clip: text`); emphasis comes from weight and size.
- **Don't** use a colored side-stripe as decoration. A 2px left border is allowed *only* as the sidebar active-state marker.
- **Don't** ship hard, dark drop shadows. Shadows are large, soft, low-opacity, or absent.
- **Don't** set body copy or dense data in Outfit.
- **Don't** let muted-gray text drift lighter "for elegance" — it fails contrast and reads as AI slop.

# UI Design System: Dark Mode (Slate & Teal)

## Overview
This design system is built for a professional Fintech SaaS Dashboard, focusing on high contrast, deep blacks (OLED-friendly), and clean, cool accents. It prioritizes legibility, eye comfort in low-light environments, and a modern, trustworthy aesthetic.

## 1. Color Palette

### 1.1 Base Colors (Slate)
Used for backgrounds, cards, and text to ensure a neutral, professional, and cool tone.
- **Background**: Slate 950/900 (OLED Deep Black/Dark Grey)
- **Foreground**: Slate 50 (High Contrast Text)
- **Muted**: Slate 800/400 (Subtle borders and secondary text)

### 1.2 Accent Colors
Used for primary actions, highlights, and branding.
- **Primary**: Teal 500 (`#14B8A6`) - Fresh, modern, and financial-focused. Used for CTAs and key indicators.
- **Secondary**: Teal 400 (`#2DD4BF`) - Supporting elements and hover states.
- **Ring/Focus**: Teal 500/400 - For keyboard focus and subtle glowing effects.

### 1.3 Semantic Colors
- **Success**: Emerald 500 / Teal 500
- **Error/Destructive**: Rose 500
- **Warning**: Amber 500
- **Info**: Sky 500

## 2. Typography

### 2.1 Font Family
- **Primary**: `Plus Jakarta Sans`
- **Usage**: Geometric sans-serif, excellent legibility for UI and numbers.

## 3. Component Styling Guidelines

### 3.1 Shadows & Glows
- **Card Shadows**: Subtle, dark shadows (`shadow-lg`, `shadow-black/10`) to create depth.
- **Glow Effects**: Used sparingly on key metrics using `drop-shadow` in Teal/Emerald hues.

### 3.2 Borders
- **Color**: `border-white/5` or `border-slate-800` (Low contrast).
- **Radius**: `rounded-xl` (12px) for cards, `rounded-lg` (8px) for controls.

### 3.3 Micro-interactions
- **Hover**: Subtle background lightening (`bg-white/5` or `bg-accent`) and border highlighting (`border-primary/50`).
- **Active**: Scale down or brightness adjustment.

## 4. Implementation (Tailwind CSS)

### 4.1 Global Variables (OKLCH)
The system uses CSS variables mapped to OKLCH color space for consistent theming.

```css
:root {
  /* Light Mode */
  --background: oklch(0.985 0.002 247.839); /* Slate 50 */
  --foreground: oklch(0.21 0.04 263);       /* Slate 900 */
  --primary: oklch(0.72 0.16 175);          /* Teal 500 */
}

.dark {
  /* Dark Mode */
  --background: oklch(0.15 0.04 263);       /* Deep Slate */
  --foreground: oklch(0.98 0.01 240);       /* Slate 50 */
  --primary: oklch(0.72 0.16 175);          /* Teal 500 */
}
```

## 5. UI Elements

### 5.1 Sidebar
- **Background**: `bg-sidebar` (Darker than main content).
- **Navigation**: High contrast active state (`bg-sidebar-accent`, `text-sidebar-accent-foreground`).

### 5.2 Cards
- **Background**: `bg-card` (Slightly lighter than background).
- **Border**: `border-border`.

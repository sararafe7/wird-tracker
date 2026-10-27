---
name: hasanat-design
description: "Design guidelines for Hasanat apps: brand colours, Arabic typography, RTL layout with logical properties, component patterns, icons, and accessibility. Use when styling pages or components, choosing colours or fonts, or reviewing Arabic and English layouts."
---

# Hasanat Design Skill

## Overview

Design guidelines for Hasanat ecosystem apps. Follow these to maintain visual consistency across the platform.

## Hasanat Brand

The Hasanat brand used by hasanat.dev, the project briefs, and platform.hasanat.dev:

| Name | Hex | Usage |
|------|-----|-------|
| Emerald | `#047857` | Primary actions, links, active states |
| Deep emerald | `#064e3b` | Strong text accents, pressed states |
| Gold | `#b8860b` | Small accents only, never body text |
| Paper | `#f7f5ee` | Page background |
| Ink | `#16271d` | Primary text |

The brand typeface is **IBM Plex Sans Arabic** (SIL Open Font License), which also covers Latin text. Self-host it, for example with the `@fontsource/ibm-plex-sans-arabic` package.

Builder guide: https://platform.hasanat.dev/services/design-system/

## Starter Colors

The starter still ships an older teal palette. To match the Hasanat brand, change the `@theme` values in `src/styles/global.css`.

| Name | Hex | Usage |
|------|-----|-------|
| Primary | `#0f766e` | Buttons, links, active states |
| Primary Light | `#14b8a6` | Hover states, accents |
| Primary Dark | `#0d5c56` | Active/pressed states |
| Background | `#f8fafb` | Page background |
| Surface | `#ffffff` | Cards, panels |
| Text | `#1c1917` | Primary text |
| Text Muted | `#78716c` | Secondary text, placeholders |
| Border | `#e7e5e4` | Card borders, dividers |

In Tailwind v4, these are configured in `src/styles/global.css`:

```css
@theme {
  --color-hasanat: #0f766e;
  --color-hasanat-light: #14b8a6;
  --color-hasanat-dark: #0d5c56;
  --color-surface: #f8fafb;
}
```

## Typography

- **Starter**: Noto Sans Arabic and Inter, loaded from Google Fonts at the top of `src/styles/global.css`
- **Hasanat brand**: IBM Plex Sans Arabic for both Arabic and Latin text
- Do not add letter spacing to Arabic text; it breaks the joined letterforms

### Text Sizes

| Element | Class | Size |
|---------|-------|------|
| Page title | `text-3xl font-bold` | 30px |
| Section heading | `text-2xl font-semibold` | 24px |
| Card title | `text-lg font-semibold` | 18px |
| Body text | `text-base` | 16px |
| Small text | `text-sm text-stone-500` | 14px |

## RTL Support

Arabic is the default language. Always use Tailwind logical properties:

| Physical (DON'T) | Logical (DO) |
|-------------------|--------------|
| `ml-4` | `ms-4` |
| `mr-4` | `me-4` |
| `pl-4` | `ps-4` |
| `pr-4` | `pe-4` |
| `text-left` | `text-start` |
| `text-right` | `text-end` |
| `left-0` | `start-0` |
| `right-0` | `end-0` |
| `border-l` | `border-s` |
| `border-r` | `border-e` |
| `rounded-l-lg` | `rounded-s-lg` |
| `rounded-r-lg` | `rounded-e-lg` |

## Component Patterns

### Button — Primary

```html
<button class="btn-primary">
  Submit
</button>
```

The `btn-primary` class is defined in `global.css`:
- Background: hasanat green
- White text
- Rounded corners
- Hover/focus/active states included

### Button — Secondary

```html
<button class="btn-secondary">
  Cancel
</button>
```

### Card

```html
<div class="card">
  <h3 class="text-lg font-semibold">Title</h3>
  <p class="text-sm text-stone-500">Description</p>
</div>
```

The `card` class provides: white background, subtle border, rounded corners, padding, hover shadow.

### Form Input

```html
<input
  type="text"
  class="w-full rounded-lg border border-stone-200 px-4 py-2 text-sm focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
  placeholder="..."
/>
```

## Layout Patterns

### Page Container

```html
<div class="mx-auto max-w-4xl px-4 py-8">
  <!-- Page content -->
</div>
```

### Two-Column Grid

```html
<div class="grid gap-6 md:grid-cols-2">
  <div class="card">...</div>
  <div class="card">...</div>
</div>
```

### Navbar

The starter includes a navbar in the homepage. For additional pages, follow the same pattern:
- Fixed or sticky top
- Hasanat logo/name on the start side
- Auth buttons on the end side
- Responsive (hamburger on mobile)

## Icons

Use `lucide-react` for consistent iconography:

```tsx
import { Heart, Star, User } from "lucide-react";

<Heart className="h-5 w-5 text-teal-600" />
```

## Accessibility

- Use semantic HTML (`nav`, `main`, `section`, `article`)
- Add `aria-label` to icon-only buttons
- Maintain 4.5:1 contrast ratio for text
- Support keyboard navigation (focus-visible states)
- Use `lang="ar"` attribute on Arabic content
- Set `dir="rtl"` for Arabic, `dir="ltr"` for English (handled by Layout.astro)

## Dark Mode (Optional)

The starter does not include dark mode by default. If adding:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #1c1917;
    --color-surface: #292524;
    --color-text: #fafaf9;
  }
}
```

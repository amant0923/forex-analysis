# Glass & Dark Mode Redesign

## Goal

Convert ForexPulse from a light-mode dashboard to a dark monochrome theme with bold glassmorphism panels and a mouse-proximity glowing border effect on key cards.

## Design Decisions

- **Theme:** Hybrid — dark header (existing) with dark glassmorphic content area
- **Glass intensity:** Bold — high blur, prominent borders, inner highlights, deep shadows
- **Background:** Pure black (`#09090b`) with static monochrome mesh gradient blobs (white at 5-8% opacity)
- **Color palette:** Pure monochrome (black/grey/white). Green for profit, red for loss, blue for buy direction — all pop harder against neutral backdrop
- **Glow effect:** GlowingEffect component (from 21st.dev) with colors remapped to monochrome silver/chrome sweep
- **Implementation:** CSS-only backgrounds, no WebGL/canvas. GlowingEffect uses `motion` library for smooth animation.
- **Scope:** Full site — all pages including login/register

## Color System

### Background Layers

| Layer | Value |
|-------|-------|
| Page background | `#09090b` |
| Mesh blob 1 | `radial-gradient(circle, rgba(255,255,255,0.08), transparent 70%)` |
| Mesh blob 2 | `radial-gradient(circle, rgba(255,255,255,0.05), transparent 70%)` |
| Mesh blob 3 | `radial-gradient(circle, rgba(255,255,255,0.06), transparent 70%)` |

### Glass Panel Tokens

| Token | Value |
|-------|-------|
| Glass background | `rgba(255,255,255,0.12)` |
| Glass background (secondary) | `rgba(255,255,255,0.08)` |
| Glass border | `rgba(255,255,255,0.2)` |
| Glass border (secondary) | `rgba(255,255,255,0.12)` |
| Glass blur | `blur(24px) saturate(1.5)` |
| Glass shadow | `0 8px 32px rgba(0,0,0,0.3)` |
| Glass inner highlight | `inset 0 1px 0 rgba(255,255,255,0.1)` |

### Text Colors

| Role | Value |
|------|-------|
| Primary text | `#ffffff` |
| Secondary text | `rgba(255,255,255,0.6)` |
| Muted/label text | `rgba(255,255,255,0.4)` |
| Disabled text | `rgba(255,255,255,0.25)` |

### Accent Colors (unchanged, just brighter on dark)

| Role | Value |
|------|-------|
| Profit/win | `#4ade80` (green-400) |
| Loss | `#f87171` (red-400) |
| Buy direction | `#60a5fa` (blue-400) |
| Sell direction | `#f87171` (red-400) |
| Brand accent (header line) | `#2563eb` |

### CSS Variables to Override

All shadcn CSS variables in `globals.css` must be swapped:

```
--background: #09090b
--foreground: #ffffff
--card: rgba(255,255,255,0.12)
--card-foreground: #ffffff
--primary: #ffffff
--primary-foreground: #09090b
--secondary: rgba(255,255,255,0.08)
--secondary-foreground: #ffffff
--muted: rgba(255,255,255,0.06)
--muted-foreground: rgba(255,255,255,0.4)
--accent: rgba(255,255,255,0.1)
--accent-foreground: #ffffff
--destructive: #f87171
--border: rgba(255,255,255,0.12)
--input: rgba(255,255,255,0.1)
--ring: rgba(255,255,255,0.25)
```

## Glass Utility Classes

Add to `globals.css` under `@layer utilities`:

```css
.glass {
  background: rgba(255,255,255,0.12);
  backdrop-filter: blur(24px) saturate(1.5);
  -webkit-backdrop-filter: blur(24px) saturate(1.5);
  border: 1px solid rgba(255,255,255,0.2);
  box-shadow: 0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1);
}

.glass-sm {
  background: rgba(255,255,255,0.08);
  backdrop-filter: blur(16px) saturate(1.3);
  -webkit-backdrop-filter: blur(16px) saturate(1.3);
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: 0 4px 16px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.08);
}
```

## GlowingEffect Component

### Source

Copy `glowing-effect.tsx` to `src/components/ui/glowing-effect.tsx`.

### Dependency

Install `motion` npm package.

### Monochrome Color Remap

Replace the default gradient colors in the component:

```
Original             → Monochrome
#dd7bbb (pink)       → rgba(255,255,255,0.6)   (bright white)
#d79f1e (gold)       → rgba(255,255,255,0.3)   (mid white)
#5a922c (green)      → rgba(180,180,180,0.4)   (light grey)
#4c7894 (teal)       → rgba(120,120,120,0.3)   (dark grey)
```

The repeating-conic-gradient stops follow the same remap, producing a silver/chrome sweep effect.

### Where to Apply

| Location | Props |
|----------|-------|
| Journal stats bar cards | `spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={3} disabled={false}` |
| Trade detail price cards (Entry, Exit, SL, TP, Lot) | Same as above |
| Playbook cards list | Same as above |
| Account cards | Same as above |
| Login card | `spread={60} glow proximity={80} inactiveZone={0.01} borderWidth={3} disabled={false}` |

**Not applied to:** Every card, table rows, or small UI elements. Only interactive/highlight cards to avoid visual noise.

### Integration Pattern

Each glowing card needs a wrapper with `relative` positioning and `rounded-[1.25rem]` plus a border:

```tsx
<div className="relative rounded-[1.25rem] border-[0.75px] border-border p-2">
  <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={3} disabled={false} />
  <div className="glass rounded-xl p-6">
    {/* card content */}
  </div>
</div>
```

## Component Changes

### card.tsx

Replace current white card with glass styling. The `bg-card` variable now points to semi-transparent value. Remove the `ring-1 ring-foreground/10` border (glass border replaces it). Keep `rounded-xl`.

### button.tsx

- Default variant: solid white text on glass background
- Destructive: stays `#f87171`
- Outline: glass border with white text
- Ghost: transparent, white text on hover

### input.tsx / textarea.tsx / select.tsx

- Background: `rgba(255,255,255,0.06)`
- Border: `rgba(255,255,255,0.12)`
- Focus ring: `rgba(255,255,255,0.25)`
- Text: white
- Placeholder: `rgba(255,255,255,0.3)`

### badge.tsx

- Default: glass-sm background, white text
- Colored variants (green, red): slightly more vivid on dark (`bg-green-500/20 text-green-400`)

### top-nav.tsx

- Change header bg from `#1a1f2e` to `#09090b` to match page background (or `rgba(255,255,255,0.04)` for subtle distinction)
- Header border from `#2a3040` to `rgba(255,255,255,0.08)`
- Keep the blue accent line

## Layout Changes

### (dashboard)/layout.tsx

Add mesh gradient blobs as positioned pseudo-elements or divs behind the content:

```tsx
<div className="relative min-h-screen bg-[#09090b] overflow-hidden">
  {/* Mesh gradient blobs */}
  <div className="pointer-events-none fixed inset-0 z-0">
    <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_70%)]" />
    <div className="absolute -bottom-[15%] -left-[10%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.05),transparent_70%)]" />
    <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.06),transparent_70%)] -translate-x-1/2" />
  </div>
  {/* Content */}
  <div className="relative z-10">
    {children}
  </div>
</div>
```

### layout.tsx (root)

Add `bg-[#09090b]` to `<body>` to prevent flash of white on load.

### Login / Register pages

Dark background with a single centered glass card. GlowingEffect applied to the login card for visual impact.

## Pages to Update (Hardcoded Colors)

Every component that uses these patterns must be updated:

| Pattern | Replace With |
|---------|-------------|
| `text-gray-900`, `text-gray-800` | `text-white` |
| `text-gray-700` | `text-white/80` |
| `text-gray-600` | `text-white/60` |
| `text-gray-500` | `text-white/40` |
| `text-gray-400` | `text-white/30` |
| `bg-white` | `glass` or `bg-white/[0.06]` |
| `bg-gray-50`, `bg-gray-100` | `bg-white/[0.04]` |
| `bg-[#fafafa]` | removed (layout handles bg) |
| `border-gray-200`, `border-gray-300` | `border-white/10` |
| `ring-foreground/10` | `ring-white/10` |
| `hover:shadow-*` (light shadows) | `hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]` |
| `divide-gray-100` | `divide-white/[0.06]` |

### Affected Page Components

- `src/components/journal-table.tsx` — table, filters, pagination
- `src/components/journal-stats-bar.tsx` — stat cards (add GlowingEffect)
- `src/components/trade-detail.tsx` — price cards (add GlowingEffect), P&L section, all text
- `src/components/trade-form.tsx` — form inputs, selectors, preview card
- `src/components/playbook-card.tsx` — card (add GlowingEffect)
- `src/components/playbook-form.tsx` — form
- `src/components/chat-interface.tsx` — message bubbles, input
- `src/components/report-viewer.tsx` — report cards, charts
- `src/components/ai-review-panel.tsx` — review card
- `src/components/account-form.tsx` — form
- `src/app/(dashboard)/journal/accounts/page.tsx` — account cards (add GlowingEffect)
- `src/app/(dashboard)/playbooks/[id]/page.tsx` — detail page
- `src/app/(dashboard)/playbooks/add/page.tsx` — form page
- `src/app/login/page.tsx` — login card (add GlowingEffect)
- `src/app/register/page.tsx` — register card
- Instrument pages (`src/app/(dashboard)/[instrument]/page.tsx`) — bias cards, charts
- Calendar page — event cards
- All remaining page-level files with heading/text colors

## Performance

- Glass `backdrop-filter` is GPU-accelerated in all modern browsers
- Mesh blobs are static positioned divs (no animation, no repaints)
- GlowingEffect uses `requestAnimationFrame` and `motion` library — only active on pointer move, idle otherwise
- No WebGL, no canvas, no heavy shaders

## Out of Scope

- Dark mode toggle (this is a permanent redesign, not a theme switcher)
- Animated mesh blobs (static is sufficient and performant)
- GlowingEffect on every element (limited to highlight cards only)

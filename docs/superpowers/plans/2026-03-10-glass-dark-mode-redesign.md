# Glass & Dark Mode Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert ForexPulse from light mode to a dark monochrome theme with bold glassmorphism panels and mouse-proximity glowing borders on key cards.

**Architecture:** Pure CSS variable swap + Tailwind class updates across all components. No structural/data changes. New GlowingEffect component from 21st.dev (adapted to monochrome). Mesh gradient blobs as fixed background divs in dashboard layout.

**Tech Stack:** Tailwind CSS v4, shadcn/ui, motion (npm), React

**Spec:** `docs/superpowers/specs/2026-03-10-glass-dark-mode-redesign.md`

---

## Color Mapping Reference

Use this table for ALL component color swaps throughout the plan:

| Old Class | New Class |
|-----------|-----------|
| `text-gray-900` | `text-white` |
| `text-gray-800` | `text-white` |
| `text-gray-700` | `text-white/80` |
| `text-gray-600` | `text-white/60` |
| `text-gray-500` | `text-white/40` |
| `text-gray-400` | `text-white/30` |
| `text-gray-300` | `text-white/20` |
| `bg-white` | `bg-white/[0.06]` |
| `bg-gray-50` | `bg-white/[0.04]` |
| `bg-gray-100` | `bg-white/[0.06]` |
| `bg-gray-200` | `bg-white/[0.08]` |
| `bg-[#fafafa]` | (remove — layout handles bg) |
| `border-gray-100` | `border-white/[0.06]` |
| `border-gray-200` | `border-white/10` |
| `border-gray-300` | `border-white/[0.12]` |
| `divide-gray-100` | `divide-white/[0.06]` |
| `hover:bg-gray-50` | `hover:bg-white/[0.06]` |
| `hover:bg-gray-50/50` | `hover:bg-white/[0.04]` |
| `hover:text-gray-700` | `hover:text-white/80` |
| `hover:text-gray-900` | `hover:text-white` |
| `hover:border-gray-300` | `hover:border-white/[0.15]` |
| `placeholder-gray-400` | `placeholder-white/30` |
| `bg-blue-100 text-blue-800` | `bg-blue-500/20 text-blue-400` |
| `bg-red-100 text-red-800` | `bg-red-500/20 text-red-400` |
| `bg-green-100 text-green-800` | `bg-green-500/20 text-green-400` |
| `bg-yellow-100 text-yellow-800` | `bg-yellow-500/20 text-yellow-400` |
| `bg-amber-50` | `bg-amber-500/10` |
| `border-amber-200` | `border-amber-500/20` |
| `text-amber-800` | `text-amber-400` |
| `bg-red-50` | `bg-red-500/10` |
| `border-red-200` | `border-red-500/20` |
| `text-red-700` | `text-red-400` |
| `text-green-700` | `text-green-400` |
| `text-green-600` | `text-green-400` |
| `text-red-600` | `text-red-400` |
| `bg-indigo-500` | `bg-indigo-400` |
| `text-indigo-500` | `text-indigo-400` |
| `bg-blue-50 p-2` | `bg-blue-500/10 p-2` |
| `text-blue-600` | `text-blue-400` |
| `focus:border-[#1e3a5f]` | `focus:border-white/25` |
| `focus:ring-indigo-500` | `focus:ring-white/25` |
| `bg-[#1e3a5f]` | `bg-white/[0.15]` |
| `hover:bg-[#162d4a]` | `hover:bg-white/20` |
| `shadow-sm` | `shadow-[0_4px_16px_rgba(0,0,0,0.2)]` |

---

## Chunk 1: Foundation

### Task 1: Install motion dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install motion**

```bash
npm install motion
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('motion/react')" && echo "OK"
```
Expected: OK (no errors)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add motion dependency for glowing effect"
```

---

### Task 2: Create GlowingEffect component

**Files:**
- Create: `src/components/ui/glowing-effect.tsx`

- [ ] **Step 1: Create the component file**

Write to `src/components/ui/glowing-effect.tsx` with the full GlowingEffect component code from the spec. **Remap the gradient colors** to monochrome:

```tsx
"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { animate } from "motion/react";

interface GlowingEffectProps {
  blur?: number;
  inactiveZone?: number;
  proximity?: number;
  spread?: number;
  variant?: "default" | "white";
  glow?: boolean;
  className?: string;
  disabled?: boolean;
  movementDuration?: number;
  borderWidth?: number;
}

const GlowingEffect = memo(
  ({
    blur = 0,
    inactiveZone = 0.7,
    proximity = 0,
    spread = 20,
    variant = "default",
    glow = false,
    className,
    movementDuration = 2,
    borderWidth = 1,
    disabled = true,
  }: GlowingEffectProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const lastPosition = useRef({ x: 0, y: 0 });
    const animationFrameRef = useRef<number>(0);

    const handleMove = useCallback(
      (e?: MouseEvent | { x: number; y: number }) => {
        if (!containerRef.current) return;

        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        animationFrameRef.current = requestAnimationFrame(() => {
          const element = containerRef.current;
          if (!element) return;

          const { left, top, width, height } = element.getBoundingClientRect();
          const mouseX = e?.x ?? lastPosition.current.x;
          const mouseY = e?.y ?? lastPosition.current.y;

          if (e) {
            lastPosition.current = { x: mouseX, y: mouseY };
          }

          const center = [left + width * 0.5, top + height * 0.5];
          const distanceFromCenter = Math.hypot(
            mouseX - center[0],
            mouseY - center[1]
          );
          const inactiveRadius = 0.5 * Math.min(width, height) * inactiveZone;

          if (distanceFromCenter < inactiveRadius) {
            element.style.setProperty("--active", "0");
            return;
          }

          const isActive =
            mouseX > left - proximity &&
            mouseX < left + width + proximity &&
            mouseY > top - proximity &&
            mouseY < top + height + proximity;

          element.style.setProperty("--active", isActive ? "1" : "0");

          if (!isActive) return;

          const currentAngle =
            parseFloat(element.style.getPropertyValue("--start")) || 0;
          let targetAngle =
            (180 * Math.atan2(mouseY - center[1], mouseX - center[0])) /
              Math.PI +
            90;

          const angleDiff = ((targetAngle - currentAngle + 180) % 360) - 180;
          const newAngle = currentAngle + angleDiff;

          animate(currentAngle, newAngle, {
            duration: movementDuration,
            ease: [0.16, 1, 0.3, 1],
            onUpdate: (value) => {
              element.style.setProperty("--start", String(value));
            },
          });
        });
      },
      [inactiveZone, proximity, movementDuration]
    );

    useEffect(() => {
      if (disabled) return;

      const handleScroll = () => handleMove();
      const handlePointerMove = (e: PointerEvent) => handleMove(e);

      window.addEventListener("scroll", handleScroll, { passive: true });
      document.body.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        window.removeEventListener("scroll", handleScroll);
        document.body.removeEventListener("pointermove", handlePointerMove);
      };
    }, [handleMove, disabled]);

    return (
      <>
        <div
          className={cn(
            "pointer-events-none absolute -inset-px hidden rounded-[inherit] border opacity-0 transition-opacity",
            glow && "opacity-100",
            variant === "white" && "border-white",
            disabled && "!block"
          )}
        />
        <div
          ref={containerRef}
          style={
            {
              "--blur": `${blur}px`,
              "--spread": spread,
              "--start": "0",
              "--active": "0",
              "--glowingeffect-border-width": `${borderWidth}px`,
              "--repeating-conic-gradient-times": "5",
              "--gradient":
                variant === "white"
                  ? `repeating-conic-gradient(
                  from 236.84deg at 50% 50%,
                  var(--black),
                  var(--black) calc(25% / var(--repeating-conic-gradient-times))
                )`
                  : `radial-gradient(circle, rgba(255,255,255,0.6) 10%, transparent 20%),
                radial-gradient(circle at 40% 40%, rgba(255,255,255,0.3) 5%, transparent 15%),
                radial-gradient(circle at 60% 60%, rgba(180,180,180,0.4) 10%, transparent 20%),
                radial-gradient(circle at 40% 60%, rgba(120,120,120,0.3) 10%, transparent 20%),
                repeating-conic-gradient(
                  from 236.84deg at 50% 50%,
                  rgba(255,255,255,0.6) 0%,
                  rgba(255,255,255,0.3) calc(25% / var(--repeating-conic-gradient-times)),
                  rgba(180,180,180,0.4) calc(50% / var(--repeating-conic-gradient-times)),
                  rgba(120,120,120,0.3) calc(75% / var(--repeating-conic-gradient-times)),
                  rgba(255,255,255,0.6) calc(100% / var(--repeating-conic-gradient-times))
                )`,
            } as React.CSSProperties
          }
          className={cn(
            "pointer-events-none absolute inset-0 rounded-[inherit] opacity-100 transition-opacity",
            glow && "opacity-100",
            blur > 0 && "blur-[var(--blur)] ",
            className,
            disabled && "!hidden"
          )}
        >
          <div
            className={cn(
              "glow",
              "rounded-[inherit]",
              'after:content-[""] after:rounded-[inherit] after:absolute after:inset-[calc(-1*var(--glowingeffect-border-width))]',
              "after:[border:var(--glowingeffect-border-width)_solid_transparent]",
              "after:[background:var(--gradient)] after:[background-attachment:fixed]",
              "after:opacity-[var(--active)] after:transition-opacity after:duration-300",
              "after:[mask-clip:padding-box,border-box]",
              "after:[mask-composite:intersect]",
              "after:[mask-image:linear-gradient(#0000,#0000),conic-gradient(from_calc((var(--start)-var(--spread))*1deg),#00000000_0deg,#fff,#00000000_calc(var(--spread)*2deg))]"
            )}
          />
        </div>
      </>
    );
  }
);

GlowingEffect.displayName = "GlowingEffect";

export { GlowingEffect };
```

- [ ] **Step 2: Verify build**

```bash
npx next build 2>&1 | tail -5
```
Expected: Compiled successfully

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/glowing-effect.tsx
git commit -m "feat: add GlowingEffect component with monochrome colors"
```

---

### Task 3: Update globals.css — dark theme + glass utilities

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace all CSS variables with dark values**

Replace the root `:root` / base CSS variable block. Swap every color variable to the dark monochrome equivalents from the spec:

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
--chart-1: #60a5fa (blue-400)
--chart-2: #4ade80 (green-400)
--chart-3: #f87171 (red-400)
--chart-4: #fbbf24 (amber-400)
--chart-5: rgba(255,255,255,0.4)
```

- [ ] **Step 2: Add glass utility classes**

Add under `@layer utilities`:

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

- [ ] **Step 3: Update scrollbar colors**

Replace scrollbar-thumb colors:
```css
::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.15);
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.25);
}
```

- [ ] **Step 4: Update selection color**

```css
::selection {
  background: rgba(255,255,255,0.15);
  color: #ffffff;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: dark monochrome theme variables + glass utilities"
```

---

### Task 4: Update layouts — dark background + mesh blobs

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: Add dark bg to root layout body**

In `src/app/layout.tsx`, add `bg-[#09090b]` to the `<body>` className to prevent flash of white.

- [ ] **Step 2: Update dashboard layout**

In `src/app/(dashboard)/layout.tsx`:
- Remove `bg-[#fafafa]` from the container
- Add mesh gradient blobs as fixed background divs
- Wrap children in a relative z-10 container

The layout should become:

```tsx
<div className="relative min-h-screen overflow-hidden">
  {/* Mesh gradient blobs */}
  <div className="pointer-events-none fixed inset-0 z-0">
    <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_70%)]" />
    <div className="absolute -bottom-[15%] -left-[10%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.05),transparent_70%)]" />
    <div className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.06),transparent_70%)] -translate-x-1/2" />
  </div>
  {/* Content */}
  <div className="relative z-10">
    <TopNav instruments={instruments} />
    <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
      {children}
    </main>
  </div>
</div>
```

- [ ] **Step 3: Verify build**

```bash
npx next build 2>&1 | tail -5
```

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx "src/app/(dashboard)/layout.tsx"
git commit -m "feat: dark background with monochrome mesh gradient blobs"
```

---

### Task 5: Update top-nav to match dark theme

**Files:**
- Modify: `src/components/top-nav.tsx`

- [ ] **Step 1: Update header colors**

Apply these changes:
- Header bg: `bg-[#1a1f2e]` → `bg-black/40 backdrop-blur-xl`
- Header border: `border-[#2a3040]` → `border-white/[0.06]`
- Dividers: `bg-gray-600` → `bg-white/10`
- Mobile drawer: `bg-[#1a1f2e] border-[#2a3040]` → `bg-black/80 backdrop-blur-xl border-white/[0.06]`
- Mobile dividers: `bg-gray-700` → `bg-white/10`
- Keep accent line `bg-[#2563eb]`
- Keep existing text colors (already `text-gray-400`/`text-white` which work on dark)

- [ ] **Step 2: Commit**

```bash
git add src/components/top-nav.tsx
git commit -m "feat: glassmorphic top nav header"
```

---

## Chunk 2: UI Primitives

### Task 6: Update card.tsx with glass styling

**Files:**
- Modify: `src/components/ui/card.tsx`

- [ ] **Step 1: Update Card component**

The Card already uses CSS variables (`bg-card`, `ring-foreground/10`). Since we changed the CSS variables in Task 3, cards will automatically pick up the new dark colors. However, we need to add glass styling:

- Add `backdrop-blur-xl` to the card container
- Replace `ring-1 ring-foreground/10` with the glass border styling
- Add the glass shadow

The card className should include:
```
glass rounded-xl
```

Remove the existing `ring-1 ring-foreground/10` and `bg-card` since the `.glass` utility handles background and border.

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/card.tsx
git commit -m "feat: glass card styling"
```

---

### Task 7: Update button.tsx for dark theme

**Files:**
- Modify: `src/components/ui/button.tsx`

- [ ] **Step 1: Update button variants**

Key changes to variant styles:
- **default:** `bg-white/[0.15] text-white hover:bg-white/20 border border-white/20`
- **destructive:** `bg-red-500/20 text-red-400 hover:bg-red-500/30`
- **outline:** `border-white/[0.15] bg-transparent text-white hover:bg-white/[0.06]`
- **secondary:** `bg-white/[0.08] text-white hover:bg-white/[0.12]`
- **ghost:** `text-white/60 hover:bg-white/[0.06] hover:text-white`
- **link:** `text-white underline-offset-4 hover:underline`

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/button.tsx
git commit -m "feat: dark mode button variants"
```

---

### Task 8: Update input.tsx, badge.tsx for dark theme

**Files:**
- Modify: `src/components/ui/input.tsx`
- Modify: `src/components/ui/badge.tsx`

- [ ] **Step 1: Update input**

Input should use:
- `bg-white/[0.06] border-white/[0.12] text-white placeholder:text-white/30 focus:border-white/25 focus:ring-white/25`

- [ ] **Step 2: Update badge variants**

- **default:** `bg-white/[0.12] text-white border-transparent`
- **secondary:** `bg-white/[0.08] text-white/80`
- **destructive:** `bg-red-500/20 text-red-400`
- **outline:** `border-white/[0.15] text-white`

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/input.tsx src/components/ui/badge.tsx
git commit -m "feat: dark mode inputs and badges"
```

---

## Chunk 3: Auth Pages

### Task 9: Dark login page with GlowingEffect

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/components/login-form.tsx`

- [ ] **Step 1: Update login page**

Apply color mapping to login page:
- Remove `bg-[#fafafa]` — add `bg-[#09090b]` with mesh blobs (same pattern as dashboard layout)
- Heading: `text-gray-900` → `text-white`
- Subtitle: `text-gray-500` → `text-white/40`
- Card: `border-gray-200 bg-white` → `glass rounded-xl`
- Add GlowingEffect wrapper around the login card
- Signup prompt: `text-gray-400` → `text-white/30`

Import and wrap the card:
```tsx
import { GlowingEffect } from "@/components/ui/glowing-effect";

<div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2">
  <GlowingEffect spread={60} glow proximity={80} inactiveZone={0.01} borderWidth={3} disabled={false} />
  <div className="glass rounded-xl p-8">
    {/* form content */}
  </div>
</div>
```

- [ ] **Step 2: Update login-form.tsx**

Apply color mapping:
- Error: `border-red-200 bg-red-50 text-red-700` → `border-red-500/20 bg-red-500/10 text-red-400`
- Labels: `text-gray-700` → `text-white/80`
- Inputs: `border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:border-[#1e3a5f]` → `bg-white/[0.06] border-white/[0.12] text-white placeholder-white/30 focus:border-white/25`
- Button: `bg-[#1e3a5f] hover:bg-[#162d4a] text-white` → `bg-white/[0.15] hover:bg-white/20 text-white border border-white/20`

- [ ] **Step 3: Update register page**

Same pattern as login. Apply full color mapping to `src/app/(auth)/register/page.tsx`.

- [ ] **Step 4: Verify build + visually check**

```bash
npx next build 2>&1 | tail -5
```

- [ ] **Step 5: Commit**

```bash
git add "src/app/(auth)/login/page.tsx" src/components/login-form.tsx "src/app/(auth)/register/page.tsx"
git commit -m "feat: dark glassmorphic auth pages with glow effect"
```

---

## Chunk 4: Journal Components

### Task 10: Update journal-stats-bar with GlowingEffect

**Files:**
- Modify: `src/components/journal-stats-bar.tsx`

- [ ] **Step 1: Apply color mapping + add GlowingEffect**

Color swaps:
- `text-gray-500` → `text-white/40`
- `text-gray-900` → `text-white`

Wrap each stat card with GlowingEffect:
```tsx
import { GlowingEffect } from "@/components/ui/glowing-effect";

<div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-2">
  <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={3} disabled={false} />
  <Card className="glass rounded-xl">
    {/* stat content */}
  </Card>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/journal-stats-bar.tsx
git commit -m "feat: dark glowing stat cards"
```

---

### Task 11: Update journal-table.tsx

**Files:**
- Modify: `src/components/journal-table.tsx`

- [ ] **Step 1: Apply full color mapping**

This file has the most color instances (~30). Apply the color mapping table systematically:

- Direction toggle: `bg-gray-100` → `bg-white/[0.06]`
- Active button: `bg-white text-gray-900 shadow-sm` → `bg-white/[0.15] text-white shadow-[0_4px_16px_rgba(0,0,0,0.2)]`
- Inactive button: `text-gray-500 hover:text-gray-700` → `text-white/40 hover:text-white/80`
- Loading: `text-gray-400` → `text-white/30`, `text-gray-500` → `text-white/40`
- Empty state: `bg-gray-100` → `bg-white/[0.06]`, `text-gray-400` → `text-white/30`, `text-gray-900` → `text-white`, `text-gray-500` → `text-white/40`
- Table header: `border-gray-100` → `border-white/[0.06]`, `text-gray-500` → `text-white/40`
- Table rows: `border-gray-50` → `border-white/[0.04]`, `hover:bg-gray-50/50` → `hover:bg-white/[0.04]`
- All `text-gray-*` in table cells per the mapping
- Pagination: `text-gray-500` → `text-white/40`, `text-gray-600` → `text-white/60`

- [ ] **Step 2: Commit**

```bash
git add src/components/journal-table.tsx
git commit -m "feat: dark journal table"
```

---

### Task 12: Update trade-detail.tsx with GlowingEffect

**Files:**
- Modify: `src/components/trade-detail.tsx`

- [ ] **Step 1: Apply color mapping to all text/bg classes**

Apply the full color mapping table. Key areas:
- Back link, instrument title, metadata text
- Direction badges: `bg-blue-100 text-blue-800` → `bg-blue-500/20 text-blue-400`, `bg-red-100 text-red-800` → `bg-red-500/20 text-red-400`
- All price labels and values
- P&L summary: `ring-green-200` → `ring-green-500/20`, `ring-red-200` → `ring-red-500/20`
- Account & Playbook cards
- Rule adherence: `bg-gray-100` → `bg-white/[0.06]`, `text-gray-700` → `text-white/80`, `text-red-700` → `text-red-400`
- Screenshots: `border-gray-200 bg-gray-50` → `border-white/10 bg-white/[0.04]`, `hover:ring-blue-300` → `hover:ring-white/25`
- Notes text
- All icon colors

- [ ] **Step 2: Add GlowingEffect to price grid cards**

Import GlowingEffect. Wrap each price card in the grid:

```tsx
<div className="relative rounded-[1.25rem] border-[0.75px] border-white/10 p-1.5">
  <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} borderWidth={3} disabled={false} />
  <Card size="sm" className="glass rounded-xl">
    {/* Entry/Exit/SL/TP/Lot content */}
  </Card>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/trade-detail.tsx
git commit -m "feat: dark trade detail with glowing price cards"
```

---

### Task 13: Update trade-form.tsx

**Files:**
- Modify: `src/components/trade-form.tsx`

- [ ] **Step 1: Apply color mapping**

This file has many button groups with hardcoded colors. Apply mapping:
- Section titles: `text-gray-900` → `text-white`
- Active instrument/direction buttons: `bg-gray-900 text-white border-gray-900` → `bg-white/[0.2] text-white border-white/25`
- Inactive buttons: `bg-white text-gray-600 border-gray-200 hover:border-gray-300` → `bg-white/[0.06] text-white/60 border-white/10 hover:border-white/[0.15]`
- P&L preview labels: `text-gray-500` → `text-white/40`
- P&L preview values: `text-gray-900` → `text-white`
- Rule category headers: `text-gray-500 uppercase` → `text-white/40 uppercase`
- Checkbox borders: `border-gray-300` → `border-white/[0.12]`
- Rule text: `text-gray-700` → `text-white/80`, `group-hover:text-gray-900` → `group-hover:text-white`
- Session/emotion/timeframe buttons: same active/inactive pattern as above

- [ ] **Step 2: Commit**

```bash
git add src/components/trade-form.tsx
git commit -m "feat: dark trade form"
```

---

## Chunk 5: Playbook, AI & Account Components

### Task 14: Update playbook-card.tsx with GlowingEffect

**Files:**
- Modify: `src/components/playbook-card.tsx`

- [ ] **Step 1: Apply color mapping + GlowingEffect**

Color swaps:
- `text-gray-900` → `text-white`
- `border-gray-100` → `border-white/[0.06]`
- `text-gray-700` → `text-white/80`
- `text-gray-500` → `text-white/40`

Wrap card with GlowingEffect (same pattern as stats bar cards).

- [ ] **Step 2: Commit**

```bash
git add src/components/playbook-card.tsx
git commit -m "feat: dark glowing playbook cards"
```

---

### Task 15: Update playbook-form.tsx and playbook pages

**Files:**
- Modify: `src/components/playbook-form.tsx`
- Modify: `src/app/(dashboard)/playbooks/[id]/page.tsx`
- Modify: `src/app/(dashboard)/playbooks/add/page.tsx`

- [ ] **Step 1: Apply color mapping to all files**

playbook-form.tsx:
- `text-gray-900` → `text-white`
- `text-gray-400` → `text-white/30`

Playbook pages: Apply mapping to any hardcoded heading/text colors.

- [ ] **Step 2: Commit**

```bash
git add src/components/playbook-form.tsx "src/app/(dashboard)/playbooks/[id]/page.tsx" "src/app/(dashboard)/playbooks/add/page.tsx"
git commit -m "feat: dark playbook form and pages"
```

---

### Task 16: Update chat-interface.tsx

**Files:**
- Modify: `src/components/chat-interface.tsx`

- [ ] **Step 1: Apply color mapping**

- Loading: `text-gray-400` → `text-white/30`
- Bot icon: `text-indigo-300` → `text-indigo-400`
- Empty state: `text-gray-500` → `text-white/40`
- Assistant bubble: `bg-gray-100 text-gray-800` → `glass-sm text-white/80`
- Typing dots: `bg-gray-100` → `bg-white/[0.06]`, `bg-gray-400` → `bg-white/30`
- Input border: `border-gray-200` → `border-white/10`
- Input: `border-gray-300 focus:ring-indigo-500` → `bg-white/[0.06] border-white/[0.12] focus:ring-white/25 text-white`

- [ ] **Step 2: Commit**

```bash
git add src/components/chat-interface.tsx
git commit -m "feat: dark glassmorphic chat interface"
```

---

### Task 17: Update ai-review-panel.tsx

**Files:**
- Modify: `src/components/ai-review-panel.tsx`

- [ ] **Step 1: Apply color mapping**

- Verdict badges: `bg-green-100 text-green-800` → `bg-green-500/20 text-green-400`, same for yellow and red variants
- Alignment colors: `text-green-700` → `text-green-400`, `text-red-700` → `text-red-400`, `text-gray-600` → `text-white/60`
- Section headings: `text-gray-400` → `text-white/30`
- Body text: `text-gray-600` → `text-white/60`
- Suggestion badges: `bg-gray-100 text-gray-500` → `bg-white/[0.06] text-white/40`
- Error: `border-red-200 bg-red-50` → `border-red-500/20 bg-red-500/10`
- Timestamp: `text-gray-400` → `text-white/30`

- [ ] **Step 2: Commit**

```bash
git add src/components/ai-review-panel.tsx
git commit -m "feat: dark AI review panel"
```

---

### Task 18: Update report-viewer.tsx

**Files:**
- Modify: `src/components/report-viewer.tsx`

- [ ] **Step 1: Update colors**

This component is already partially dark-themed (`#1e2433`, `#2a3040`). Update:
- Replace hardcoded dark colors with glass utilities where appropriate
- `text-gray-400` → `text-white/30`
- `text-gray-300` → `text-white/20`
- Any remaining light-mode table colors

- [ ] **Step 2: Commit**

```bash
git add src/components/report-viewer.tsx
git commit -m "feat: glassmorphic report viewer"
```

---

### Task 19: Update accounts-manager.tsx with GlowingEffect

**Files:**
- Modify: `src/components/accounts-manager.tsx` (or `src/app/(dashboard)/journal/accounts/page.tsx` — check which has account card rendering)

- [ ] **Step 1: Apply full color mapping**

- Loading: `text-gray-400` → `text-white/30`, `text-gray-500` → `text-white/40`
- Tier warning: `border-amber-200 bg-amber-50 text-amber-800` → `border-amber-500/20 bg-amber-500/10 text-amber-400`
- Error: `border-red-200 bg-red-50 text-red-700` → `border-red-500/20 bg-red-500/10 text-red-400`
- Heading: `text-gray-900` → `text-white`
- Empty state: `bg-gray-100` → `bg-white/[0.06]`, etc.
- Account cards: `bg-blue-50` → `bg-blue-500/10`, `text-blue-600` → `text-blue-400`, `text-gray-900` → `text-white`, `text-gray-400` → `text-white/30`, `text-gray-700` → `text-white/80`, `text-gray-500` → `text-white/40`
- Wrap account cards with GlowingEffect

- [ ] **Step 2: Update account-form.tsx if it exists**

Apply same color mapping pattern.

- [ ] **Step 3: Commit**

```bash
git add src/components/accounts-manager.tsx src/components/account-form.tsx
git commit -m "feat: dark glowing account cards"
```

---

## Chunk 6: Dashboard & Instrument Pages

### Task 20: Update dashboard-client.tsx

**Files:**
- Modify: `src/components/dashboard-client.tsx`

- [ ] **Step 1: Apply color mapping**

- Heading: `text-gray-900` → `text-white`
- Subtitle: `text-gray-500` → `text-white/40`
- Market summary border: `border-y border-gray-200` → `border-y border-white/[0.08]`
- Instrument code: `text-gray-700` → `text-white/80`
- Card borders: `border-gray-200` → `border-white/10`, `border-[#2563eb]` → keep (brand blue)

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard-client.tsx
git commit -m "feat: dark dashboard client"
```

---

### Task 21: Update market-sentiment.tsx and sentiment-gauge.tsx

**Files:**
- Modify: `src/components/market-sentiment.tsx`
- Modify: `src/components/sentiment-gauge.tsx`

- [ ] **Step 1: Apply color mapping**

market-sentiment.tsx:
- `border-gray-200 bg-white` → `glass rounded-xl` (remove explicit border/bg)
- `text-gray-400` → `text-white/30`
- `text-gray-500` → `text-white/40`

sentiment-gauge.tsx:
- `bg-gray-100` → `bg-white/[0.06]`

- [ ] **Step 2: Commit**

```bash
git add src/components/market-sentiment.tsx src/components/sentiment-gauge.tsx
git commit -m "feat: dark market sentiment and gauge"
```

---

### Task 22: Update remaining pages

**Files:**
- Modify: `src/app/(dashboard)/[instrument]/page.tsx`
- Modify: `src/app/(dashboard)/calendar/page.tsx`
- Modify: `src/app/(dashboard)/journal/page.tsx`
- Modify: `src/app/(dashboard)/journal/[id]/page.tsx`
- Modify: `src/app/(dashboard)/journal/chat/page.tsx`
- Modify: `src/app/(dashboard)/journal/reports/page.tsx`

- [ ] **Step 1: Apply color mapping to each page file**

For each file, search for any hardcoded `text-gray-*`, `bg-white`, `bg-gray-*`, `border-gray-*` classes and apply the mapping table. Most of these pages are thin wrappers that delegate to components (already updated), so changes should be minimal — mainly page headings and any page-level styling.

- [ ] **Step 2: Verify build**

```bash
npx next build 2>&1 | tail -5
```
Expected: Compiled successfully

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)"
git commit -m "feat: dark mode for all remaining pages"
```

---

## Chunk 7: Final Verification

### Task 23: Visual verification with Playwright

**Files:**
- Create: `/tmp/verify_dark_mode.py`

- [ ] **Step 1: Write verification script**

```python
"""Verify dark mode redesign renders correctly."""
from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1400, "height": 900})

    errors = []
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    # Login
    page.goto("http://localhost:3000/login")
    page.wait_for_load_state("networkidle")
    time.sleep(1)
    page.screenshot(path="/tmp/dark_login.png")

    email = page.query_selector('input[name="email"], input[type="email"]')
    pwd = page.query_selector('input[name="password"], input[type="password"]')
    if email and pwd:
        email.fill("admin@forexpulse.com")
        pwd.fill("admin123")
        page.click('button:has-text("Sign In")')
        time.sleep(3)
        page.wait_for_load_state("networkidle")

    # Journal
    page.goto("http://localhost:3000/journal")
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    page.screenshot(path="/tmp/dark_journal.png")

    # Trade detail
    rows = page.query_selector_all("table tbody tr")
    if rows:
        rows[0].click()
        time.sleep(3)
        page.screenshot(path="/tmp/dark_trade_detail.png")

    # Playbooks
    page.goto("http://localhost:3000/playbooks")
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    page.screenshot(path="/tmp/dark_playbooks.png")

    # AI Chat
    page.goto("http://localhost:3000/journal/chat")
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    page.screenshot(path="/tmp/dark_chat.png")

    # Dashboard
    page.goto("http://localhost:3000/EURUSD")
    page.wait_for_load_state("networkidle")
    time.sleep(2)
    page.screenshot(path="/tmp/dark_dashboard.png")

    runtime_errors = [e for e in errors if "TypeError" in e or "is not a function" in e]
    if runtime_errors:
        print(f"RUNTIME ERRORS: {runtime_errors[:5]}")
    else:
        print("No runtime errors detected")

    print(f"\nScreenshots saved to /tmp/dark_*.png")
    print("Verify visually: login, journal, trade detail, playbooks, chat, dashboard")

    browser.close()
```

- [ ] **Step 2: Start dev server and run verification**

```bash
npm run dev &
sleep 5
python /tmp/verify_dark_mode.py
```

- [ ] **Step 3: Review screenshots visually**

Check each screenshot for:
- No white backgrounds remaining
- Glass panels visible with blur effect
- Text readable (white on dark)
- Green/red P&L colors pop
- GlowingEffect visible on stat cards
- No broken layouts

- [ ] **Step 4: Fix any remaining issues**

If any light-mode colors remain visible in screenshots, find and fix the offending classes.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "fix: final dark mode visual tweaks"
```

---

### Task 24: Deploy

- [ ] **Step 1: Push to main**

```bash
git push origin main
```

Vercel auto-deploys from main. Verify at the Vercel dashboard that the build succeeds.

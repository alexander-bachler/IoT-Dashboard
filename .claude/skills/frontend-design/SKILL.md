---
name: frontend-design
description: >-
  Apply this repo's frontend design system when building or restyling UI in the
  IoT-Dashboard Next.js app. Use when the user asks to make the UI modern,
  clean, intuitive, consistent, more "SaaS-like", or to design/restyle a page,
  component, navigation, or the global look & feel. Codifies the "cleaner SaaS"
  visual language (Linear/Vercel-style): neutral surfaces, one accent color,
  generous spacing, restrained effects.
---

# Frontend Design — IoT-Dashboard

A practical design system for this codebase. The goal is a **clean, calm,
modern SaaS** look (think Linear / Vercel): content-first, generous whitespace,
a single accent color, and restrained effects. Avoid the older "vibrant"
treatment (multi-color gradients as surfaces, glow, scale-on-hover).

## Stack
- Next.js 15 (App Router) + React 19, TypeScript.
- Tailwind CSS 3 + `tailwindcss-animate`, shadcn/ui (Radix) in `components/ui/`.
- `next-themes` (dark default), `lucide-react` icons, Apache ECharts for charts,
  `sonner` for toasts.

## Tokens (source of truth: `app/globals.css`)
- Use **semantic CSS variables**, never hard-coded hex/raw colors:
  `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`,
  `border-border`, `bg-primary`/`text-primary-foreground`, `bg-accent`,
  `bg-destructive`. Both light and dark are defined via these tokens.
- Radius: `--radius` (0.75rem). Prefer `rounded-lg`/`rounded-xl`.
- Shadows: `shadow-sm` (resting), `shadow-md` (hover/raised). Avoid `xl` glows.
- Accent color = the single `primary` (blue). Use it sparingly: primary
  buttons, active nav, focus rings, key KPIs/links. Everything else is neutral.

## Principles (the "cleaner SaaS" rules)
1. **One accent, neutral everything else.** No blue→purple gradient fills on
   cards, headers, tabs, or text. Brand identity lives in the logo mark + the
   primary button, not in every heading.
2. **Surfaces are solid.** Cards = `bg-card` + `border-border` + `shadow-sm`.
   No heavy `backdrop-blur` glassmorphism as the main motif. The shared
   `.glass-card` class is already redefined to a clean card — reuse it.
3. **Hierarchy through type & space, not color.** Headings:
   `text-2xl font-semibold tracking-tight` (use `.section-header`). Body:
   `text-sm`/`text-base`. Secondary text: `text-muted-foreground`. Generous
   padding (`p-6` cards, `gap-4`/`gap-6` grids, page `space-y-6`).
4. **Restrained motion.** Subtle only: `transition-colors`/`transition-shadow`,
   a small `hover:shadow-md` or `hover:bg-accent`. No `scale(1.05)` jumps, no
   decorative animated blur "orbs", no permanent glow.
5. **Intuitive navigation.** Every route is reachable from the global nav.
   Active state is a quiet `bg-accent text-foreground`, not a glowing gradient.
   Always provide a mobile/collapsed nav.
6. **Consistent states.** Use the shared primitives for empty/loading/error:
   `components/ui/empty-state`, `loading-skeleton`/`skeleton`, `error-boundary`.
7. **Accessibility.** Real `<button>`/`<a>`, visible focus rings
   (`focus-visible:ring`), labelled icon-only buttons (`aria-label` / `sr-only`),
   adequate contrast (lean on tokens), respect reduced-motion.

## Reusable building blocks (prefer these over bespoke markup)
- Layout chrome: `components/layout/header.tsx`, `status-bar`,
  `command-palette`, `quick-actions-fab`.
- Primitives: `components/ui/*` (button, card, badge, dialog, dropdown-menu,
  select, tabs, input, table, popover, avatar, empty-state, skeleton…).
- Shared utility classes (defined in `globals.css`, kept clean): `.glass-card`
  (clean card), `.metric-card` / `.data-card` (KPI/content cards),
  `.section-header` (page/section title), `.info-banner` / `.success-banner` /
  `.warning-banner` (semantic notices), `.hover-scale` (subtle hover).
- `gradient-text` is intentionally redefined to solid `text-foreground` — clean
  by default, so existing usages don't need editing.

## Do / Don't
| Do | Don't |
|---|---|
| `bg-card border border-border shadow-sm` | `bg-gradient-to-br from-blue-500 to-purple-600` on surfaces |
| Solid `text-foreground` headings | `bg-clip-text text-transparent` gradient headings |
| `hover:bg-accent` / `hover:shadow-md` | `hover:scale-105`, permanent `glow` |
| One accent (primary) | rainbow of per-feature accent colors |
| Semantic tokens | raw hex / `slate-900` literals |
| Decorative-free backgrounds | absolutely-positioned `blur-3xl` orbs |

## Workflow when restyling
1. Read `app/globals.css` first — adjust shared tokens/classes there to fan out
   changes across all pages with minimal edits.
2. Reuse `components/ui/*`; extend a primitive rather than forking markup.
3. After changes: run `npx tsc --noEmit` and grep for regressions
   (`bg-gradient-to`, `blur-3xl`, `scale-1`, undefined utility classes like
   `shadow-glow-sm`).
4. Keep diffs focused on the visual/style layer; don't change data logic.

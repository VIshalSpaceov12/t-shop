# Shop - Bewakoof-Style E-Commerce Platform

## Project Overview

Production-grade fashion e-commerce platform built with Next.js 15+ (App Router), PostgreSQL, Prisma, Auth.js v5, Tailwind CSS, and shadcn/ui.

## Tech Stack

- **Framework:** Next.js (App Router, fullstack)
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** Auth.js v5 (NextAuth)
- **UI:** Tailwind CSS + shadcn/ui
- **Validation:** Zod
- **Deployment:** Vercel

## Project Structure

```
src/app/(store)/    → Customer-facing pages (homepage, products, cart, checkout)
src/app/admin/      → Admin panel (products, categories, orders, banners)
src/app/api/        → API routes (auth, cart, orders, upload)
src/components/ui/  → shadcn/ui components
src/components/store/ → Store-specific components
src/components/admin/ → Admin-specific components
src/components/shared/ → Shared components (Navbar, Footer)
src/lib/            → Utilities (prisma client, auth config, helpers)
src/hooks/          → Custom React hooks
prisma/             → Schema, migrations, seed
```

## Coding Standards

- Use Server Components by default. Only use `"use client"` when interactivity is needed.
- Use Server Actions for mutations where possible, API routes for complex operations.
- All form inputs validated with Zod schemas (defined in `src/lib/validators.ts`).
- Prices stored as Float in DB, formatted with `formatPrice()` from `src/lib/utils.ts`.
- Product URLs use slugs (`/products/[slug]`), not IDs.
- Admin routes protected by middleware checking `role === ADMIN`.
- Use `cn()` helper for conditional Tailwind classes.
- Import paths use `@/` alias (maps to `src/`).

## Database Commands

```bash
npx prisma migrate dev --name <name>   # Create and run migration
npx prisma db seed                      # Seed demo data
npx prisma studio                       # Visual database browser
npx prisma generate                     # Regenerate client after schema change
```

## Development

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # Run ESLint
```

---

## MANDATORY RULE: Playwright Testing After Every Phase

### The Rule

**After completing ANY implementation phase, you MUST run a Playwright MCP design review before moving to the next phase. No exceptions.**

The implementation is divided into 5 phases:

| Phase | Tasks | Test Trigger |
|-------|-------|-------------|
| **Foundation** | Tasks 1-6 (Setup, DB, Auth, Layout, Login) | Test after Task 6 |
| **Admin Panel** | Tasks 7-10 (Dashboard, Categories, Products, Banners) | Test after Task 10 |
| **Storefront** | Tasks 11-13 (Homepage, Listings, Product Detail) | Test after Task 13 |
| **Shopping** | Tasks 14-16 (Cart, Wishlist, Checkout) | Test after Task 16 |
| **Orders & Polish** | Tasks 17-21 (Orders, Account, Polish, Seed) | Test after Task 21 |

### How It Works

1. Complete all tasks in the phase
2. Ensure dev server is running (`npm run dev`)
3. Run `/design-review` command OR manually execute the design review agent
4. The agent uses Playwright MCP to:
   - Navigate all new pages
   - Test all interactive elements (clicks, forms, navigation)
   - Screenshot at 375px, 768px, 1024px, 1440px for responsiveness
   - Check accessibility (contrast, alt text, focus, keyboard nav)
   - Read console for errors
5. Fix ALL **Blocker** and **High** priority issues
6. Re-run review until clean
7. Only then proceed to next phase

### Phase Gate Criteria

A phase is **NOT complete** until:
- [ ] All pages render without console errors
- [ ] All interactive elements work (buttons, forms, links)
- [ ] Layout is correct at mobile (375px), tablet (768px), and desktop (1440px)
- [ ] No horizontal scroll at any viewport
- [ ] All images load (no broken images)
- [ ] Auth flows work (login, register, protected routes redirect)
- [ ] Zero Blocker issues
- [ ] Zero High-priority issues

### Quick Visual Check (After Every Task)

After completing any individual task (not just phases), do a quick check:

```javascript
// 1. Navigate to the affected page
mcp__playwright__browser_navigate({ url: "http://localhost:3000/<page>" })

// 2. Take a screenshot
mcp__playwright__browser_take_screenshot()

// 3. Check for console errors
mcp__playwright__browser_console_messages()

// 4. If the task involves responsive UI, resize and screenshot
mcp__playwright__browser_resize({ width: 375, height: 812 })
mcp__playwright__browser_take_screenshot()
```

This quick check catches issues early before they compound.

---

## Playwright MCP Commands Reference

```javascript
// Navigation
mcp__playwright__browser_navigate({ url: "http://localhost:3000" })

// Screenshots
mcp__playwright__browser_take_screenshot()

// Interactions
mcp__playwright__browser_click({ selector: "button[type='submit']" })
mcp__playwright__browser_type({ selector: "input[name='email']", text: "user@test.com" })
mcp__playwright__browser_hover({ selector: ".product-card" })
mcp__playwright__browser_select_option({ selector: "select[name='size']", value: "XL" })

// Viewport
mcp__playwright__browser_resize({ width: 375, height: 812 })   // Mobile
mcp__playwright__browser_resize({ width: 768, height: 1024 })  // Tablet
mcp__playwright__browser_resize({ width: 1440, height: 900 })  // Desktop

// Debugging
mcp__playwright__browser_console_messages()
mcp__playwright__browser_scroll_down()
mcp__playwright__browser_scroll_up()
```

---

## Design Standards

Follow S-Tier SaaS design patterns inspired by Bewakoof, Stripe, and Airbnb:

- **Typography:** Clear hierarchy - large bold headings, regular body, muted secondary text
- **Spacing:** Consistent spacing scale using Tailwind (4, 8, 12, 16, 24, 32, 48)
- **Colors:** Primary yellow accent (#FFD232 - Bewakoof style), clean white backgrounds, dark text
- **Cards:** Subtle shadows, rounded corners (rounded-lg), hover elevation
- **Buttons:** Full-width CTAs on mobile, clear primary/secondary distinction
- **Images:** Aspect-ratio consistent, lazy loaded, with skeleton placeholders
- **Mobile First:** Design for 375px first, enhance for larger screens

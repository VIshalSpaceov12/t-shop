# Bewakoof-Style E-Commerce Platform - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a production-grade fashion e-commerce platform similar to Bewakoof.com with Next.js fullstack, PostgreSQL, Prisma, Auth.js, Tailwind CSS + shadcn/ui.

**Architecture:** Next.js App Router handles both frontend (SSR/SSG pages) and backend (API routes + Server Actions). PostgreSQL stores all data via Prisma ORM. Auth.js v5 manages authentication. Customer-facing pages under `(store)` route group, admin panel under `/admin` with role-based middleware protection.

**Tech Stack:** Next.js 15+, PostgreSQL, Prisma 7, Auth.js v5, Tailwind CSS, shadcn/ui, Zod, Vercel Blob (image uploads)

---

## Phase 1: MVP Implementation

### Task 1: Project Setup & Configuration

**Files:**
- Create: `package.json`, `next.config.js`, `tailwind.config.ts`, `tsconfig.json`
- Create: `.env`, `.env.example`
- Create: `src/app/layout.tsx`, `src/app/globals.css`
- Create: `src/app/(store)/page.tsx`

**Step 1: Initialize Next.js project**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack
```
Expected: Project scaffolded with Next.js, Tailwind, TypeScript

**Step 2: Install core dependencies**

Run:
```bash
npm install prisma @prisma/client next-auth@beta @auth/prisma-adapter zod bcryptjs
npm install -D @types/bcryptjs
```

**Step 3: Install shadcn/ui**

Run:
```bash
npx shadcn@latest init -d
```
Expected: `components.json` created, `src/components/ui/` directory ready

**Step 4: Install essential shadcn components**

Run:
```bash
npx shadcn@latest add button input label card dialog dropdown-menu table badge separator sheet select checkbox toast avatar skeleton tabs textarea
```

**Step 5: Create environment file**

Create `.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/shop_db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-secret-here"
```

Create `.env.example` (same without values):
```env
DATABASE_URL=
NEXTAUTH_URL=
NEXTAUTH_SECRET=
```

**Step 6: Add `.env` to `.gitignore`**

Verify `.gitignore` includes `.env` and `.env.local` (Next.js scaffolding usually does this).

**Step 7: Initialize git and commit**

Run:
```bash
git init
git add .
git commit -m "chore: initialize Next.js project with Tailwind, shadcn/ui, Prisma, Auth.js"
```

---

### Task 2: Database Schema with Prisma

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`

**Step 1: Initialize Prisma**

Run:
```bash
npx prisma init
```

**Step 2: Write the complete Prisma schema**

Replace `prisma/schema.prisma` with:
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  CUSTOMER
  ADMIN
}

enum Gender {
  MEN
  WOMEN
  UNISEX
}

enum ProductStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}

enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}

enum PaymentStatus {
  UNPAID
  PAID
  REFUNDED
}

// Auth.js required models
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  phone         String?
  passwordHash  String?
  role          Role      @default(CUSTOMER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts Account[]
  sessions Session[]
  addresses Address[]
  cart      Cart?
  wishlist  Wishlist[]
  orders    Order[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Address {
  id           String  @id @default(cuid())
  userId       String
  fullName     String
  phone        String
  addressLine1 String
  addressLine2 String?
  city         String
  state        String
  pincode      String
  isDefault    Boolean @default(false)

  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  orders Order[]
}

model Category {
  id       String  @id @default(cuid())
  name     String
  slug     String  @unique
  image    String?
  parentId String?

  parent   Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children Category[] @relation("CategoryTree")
  products Product[]
}

model Product {
  id           String        @id @default(cuid())
  name         String
  slug         String        @unique
  description  String?       @db.Text
  brand        String        @default("Shop")
  basePrice    Float
  sellingPrice Float
  discount     Float         @default(0)
  categoryId   String
  gender       Gender        @default(UNISEX)
  status       ProductStatus @default(DRAFT)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  category  Category       @relation(fields: [categoryId], references: [id])
  variants  ProductVariant[]
  images    ProductImage[]
  wishlist  Wishlist[]
}

model ProductVariant {
  id       String @id @default(cuid())
  productId String
  size     String
  color    String
  colorHex String @default("#000000")
  sku      String @unique
  stock    Int    @default(0)
  price    Float?

  product    Product     @relation(fields: [productId], references: [id], onDelete: Cascade)
  cartItems  CartItem[]
  orderItems OrderItem[]
}

model ProductImage {
  id        String  @id @default(cuid())
  productId String
  url       String
  altText   String?
  sortOrder Int     @default(0)
  isPrimary Boolean @default(false)

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model Cart {
  id        String   @id @default(cuid())
  userId    String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user  User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  items CartItem[]
}

model CartItem {
  id        String @id @default(cuid())
  cartId    String
  variantId String
  quantity  Int    @default(1)

  cart    Cart           @relation(fields: [cartId], references: [id], onDelete: Cascade)
  variant ProductVariant @relation(fields: [variantId], references: [id])

  @@unique([cartId, variantId])
}

model Wishlist {
  id        String   @id @default(cuid())
  userId    String
  productId String
  createdAt DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([userId, productId])
}

model Order {
  id             String        @id @default(cuid())
  userId         String
  addressId      String
  status         OrderStatus   @default(PENDING)
  totalAmount    Float
  paymentMethod  String        @default("COD")
  paymentStatus  PaymentStatus @default(UNPAID)
  trackingNumber String?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  user    User        @relation(fields: [userId], references: [id])
  address Address     @relation(fields: [addressId], references: [id])
  items   OrderItem[]
}

model OrderItem {
  id        String @id @default(cuid())
  orderId   String
  variantId String
  quantity  Int
  price     Float

  order   Order          @relation(fields: [orderId], references: [id], onDelete: Cascade)
  variant ProductVariant @relation(fields: [variantId], references: [id])
}

model Banner {
  id        String  @id @default(cuid())
  title     String
  image     String
  link      String?
  position  String  @default("home_top")
  isActive  Boolean @default(true)
  sortOrder Int     @default(0)
}
```

**Step 3: Create Prisma client singleton**

Create `src/lib/prisma.ts`:
```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Step 4: Create and run the database**

Run:
```bash
createdb shop_db
npx prisma migrate dev --name init
```
Expected: Migration created and applied, database tables generated.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add Prisma schema with all models and initial migration"
```

---

### Task 3: Authentication with Auth.js v5

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/api/auth/register/route.ts`
- Create: `src/middleware.ts`
- Create: `src/lib/validators.ts`

**Step 1: Configure Auth.js**

Create `src/lib/auth.ts`:
```typescript
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.passwordHash) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
});
```

**Step 2: Create auth API route**

Create `src/app/api/auth/[...nextauth]/route.ts`:
```typescript
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

**Step 3: Create registration API route**

Create `src/lib/validators.ts`:
```typescript
import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
```

Create `src/app/api/auth/register/route.ts`:
```typescript
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash },
    });

    return NextResponse.json(
      { message: "User created", userId: user.id },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

**Step 4: Add middleware for admin protection**

Create `src/middleware.ts`:
```typescript
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Protect admin routes
  if (pathname.startsWith("/admin")) {
    if (!req.auth) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (req.auth.user?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Protect user-only routes
  if (
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/account")
  ) {
    if (!req.auth) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/checkout/:path*", "/orders/:path*", "/account/:path*"],
};
```

**Step 5: Add TypeScript types for Auth.js**

Create `src/types/next-auth.d.ts`:
```typescript
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    role?: string;
  }
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }
}
```

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add Auth.js v5 with credentials provider, registration, and middleware"
```

---

### Task 4: Utility Functions & Shared Configuration

**Files:**
- Create: `src/lib/utils.ts` (extend existing from shadcn)
- Create: `src/lib/constants.ts`
- Create: `src/hooks/use-cart.ts`

**Step 1: Add utility functions**

Extend `src/lib/utils.ts`:
```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(price);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function calculateDiscount(basePrice: number, sellingPrice: number): number {
  return Math.round(((basePrice - sellingPrice) / basePrice) * 100);
}

export function truncate(text: string, length: number): string {
  return text.length > length ? text.substring(0, length) + "..." : text;
}
```

**Step 2: Add constants**

Create `src/lib/constants.ts`:
```typescript
export const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"] as const;

export const GENDERS = [
  { label: "Men", value: "MEN" },
  { label: "Women", value: "WOMEN" },
  { label: "Unisex", value: "UNISEX" },
] as const;

export const ORDER_STATUSES = [
  { label: "Pending", value: "PENDING", color: "bg-yellow-100 text-yellow-800" },
  { label: "Confirmed", value: "CONFIRMED", color: "bg-blue-100 text-blue-800" },
  { label: "Shipped", value: "SHIPPED", color: "bg-purple-100 text-purple-800" },
  { label: "Delivered", value: "DELIVERED", color: "bg-green-100 text-green-800" },
  { label: "Cancelled", value: "CANCELLED", color: "bg-red-100 text-red-800" },
] as const;

export const PRODUCTS_PER_PAGE = 12;

export const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Discount", value: "discount" },
] as const;
```

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add utility functions and constants"
```

---

### Task 5: Shared Layout Components (Navbar, Footer)

**Files:**
- Create: `src/components/shared/navbar.tsx`
- Create: `src/components/shared/footer.tsx`
- Create: `src/components/shared/mobile-nav.tsx`
- Create: `src/components/shared/search-bar.tsx`
- Modify: `src/app/layout.tsx`
- Create: `src/app/(store)/layout.tsx`

**Step 1: Build the Navbar**

Create a responsive navbar with: logo, category links (Men, Women), search bar, user menu (login/account), wishlist icon, cart icon with count. Use shadcn `DropdownMenu` for the user menu and `Sheet` for mobile nav.

**Step 2: Build the Footer**

Create a footer with: brand info, category links, help links (contact, shipping, returns), social media icons, copyright. 4-column grid on desktop, stacked on mobile.

**Step 3: Build Mobile Navigation**

Create a slide-out drawer using shadcn `Sheet` for mobile menu with category links and user options.

**Step 4: Create store layout**

Create `src/app/(store)/layout.tsx` that wraps children with `<Navbar />` and `<Footer />`.

**Step 5: Update root layout**

Update `src/app/layout.tsx` with SessionProvider, Toaster, and global font setup.

**Step 6: Verify dev server runs**

Run: `npm run dev`
Expected: Homepage renders with navbar and footer at `http://localhost:3000`

**Step 7: Commit**

```bash
git add .
git commit -m "feat: add navbar, footer, mobile navigation, and store layout"
```

---

### Task 6: Auth Pages (Login, Register)

**Files:**
- Create: `src/app/(store)/login/page.tsx`
- Create: `src/app/(store)/register/page.tsx`
- Create: `src/components/store/login-form.tsx`
- Create: `src/components/store/register-form.tsx`

**Step 1: Build Login page**

Create login page with email/password form using shadcn `Input`, `Button`, `Card`. Client component that calls `signIn("credentials", ...)`. Link to register page.

**Step 2: Build Register page**

Create registration page with name, email, password fields. Calls `/api/auth/register` then auto-logs in. Link to login page.

**Step 3: Test auth flow**

Run: `npm run dev`
- Register a new user at `/register`
- Login at `/login`
- Verify session in navbar (shows user name/avatar instead of login link)

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add login and registration pages"
```

---

### PHASE GATE: Foundation Phase - Playwright Testing

> **MANDATORY:** Do NOT proceed to Task 7 until this gate passes.

**Step 1: Ensure dev server is running**

Run: `npm run dev`

**Step 2: Test Navbar & Footer**

```javascript
mcp__playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__playwright__browser_take_screenshot()  // Verify navbar + footer render
mcp__playwright__browser_resize({ width: 375, height: 812 })
mcp__playwright__browser_take_screenshot()  // Verify mobile layout
mcp__playwright__browser_click({ selector: "[data-testid='mobile-menu-trigger']" })
mcp__playwright__browser_take_screenshot()  // Verify mobile nav drawer opens
```

**Step 3: Test Auth Pages**

```javascript
mcp__playwright__browser_navigate({ url: "http://localhost:3000/register" })
mcp__playwright__browser_take_screenshot()  // Verify register page renders
mcp__playwright__browser_type({ selector: "input[name='name']", text: "Test User" })
mcp__playwright__browser_type({ selector: "input[name='email']", text: "test@example.com" })
mcp__playwright__browser_type({ selector: "input[name='password']", text: "password123" })
mcp__playwright__browser_click({ selector: "button[type='submit']" })
mcp__playwright__browser_take_screenshot()  // Verify registration success

mcp__playwright__browser_navigate({ url: "http://localhost:3000/login" })
mcp__playwright__browser_take_screenshot()  // Verify login page renders
mcp__playwright__browser_type({ selector: "input[name='email']", text: "test@example.com" })
mcp__playwright__browser_type({ selector: "input[name='password']", text: "password123" })
mcp__playwright__browser_click({ selector: "button[type='submit']" })
mcp__playwright__browser_take_screenshot()  // Verify logged-in navbar state
```

**Step 4: Test Auth Redirects**

```javascript
// Logout first, then test protected routes
mcp__playwright__browser_navigate({ url: "http://localhost:3000/checkout" })
mcp__playwright__browser_take_screenshot()  // Should redirect to /login

mcp__playwright__browser_navigate({ url: "http://localhost:3000/admin" })
mcp__playwright__browser_take_screenshot()  // Should redirect to /login or /
```

**Step 5: Test Responsive at All Breakpoints**

```javascript
// Desktop
mcp__playwright__browser_resize({ width: 1440, height: 900 })
mcp__playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__playwright__browser_take_screenshot()

// Tablet
mcp__playwright__browser_resize({ width: 768, height: 1024 })
mcp__playwright__browser_take_screenshot()

// Mobile
mcp__playwright__browser_resize({ width: 375, height: 812 })
mcp__playwright__browser_take_screenshot()
```

**Step 6: Check Console Errors**

```javascript
mcp__playwright__browser_console_messages()  // Must have ZERO errors
```

**Pass Criteria:**
- [ ] Navbar renders with logo, links, auth buttons at all breakpoints
- [ ] Footer renders with all sections
- [ ] Mobile nav drawer opens and closes
- [ ] Register form works end-to-end
- [ ] Login form works end-to-end
- [ ] Navbar updates to show logged-in state
- [ ] Protected routes redirect unauthenticated users
- [ ] No console errors
- [ ] No horizontal scroll at any breakpoint

**If any Blocker/High issue found:** Fix it, re-run the gate, then proceed.

---

### Task 7: Admin Layout & Dashboard

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/components/admin/sidebar.tsx`
- Create: `src/components/admin/admin-header.tsx`

**Step 1: Build admin sidebar**

Create sidebar with navigation links: Dashboard, Products, Categories, Orders, Banners. Use icons from lucide-react. Highlight active route. Collapsible on mobile.

**Step 2: Build admin layout**

Create `src/app/admin/layout.tsx` with sidebar + main content area. No store navbar/footer.

**Step 3: Build dashboard overview page**

Create dashboard showing stat cards: Total Products, Total Orders, Total Users, Revenue. Fetch counts from database using Server Component.

**Step 4: Seed an admin user**

Create `prisma/seed.ts` that creates an admin user with email `admin@shop.com` and password `admin123`.

Add to `package.json`:
```json
"prisma": {
  "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
}
```

Run: `npx prisma db seed`

**Step 5: Test admin access**

Login as admin → navigate to `/admin` → should see dashboard.
Login as customer → navigate to `/admin` → should redirect to `/`.

**Step 6: Commit**

```bash
git add .
git commit -m "feat: add admin layout, sidebar, dashboard, and seed script"
```

---

### Task 8: Admin - Category Management

**Files:**
- Create: `src/app/admin/categories/page.tsx`
- Create: `src/components/admin/category-form.tsx`
- Create: `src/app/api/admin/categories/route.ts`
- Create: `src/app/api/admin/categories/[id]/route.ts`

**Step 1: Build category API routes**

- `GET /api/admin/categories` - List all categories with parent info
- `POST /api/admin/categories` - Create category (name, slug auto-generated, image, parentId)
- `PUT /api/admin/categories/[id]` - Update category
- `DELETE /api/admin/categories/[id]` - Delete category (only if no products)

**Step 2: Build category management page**

DataTable showing categories with columns: Name, Slug, Parent, Products Count, Actions (Edit/Delete).
Dialog form for create/edit with fields: Name, Parent (select), Image upload.

**Step 3: Test CRUD operations**

Create categories: Men, Women, T-Shirts (parent: Men), Joggers (parent: Men)

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add admin category management with CRUD"
```

---

### Task 9: Admin - Product Management

**Files:**
- Create: `src/app/admin/products/page.tsx`
- Create: `src/app/admin/products/new/page.tsx`
- Create: `src/app/admin/products/[id]/edit/page.tsx`
- Create: `src/components/admin/product-form.tsx`
- Create: `src/components/admin/variant-form.tsx`
- Create: `src/components/admin/image-upload.tsx`
- Create: `src/app/api/admin/products/route.ts`
- Create: `src/app/api/admin/products/[id]/route.ts`
- Create: `src/app/api/upload/route.ts`

**Step 1: Build image upload API**

Create `/api/upload` that accepts multipart form data, saves to `public/uploads/` (later migrate to Vercel Blob/Cloudinary).

**Step 2: Build product API routes**

- `GET /api/admin/products` - List products with pagination, search, status filter
- `POST /api/admin/products` - Create product with variants and images
- `PUT /api/admin/products/[id]` - Update product
- `DELETE /api/admin/products/[id]` - Delete product

**Step 3: Build product list page**

DataTable with columns: Image (thumbnail), Name, Category, Price, Stock, Status, Actions.
Filters: status dropdown, search input. Bulk status toggle.

**Step 4: Build product form**

Multi-section form:
- Basic info: Name, Description (textarea), Brand, Category (select), Gender
- Pricing: Base Price, Selling Price (auto-calculates discount)
- Variants: Dynamic form to add size/color/stock/SKU combinations
- Images: Multi-image upload with drag-to-reorder, primary image selection

**Step 5: Seed sample products**

Add 10-15 sample products across categories to `prisma/seed.ts`.

**Step 6: Test full product flow**

Create a product with multiple variants and images → verify it appears in list → edit it → verify changes saved.

**Step 7: Commit**

```bash
git add .
git commit -m "feat: add admin product management with variants and image upload"
```

---

### Task 10: Admin - Banner Management

**Files:**
- Create: `src/app/admin/banners/page.tsx`
- Create: `src/components/admin/banner-form.tsx`
- Create: `src/app/api/admin/banners/route.ts`
- Create: `src/app/api/admin/banners/[id]/route.ts`

**Step 1: Build banner CRUD API and page**

Simple CRUD: title, image upload, link URL, position (home_top, home_middle), active toggle, sort order.
List view with drag-to-reorder or sort order input.

**Step 2: Seed sample banners**

Add 3-4 banners to seed script.

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add admin banner management"
```

---

### PHASE GATE: Admin Panel Phase - Playwright Testing

> **MANDATORY:** Do NOT proceed to Task 11 until this gate passes.

**Step 1: Test Admin Login & Access Control**

```javascript
// Login as admin
mcp__playwright__browser_navigate({ url: "http://localhost:3000/login" })
mcp__playwright__browser_type({ selector: "input[name='email']", text: "admin@shop.com" })
mcp__playwright__browser_type({ selector: "input[name='password']", text: "admin123" })
mcp__playwright__browser_click({ selector: "button[type='submit']" })

// Navigate to admin
mcp__playwright__browser_navigate({ url: "http://localhost:3000/admin" })
mcp__playwright__browser_take_screenshot()  // Verify dashboard with stat cards
```

**Step 2: Test Admin Sidebar Navigation**

```javascript
mcp__playwright__browser_click({ selector: "a[href='/admin/products']" })
mcp__playwright__browser_take_screenshot()  // Products page

mcp__playwright__browser_click({ selector: "a[href='/admin/categories']" })
mcp__playwright__browser_take_screenshot()  // Categories page

mcp__playwright__browser_click({ selector: "a[href='/admin/orders']" })
mcp__playwright__browser_take_screenshot()  // Orders page

mcp__playwright__browser_click({ selector: "a[href='/admin/banners']" })
mcp__playwright__browser_take_screenshot()  // Banners page
```

**Step 3: Test Category CRUD**

```javascript
mcp__playwright__browser_navigate({ url: "http://localhost:3000/admin/categories" })
// Create a category
mcp__playwright__browser_click({ selector: "[data-testid='add-category-btn']" })
mcp__playwright__browser_take_screenshot()  // Verify form dialog opens
mcp__playwright__browser_type({ selector: "input[name='name']", text: "Test Category" })
mcp__playwright__browser_click({ selector: "button[type='submit']" })
mcp__playwright__browser_take_screenshot()  // Verify category appears in table
```

**Step 4: Test Product CRUD**

```javascript
mcp__playwright__browser_navigate({ url: "http://localhost:3000/admin/products/new" })
mcp__playwright__browser_take_screenshot()  // Verify product form renders
// Fill basic info, add variant, upload image
mcp__playwright__browser_take_screenshot()  // Verify form state

mcp__playwright__browser_navigate({ url: "http://localhost:3000/admin/products" })
mcp__playwright__browser_take_screenshot()  // Verify products listed in table
```

**Step 5: Test Banner CRUD**

```javascript
mcp__playwright__browser_navigate({ url: "http://localhost:3000/admin/banners" })
mcp__playwright__browser_take_screenshot()  // Verify banners page renders
```

**Step 6: Test Admin Access Denied for Customer**

```javascript
// Login as regular customer
mcp__playwright__browser_navigate({ url: "http://localhost:3000/login" })
mcp__playwright__browser_type({ selector: "input[name='email']", text: "test@example.com" })
mcp__playwright__browser_type({ selector: "input[name='password']", text: "password123" })
mcp__playwright__browser_click({ selector: "button[type='submit']" })

mcp__playwright__browser_navigate({ url: "http://localhost:3000/admin" })
mcp__playwright__browser_take_screenshot()  // Should redirect to /
```

**Step 7: Test Responsive Admin Layout**

```javascript
mcp__playwright__browser_resize({ width: 375, height: 812 })
mcp__playwright__browser_navigate({ url: "http://localhost:3000/admin" })
mcp__playwright__browser_take_screenshot()  // Sidebar should collapse

mcp__playwright__browser_resize({ width: 1440, height: 900 })
mcp__playwright__browser_take_screenshot()  // Full sidebar visible
```

**Step 8: Console Check**

```javascript
mcp__playwright__browser_console_messages()  // Zero errors
```

**Pass Criteria:**
- [ ] Admin dashboard shows stat cards with real data
- [ ] Sidebar navigation works across all pages
- [ ] Category CRUD: create, edit, delete all work
- [ ] Product CRUD: create with variants/images, edit, delete
- [ ] Banner CRUD: create, edit, toggle active, reorder
- [ ] Customer role cannot access /admin (redirected)
- [ ] Admin layout is responsive (sidebar collapses on mobile)
- [ ] No console errors

**If any Blocker/High issue found:** Fix it, re-run the gate, then proceed.

---

### Task 11: Homepage (Customer-Facing)

**Files:**
- Modify: `src/app/(store)/page.tsx`
- Create: `src/components/store/banner-carousel.tsx`
- Create: `src/components/store/category-grid.tsx`
- Create: `src/components/store/product-card.tsx`
- Create: `src/components/store/product-section.tsx`

**Step 1: Build Banner Carousel**

Auto-sliding carousel with dots indicator, swipe on mobile. Fetches active banners sorted by sortOrder.

**Step 2: Build Category Grid**

Grid of category tiles with image and name overlay. Links to `/category/[slug]`. 3 cols mobile, 4-5 cols desktop.

**Step 3: Build Product Card**

Reusable card showing: image (hover shows second image), brand, name, selling price, base price (strikethrough), discount badge, wishlist heart icon.

**Step 4: Build Homepage**

Compose Server Component page:
1. Banner carousel (top)
2. "Shop by Category" grid
3. Promotional strip ("Free Shipping on orders above ₹399")
4. "New Arrivals" product section (latest 8 active products)
5. "Trending Now" product section

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add homepage with banner carousel, categories, and product sections"
```

---

### Task 12: Product Listing Page with Filters

**Files:**
- Create: `src/app/(store)/products/page.tsx`
- Create: `src/app/(store)/category/[slug]/page.tsx`
- Create: `src/components/store/product-filters.tsx`
- Create: `src/components/store/sort-dropdown.tsx`
- Create: `src/components/store/pagination.tsx`
- Create: `src/components/store/active-filters.tsx`

**Step 1: Build filter sidebar**

Sticky sidebar (desktop) / Sheet bottom drawer (mobile) with filter sections:
- Category (checkbox list)
- Size (checkbox list from SIZES constant)
- Color (color swatches)
- Price range (min/max inputs or preset ranges)
- Gender (radio)
- Discount (10%+, 20%+, etc.)

Filters update URL searchParams. "Clear All" button.

**Step 2: Build product listing page**

Server Component that reads searchParams, builds Prisma query with filters:
```
/products?category=tshirts&size=M,L&color=blue&minPrice=500&maxPrice=2000&sort=price_asc&page=1
```

**Step 3: Build category page**

`/category/[slug]` - same layout as products page but pre-filtered to category. Shows category name as heading, breadcrumb (Home > Men > T-Shirts).

**Step 4: Build pagination**

Page numbers with prev/next. Preserves all current filters in URL. Shows "Showing 1-12 of 48 products".

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add product listing with filters, sorting, and pagination"
```

---

### Task 13: Product Detail Page

**Files:**
- Create: `src/app/(store)/products/[slug]/page.tsx`
- Create: `src/components/store/image-gallery.tsx`
- Create: `src/components/store/size-selector.tsx`
- Create: `src/components/store/color-selector.tsx`
- Create: `src/components/store/add-to-cart-button.tsx`
- Create: `src/components/store/similar-products.tsx`

**Step 1: Build Image Gallery**

Main image + thumbnail strip. Click thumbnail to change main image. Zoom on hover (desktop). Swipeable on mobile.

**Step 2: Build Size & Color Selectors**

Color swatches (circles with colorHex). Selecting color filters available sizes. Unavailable sizes greyed out (stock = 0 for that variant).

**Step 3: Build Product Detail Page**

Server Component fetching product by slug with variants and images:
- Breadcrumb (Home > Category > Product Name)
- Image gallery (left, 50% width desktop)
- Product info (right, 50% width desktop):
  - Brand, Name, Ratings placeholder
  - Selling price, base price strikethrough, discount badge
  - Color selector
  - Size selector
  - "Add to Cart" button (full width)
  - "Add to Wishlist" button
  - Description accordion
  - Delivery info (pincode check placeholder)
- Similar products section (same category, different product)

**Step 4: Generate SEO metadata**

Use `generateMetadata` to set title, description, og:image from product data.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add product detail page with gallery, variant selection, and SEO"
```

---

### PHASE GATE: Storefront Phase - Playwright Testing

> **MANDATORY:** Do NOT proceed to Task 14 until this gate passes.

**Step 1: Test Homepage**

```javascript
mcp__playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__playwright__browser_take_screenshot()  // Full homepage

// Test banner carousel
mcp__playwright__browser_take_screenshot()  // Wait 3-5s, carousel should auto-slide
mcp__playwright__browser_click({ selector: "[data-testid='banner-dot-1']" })
mcp__playwright__browser_take_screenshot()  // Second banner visible

// Test category grid
mcp__playwright__browser_scroll_down()
mcp__playwright__browser_take_screenshot()  // Category tiles visible

// Test product sections
mcp__playwright__browser_scroll_down()
mcp__playwright__browser_take_screenshot()  // New arrivals section visible
```

**Step 2: Test Product Listing with Filters**

```javascript
mcp__playwright__browser_navigate({ url: "http://localhost:3000/products" })
mcp__playwright__browser_take_screenshot()  // Product grid visible

// Test filters
mcp__playwright__browser_click({ selector: "[data-testid='filter-size-M']" })
mcp__playwright__browser_take_screenshot()  // Filtered results

mcp__playwright__browser_click({ selector: "[data-testid='filter-clear-all']" })
mcp__playwright__browser_take_screenshot()  // All products back

// Test sorting
mcp__playwright__browser_click({ selector: "[data-testid='sort-dropdown']" })
mcp__playwright__browser_click({ selector: "[data-value='price_asc']" })
mcp__playwright__browser_take_screenshot()  // Sorted by price low to high

// Test pagination
mcp__playwright__browser_scroll_down()
mcp__playwright__browser_click({ selector: "[data-testid='page-2']" })
mcp__playwright__browser_take_screenshot()  // Page 2 products
```

**Step 3: Test Category Page**

```javascript
mcp__playwright__browser_navigate({ url: "http://localhost:3000/category/men" })
mcp__playwright__browser_take_screenshot()  // Category heading + breadcrumb + filtered products
```

**Step 4: Test Product Detail Page**

```javascript
// Click a product card
mcp__playwright__browser_navigate({ url: "http://localhost:3000/products" })
mcp__playwright__browser_click({ selector: ".product-card:first-child a" })
mcp__playwright__browser_take_screenshot()  // Product detail page

// Test image gallery
mcp__playwright__browser_click({ selector: "[data-testid='thumbnail-1']" })
mcp__playwright__browser_take_screenshot()  // Main image changed

// Test color selector
mcp__playwright__browser_click({ selector: "[data-testid='color-swatch']:nth-child(2)" })
mcp__playwright__browser_take_screenshot()  // Color changed, sizes updated

// Test size selector
mcp__playwright__browser_click({ selector: "[data-testid='size-M']" })
mcp__playwright__browser_take_screenshot()  // Size selected

// Scroll to similar products
mcp__playwright__browser_scroll_down()
mcp__playwright__browser_scroll_down()
mcp__playwright__browser_take_screenshot()  // Similar products section visible
```

**Step 5: Test Responsive - Product Grid**

```javascript
mcp__playwright__browser_navigate({ url: "http://localhost:3000/products" })

mcp__playwright__browser_resize({ width: 375, height: 812 })
mcp__playwright__browser_take_screenshot()  // 2-column grid on mobile

mcp__playwright__browser_resize({ width: 768, height: 1024 })
mcp__playwright__browser_take_screenshot()  // 3-column grid on tablet

mcp__playwright__browser_resize({ width: 1440, height: 900 })
mcp__playwright__browser_take_screenshot()  // 4-column grid on desktop
```

**Step 6: Test Responsive - Product Detail**

```javascript
mcp__playwright__browser_navigate({ url: "http://localhost:3000/products/sample-product" })

mcp__playwright__browser_resize({ width: 375, height: 812 })
mcp__playwright__browser_take_screenshot()  // Stacked layout on mobile (image top, info bottom)

mcp__playwright__browser_resize({ width: 1440, height: 900 })
mcp__playwright__browser_take_screenshot()  // Side-by-side layout on desktop
```

**Step 7: Console Check**

```javascript
mcp__playwright__browser_console_messages()  // Zero errors
```

**Pass Criteria:**
- [ ] Homepage banner carousel auto-slides and clicks work
- [ ] Category grid renders with images, links to category pages
- [ ] Product sections show correct products
- [ ] Filters work: category, size, color, price range
- [ ] Sorting works: newest, price asc/desc, discount
- [ ] Pagination works and preserves filters in URL
- [ ] Category pages show breadcrumb and pre-filtered products
- [ ] Product detail: image gallery, color/size selectors work
- [ ] Unavailable sizes are greyed out
- [ ] Product grid responsive: 2/3/4 columns at breakpoints
- [ ] Product detail responsive: stacked on mobile, side-by-side on desktop
- [ ] No broken images anywhere
- [ ] No console errors

**If any Blocker/High issue found:** Fix it, re-run the gate, then proceed.

---

### Task 14: Cart Functionality

**Files:**
- Create: `src/app/(store)/cart/page.tsx`
- Create: `src/components/store/cart-item.tsx`
- Create: `src/components/store/cart-summary.tsx`
- Create: `src/app/api/cart/route.ts`
- Create: `src/app/api/cart/[itemId]/route.ts`
- Create: `src/hooks/use-cart.ts`
- Create: `src/context/cart-context.tsx`

**Step 1: Build Cart API**

- `GET /api/cart` - Get current user's cart with items, variant details, product images
- `POST /api/cart` - Add item (variantId, quantity). Create cart if doesn't exist.
- `PUT /api/cart/[itemId]` - Update quantity
- `DELETE /api/cart/[itemId]` - Remove item

**Step 2: Build Cart Context**

React context that:
- Tracks cart items count (shown in navbar badge)
- For logged-in users: syncs with DB
- For guests: uses localStorage
- Merges guest cart into DB cart on login

**Step 3: Build Cart Page**

- Cart items list: image, name, variant (size/color), quantity selector (+/-), price, remove button
- Cart summary sidebar: subtotal, shipping (free above ₹399), total, "Proceed to Checkout" button
- Empty cart state with "Continue Shopping" link

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add cart functionality with API, context, and cart page"
```

---

### Task 15: Wishlist

**Files:**
- Create: `src/app/(store)/wishlist/page.tsx`
- Create: `src/app/api/wishlist/route.ts`
- Create: `src/app/api/wishlist/[productId]/route.ts`
- Create: `src/hooks/use-wishlist.ts`

**Step 1: Build Wishlist API**

- `GET /api/wishlist` - Get user's wishlist with product details
- `POST /api/wishlist` - Toggle product in wishlist (add if not exists, remove if exists)

**Step 2: Build Wishlist Page**

Grid of product cards (same as listing) with "Remove" and "Move to Cart" options.

**Step 3: Integrate wishlist heart icon**

Update ProductCard to show filled/empty heart based on wishlist status. Toggle on click (requires auth).

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add wishlist with toggle and wishlist page"
```

---

### Task 16: Checkout & Order Placement

**Files:**
- Create: `src/app/(store)/checkout/page.tsx`
- Create: `src/components/store/address-form.tsx`
- Create: `src/components/store/address-selector.tsx`
- Create: `src/components/store/order-summary.tsx`
- Create: `src/app/api/orders/route.ts`
- Create: `src/app/api/addresses/route.ts`

**Step 1: Build Address API**

- `GET /api/addresses` - List user addresses
- `POST /api/addresses` - Add new address
- `PUT /api/addresses/[id]` - Update address
- `DELETE /api/addresses/[id]` - Delete address

**Step 2: Build Checkout Page**

Multi-step or single page:
1. Address selection (saved addresses + add new form)
2. Order summary (items, quantities, prices)
3. Payment method: "Cash on Delivery" (only option for now, architecture ready for payment gateway)
4. "Place Order" button

**Step 3: Build Order API**

`POST /api/orders` - Creates order from cart:
- Validates stock availability
- Snapshots current prices into OrderItems
- Decrements variant stock
- Clears the cart
- Returns order ID

**Step 4: Build Order Confirmation**

Redirect to `/orders/[id]` after successful placement showing order details and status.

**Step 5: Commit**

```bash
git add .
git commit -m "feat: add checkout flow with address management and order placement"
```

---

### PHASE GATE: Shopping Phase - Playwright Testing

> **MANDATORY:** Do NOT proceed to Task 17 until this gate passes.

**Step 1: Test Add to Cart**

```javascript
// Login first
mcp__playwright__browser_navigate({ url: "http://localhost:3000/login" })
mcp__playwright__browser_type({ selector: "input[name='email']", text: "test@example.com" })
mcp__playwright__browser_type({ selector: "input[name='password']", text: "password123" })
mcp__playwright__browser_click({ selector: "button[type='submit']" })

// Go to a product
mcp__playwright__browser_navigate({ url: "http://localhost:3000/products" })
mcp__playwright__browser_click({ selector: ".product-card:first-child a" })

// Select variant and add to cart
mcp__playwright__browser_click({ selector: "[data-testid='size-M']" })
mcp__playwright__browser_click({ selector: "[data-testid='add-to-cart-btn']" })
mcp__playwright__browser_take_screenshot()  // Toast notification + navbar cart badge updates
```

**Step 2: Test Cart Page**

```javascript
mcp__playwright__browser_navigate({ url: "http://localhost:3000/cart" })
mcp__playwright__browser_take_screenshot()  // Cart with items visible

// Update quantity
mcp__playwright__browser_click({ selector: "[data-testid='quantity-increase']" })
mcp__playwright__browser_take_screenshot()  // Quantity increased, total updated

// Remove item
mcp__playwright__browser_click({ selector: "[data-testid='remove-item']" })
mcp__playwright__browser_take_screenshot()  // Item removed, or empty cart state
```

**Step 3: Test Wishlist**

```javascript
// Add to wishlist from product page
mcp__playwright__browser_navigate({ url: "http://localhost:3000/products" })
mcp__playwright__browser_click({ selector: ".product-card:first-child [data-testid='wishlist-heart']" })
mcp__playwright__browser_take_screenshot()  // Heart filled

// Check wishlist page
mcp__playwright__browser_navigate({ url: "http://localhost:3000/wishlist" })
mcp__playwright__browser_take_screenshot()  // Wishlisted product visible

// Move to cart
mcp__playwright__browser_click({ selector: "[data-testid='move-to-cart']" })
mcp__playwright__browser_take_screenshot()  // Item moved to cart

// Remove from wishlist
mcp__playwright__browser_navigate({ url: "http://localhost:3000/products" })
mcp__playwright__browser_click({ selector: ".product-card:first-child [data-testid='wishlist-heart']" })
mcp__playwright__browser_take_screenshot()  // Heart unfilled (toggled off)
```

**Step 4: Test Checkout Flow**

```javascript
// Ensure cart has items
mcp__playwright__browser_navigate({ url: "http://localhost:3000/products" })
mcp__playwright__browser_click({ selector: ".product-card:first-child a" })
mcp__playwright__browser_click({ selector: "[data-testid='size-M']" })
mcp__playwright__browser_click({ selector: "[data-testid='add-to-cart-btn']" })

// Go to checkout
mcp__playwright__browser_navigate({ url: "http://localhost:3000/cart" })
mcp__playwright__browser_click({ selector: "[data-testid='proceed-to-checkout']" })
mcp__playwright__browser_take_screenshot()  // Checkout page

// Add address
mcp__playwright__browser_click({ selector: "[data-testid='add-new-address']" })
mcp__playwright__browser_type({ selector: "input[name='fullName']", text: "Test User" })
mcp__playwright__browser_type({ selector: "input[name='phone']", text: "9876543210" })
mcp__playwright__browser_type({ selector: "input[name='addressLine1']", text: "123 Test Street" })
mcp__playwright__browser_type({ selector: "input[name='city']", text: "Mumbai" })
mcp__playwright__browser_type({ selector: "input[name='state']", text: "Maharashtra" })
mcp__playwright__browser_type({ selector: "input[name='pincode']", text: "400001" })
mcp__playwright__browser_click({ selector: "button[type='submit']" })
mcp__playwright__browser_take_screenshot()  // Address saved

// Place order
mcp__playwright__browser_click({ selector: "[data-testid='place-order-btn']" })
mcp__playwright__browser_take_screenshot()  // Order confirmation page
```

**Step 5: Test Empty States**

```javascript
// Empty cart
mcp__playwright__browser_navigate({ url: "http://localhost:3000/cart" })
mcp__playwright__browser_take_screenshot()  // Empty cart illustration + "Continue Shopping" link

// Empty wishlist
mcp__playwright__browser_navigate({ url: "http://localhost:3000/wishlist" })
mcp__playwright__browser_take_screenshot()  // Empty wishlist state
```

**Step 6: Test Responsive - Cart & Checkout**

```javascript
mcp__playwright__browser_resize({ width: 375, height: 812 })

mcp__playwright__browser_navigate({ url: "http://localhost:3000/cart" })
mcp__playwright__browser_take_screenshot()  // Cart mobile layout

mcp__playwright__browser_navigate({ url: "http://localhost:3000/checkout" })
mcp__playwright__browser_take_screenshot()  // Checkout mobile layout

mcp__playwright__browser_resize({ width: 1440, height: 900 })
```

**Step 7: Console Check**

```javascript
mcp__playwright__browser_console_messages()  // Zero errors
```

**Pass Criteria:**
- [ ] Add to cart works from product detail page
- [ ] Cart badge in navbar updates
- [ ] Cart page: quantity update, remove item work
- [ ] Cart summary shows correct subtotal, shipping, total
- [ ] Wishlist toggle works (add/remove from heart icon)
- [ ] Wishlist page: shows products, move to cart works
- [ ] Checkout: address form works, address selection works
- [ ] Checkout: order summary is accurate
- [ ] Place order: creates order, clears cart, shows confirmation
- [ ] Empty states render correctly (cart, wishlist)
- [ ] Guest cart in localStorage works (test without login)
- [ ] Responsive at mobile for cart and checkout
- [ ] No console errors

**If any Blocker/High issue found:** Fix it, re-run the gate, then proceed.

---

### Task 17: Order History & Details (Customer)

**Files:**
- Create: `src/app/(store)/orders/page.tsx`
- Create: `src/app/(store)/orders/[id]/page.tsx`
- Create: `src/components/store/order-card.tsx`
- Create: `src/components/store/order-timeline.tsx`

**Step 1: Build Order History Page**

List of user's orders with: order ID, date, status badge, total, item count. Sorted by newest first.

**Step 2: Build Order Detail Page**

- Order status timeline (visual steps: Placed → Confirmed → Shipped → Delivered)
- Delivery address
- Order items with images, names, variants, quantities, prices
- Order total breakdown
- "Cancel Order" button (only if status is PENDING)

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add order history and order detail pages"
```

---

### Task 18: Admin - Order Management

**Files:**
- Create: `src/app/admin/orders/page.tsx`
- Create: `src/app/admin/orders/[id]/page.tsx`
- Create: `src/app/api/admin/orders/route.ts`
- Create: `src/app/api/admin/orders/[id]/route.ts`

**Step 1: Build admin orders API**

- `GET /api/admin/orders` - List all orders with filters (status, date range)
- `PUT /api/admin/orders/[id]` - Update order status, add tracking number

**Step 2: Build admin orders page**

DataTable with columns: Order ID, Customer, Date, Items, Total, Status (badge), Actions.
Filter by status tabs (All, Pending, Confirmed, Shipped, Delivered, Cancelled).

**Step 3: Build order detail page**

Full order details with ability to:
- Update status (dropdown)
- Add tracking number
- View customer info and delivery address

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add admin order management with status updates"
```

---

### Task 19: User Account Page

**Files:**
- Create: `src/app/(store)/account/page.tsx`
- Create: `src/components/store/profile-form.tsx`
- Create: `src/components/store/address-list.tsx`
- Create: `src/app/api/user/profile/route.ts`

**Step 1: Build Profile API**

- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update name, phone, avatar

**Step 2: Build Account Page**

Tabbed layout:
- Profile tab: Edit name, email (read-only), phone, avatar
- Addresses tab: List saved addresses, add/edit/delete, set default
- Orders tab: Link to `/orders`

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add user account page with profile and address management"
```

---

### Task 20: Responsive Polish & Final Touches

**Files:**
- Modify: multiple component files for responsive fixes
- Create: `src/app/(store)/not-found.tsx`
- Create: `src/app/(store)/loading.tsx`

**Step 1: Add loading states**

Add skeleton loading components using shadcn `Skeleton` for:
- Product grid (skeleton cards)
- Product detail page
- Cart page

**Step 2: Add error/empty states**

- 404 page with illustration and "Go Home" button
- Empty states: empty cart, empty wishlist, no orders, no search results

**Step 3: Responsive testing and fixes**

Test all pages at mobile (375px), tablet (768px), desktop (1024px+). Fix any layout issues.

**Step 4: Commit**

```bash
git add .
git commit -m "feat: add loading states, error pages, and responsive polish"
```

---

### Task 21: Database Seed with Full Demo Data

**Files:**
- Modify: `prisma/seed.ts`

**Step 1: Create comprehensive seed**

Seed script that creates:
- 1 admin user, 2 customer users
- 8-10 categories (Men, Women, with subcategories)
- 20-30 products with variants (multiple sizes/colors), images (use placeholder URLs)
- 5 banners
- Sample orders in various statuses

**Step 2: Run seed and verify**

Run: `npx prisma db seed`
Verify: Browse homepage, listing pages, admin dashboard - all populated.

**Step 3: Commit**

```bash
git add .
git commit -m "feat: add comprehensive seed data for demo"
```

---

### PHASE GATE: Orders & Polish Phase - FINAL Playwright Testing

> **MANDATORY:** This is the final quality gate before the MVP is considered complete.

**Step 1: Test Order History**

```javascript
// Login as customer who has placed orders
mcp__playwright__browser_navigate({ url: "http://localhost:3000/login" })
mcp__playwright__browser_type({ selector: "input[name='email']", text: "test@example.com" })
mcp__playwright__browser_type({ selector: "input[name='password']", text: "password123" })
mcp__playwright__browser_click({ selector: "button[type='submit']" })

mcp__playwright__browser_navigate({ url: "http://localhost:3000/orders" })
mcp__playwright__browser_take_screenshot()  // Order list with status badges
```

**Step 2: Test Order Detail & Cancel**

```javascript
mcp__playwright__browser_click({ selector: ".order-card:first-child a" })
mcp__playwright__browser_take_screenshot()  // Order detail with timeline

// Cancel order (if PENDING)
mcp__playwright__browser_click({ selector: "[data-testid='cancel-order-btn']" })
mcp__playwright__browser_take_screenshot()  // Status changed to CANCELLED
```

**Step 3: Test Admin Order Management**

```javascript
// Login as admin
mcp__playwright__browser_navigate({ url: "http://localhost:3000/login" })
mcp__playwright__browser_type({ selector: "input[name='email']", text: "admin@shop.com" })
mcp__playwright__browser_type({ selector: "input[name='password']", text: "admin123" })
mcp__playwright__browser_click({ selector: "button[type='submit']" })

mcp__playwright__browser_navigate({ url: "http://localhost:3000/admin/orders" })
mcp__playwright__browser_take_screenshot()  // Orders table with all orders

// Update order status
mcp__playwright__browser_click({ selector: ".order-row:first-child [data-testid='status-select']" })
mcp__playwright__browser_click({ selector: "[data-value='SHIPPED']" })
mcp__playwright__browser_take_screenshot()  // Status updated
```

**Step 4: Test User Account Page**

```javascript
// Login as customer
mcp__playwright__browser_navigate({ url: "http://localhost:3000/login" })
mcp__playwright__browser_type({ selector: "input[name='email']", text: "test@example.com" })
mcp__playwright__browser_type({ selector: "input[name='password']", text: "password123" })
mcp__playwright__browser_click({ selector: "button[type='submit']" })

mcp__playwright__browser_navigate({ url: "http://localhost:3000/account" })
mcp__playwright__browser_take_screenshot()  // Profile tab

// Edit profile
mcp__playwright__browser_type({ selector: "input[name='phone']", text: "9876543210" })
mcp__playwright__browser_click({ selector: "[data-testid='save-profile']" })
mcp__playwright__browser_take_screenshot()  // Profile updated

// Switch to addresses tab
mcp__playwright__browser_click({ selector: "[data-testid='tab-addresses']" })
mcp__playwright__browser_take_screenshot()  // Addresses list
```

**Step 5: Test Loading & Error States**

```javascript
// 404 page
mcp__playwright__browser_navigate({ url: "http://localhost:3000/nonexistent-page" })
mcp__playwright__browser_take_screenshot()  // Custom 404 page

// Verify skeleton loaders (throttle network if possible)
mcp__playwright__browser_navigate({ url: "http://localhost:3000/products" })
mcp__playwright__browser_take_screenshot()  // Should briefly show skeletons
```

**Step 6: FULL E2E Flow Test**

```javascript
// Complete user journey: Browse → Select → Cart → Checkout → Order

// 1. Homepage
mcp__playwright__browser_resize({ width: 1440, height: 900 })
mcp__playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__playwright__browser_take_screenshot()

// 2. Browse category
mcp__playwright__browser_click({ selector: "[data-testid='category-men']" })
mcp__playwright__browser_take_screenshot()

// 3. Filter products
mcp__playwright__browser_click({ selector: "[data-testid='filter-size-L']" })
mcp__playwright__browser_take_screenshot()

// 4. View product
mcp__playwright__browser_click({ selector: ".product-card:first-child a" })
mcp__playwright__browser_take_screenshot()

// 5. Select variant and add to cart
mcp__playwright__browser_click({ selector: "[data-testid='size-L']" })
mcp__playwright__browser_click({ selector: "[data-testid='add-to-cart-btn']" })
mcp__playwright__browser_take_screenshot()

// 6. Go to cart
mcp__playwright__browser_navigate({ url: "http://localhost:3000/cart" })
mcp__playwright__browser_take_screenshot()

// 7. Proceed to checkout
mcp__playwright__browser_click({ selector: "[data-testid='proceed-to-checkout']" })
mcp__playwright__browser_take_screenshot()

// 8. Select address and place order
mcp__playwright__browser_click({ selector: "[data-testid='address-card']:first-child" })
mcp__playwright__browser_click({ selector: "[data-testid='place-order-btn']" })
mcp__playwright__browser_take_screenshot()  // Order confirmation

// 9. Check order in history
mcp__playwright__browser_navigate({ url: "http://localhost:3000/orders" })
mcp__playwright__browser_take_screenshot()  // New order visible
```

**Step 7: Full Responsive Sweep**

Test every key page at mobile (375px), tablet (768px), desktop (1440px):

```javascript
const pages = [
  "/",
  "/products",
  "/products/sample-product",
  "/cart",
  "/wishlist",
  "/orders",
  "/account",
  "/admin",
  "/admin/products",
  "/admin/orders"
];

// Mobile
mcp__playwright__browser_resize({ width: 375, height: 812 })
// Navigate and screenshot each page

// Tablet
mcp__playwright__browser_resize({ width: 768, height: 1024 })
// Navigate and screenshot each page

// Desktop
mcp__playwright__browser_resize({ width: 1440, height: 900 })
// Navigate and screenshot each page
```

**Step 8: Accessibility Quick Scan**

```javascript
// Check all pages for:
// - Heading hierarchy (h1 → h2 → h3)
// - Image alt text
// - Form labels
// - Focus indicators (Tab through interactive elements)
// - Color contrast on price text, badges, buttons
```

**Step 9: Final Console Check**

```javascript
// Navigate through ALL pages and check console
mcp__playwright__browser_console_messages()  // ZERO errors across entire app
```

**Pass Criteria - FINAL MVP GATE:**
- [ ] Order history shows all user orders with correct statuses
- [ ] Order detail shows timeline, items, address
- [ ] Cancel order works for PENDING orders only
- [ ] Admin can update order status and add tracking
- [ ] Account page: profile edit, address management work
- [ ] Loading skeletons appear during data fetch
- [ ] 404 page renders for invalid routes
- [ ] Full E2E journey works: browse → cart → checkout → order
- [ ] All pages responsive at 375px, 768px, 1440px
- [ ] No horizontal scroll at any breakpoint
- [ ] No broken images
- [ ] No console errors across entire application
- [ ] Keyboard navigation works on all interactive elements
- [ ] Seed data populates correctly across all pages

**If any Blocker/High issue found:** Fix it, re-run the gate. MVP is NOT complete until this passes.

---

## Summary

| Task | Description | Depends On |
|------|-------------|------------|
| 1 | Project Setup & Configuration | - |
| 2 | Database Schema (Prisma) | 1 |
| 3 | Authentication (Auth.js) | 2 |
| 4 | Utilities & Constants | 1 |
| 5 | Navbar, Footer, Layout | 1, 4 |
| 6 | Login & Register Pages | 3, 5 |
| **GATE** | **Foundation Phase - Playwright Test** | **6** |
| 7 | Admin Layout & Dashboard | Gate 1 |
| 8 | Admin Categories CRUD | 7 |
| 9 | Admin Products CRUD | 8 |
| 10 | Admin Banners CRUD | 7 |
| **GATE** | **Admin Phase - Playwright Test** | **10** |
| 11 | Homepage | Gate 2 |
| 12 | Product Listing + Filters | 11 |
| 13 | Product Detail Page | 12 |
| **GATE** | **Storefront Phase - Playwright Test** | **13** |
| 14 | Cart Functionality | Gate 3 |
| 15 | Wishlist | 14 |
| 16 | Checkout & Orders | 15 |
| **GATE** | **Shopping Phase - Playwright Test** | **16** |
| 17 | Order History (Customer) | Gate 4 |
| 18 | Admin Order Management | 17 |
| 19 | User Account Page | 18 |
| 20 | Responsive Polish | 19 |
| 21 | Full Seed Data | 20 |
| **GATE** | **FINAL MVP - Playwright Test** | **21** |

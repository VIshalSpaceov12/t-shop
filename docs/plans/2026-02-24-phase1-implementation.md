# Phase 1: Foundation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add mobile API endpoints to the Next.js backend and create the Flutter project with auth flow, networking, and navigation fully working.

**Architecture:** Two parallel workstreams — (A) Next.js backend gains 8 new API routes + a Bearer token auth helper, (B) Flutter project is created with Riverpod, Dio, GoRouter, Material 3 theme, and a complete login/register flow that talks to the backend. The backend changes are additive only — zero changes to existing web behavior.

**Tech Stack:** Next.js 16 (backend additions), Flutter 3.32.8 / Dart 3.8.1, Riverpod, Dio, Retrofit, GoRouter, freezed, json_serializable, SharedPreferences.

---

## Task 1: Create `getSessionOrBearer()` Auth Helper

**Files:**
- Create: `src/lib/mobile-auth.ts`

**Step 1: Create the mobile auth helper**

This utility verifies a JWT Bearer token from the `Authorization` header. It uses the same `NEXTAUTH_SECRET` that Auth.js uses for signing JWTs, keeping token format consistent.

```ts
// src/lib/mobile-auth.ts
import { NextRequest } from "next/server";
import { prisma } from "./prisma";

interface MobileUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

// Simple JWT helpers using Web Crypto API (Edge-compatible, no node:crypto)
async function createHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function base64UrlEncode(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export async function signMobileJwt(
  payload: Record<string, unknown>,
  expiresInSeconds: number = 7 * 24 * 60 * 60 // 7 days
): Promise<string> {
  const secret = process.env.NEXTAUTH_SECRET!;
  const key = await createHmacKey(secret);
  const enc = new TextEncoder();

  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSeconds };

  const headerB64 = base64UrlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64UrlEncode(enc.encode(JSON.stringify(fullPayload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(signingInput));
  const sigB64 = base64UrlEncode(new Uint8Array(signature));

  return `${signingInput}.${sigB64}`;
}

export async function verifyMobileJwt(token: string): Promise<Record<string, unknown> | null> {
  const secret = process.env.NEXTAUTH_SECRET!;
  const key = await createHmacKey(secret);
  const enc = new TextEncoder();

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, sigB64] = parts;
  const signingInput = `${headerB64}.${payloadB64}`;

  const signature = base64UrlDecode(sigB64);
  const valid = await crypto.subtle.verify("HMAC", key, signature, enc.encode(signingInput));
  if (!valid) return null;

  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));

  // Check expiry
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}

export async function getMobileUser(req: NextRequest): Promise<MobileUser | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);
  const payload = await verifyMobileJwt(token);
  if (!payload?.sub) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.sub as string },
    select: { id: true, email: true, name: true, role: true },
  });

  return user;
}

export async function getSessionOrBearer(req: NextRequest): Promise<{ id: string; role: string } | null> {
  // Try Bearer token first (mobile)
  const mobileUser = await getMobileUser(req);
  if (mobileUser) return { id: mobileUser.id, role: mobileUser.role };

  // Fall back to Auth.js session (web)
  const { auth } = await import("./auth");
  const session = await auth();
  if (session?.user?.id) return { id: session.user.id, role: session.user.role as string };

  return null;
}
```

**Step 2: Verify it compiles**

Run: `cd /Users/sotsys336/Documents/Projects/t-shop && npx tsc --noEmit src/lib/mobile-auth.ts 2>&1 || echo "Type check done"`

Note: Full project type-check may show unrelated warnings. Just verify no errors in this file.

**Step 3: Commit**

```bash
git add src/lib/mobile-auth.ts
git commit -m "feat: add mobile JWT auth helper (getSessionOrBearer)"
```

---

## Task 2: Add Mobile Auth Endpoints (Login, Register, Refresh)

**Files:**
- Create: `src/app/api/mobile/auth/login/route.ts`
- Create: `src/app/api/mobile/auth/register/route.ts`
- Create: `src/app/api/mobile/auth/refresh/route.ts`

**Step 1: Create login endpoint**

```ts
// src/app/api/mobile/auth/login/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";
import { signMobileJwt } from "@/lib/mobile-auth";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await signMobileJwt({ sub: user.id, role: user.role }, 24 * 60 * 60); // 1 day
    const refreshToken = await signMobileJwt({ sub: user.id, type: "refresh" }, 30 * 24 * 60 * 60); // 30 days

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
      refreshToken,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Create register endpoint**

```ts
// src/app/api/mobile/auth/register/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { signMobileJwt } from "@/lib/mobile-auth";
import { z } from "zod";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password } = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({ data: { name, email, passwordHash } });

    const token = await signMobileJwt({ sub: user.id, role: user.role }, 24 * 60 * 60);
    const refreshToken = await signMobileJwt({ sub: user.id, type: "refresh" }, 30 * 24 * 60 * 60);

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
      refreshToken,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 3: Create refresh endpoint**

```ts
// src/app/api/mobile/auth/refresh/route.ts
import { NextResponse } from "next/server";
import { signMobileJwt, verifyMobileJwt } from "@/lib/mobile-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      return NextResponse.json({ error: "Refresh token required" }, { status: 400 });
    }

    const payload = await verifyMobileJwt(refreshToken);
    if (!payload?.sub || payload.type !== "refresh") {
      return NextResponse.json({ error: "Invalid refresh token" }, { status: 401 });
    }

    const token = await signMobileJwt({ sub: payload.sub, role: payload.role }, 24 * 60 * 60);

    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 4: Test with curl**

```bash
# Register
curl -s -X POST http://localhost:3000/api/mobile/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Mobile","email":"mobile@test.com","password":"test123"}' | head -c 200

# Login
curl -s -X POST http://localhost:3000/api/mobile/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"mobile@test.com","password":"test123"}' | head -c 200

# Login with seeded account
curl -s -X POST http://localhost:3000/api/mobile/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@shop.com","password":"password123"}' | head -c 200
```

Expected: JSON responses with `user`, `token`, and `refreshToken` fields.

**Step 5: Commit**

```bash
git add src/app/api/mobile/auth/
git commit -m "feat: add mobile auth endpoints (login, register, refresh)"
```

---

## Task 3: Add Public Mobile Product Endpoints

**Files:**
- Create: `src/app/api/mobile/products/route.ts`
- Create: `src/app/api/mobile/products/[slug]/route.ts`

**Step 1: Create product listing endpoint**

Mirrors the query logic from `src/app/(store)/products/page.tsx` but as a REST API.

```ts
// src/app/api/mobile/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PRODUCTS_PER_PAGE } from "@/lib/constants";
import { Prisma } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || String(PRODUCTS_PER_PAGE));
    const search = searchParams.get("search") || "";
    const gender = searchParams.get("gender") || "";
    const category = searchParams.get("category") || "";
    const sort = searchParams.get("sort") || "newest";
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = { status: "ACTIVE" };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { brand: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    if (gender) {
      where.gender = gender as Prisma.EnumGenderFilter;
    }

    if (category) {
      const slugs = category.split(",");
      where.category = { slug: { in: slugs } };
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput;
    switch (sort) {
      case "price_asc":
        orderBy = { sellingPrice: "asc" };
        break;
      case "price_desc":
        orderBy = { sellingPrice: "desc" };
        break;
      case "discount":
        orderBy = { discount: "desc" };
        break;
      default:
        orderBy = { createdAt: "desc" };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 2 },
          category: { select: { name: true, slug: true } },
        },
      }),
      prisma.product.count({ where }),
    ]);

    return NextResponse.json({
      products,
      total,
      pages: Math.ceil(total / limit),
      page,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Create product detail endpoint**

```ts
// src/app/api/mobile/products/[slug]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMobileUser } from "@/lib/mobile-auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: {
          select: {
            name: true,
            slug: true,
            parent: { select: { name: true, slug: true } },
          },
        },
        variants: { orderBy: [{ color: "asc" }, { size: "asc" }] },
        images: { orderBy: { sortOrder: "asc" } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check wishlist status if authenticated
    let isWishlisted = false;
    const mobileUser = await getMobileUser(request);
    if (mobileUser) {
      const wishlistItem = await prisma.wishlist.findUnique({
        where: { userId_productId: { userId: mobileUser.id, productId: product.id } },
      });
      isWishlisted = !!wishlistItem;
    }

    // Similar products
    const similarProducts = await prisma.product.findMany({
      where: { status: "ACTIVE", categoryId: product.categoryId, NOT: { id: product.id } },
      take: 4,
      include: { images: { orderBy: { sortOrder: "asc" }, take: 2 } },
    });

    return NextResponse.json({ product, isWishlisted, similarProducts });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 3: Test with curl**

```bash
# Product listing
curl -s http://localhost:3000/api/mobile/products | python3 -m json.tool | head -30

# Product listing with filters
curl -s "http://localhost:3000/api/mobile/products?gender=MEN&sort=price_asc" | python3 -m json.tool | head -20

# Product detail
curl -s http://localhost:3000/api/mobile/products/anime-oversized-tee | python3 -m json.tool | head -30
```

Expected: JSON with products array, pagination info, and full product detail respectively.

**Step 4: Commit**

```bash
git add src/app/api/mobile/products/
git commit -m "feat: add mobile product listing and detail endpoints"
```

---

## Task 4: Add Public Mobile Categories and Banners Endpoints

**Files:**
- Create: `src/app/api/mobile/categories/route.ts`
- Create: `src/app/api/mobile/banners/route.ts`

**Step 1: Create categories endpoint**

```ts
// src/app/api/mobile/categories/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      where: { parentId: { not: null } },
      orderBy: { name: "asc" },
      include: {
        parent: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true } },
      },
    });

    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Create banners endpoint**

```ts
// src/app/api/mobile/banners/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const banners = await prisma.banner.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, title: true, image: true, link: true, position: true },
    });

    return NextResponse.json({ banners });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 3: Test with curl**

```bash
curl -s http://localhost:3000/api/mobile/categories | python3 -m json.tool | head -20
curl -s http://localhost:3000/api/mobile/banners | python3 -m json.tool | head -20
```

**Step 4: Commit**

```bash
git add src/app/api/mobile/categories/ src/app/api/mobile/banners/
git commit -m "feat: add mobile categories and banners endpoints"
```

---

## Task 5: Add Mobile Cancel Order Endpoint

**Files:**
- Create: `src/app/api/mobile/orders/[id]/cancel/route.ts`

**Step 1: Create cancel order endpoint**

Mirrors the server action in `src/app/(store)/orders/[id]/actions.ts` but as REST.

```ts
// src/app/api/mobile/orders/[id]/cancel/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionOrBearer } from "@/lib/mobile-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSessionOrBearer(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: orderId } = await params;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, userId: true, status: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (order.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending orders can be cancelled" },
        { status: 400 }
      );
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

**Step 2: Test with curl**

```bash
# Get a token first
TOKEN=$(curl -s -X POST http://localhost:3000/api/mobile/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@shop.com","password":"password123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "Token: ${TOKEN:0:20}..."

# Try cancel (will need a valid order ID from the seeded data)
```

**Step 3: Commit**

```bash
git add src/app/api/mobile/orders/
git commit -m "feat: add mobile cancel order endpoint"
```

---

## Task 6: Update Existing Protected Routes to Accept Bearer Tokens

**Files:**
- Modify: `src/app/api/cart/route.ts`
- Modify: `src/app/api/cart/[itemId]/route.ts`
- Modify: `src/app/api/wishlist/route.ts`
- Modify: `src/app/api/checkout/route.ts`
- Modify: `src/app/api/account/route.ts`
- Modify: `src/app/api/addresses/route.ts`
- Modify: `src/app/api/addresses/[id]/route.ts`
- Modify: `src/app/api/upload/route.ts`
- Modify: `src/app/api/admin/products/route.ts`
- Modify: `src/app/api/admin/products/[id]/route.ts`
- Modify: `src/app/api/admin/categories/route.ts`
- Modify: `src/app/api/admin/categories/[id]/route.ts`
- Modify: `src/app/api/admin/banners/route.ts`
- Modify: `src/app/api/admin/banners/[id]/route.ts`
- Modify: `src/app/api/admin/orders/route.ts`
- Modify: `src/app/api/admin/orders/[id]/route.ts`

**The Pattern:** In each file, replace the auth check:

```ts
// BEFORE
import { auth } from "@/lib/auth";
// ... inside handler:
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
// Then uses: session.user.id, session.user.role
```

```ts
// AFTER
import { getSessionOrBearer } from "@/lib/mobile-auth";
// ... inside handler (needs request parameter):
const user = await getSessionOrBearer(request);
if (!user) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
// Then uses: user.id, user.role
```

**Important:** Some handlers use `GET()` without a `request` parameter (e.g., `cart/route.ts GET`, `account/route.ts GET`). These need the parameter added: `GET(request: NextRequest)`.

**For admin routes**, also update the role check from `session.user.role !== "ADMIN"` to `user.role !== "ADMIN"`.

**Step 1: Update all files** following the pattern above. Each file needs:
1. Replace `import { auth } from "@/lib/auth"` with `import { getSessionOrBearer } from "@/lib/mobile-auth"`
2. Add `import { NextRequest } from "next/server"` if not already imported
3. Add `request: NextRequest` parameter to handler if missing
4. Replace `const session = await auth()` with `const user = await getSessionOrBearer(request)`
5. Replace `session?.user?.id` / `session.user.id` with `user?.id` / `user.id`
6. Replace `session.user.role` with `user.role` (admin routes)

**Step 2: Test existing web app still works**

Navigate to `http://localhost:3000` in browser, login as customer, add to cart, check wishlist — everything should work identically (falls back to cookie session).

**Step 3: Test Bearer token works**

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/mobile/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"customer@shop.com","password":"password123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

# Cart
curl -s http://localhost:3000/api/cart -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -10

# Account
curl -s http://localhost:3000/api/account -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Wishlist
curl -s http://localhost:3000/api/wishlist -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -10

# Admin (should fail - customer role)
curl -s http://localhost:3000/api/admin/products -H "Authorization: Bearer $TOKEN"
```

**Step 4: Commit**

```bash
git add src/app/api/
git commit -m "feat: add Bearer token support to all protected API routes"
```

---

## Task 7: Create Flutter Project and Configure Android Build

**Step 1: Create Flutter project**

```bash
cd /Users/sotsys336/Documents/Projects
flutter create --org com.tshop --project-name tshop_mobile tshop_mobile
cd tshop_mobile
```

**Step 2: Configure Android NDK and Gradle**

Modify `android/app/build.gradle.kts` — set `ndkVersion`:

```kotlin
android {
    namespace = "com.tshop.tshop_mobile"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = "27.1.12297006"
    // ... rest stays the same
}
```

Modify `android/gradle/wrapper/gradle-wrapper.properties` — set Gradle version:

```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.14.3-bin.zip
```

**Step 3: Verify it builds**

```bash
flutter pub get
flutter analyze
```

Expected: No errors.

**Step 4: Commit**

```bash
cd /Users/sotsys336/Documents/Projects/tshop_mobile
git init
git add .
git commit -m "feat: init Flutter project with Android NDK 27.1.12297006 and Gradle 8.14.3"
```

---

## Task 8: Add Flutter Dependencies

**Step 1: Add all Phase 1 dependencies to `pubspec.yaml`**

```yaml
dependencies:
  flutter:
    sdk: flutter
  # State management
  flutter_riverpod: ^2.6.1
  riverpod_annotation: ^2.6.1
  # Networking
  dio: ^5.7.0
  retrofit: ^4.4.1
  # Navigation
  go_router: ^14.8.1
  # Local storage
  shared_preferences: ^2.5.3
  # Models
  freezed_annotation: ^2.4.4
  json_annotation: ^4.9.0
  # UI
  cached_network_image: ^3.4.1
  google_fonts: ^6.2.1

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^5.0.0
  # Code generation
  build_runner: ^2.4.13
  freezed: ^2.5.7
  json_serializable: ^6.9.0
  retrofit_generator: ^9.1.7
  riverpod_generator: ^2.6.3
  custom_lint: ^0.7.0
  riverpod_lint: ^2.6.3
```

**Step 2: Install**

```bash
flutter pub get
```

**Step 3: Commit**

```bash
git add pubspec.yaml pubspec.lock
git commit -m "feat: add core dependencies (riverpod, dio, go_router, freezed)"
```

---

## Task 9: Create Core Layer (Config, Theme, Constants)

**Files:**
- Create: `lib/core/config.dart`
- Create: `lib/core/constants.dart`
- Create: `lib/core/theme.dart`

**Step 1: Create app config**

```dart
// lib/core/config.dart
class AppConfig {
  static const String baseUrl = 'http://10.0.2.2:3000'; // Android emulator -> host
  static const String baseUrlIos = 'http://localhost:3000'; // iOS simulator
  static const String baseImageUrl = baseUrl;

  static String get apiUrl {
    // For real devices, replace with your machine's IP
    return baseUrl;
  }
}
```

**Step 2: Create constants**

```dart
// lib/core/constants.dart
class AppConstants {
  static const int productsPerPage = 12;

  static const List<String> sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];

  static const List<Map<String, String>> genders = [
    {'label': 'Men', 'value': 'MEN'},
    {'label': 'Women', 'value': 'WOMEN'},
    {'label': 'Unisex', 'value': 'UNISEX'},
  ];

  static const List<Map<String, String>> sortOptions = [
    {'label': 'Newest', 'value': 'newest'},
    {'label': 'Price: Low to High', 'value': 'price_asc'},
    {'label': 'Price: High to Low', 'value': 'price_desc'},
    {'label': 'Discount', 'value': 'discount'},
  ];

  static const List<Map<String, String>> orderStatuses = [
    {'label': 'Pending', 'value': 'PENDING'},
    {'label': 'Confirmed', 'value': 'CONFIRMED'},
    {'label': 'Shipped', 'value': 'SHIPPED'},
    {'label': 'Delivered', 'value': 'DELIVERED'},
    {'label': 'Cancelled', 'value': 'CANCELLED'},
  ];
}
```

**Step 3: Create Material 3 theme**

```dart
// lib/core/theme.dart
import 'package:flutter/material.dart';

class AppTheme {
  // Brand colors (from web SHOP. identity)
  static const Color primaryYellow = Color(0xFFFFD232);
  static const Color darkText = Color(0xFF1A1A1A);
  static const Color mutedText = Color(0xFF6B7280);
  static const Color background = Color(0xFFFAFAFA);
  static const Color surface = Colors.white;
  static const Color error = Color(0xFFDC2626);
  static const Color success = Color(0xFF16A34A);

  static ThemeData get lightTheme {
    final colorScheme = ColorScheme.fromSeed(
      seedColor: primaryYellow,
      brightness: Brightness.light,
      surface: surface,
      error: error,
    );

    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: background,
      appBarTheme: const AppBarTheme(
        backgroundColor: surface,
        foregroundColor: darkText,
        elevation: 0,
        scrolledUnderElevation: 1,
        centerTitle: false,
        titleTextStyle: TextStyle(
          color: darkText,
          fontSize: 20,
          fontWeight: FontWeight.w700,
        ),
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: BorderSide(color: Colors.grey.shade200),
        ),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: darkText,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: darkText,
          minimumSize: const Size(double.infinity, 52),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          side: BorderSide(color: Colors.grey.shade300),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.grey.shade50,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey.shade300),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.grey.shade300),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: darkText, width: 2),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      ),
      bottomNavigationBarTheme: const BottomNavigationBarThemeData(
        backgroundColor: surface,
        selectedItemColor: darkText,
        unselectedItemColor: mutedText,
        type: BottomNavigationBarType.fixed,
        elevation: 8,
      ),
      chipTheme: ChipThemeData(
        backgroundColor: Colors.grey.shade100,
        selectedColor: primaryYellow,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      ),
      dividerTheme: DividerThemeData(color: Colors.grey.shade200, thickness: 1),
    );
  }
}
```

**Step 4: Verify**

```bash
flutter analyze
```

**Step 5: Commit**

```bash
git add lib/core/
git commit -m "feat: add core config, constants, and Material 3 theme"
```

---

## Task 10: Create Dio Network Client with Auth Interceptor

**Files:**
- Create: `lib/core/network/dio_client.dart`
- Create: `lib/core/network/auth_interceptor.dart`
- Create: `lib/core/network/token_storage.dart`

**Step 1: Create token storage**

```dart
// lib/core/network/token_storage.dart
import 'package:shared_preferences/shared_preferences.dart';

class TokenStorage {
  static const _tokenKey = 'auth_token';
  static const _refreshTokenKey = 'auth_refresh_token';

  final SharedPreferences _prefs;

  TokenStorage(this._prefs);

  String? get token => _prefs.getString(_tokenKey);
  String? get refreshToken => _prefs.getString(_refreshTokenKey);

  Future<void> saveTokens({required String token, required String refreshToken}) async {
    await _prefs.setString(_tokenKey, token);
    await _prefs.setString(_refreshTokenKey, refreshToken);
  }

  Future<void> saveToken(String token) async {
    await _prefs.setString(_tokenKey, token);
  }

  Future<void> clear() async {
    await _prefs.remove(_tokenKey);
    await _prefs.remove(_refreshTokenKey);
  }

  bool get hasToken => token != null;
}
```

**Step 2: Create auth interceptor**

```dart
// lib/core/network/auth_interceptor.dart
import 'package:dio/dio.dart';
import 'token_storage.dart';

class AuthInterceptor extends Interceptor {
  final TokenStorage _tokenStorage;
  final Dio _dio; // Separate Dio instance for refresh to avoid interceptor loop

  AuthInterceptor(this._tokenStorage, this._dio);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = _tokenStorage.token;
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401 && _tokenStorage.refreshToken != null) {
      try {
        final response = await _dio.post(
          '/api/mobile/auth/refresh',
          data: {'refreshToken': _tokenStorage.refreshToken},
        );

        final newToken = response.data['token'] as String;
        await _tokenStorage.saveToken(newToken);

        // Retry the original request with the new token
        final options = err.requestOptions;
        options.headers['Authorization'] = 'Bearer $newToken';
        final retryResponse = await _dio.fetch(options);
        return handler.resolve(retryResponse);
      } catch (_) {
        // Refresh failed — clear tokens
        await _tokenStorage.clear();
      }
    }
    handler.next(err);
  }
}
```

**Step 3: Create Dio client**

```dart
// lib/core/network/dio_client.dart
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../config.dart';
import 'auth_interceptor.dart';
import 'token_storage.dart';

class DioClient {
  late final Dio dio;
  late final Dio _refreshDio; // Separate instance for token refresh

  DioClient(TokenStorage tokenStorage) {
    _refreshDio = Dio(BaseOptions(
      baseUrl: AppConfig.apiUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ));

    dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
      headers: {'Content-Type': 'application/json'},
    ));

    dio.interceptors.add(AuthInterceptor(tokenStorage, _refreshDio));

    if (kDebugMode) {
      dio.interceptors.add(LogInterceptor(
        requestBody: true,
        responseBody: true,
        logPrint: (obj) => debugPrint(obj.toString()),
      ));
    }
  }
}
```

**Step 4: Verify**

```bash
flutter analyze
```

**Step 5: Commit**

```bash
git add lib/core/network/
git commit -m "feat: add Dio client with auth interceptor and token storage"
```

---

## Task 11: Create Auth Models and Repository

**Files:**
- Create: `lib/models/user.dart`
- Create: `lib/repositories/auth_repository.dart`

**Step 1: Create user model**

```dart
// lib/models/user.dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'user.freezed.dart';
part 'user.g.dart';

@freezed
abstract class User with _$User {
  const factory User({
    required String id,
    String? name,
    required String email,
    required String role,
    String? phone,
    DateTime? createdAt,
  }) = _User;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
}

@freezed
abstract class AuthResponse with _$AuthResponse {
  const factory AuthResponse({
    required User user,
    required String token,
    required String refreshToken,
  }) = _AuthResponse;

  factory AuthResponse.fromJson(Map<String, dynamic> json) => _$AuthResponseFromJson(json);
}
```

**Step 2: Create auth repository**

```dart
// lib/repositories/auth_repository.dart
import 'package:dio/dio.dart';
import '../models/user.dart';

class AuthRepository {
  final Dio _dio;

  AuthRepository(this._dio);

  Future<AuthResponse> login({required String email, required String password}) async {
    final response = await _dio.post('/api/mobile/auth/login', data: {
      'email': email,
      'password': password,
    });
    return AuthResponse.fromJson(response.data);
  }

  Future<AuthResponse> register({
    required String name,
    required String email,
    required String password,
  }) async {
    final response = await _dio.post('/api/mobile/auth/register', data: {
      'name': name,
      'email': email,
      'password': password,
    });
    return AuthResponse.fromJson(response.data);
  }

  Future<User> getAccount() async {
    final response = await _dio.get('/api/account');
    return User.fromJson(response.data);
  }
}
```

**Step 3: Run code generation**

```bash
dart run build_runner build --delete-conflicting-outputs
```

Expected: Generates `user.freezed.dart` and `user.g.dart`.

**Step 4: Verify**

```bash
flutter analyze
```

**Step 5: Commit**

```bash
git add lib/models/ lib/repositories/auth_repository.dart
git commit -m "feat: add User model and auth repository"
```

---

## Task 12: Create Auth Provider (Riverpod)

**Files:**
- Create: `lib/providers/core_providers.dart`
- Create: `lib/providers/auth_provider.dart`

**Step 1: Create core providers (SharedPreferences, TokenStorage, Dio, etc.)**

```dart
// lib/providers/core_providers.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../core/network/dio_client.dart';
import '../core/network/token_storage.dart';
import '../repositories/auth_repository.dart';

// SharedPreferences — initialized in main.dart before runApp
final sharedPreferencesProvider = Provider<SharedPreferences>((ref) {
  throw UnimplementedError('Must be overridden in ProviderScope');
});

final tokenStorageProvider = Provider<TokenStorage>((ref) {
  return TokenStorage(ref.watch(sharedPreferencesProvider));
});

final dioClientProvider = Provider<DioClient>((ref) {
  return DioClient(ref.watch(tokenStorageProvider));
});

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(ref.watch(dioClientProvider).dio);
});
```

**Step 2: Create auth provider**

```dart
// lib/providers/auth_provider.dart
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/user.dart';
import 'core_providers.dart';

enum AuthStatus { initial, authenticated, unauthenticated, loading }

class AuthState {
  final AuthStatus status;
  final User? user;
  final String? error;

  const AuthState({
    this.status = AuthStatus.initial,
    this.user,
    this.error,
  });

  AuthState copyWith({AuthStatus? status, User? user, String? error}) {
    return AuthState(
      status: status ?? this.status,
      user: user ?? this.user,
      error: error,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final Ref _ref;

  AuthNotifier(this._ref) : super(const AuthState()) {
    _tryRestoreSession();
  }

  Future<void> _tryRestoreSession() async {
    final tokenStorage = _ref.read(tokenStorageProvider);
    if (!tokenStorage.hasToken) {
      state = const AuthState(status: AuthStatus.unauthenticated);
      return;
    }

    try {
      final authRepo = _ref.read(authRepositoryProvider);
      final user = await authRepo.getAccount();
      state = AuthState(status: AuthStatus.authenticated, user: user);
    } catch (_) {
      await tokenStorage.clear();
      state = const AuthState(status: AuthStatus.unauthenticated);
    }
  }

  Future<void> login({required String email, required String password}) async {
    state = state.copyWith(status: AuthStatus.loading, error: null);
    try {
      final authRepo = _ref.read(authRepositoryProvider);
      final tokenStorage = _ref.read(tokenStorageProvider);

      final authResponse = await authRepo.login(email: email, password: password);
      await tokenStorage.saveTokens(
        token: authResponse.token,
        refreshToken: authResponse.refreshToken,
      );

      state = AuthState(status: AuthStatus.authenticated, user: authResponse.user);
    } on DioException catch (e) {
      final message = e.response?.data?['error'] ?? 'Login failed';
      state = state.copyWith(status: AuthStatus.unauthenticated, error: message);
    }
  }

  Future<void> register({
    required String name,
    required String email,
    required String password,
  }) async {
    state = state.copyWith(status: AuthStatus.loading, error: null);
    try {
      final authRepo = _ref.read(authRepositoryProvider);
      final tokenStorage = _ref.read(tokenStorageProvider);

      final authResponse = await authRepo.register(
        name: name,
        email: email,
        password: password,
      );
      await tokenStorage.saveTokens(
        token: authResponse.token,
        refreshToken: authResponse.refreshToken,
      );

      state = AuthState(status: AuthStatus.authenticated, user: authResponse.user);
    } on DioException catch (e) {
      final message = e.response?.data?['error'] ?? 'Registration failed';
      state = state.copyWith(status: AuthStatus.unauthenticated, error: message);
    }
  }

  Future<void> logout() async {
    final tokenStorage = _ref.read(tokenStorageProvider);
    await tokenStorage.clear();
    state = const AuthState(status: AuthStatus.unauthenticated);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref);
});
```

**Step 3: Verify**

```bash
flutter analyze
```

**Step 4: Commit**

```bash
git add lib/providers/
git commit -m "feat: add auth provider with login, register, logout, session restore"
```

---

## Task 13: Create GoRouter with Auth Guards

**Files:**
- Create: `lib/core/router.dart`

**Step 1: Create router**

```dart
// lib/core/router.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../screens/auth/login_screen.dart';
import '../screens/auth/register_screen.dart';
import '../screens/home/home_screen.dart';

final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authProvider);

  return GoRouter(
    initialLocation: '/',
    redirect: (context, state) {
      final isLoggedIn = authState.status == AuthStatus.authenticated;
      final isLoading = authState.status == AuthStatus.initial ||
          authState.status == AuthStatus.loading;
      final isAuthRoute = state.matchedLocation == '/login' ||
          state.matchedLocation == '/register';

      // Still loading — don't redirect
      if (isLoading) return null;

      // On auth page but already logged in — go home
      if (isAuthRoute && isLoggedIn) return '/';

      // Protected routes
      final protectedPrefixes = ['/cart', '/wishlist', '/checkout', '/orders', '/account'];
      final isProtected = protectedPrefixes.any((p) => state.matchedLocation.startsWith(p));

      if (isProtected && !isLoggedIn) return '/login';

      // Admin routes
      if (state.matchedLocation.startsWith('/admin')) {
        if (!isLoggedIn) return '/login';
        if (authState.user?.role != 'ADMIN') return '/';
      }

      return null;
    },
    routes: [
      GoRoute(path: '/', builder: (_, __) => const HomeScreen()),
      GoRoute(path: '/login', builder: (_, __) => const LoginScreen()),
      GoRoute(path: '/register', builder: (_, __) => const RegisterScreen()),
      // Placeholder routes — will be replaced in Phase 2-5
      GoRoute(path: '/cart', builder: (_, __) => const _PlaceholderScreen(title: 'Cart')),
      GoRoute(path: '/wishlist', builder: (_, __) => const _PlaceholderScreen(title: 'Wishlist')),
      GoRoute(path: '/checkout', builder: (_, __) => const _PlaceholderScreen(title: 'Checkout')),
      GoRoute(path: '/orders', builder: (_, __) => const _PlaceholderScreen(title: 'Orders')),
      GoRoute(path: '/account', builder: (_, __) => const _PlaceholderScreen(title: 'Account')),
      GoRoute(path: '/products', builder: (_, __) => const _PlaceholderScreen(title: 'Products')),
      GoRoute(path: '/products/:slug', builder: (_, state) => _PlaceholderScreen(title: 'Product: ${state.pathParameters['slug']}')),
      GoRoute(path: '/admin', builder: (_, __) => const _PlaceholderScreen(title: 'Admin')),
    ],
  );
});

class _PlaceholderScreen extends StatelessWidget {
  final String title;
  const _PlaceholderScreen({required this.title});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(child: Text('$title — Coming soon')),
    );
  }
}
```

**Step 2: Verify**

```bash
flutter analyze
```

**Step 3: Commit**

```bash
git add lib/core/router.dart
git commit -m "feat: add GoRouter with auth guards and placeholder routes"
```

---

## Task 14: Create Login and Register Screens

**Files:**
- Create: `lib/screens/auth/login_screen.dart`
- Create: `lib/screens/auth/register_screen.dart`

**Step 1: Create login screen**

```dart
// lib/screens/auth/login_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    await ref.read(authProvider.notifier).login(
      email: _emailController.text.trim(),
      password: _passwordController.text,
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final isLoading = authState.status == AuthStatus.loading;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 48),
                Text(
                  'SHOP.',
                  style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                    fontWeight: FontWeight.w900,
                    letterSpacing: -1,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Welcome back',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Sign in to your account to continue',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 40),
                if (authState.error != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.red.shade200),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.error_outline, color: Colors.red.shade700, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            authState.error!,
                            style: TextStyle(color: Colors.red.shade700, fontSize: 14),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    hintText: 'you@example.com',
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) return 'Email is required';
                    if (!value.contains('@')) return 'Invalid email address';
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  textInputAction: TextInputAction.done,
                  onFieldSubmitted: (_) => _handleLogin(),
                  decoration: InputDecoration(
                    labelText: 'Password',
                    prefixIcon: const Icon(Icons.lock_outlined),
                    suffixIcon: IconButton(
                      icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility),
                      onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) return 'Password is required';
                    return null;
                  },
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: isLoading ? null : _handleLogin,
                  child: isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Sign In'),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      "Don't have an account? ",
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                    GestureDetector(
                      onTap: () => context.go('/register'),
                      child: const Text(
                        'Sign Up',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
```

**Step 2: Create register screen**

```dart
// lib/screens/auth/register_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;

    await ref.read(authProvider.notifier).register(
      name: _nameController.text.trim(),
      email: _emailController.text.trim(),
      password: _passwordController.text,
    );
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final isLoading = authState.status == AuthStatus.loading;

    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SizedBox(height: 48),
                Text(
                  'SHOP.',
                  style: Theme.of(context).textTheme.headlineLarge?.copyWith(
                    fontWeight: FontWeight.w900,
                    letterSpacing: -1,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Create account',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  'Sign up to start shopping',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey.shade600,
                  ),
                ),
                const SizedBox(height: 40),
                if (authState.error != null) ...[
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.red.shade50,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.red.shade200),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.error_outline, color: Colors.red.shade700, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            authState.error!,
                            style: TextStyle(color: Colors.red.shade700, fontSize: 14),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
                TextFormField(
                  controller: _nameController,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Full Name',
                    hintText: 'John Doe',
                    prefixIcon: Icon(Icons.person_outlined),
                  ),
                  validator: (value) {
                    if (value == null || value.length < 2) return 'Name must be at least 2 characters';
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _emailController,
                  keyboardType: TextInputType.emailAddress,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: 'Email',
                    hintText: 'you@example.com',
                    prefixIcon: Icon(Icons.email_outlined),
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) return 'Email is required';
                    if (!value.contains('@')) return 'Invalid email address';
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _passwordController,
                  obscureText: _obscurePassword,
                  textInputAction: TextInputAction.done,
                  onFieldSubmitted: (_) => _handleRegister(),
                  decoration: InputDecoration(
                    labelText: 'Password',
                    prefixIcon: const Icon(Icons.lock_outlined),
                    suffixIcon: IconButton(
                      icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility),
                      onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                    ),
                  ),
                  validator: (value) {
                    if (value == null || value.length < 6) return 'Password must be at least 6 characters';
                    return null;
                  },
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: isLoading ? null : _handleRegister,
                  child: isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Text('Create Account'),
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Already have an account? ',
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                    GestureDetector(
                      onTap: () => context.go('/login'),
                      child: const Text(
                        'Sign In',
                        style: TextStyle(fontWeight: FontWeight.w700),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
```

**Step 3: Verify**

```bash
flutter analyze
```

**Step 4: Commit**

```bash
git add lib/screens/auth/
git commit -m "feat: add login and register screens"
```

---

## Task 15: Create Home Screen Placeholder and App Entry Point

**Files:**
- Create: `lib/screens/home/home_screen.dart`
- Modify: `lib/main.dart`
- Create: `lib/app.dart`

**Step 1: Create placeholder home screen**

```dart
// lib/screens/home/home_screen.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../providers/auth_provider.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final isLoggedIn = authState.status == AuthStatus.authenticated;

    return Scaffold(
      appBar: AppBar(
        title: Text.rich(
          TextSpan(
            children: [
              const TextSpan(
                text: 'SHOP',
                style: TextStyle(fontWeight: FontWeight.w900),
              ),
              TextSpan(
                text: '.',
                style: TextStyle(
                  fontWeight: FontWeight.w900,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
            ],
          ),
        ),
        actions: [
          if (isLoggedIn) ...[
            IconButton(
              icon: const Icon(Icons.person_outline),
              onPressed: () => context.push('/account'),
            ),
            IconButton(
              icon: const Icon(Icons.logout),
              onPressed: () => ref.read(authProvider.notifier).logout(),
            ),
          ] else
            TextButton(
              onPressed: () => context.push('/login'),
              child: const Text('Login'),
            ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.store, size: 80, color: Colors.grey.shade300),
            const SizedBox(height: 16),
            Text(
              'Home Screen',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            Text(
              isLoggedIn
                  ? 'Welcome, ${authState.user?.name ?? "User"}!'
                  : 'Browse as guest or sign in',
              style: TextStyle(color: Colors.grey.shade600),
            ),
            const SizedBox(height: 24),
            if (isLoggedIn && authState.user?.role == 'ADMIN')
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: OutlinedButton.icon(
                  onPressed: () => context.push('/admin'),
                  icon: const Icon(Icons.admin_panel_settings),
                  label: const Text('Admin Panel'),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
```

**Step 2: Create app widget**

```dart
// lib/app.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'core/router.dart';
import 'core/theme.dart';

class TShopApp extends ConsumerWidget {
  const TShopApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'SHOP.',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      routerConfig: router,
    );
  }
}
```

**Step 3: Update main.dart**

```dart
// lib/main.dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'app.dart';
import 'providers/core_providers.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();

  runApp(
    ProviderScope(
      overrides: [
        sharedPreferencesProvider.overrideWithValue(prefs),
      ],
      child: const TShopApp(),
    ),
  );
}
```

**Step 4: Verify full app compiles and runs**

```bash
flutter analyze
flutter run -d chrome  # Quick web test, or use emulator/device
```

**Step 5: Commit**

```bash
git add lib/main.dart lib/app.dart lib/screens/home/
git commit -m "feat: add app entry point, home screen, and wired up router"
```

---

## Task 16: End-to-End Auth Flow Test

**Step 1: Start Next.js dev server** (if not running)

```bash
cd /Users/sotsys336/Documents/Projects/t-shop && npm run dev
```

**Step 2: Run Flutter app on a simulator/device**

```bash
cd /Users/sotsys336/Documents/Projects/tshop_mobile
flutter run
```

**Step 3: Manual test checklist**

- [ ] App launches and shows Home Screen
- [ ] Tap "Login" — navigates to login screen
- [ ] Enter `customer@shop.com` / `password123` — logs in, returns to home, shows "Welcome, Customer!"
- [ ] Tap logout — returns to guest home
- [ ] Tap "Login" → tap "Sign Up" link — navigates to register screen
- [ ] Register new account — logs in automatically, returns to home
- [ ] Kill and relaunch app — session is restored (auto-login from stored token)
- [ ] Login with `admin@shop.com` / `admin123` — shows "Admin Panel" button on home

**Step 4: Fix any issues found**

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: Phase 1 complete — backend mobile API + Flutter auth flow"
```

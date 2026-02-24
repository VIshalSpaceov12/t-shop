# SHOP. Flutter Mobile App — Design Document

**Date:** 2026-02-24
**Status:** Approved
**Scope:** Full customer + admin mobile app for the SHOP. e-commerce platform

---

## 1. Overview

A native-first Flutter mobile app (Android + iOS) that provides the complete SHOP. e-commerce experience — product browsing, cart, wishlist, checkout, order management, and a full admin panel. Consumes the existing Next.js backend via REST APIs with Bearer token authentication.

### Goals

- Feature parity with the web app for both customer and admin flows
- Native Material 3 design with SHOP. brand identity
- Offline-aware with cached data fallback
- Zero breaking changes to the existing web application

### Non-Goals

- Payment gateway integration (COD only, matching web)
- Push notifications (future scope)
- OAuth/social login (future scope)

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Flutter 3.x / Dart 3.x | Cross-platform, single codebase |
| State Management | Riverpod + riverpod_generator | Compile-safe, great caching, code-gen reduces boilerplate |
| Networking | Dio + Retrofit | Type-safe API client with interceptors for auth |
| Navigation | GoRouter | Declarative routing, deep-link ready, redirect guards |
| Local Storage | SharedPreferences (tokens), Hive (offline cache) | Lightweight, performant |
| Image Caching | cached_network_image | Standard Flutter image caching with placeholders |
| Models | freezed + json_serializable | Immutable data classes with JSON code-gen |
| Forms | flutter_form_builder | Reduces form boilerplate |
| UI | Material 3 with custom theme | Native-first feel with brand colors |

### Android Configuration

- `ndkVersion = "27.1.12297006"`
- `gradle-8.14.3-bin.zip`

---

## 3. Project Structure

```
tshop_mobile/
  lib/
    core/
      config.dart           -> Base URL, environment config
      constants.dart        -> Sizes, genders, order statuses, pagination
      theme.dart            -> Material 3 theme (colors, typography, spacing)
      network/
        dio_client.dart     -> Dio instance with interceptors
        api_interceptor.dart -> Bearer token attach + 401 refresh logic
    models/
      user.dart             -> User, AuthResponse (freezed)
      product.dart          -> Product, ProductVariant, ProductImage (freezed)
      category.dart         -> Category (freezed)
      banner.dart           -> Banner (freezed)
      cart.dart             -> Cart, CartItem (freezed)
      wishlist.dart         -> WishlistItem (freezed)
      order.dart            -> Order, OrderItem (freezed)
      address.dart          -> Address (freezed)
      api_response.dart     -> Paginated response wrapper (freezed)
    repositories/
      auth_repository.dart       -> /api/mobile/auth/*
      product_repository.dart    -> /api/mobile/products/*
      category_repository.dart   -> /api/mobile/categories
      banner_repository.dart     -> /api/mobile/banners
      cart_repository.dart       -> /api/cart/*
      wishlist_repository.dart   -> /api/wishlist/*
      checkout_repository.dart   -> /api/checkout
      order_repository.dart      -> /api/mobile/orders/*
      account_repository.dart    -> /api/account, /api/addresses/*
      admin/
        admin_product_repository.dart   -> /api/admin/products/*
        admin_category_repository.dart  -> /api/admin/categories/*
        admin_banner_repository.dart    -> /api/admin/banners/*
        admin_order_repository.dart     -> /api/admin/orders/*
        upload_repository.dart          -> /api/upload
    providers/
      auth_provider.dart
      product_provider.dart
      category_provider.dart
      banner_provider.dart
      cart_provider.dart
      wishlist_provider.dart
      order_provider.dart
      account_provider.dart
      admin/
        admin_product_provider.dart
        admin_category_provider.dart
        admin_banner_provider.dart
        admin_order_provider.dart
    screens/
      auth/
        login_screen.dart
        register_screen.dart
      home/
        home_screen.dart
        widgets/
          banner_carousel.dart
          category_chips.dart
          product_section.dart
      products/
        product_list_screen.dart
        product_detail_screen.dart
        widgets/
          product_card.dart
          filter_bar.dart
          image_gallery.dart
          size_selector.dart
          color_selector.dart
      cart/
        cart_screen.dart
        widgets/
          cart_item_tile.dart
          price_summary.dart
      wishlist/
        wishlist_screen.dart
      checkout/
        checkout_screen.dart
        order_success_screen.dart
        widgets/
          address_selector.dart
          address_form_sheet.dart
      orders/
        orders_screen.dart
        order_detail_screen.dart
      account/
        account_screen.dart
        widgets/
          profile_section.dart
          address_list.dart
      admin/
        admin_dashboard_screen.dart
        products/
          admin_product_list_screen.dart
          admin_product_form_screen.dart
        categories/
          admin_category_list_screen.dart
          admin_category_form_screen.dart
        banners/
          admin_banner_list_screen.dart
          admin_banner_form_screen.dart
        orders/
          admin_order_list_screen.dart
          admin_order_detail_screen.dart
    widgets/
      app_scaffold.dart        -> Bottom nav wrapper
      loading_skeleton.dart    -> Shimmer placeholder
      error_view.dart          -> Error state with retry
      empty_view.dart          -> Empty state illustration
      price_tag.dart           -> Formatted price with discount
      status_badge.dart        -> Order/product status chip
    app.dart                   -> MaterialApp.router + ProviderScope
    main.dart                  -> Entry point
```

---

## 4. Backend API Changes (Next.js)

### 4.1 New Mobile Auth Endpoints

**`POST /api/mobile/auth/register`**
- Body: `{ name, email, password }`
- Validates with `registerSchema`, hashes password, creates user
- Signs a JWT with `{ sub: user.id, role: user.role }` using `NEXTAUTH_SECRET`
- Returns: `{ user: { id, name, email, role }, token, refreshToken }`

**`POST /api/mobile/auth/login`**
- Body: `{ email, password }`
- Validates credentials, checks bcrypt hash
- Returns: `{ user: { id, name, email, role }, token, refreshToken }`

**`POST /api/mobile/auth/refresh`**
- Body: `{ refreshToken }`
- Validates refresh token, issues new access token
- Returns: `{ token }`

### 4.2 New Public Endpoints

**`GET /api/mobile/products`**
- Query: `page`, `search`, `gender`, `category` (slug), `sort` (newest, price_asc, price_desc, discount), `limit`
- Returns: `{ products: [...], total, pages, page }`
- Products include: id, name, slug, brand, basePrice, sellingPrice, discount, gender, primary image, category name

**`GET /api/mobile/products/[slug]`**
- Returns: Full product with all variants, all images, category, related products (same category, limit 8)

**`GET /api/mobile/categories`**
- Returns: All categories with product count, parent info, ordered alphabetically

**`GET /api/mobile/banners`**
- Returns: Active banners ordered by sortOrder

### 4.3 New Mobile Order Endpoint

**`POST /api/mobile/orders/[id]/cancel`**
- Auth required (Bearer)
- Validates ownership, only PENDING orders
- Updates status to CANCELLED
- Returns: `{ success: true }`

### 4.4 Auth Helper for Existing Endpoints

**`getSessionOrBearer(req)`** — utility function in `src/lib/auth.ts`:
- Checks `Authorization: Bearer <token>` header first
- If present: verify JWT, return user session object
- If absent: fall back to `auth()` (Auth.js cookie session)
- Applied to all existing protected route handlers

Existing endpoints that gain Bearer support (no other changes):
- `GET/POST /api/cart`, `PUT/DELETE /api/cart/[itemId]`
- `GET/POST /api/wishlist`, `DELETE /api/wishlist`
- `POST /api/checkout`
- `GET/PUT /api/account`
- `GET/POST /api/addresses`, `PUT/DELETE /api/addresses/[id]`
- All `/api/admin/*` routes
- `POST /api/upload`

**Total: 8 new route files, 1 auth helper. Zero breaking changes.**

---

## 5. Authentication Flow

### Login/Register

```
User enters credentials
  -> POST /api/mobile/auth/login (or /register)
  -> Server validates, returns { user, token, refreshToken }
  -> Store tokens in SharedPreferences
  -> Dio interceptor auto-attaches "Authorization: Bearer <token>"
  -> Riverpod authProvider updates with user data
  -> GoRouter redirect sends user to home
```

### Token Interceptor (Dio)

```
Every request:
  -> Attach "Authorization: Bearer <token>" from SharedPreferences

On 401 response:
  -> Attempt POST /api/mobile/auth/refresh with refreshToken
  -> Success: store new token, retry original request
  -> Failure: clear all tokens, authProvider -> null, GoRouter redirects to /login
```

### Route Guards (GoRouter redirect)

| Route Pattern | Rule |
|---------------|------|
| `/login`, `/register` | If logged in, redirect to `/home` |
| `/cart`, `/wishlist`, `/checkout/*`, `/orders/*`, `/account/*` | If not logged in, redirect to `/login` |
| `/admin/*` | If not logged in or role != ADMIN, redirect to `/home` |
| Everything else | Public, no redirect |

### App Launch

```
1. Read token from SharedPreferences
2. If token exists: GET /api/account to validate
3. Valid -> hydrate authProvider, show home
4. Invalid -> attempt refresh -> fail -> show login
5. No token -> show home (browsing is public)
```

---

## 6. Customer Screens

### 6.1 Navigation

Bottom navigation bar with 5 tabs:

| Tab | Icon | Screen | Auth Required |
|-----|------|--------|---------------|
| Home | home | HomeScreen | No |
| Categories | grid | CategoryListScreen | No |
| Cart | shopping_cart | CartScreen | Yes |
| Wishlist | favorite | WishlistScreen | Yes |
| Account | person | AccountScreen | Yes |

Cart tab shows badge with item count (from cartProvider).

### 6.2 Home Screen

- **Banner carousel:** Auto-scrolling PageView, 3-second interval, dots indicator, tap navigates to banner link
- **Category chips:** Horizontal scrollable row, tap navigates to product list filtered by category
- **"New Arrivals" section:** Horizontal scrollable product cards, "View All" link
- **"Trending Now" section:** Horizontal scrollable product cards sorted by discount, "View All" link
- **Pull-to-refresh:** Refreshes banners, categories, and product sections

### 6.3 Product Listing Screen

- **Grid:** 2 columns, product cards with image, name, brand, price, discount badge
- **Filter bar:** Chips for gender (Men/Women/All), sort dropdown
- **Search:** Search bar at top with 300ms debounce
- **Pagination:** Infinite scroll, 12 items per page, loading indicator at bottom
- **Empty state:** "No products found" with illustration

### 6.4 Product Detail Screen

- **Image gallery:** Swipeable PageView with dots indicator, tap for full-screen view with pinch-to-zoom
- **Info:** Product name, brand, selling price (bold), base price (strikethrough), discount percentage badge
- **Size selector:** Chip group from variants. Out-of-stock sizes greyed out with "Out of Stock" label
- **Color selector:** Circle swatches with border on selected. Updates available sizes based on color
- **"Add to Cart" button:** Full-width, fixed at bottom. Disabled if no size selected or out of stock
- **Wishlist toggle:** Heart icon in app bar, toggles via `POST /api/wishlist`
- **"Similar Products" section:** Horizontal list of products from same category

### 6.5 Cart Screen

- **Item list:** Product image, name, size/color, quantity stepper (1 to stock limit), price
- **Swipe to delete:** Swipe left reveals delete action
- **Price summary:** Subtotal, total (fixed at bottom)
- **"Proceed to Checkout" CTA:** Full-width button, navigates to checkout
- **Empty state:** "Your cart is empty" with "Continue Shopping" link
- **Auth gate:** If not logged in, show prompt to login

### 6.6 Checkout Screen

- **Address selection:** Radio list of saved addresses, default pre-selected
- **"Add New Address" button:** Opens bottom sheet with address form
- **Order summary:** Item count, total amount
- **Payment method:** "Cash on Delivery" (static, only option)
- **"Place Order" button:** Calls `POST /api/checkout`, shows loading, navigates to success screen

### 6.7 Order Success Screen

- Checkmark animation
- Order ID displayed
- "View Order" button -> order detail
- "Continue Shopping" button -> home

### 6.8 Orders Screen

- **List:** Order cards with order ID (truncated), date, status badge, total, item count
- **Tap:** Navigates to order detail
- **Empty state:** "No orders yet"

### 6.9 Order Detail Screen

- Order status badge (colored)
- Item list with image, name, size/color, quantity, price
- Delivery address
- Tracking number (if available)
- Price summary
- **"Cancel Order" button:** Only visible for PENDING orders, confirmation dialog before calling cancel endpoint

### 6.10 Account Screen

- **Profile section:** Name, email, phone with "Edit" button (opens edit form)
- **Addresses section:** List of saved addresses, add/edit/delete, default badge
- **"Logout" button:** Clears tokens, resets all providers, navigates to home
- **"Admin Panel" link:** Only visible for ADMIN users, navigates to admin section

---

## 7. Admin Screens

Accessed via Account screen (ADMIN users only). Uses a separate navigation stack with its own app bar and back navigation to the customer app.

### 7.1 Admin Dashboard

- **Summary cards (2x2 grid):**
  - Total Products (from `/api/admin/products` total count)
  - Active Products (filtered count)
  - Total Orders (from `/api/admin/orders` total count)
  - Pending Orders (filtered count)
- Quick action buttons: "Add Product", "View Orders"

### 7.2 Product Management

**List Screen:**
- Paginated list with product image thumbnail, name, status badge, selling price
- Search bar
- Status filter chips (All, Draft, Active, Archived)
- FAB for "Add Product"
- Tap -> Edit product

**Form Screen (Add/Edit):**
- Fields: Name, description (multiline), brand, base price, selling price, category (dropdown), gender (radio), status (dropdown)
- **Image section:** Grid of uploaded images, tap to add (camera/gallery picker), drag to reorder, tap X to remove. Upload via `POST /api/upload`
- **Variants section:** Expandable list of variant rows. Each row: size (dropdown from SIZES constant), color name, color hex (color picker), SKU (auto-generated suggestion), stock (number input), price override (optional)
- "Add Variant" button
- "Save" button in app bar

### 7.3 Category Management

**List Screen:**
- List with category name, product count, parent category (if any)
- FAB for "Add Category"
- Tap -> Edit, long-press -> Delete (with confirmation)

**Form Screen (Add/Edit):**
- Fields: Name, parent category (dropdown, optional), image upload

### 7.4 Banner Management

**List Screen:**
- Reorderable list (drag handles) with banner image preview, title, active toggle
- FAB for "Add Banner"
- Tap -> Edit, swipe -> Delete

**Form Screen (Add/Edit):**
- Fields: Title, image upload, link URL, position, active toggle, sort order

### 7.5 Order Management

**List Screen:**
- Paginated list with order ID, customer name, date, status badge, total
- Search bar (order ID or customer name)
- Status filter tabs (All, Pending, Confirmed, Shipped, Delivered, Cancelled)

**Detail Screen:**
- Full order info: customer name/email, delivery address, all items with images
- **Status update:** Dropdown following state machine rules:
  - PENDING -> CONFIRMED or CANCELLED
  - CONFIRMED -> SHIPPED or CANCELLED
  - SHIPPED -> DELIVERED
  - DELIVERED and CANCELLED are terminal (dropdown disabled)
- **Tracking number:** Text input, editable when status is SHIPPED or DELIVERED
- "Update" button to save status + tracking number

---

## 8. Image Handling

**Configuration:**
```dart
class AppConfig {
  static const String baseUrl = "http://localhost:3000";
  static const String baseImageUrl = "$baseUrl";
}
```

Product images from the server are stored as relative paths (`/uploads/filename.jpg`). The Flutter app prefixes with `baseImageUrl`:
```dart
CachedNetworkImage(imageUrl: "${AppConfig.baseImageUrl}${product.imageUrl}")
```

Swapping to a CDN later requires only changing `baseImageUrl`.

**Admin image upload flow:**
1. User picks image from camera/gallery
2. Compress if > 2MB
3. Upload via `POST /api/upload` (multipart/form-data)
4. Server returns `{ url: "/uploads/filename.jpg" }`
5. Attach URL to product/banner/category form data

---

## 9. Error Handling & Offline

**Network errors:**
- Dio interceptor catches connection errors
- Shows snackbar: "No internet connection"
- Retry button on error views

**API errors:**
- 400: Show validation error messages from response body
- 401: Token refresh flow (see Section 5)
- 404: "Not found" screen
- 500: "Something went wrong" with retry

**Offline cache (Hive):**
- Cache product listings, categories, banners on successful fetch
- On network failure: serve cached data with "Offline" indicator
- Cart and wishlist are online-only (require auth)
- Cache invalidation: TTL-based (5 minutes for products, 15 minutes for categories/banners)

---

## 10. Implementation Phases

### Phase 1 — Foundation
**Backend:**
- Add `POST /api/mobile/auth/register`
- Add `POST /api/mobile/auth/login`
- Add `POST /api/mobile/auth/refresh`
- Add `getSessionOrBearer()` helper to `src/lib/auth.ts`
- Update all existing protected routes to use `getSessionOrBearer()`
- Add `GET /api/mobile/products` (paginated, filtered)
- Add `GET /api/mobile/products/[slug]`
- Add `GET /api/mobile/categories`
- Add `GET /api/mobile/banners`
- Add `POST /api/mobile/orders/[id]/cancel`

**Flutter:**
- Create project with `flutter create --org com.tshop tshop_mobile`
- Configure Android NDK 27.1.12297006 and Gradle 8.14.3
- Set up folder structure
- Configure Material 3 theme (brand colors, typography)
- Set up Dio client with auth interceptor
- Set up Riverpod (ProviderScope in main)
- Set up GoRouter with route guards
- Build login screen and register screen
- Implement auth provider (login, register, logout, token persistence)
- Test auth flow end-to-end on both platforms

### Phase 2 — Core Browsing
- Home screen (banner carousel, category chips, product sections)
- Product listing screen (grid, filters, search, infinite scroll)
- Product detail screen (image gallery, size/color selectors)
- Category browsing
- Search functionality
- Test on both platforms

### Phase 3 — Shopping
- Cart screen (add, update, remove, swipe-to-delete)
- Cart provider with badge count
- Wishlist screen and toggle
- Checkout screen (address selection, new address form)
- Order success screen
- Test full purchase flow on both platforms

### Phase 4 — Account & Orders
- Orders list screen
- Order detail screen with cancel
- Account screen (profile edit)
- Address management (CRUD)
- Test on both platforms

### Phase 5 — Admin Panel
- Admin dashboard
- Product management (list + form with image upload + variants)
- Category management (list + form)
- Banner management (list + form)
- Order management (list + detail with status update)
- Test all admin flows on both platforms

### Phase 6 — Polish
- Loading skeletons (shimmer effect)
- Error states and empty states with illustrations
- Pull-to-refresh on all list screens
- Offline cache with Hive
- App icon and splash screen
- iOS safe area handling
- Android predictive back gesture support
- Final testing on physical devices

### Phase Gate Criteria

Each phase is NOT complete until:
- [ ] All screens render without errors on Android
- [ ] All screens render without errors on iOS
- [ ] All interactive elements work (buttons, forms, navigation)
- [ ] Network error handling works (airplane mode test)
- [ ] No layout overflow at any screen size
- [ ] Auth flows work correctly (login, logout, token refresh)

---

## 11. File Estimates

| Area | Files |
|------|-------|
| Core (config, theme, network) | ~6 |
| Models (freezed) | ~10 |
| Repositories | ~12 |
| Providers | ~10 |
| Customer screens + widgets | ~30 |
| Admin screens + widgets | ~15 |
| Shared widgets | ~8 |
| Backend new routes | ~8 |
| Backend modified files | ~15 |
| **Total** | **~114** |

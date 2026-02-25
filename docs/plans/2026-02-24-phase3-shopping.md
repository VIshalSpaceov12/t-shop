# Phase 3: Shopping — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the full shopping experience — cart (add/update/remove/swipe-to-delete), wishlist (toggle + screen), checkout (address selection/new address form), and order success screen.

**Architecture:** Add Cart, WishlistItem, Address, Order models (freezed), repositories, and Riverpod providers following Phase 2 patterns. Build 4 screens + update product detail for wishlist/cart integration. All data comes from `/api/*` endpoints with Bearer token auth.

**Tech Stack:** Flutter/Dart, Riverpod StateNotifier, Dio, GoRouter, freezed.

---

## Task 1: Create Cart, WishlistItem, Address Models

**Files:**
- Create: `lib/models/cart.dart`
- Create: `lib/models/wishlist.dart`
- Create: `lib/models/address.dart`
- Create: `lib/models/order.dart`

### `lib/models/cart.dart`

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'cart.freezed.dart';
part 'cart.g.dart';

@freezed
abstract class CartItem with _$CartItem {
  const factory CartItem({
    required String id,
    required int quantity,
    required CartVariant variant,
    required CartProduct product,
  }) = _CartItem;

  factory CartItem.fromJson(Map<String, dynamic> json) => _$CartItemFromJson(json);
}

@freezed
abstract class CartVariant with _$CartVariant {
  const factory CartVariant({
    required String id,
    required String size,
    required String color,
    required String colorHex,
    required int stock,
  }) = _CartVariant;

  factory CartVariant.fromJson(Map<String, dynamic> json) => _$CartVariantFromJson(json);
}

@freezed
abstract class CartProduct with _$CartProduct {
  const factory CartProduct({
    required String id,
    required String name,
    required String slug,
    required String brand,
    required double sellingPrice,
    List<CartProductImage>? images,
  }) = _CartProduct;

  factory CartProduct.fromJson(Map<String, dynamic> json) => _$CartProductFromJson(json);
}

@freezed
abstract class CartProductImage with _$CartProductImage {
  const factory CartProductImage({
    required String url,
    @Default(0) int sortOrder,
  }) = _CartProductImage;

  factory CartProductImage.fromJson(Map<String, dynamic> json) => _$CartProductImageFromJson(json);
}

@freezed
abstract class CartResponse with _$CartResponse {
  const factory CartResponse({
    required List<CartItem> items,
    required int itemCount,
  }) = _CartResponse;

  factory CartResponse.fromJson(Map<String, dynamic> json) => _$CartResponseFromJson(json);
}
```

### `lib/models/wishlist.dart`

```dart
import 'package:freezed_annotation/freezed_annotation.dart';
import 'product.dart';

part 'wishlist.freezed.dart';
part 'wishlist.g.dart';

@freezed
abstract class WishlistItem with _$WishlistItem {
  const factory WishlistItem({
    required String id,
    required WishlistProduct product,
    DateTime? createdAt,
  }) = _WishlistItem;

  factory WishlistItem.fromJson(Map<String, dynamic> json) => _$WishlistItemFromJson(json);
}

@freezed
abstract class WishlistProduct with _$WishlistProduct {
  const factory WishlistProduct({
    required String id,
    required String name,
    required String slug,
    required String brand,
    required double basePrice,
    required double sellingPrice,
    required double discount,
    List<ProductImage>? images,
  }) = _WishlistProduct;

  factory WishlistProduct.fromJson(Map<String, dynamic> json) => _$WishlistProductFromJson(json);
}

@freezed
abstract class WishlistResponse with _$WishlistResponse {
  const factory WishlistResponse({
    required List<WishlistItem> items,
  }) = _WishlistResponse;

  factory WishlistResponse.fromJson(Map<String, dynamic> json) => _$WishlistResponseFromJson(json);
}

@freezed
abstract class WishlistToggleResponse with _$WishlistToggleResponse {
  const factory WishlistToggleResponse({
    required bool wishlisted,
  }) = _WishlistToggleResponse;

  factory WishlistToggleResponse.fromJson(Map<String, dynamic> json) => _$WishlistToggleResponseFromJson(json);
}
```

### `lib/models/address.dart`

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'address.freezed.dart';
part 'address.g.dart';

@freezed
abstract class Address with _$Address {
  const factory Address({
    required String id,
    required String fullName,
    required String phone,
    required String addressLine1,
    String? addressLine2,
    required String city,
    required String state,
    required String pincode,
    @Default(false) bool isDefault,
    DateTime? createdAt,
  }) = _Address;

  factory Address.fromJson(Map<String, dynamic> json) => _$AddressFromJson(json);
}
```

### `lib/models/order.dart`

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'order.freezed.dart';
part 'order.g.dart';

@freezed
abstract class CheckoutResponse with _$CheckoutResponse {
  const factory CheckoutResponse({
    required String orderId,
  }) = _CheckoutResponse;

  factory CheckoutResponse.fromJson(Map<String, dynamic> json) => _$CheckoutResponseFromJson(json);
}
```

After creating all 4 files, run: `dart run build_runner build --delete-conflicting-outputs`

Commit: `feat: add Cart, Wishlist, Address, Order models (freezed)`

---

## Task 2: Create Cart, Wishlist, Address, Checkout Repositories

**Files:**
- Create: `lib/repositories/cart_repository.dart`
- Create: `lib/repositories/wishlist_repository.dart`
- Create: `lib/repositories/address_repository.dart`
- Create: `lib/repositories/checkout_repository.dart`
- Modify: `lib/providers/core_providers.dart`

### `lib/repositories/cart_repository.dart`
- `getCart()` → `CartResponse` — GET `/api/cart`
- `addToCart({variantId, quantity})` → `void` — POST `/api/cart`
- `updateQuantity(itemId, quantity)` → `void` — PUT `/api/cart/$itemId`
- `removeItem(itemId)` → `void` — DELETE `/api/cart/$itemId`

### `lib/repositories/wishlist_repository.dart`
- `getWishlist()` → `WishlistResponse` — GET `/api/wishlist`
- `toggleWishlist(productId)` → `WishlistToggleResponse` — POST `/api/wishlist`
- `removeFromWishlist(productId)` → `void` — DELETE `/api/wishlist?productId=$productId`

### `lib/repositories/address_repository.dart`
- `getAddresses()` → `List<Address>` — GET `/api/addresses`
- `createAddress(data)` → `Address` — POST `/api/addresses`
- `updateAddress(id, data)` → `Address` — PUT `/api/addresses/$id`
- `deleteAddress(id)` → `void` — DELETE `/api/addresses/$id`

### `lib/repositories/checkout_repository.dart`
- `checkout(addressId)` → `CheckoutResponse` — POST `/api/checkout`

Add all 4 to `lib/providers/core_providers.dart`.

Commit: `feat: add cart, wishlist, address, checkout repositories`

---

## Task 3: Create Cart and Wishlist Providers

**Files:**
- Create: `lib/providers/cart_provider.dart`
- Create: `lib/providers/wishlist_provider.dart`

### `lib/providers/cart_provider.dart`
- `CartState` — items, itemCount, isLoading, error
- `CartNotifier` extends StateNotifier:
  - `loadCart()` — fetches cart from API
  - `addToCart(variantId, quantity)` — adds item, reloads cart
  - `updateQuantity(itemId, quantity)` — updates quantity, reloads
  - `removeItem(itemId)` — removes item, reloads
  - `totalAmount` getter — sum of all items' sellingPrice * quantity
- `cartProvider` — StateNotifierProvider (NOT autoDispose — cart persists across screens)

### `lib/providers/wishlist_provider.dart`
- `WishlistState` — items, isLoading, error
- `WishlistNotifier` extends StateNotifier:
  - `loadWishlist()` — fetches wishlist
  - `toggleWishlist(productId)` — toggles, reloads
  - `isWishlisted(productId)` — check if product is in wishlist
- `wishlistProvider` — StateNotifierProvider (NOT autoDispose)

Commit: `feat: add cart and wishlist providers`

---

## Task 4: Build Cart Screen

**Files:**
- Create: `lib/screens/cart/cart_screen.dart`
- Create: `lib/screens/cart/widgets/cart_item_card.dart`
- Create: `lib/screens/cart/widgets/cart_summary.dart`

### Cart screen layout:
1. AppBar with "Cart" title and item count badge
2. List of CartItemCard widgets with Dismissible for swipe-to-delete
3. CartItemCard: product image, name, size/color info, quantity stepper (+/-), price
4. CartSummary: fixed bottom — subtotal, total, "Proceed to Checkout" button
5. Empty state when cart is empty
6. Auth gate: if not logged in, show login prompt

Commit: `feat: build cart screen with item management and swipe-to-delete`

---

## Task 5: Build Wishlist Screen

**Files:**
- Create: `lib/screens/wishlist/wishlist_screen.dart`

### Wishlist screen layout:
1. AppBar with "Wishlist" title
2. 2-column grid of product cards (same as product listing but with remove icon)
3. Each card has a remove (X) button in top-right corner
4. Tap navigates to product detail
5. Empty state when wishlist is empty
6. Auth gate: if not logged in, show login prompt

Commit: `feat: build wishlist screen`

---

## Task 6: Build Checkout Screen and Address Management

**Files:**
- Create: `lib/providers/address_provider.dart`
- Create: `lib/screens/checkout/checkout_screen.dart`
- Create: `lib/screens/checkout/widgets/address_card.dart`
- Create: `lib/screens/checkout/widgets/address_form.dart`
- Create: `lib/screens/checkout/order_success_screen.dart`

### `lib/providers/address_provider.dart`
- `AddressState` — addresses list, isLoading, error
- `AddressNotifier` — loadAddresses(), createAddress(), updateAddress(), deleteAddress()
- `addressProvider` — StateNotifierProvider

### Checkout screen layout:
1. AppBar with "Checkout" title
2. Address list with radio selection, default pre-selected
3. AddressCard: name, phone, full address, default badge, radio button
4. "Add New Address" button → opens bottom sheet with AddressForm
5. AddressForm: fullName, phone, addressLine1, addressLine2, city, state, pincode, isDefault toggle
6. Order summary: item count, total amount
7. "Place Order (COD)" button — calls checkout, navigates to success screen

### Order success screen:
1. Checkmark icon animation
2. "Order Placed Successfully!" text
3. Order ID displayed
4. "View Orders" button → /orders
5. "Continue Shopping" button → /

Commit: `feat: build checkout with address management and order success`

---

## Task 7: Integrate Cart/Wishlist into Product Detail and Home

**Files:**
- Modify: `lib/screens/products/product_detail_screen.dart`
- Modify: `lib/screens/home/home_screen.dart`
- Modify: `lib/providers/auth_provider.dart`

### Product detail changes:
- Wire "Add to Cart" button to `cartProvider.addToCart(variantId, quantity)` — find the matching variant from selectedSize + selectedColor
- Wire wishlist heart icon to `wishlistProvider.toggleWishlist(product.id)`
- Show snackbar on success/failure

### Home screen changes:
- Cart icon in AppBar shows badge with item count from `cartProvider`

### Auth provider changes:
- On login success, load cart and wishlist
- On logout, clear cart and wishlist state

Commit: `feat: integrate cart and wishlist into product detail and home`

---

## Task 8: Update Router

**Files:**
- Modify: `lib/core/router.dart`

- Replace cart, wishlist, checkout placeholder routes with real screens
- Add `/checkout` route (protected)
- Add `/order-success/:orderId` route
- Cart and Wishlist tabs in bottom nav now use real screens

Commit: `feat: update router with shopping screens`

---

## Task 9: Visual Verification

- Run Flutter app
- Verify cart flow: add item from product detail, view in cart, update quantity, swipe delete
- Verify wishlist: toggle from product detail, view in wishlist screen
- Verify checkout: select address, add new address, place order
- Verify order success screen
- Fix any issues

Commit: `fix: Phase 3 visual fixes` (if needed)

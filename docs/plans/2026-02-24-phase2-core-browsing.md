# Phase 2: Core Browsing — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the full browsing experience — home screen with banners/categories/products, product listing with filters/search/infinite scroll, and product detail with image gallery/size-color selectors.

**Architecture:** Add Product, Category, Banner models (freezed), repositories, and Riverpod providers following Phase 1 patterns. Build 4 screens + shared widgets. All data comes from `/api/mobile/*` endpoints.

**Tech Stack:** Flutter/Dart, Riverpod StateNotifier, Dio, GoRouter, cached_network_image, freezed.

---

## Task 1: Create Product, Category, Banner Models

**Files:**
- Create: `lib/models/product.dart`
- Create: `lib/models/category.dart`
- Create: `lib/models/banner.dart`

### `lib/models/product.dart`

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'product.freezed.dart';
part 'product.g.dart';

@freezed
abstract class Product with _$Product {
  const factory Product({
    required String id,
    required String name,
    required String slug,
    String? description,
    required String brand,
    required double basePrice,
    required double sellingPrice,
    required double discount,
    required String gender,
    String? status,
    DateTime? createdAt,
    ProductCategory? category,
    List<ProductVariant>? variants,
    List<ProductImage>? images,
  }) = _Product;

  factory Product.fromJson(Map<String, dynamic> json) => _$ProductFromJson(json);
}

@freezed
abstract class ProductCategory with _$ProductCategory {
  const factory ProductCategory({
    String? id,
    required String name,
    required String slug,
    ProductCategoryParent? parent,
  }) = _ProductCategory;

  factory ProductCategory.fromJson(Map<String, dynamic> json) => _$ProductCategoryFromJson(json);
}

@freezed
abstract class ProductCategoryParent with _$ProductCategoryParent {
  const factory ProductCategoryParent({
    required String name,
    required String slug,
  }) = _ProductCategoryParent;

  factory ProductCategoryParent.fromJson(Map<String, dynamic> json) => _$ProductCategoryParentFromJson(json);
}

@freezed
abstract class ProductVariant with _$ProductVariant {
  const factory ProductVariant({
    required String id,
    required String size,
    required String color,
    required String colorHex,
    required String sku,
    required int stock,
    double? price,
  }) = _ProductVariant;

  factory ProductVariant.fromJson(Map<String, dynamic> json) => _$ProductVariantFromJson(json);
}

@freezed
abstract class ProductImage with _$ProductImage {
  const factory ProductImage({
    required String id,
    required String url,
    String? altText,
    @Default(0) int sortOrder,
    @Default(false) bool isPrimary,
  }) = _ProductImage;

  factory ProductImage.fromJson(Map<String, dynamic> json) => _$ProductImageFromJson(json);
}

@freezed
abstract class ProductListResponse with _$ProductListResponse {
  const factory ProductListResponse({
    required List<Product> products,
    required int total,
    required int pages,
    required int page,
  }) = _ProductListResponse;

  factory ProductListResponse.fromJson(Map<String, dynamic> json) => _$ProductListResponseFromJson(json);
}

@freezed
abstract class ProductDetailResponse with _$ProductDetailResponse {
  const factory ProductDetailResponse({
    required Product product,
    required bool isWishlisted,
    required List<Product> similarProducts,
  }) = _ProductDetailResponse;

  factory ProductDetailResponse.fromJson(Map<String, dynamic> json) => _$ProductDetailResponseFromJson(json);
}
```

### `lib/models/category.dart`

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'category.freezed.dart';
part 'category.g.dart';

@freezed
abstract class Category with _$Category {
  const factory Category({
    required String id,
    required String name,
    required String slug,
    String? image,
    String? parentId,
    CategoryParent? parent,
    @JsonKey(name: '_count') CategoryCount? count,
  }) = _Category;

  factory Category.fromJson(Map<String, dynamic> json) => _$CategoryFromJson(json);
}

@freezed
abstract class CategoryParent with _$CategoryParent {
  const factory CategoryParent({
    required String id,
    required String name,
    required String slug,
  }) = _CategoryParent;

  factory CategoryParent.fromJson(Map<String, dynamic> json) => _$CategoryParentFromJson(json);
}

@freezed
abstract class CategoryCount with _$CategoryCount {
  const factory CategoryCount({
    @Default(0) int products,
  }) = _CategoryCount;

  factory CategoryCount.fromJson(Map<String, dynamic> json) => _$CategoryCountFromJson(json);
}

@freezed
abstract class CategoryListResponse with _$CategoryListResponse {
  const factory CategoryListResponse({
    required List<Category> categories,
  }) = _CategoryListResponse;

  factory CategoryListResponse.fromJson(Map<String, dynamic> json) => _$CategoryListResponseFromJson(json);
}
```

### `lib/models/banner.dart`

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'banner.freezed.dart';
part 'banner.g.dart';

@freezed
abstract class AppBanner with _$AppBanner {
  const factory AppBanner({
    required String id,
    required String title,
    required String image,
    String? link,
    String? position,
  }) = _AppBanner;

  factory AppBanner.fromJson(Map<String, dynamic> json) => _$AppBannerFromJson(json);
}

@freezed
abstract class BannerListResponse with _$BannerListResponse {
  const factory BannerListResponse({
    required List<AppBanner> banners,
  }) = _BannerListResponse;

  factory BannerListResponse.fromJson(Map<String, dynamic> json) => _$BannerListResponseFromJson(json);
}
```

After creating all 3 files, run: `dart run build_runner build --delete-conflicting-outputs`

Commit: `feat: add Product, Category, Banner models (freezed)`

---

## Task 2: Create Product, Category, Banner Repositories

**Files:**
- Create: `lib/repositories/product_repository.dart`
- Create: `lib/repositories/category_repository.dart`
- Create: `lib/repositories/banner_repository.dart`

Follow the AuthRepository pattern — each takes a `Dio` instance, returns typed responses.

### `lib/repositories/product_repository.dart`
- `getProducts({page, search, gender, category, sort, limit})` → `ProductListResponse`
- `getProductBySlug(slug)` → `ProductDetailResponse`
- Endpoint: `/api/mobile/products` and `/api/mobile/products/$slug`

### `lib/repositories/category_repository.dart`
- `getCategories()` → `CategoryListResponse`
- Endpoint: `/api/mobile/categories`

### `lib/repositories/banner_repository.dart`
- `getBanners()` → `BannerListResponse`
- Endpoint: `/api/mobile/banners`

Add all 3 to `lib/providers/core_providers.dart`.

Commit: `feat: add product, category, banner repositories and providers`

---

## Task 3: Create Browsing Providers

**Files:**
- Create: `lib/providers/home_provider.dart`
- Create: `lib/providers/product_provider.dart`

### `lib/providers/home_provider.dart`
- `homeDataProvider` — FutureProvider that fetches banners, categories, new arrivals (newest, limit 8), and trending (discount sort, limit 8) in parallel via `Future.wait`
- Returns a `HomeData` class with `banners`, `categories`, `newArrivals`, `trending`

### `lib/providers/product_provider.dart`
- `productListProvider(filters)` — StateNotifier for paginated product listing
- `productDetailProvider(slug)` — FutureProvider for single product detail
- Handles infinite scroll (load more), search, filters

Commit: `feat: add home and product listing providers`

---

## Task 4: Create Shared Widgets

**Files:**
- Create: `lib/widgets/product_card.dart`
- Create: `lib/widgets/price_tag.dart`
- Create: `lib/widgets/loading_skeleton.dart`
- Create: `lib/widgets/error_view.dart`
- Create: `lib/widgets/empty_view.dart`

### `product_card.dart`
- Displays product image (cached_network_image), name, brand, price with discount badge
- Tap navigates to `/products/$slug`
- Shows 2 images on hover/alternate (if available)
- Discount badge in top-right corner

### `price_tag.dart`
- Shows selling price (bold), base price (strikethrough), discount percentage
- Uses Indian Rupee formatting (₹)

### `loading_skeleton.dart`
- Shimmer/placeholder animation for loading states
- Grid variant (for product listing) and horizontal variant (for product sections)

### `error_view.dart`
- Error icon, message, "Retry" button

### `empty_view.dart`
- Illustration icon, message, optional action button

Commit: `feat: add shared widgets (product card, price tag, loading, error, empty)`

---

## Task 5: Build Home Screen

**Files:**
- Rewrite: `lib/screens/home/home_screen.dart`
- Create: `lib/screens/home/widgets/banner_carousel.dart`
- Create: `lib/screens/home/widgets/category_chips.dart`
- Create: `lib/screens/home/widgets/product_section.dart`

### Home screen layout (top to bottom):
1. AppBar with SHOP. logo, search icon, cart icon (future badge)
2. BannerCarousel — auto-scrolling PageView with dot indicators
3. CategoryChips — horizontal scroll row, tap navigates to product listing filtered
4. ProductSection "New Arrivals" — horizontal scrollable product cards
5. ProductSection "Trending Now" — horizontal scrollable product cards
6. Pull-to-refresh on entire screen

Uses `homeDataProvider` for data. Shows loading skeletons while fetching.

Commit: `feat: build home screen with banners, categories, product sections`

---

## Task 6: Build Product Listing Screen

**Files:**
- Create: `lib/screens/products/product_list_screen.dart`
- Create: `lib/screens/products/widgets/filter_bar.dart`

### Product listing:
- 2-column grid of ProductCard widgets
- Filter bar at top: gender chips (Men/Women/All), sort dropdown
- Search bar in AppBar with 300ms debounce
- Infinite scroll pagination (ScrollController, load next page when near bottom)
- Loading indicator at bottom while fetching next page
- Empty state when no products match
- Receives initial filters from query params (gender, category, sort, search)

Update GoRouter to pass query params to this screen.

Commit: `feat: build product listing with filters, search, infinite scroll`

---

## Task 7: Build Product Detail Screen

**Files:**
- Create: `lib/screens/products/product_detail_screen.dart`
- Create: `lib/screens/products/widgets/image_gallery.dart`
- Create: `lib/screens/products/widgets/size_selector.dart`
- Create: `lib/screens/products/widgets/color_selector.dart`

### Product detail layout:
1. Image gallery — swipeable PageView with dot indicators
2. Brand name (muted)
3. Product name (bold, large)
4. Price row: selling price, base price strikethrough, discount badge
5. Color selector — circle swatches, selected has border
6. Size selector — chip group, out-of-stock greyed out
7. "Add to Cart" button — full-width, fixed at bottom (disabled if no size selected)
8. Similar products section at bottom

Update GoRouter to resolve `/products/:slug` to this screen.

Commit: `feat: build product detail with image gallery, size/color selectors`

---

## Task 8: Update Router and Navigation

**Files:**
- Modify: `lib/core/router.dart`

- Replace placeholder routes for `/products` and `/products/:slug` with real screens
- Add bottom navigation shell route (Home, Categories placeholder, Cart placeholder, Wishlist placeholder, Account placeholder)
- Product list accepts query params: `?gender=MEN&category=t-shirts&sort=newest&search=anime`

Commit: `feat: update router with real browsing screens and bottom nav`

---

## Task 9: Visual Verification

- Run Flutter app
- Verify home screen loads banners, categories, products from API
- Verify product listing with filters and search
- Verify product detail with variants
- Screenshot all screens
- Fix any issues

Commit: `fix: Phase 2 visual fixes` (if needed)

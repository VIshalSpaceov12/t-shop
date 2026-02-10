# Bewakoof-Style E-Commerce Platform - Design Document

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 15 (App Router, fullstack) |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | NextAuth.js (Auth.js) |
| UI | Tailwind CSS + shadcn/ui |
| Admin | Custom (under `/admin`) |
| Deployment | Vercel |
| Payments | Deferred (architecture ready) |

## Phases

### Phase 1 - MVP
- Homepage with banners, categories, featured products
- Product listing with filters (category, size, color, price) & sorting
- Product detail page (images, sizes, add to cart)
- Cart management (add/remove/quantity)
- User auth (signup, login, profile)
- Wishlist
- Order placement (COD placeholder)
- Admin panel (products, categories, orders, banners)

### Phase 2 - Growth
- Search with autocomplete
- Product reviews & ratings
- Coupon/discount system
- Email notifications
- SEO optimization (sitemap, structured data)

### Phase 3 - Scale
- Payment gateway integration
- Rewards/coins system
- Referral program
- Inventory tracking & low-stock alerts
- Analytics dashboard in admin

## Database Schema

### User & Auth
- **User** - id, name, email, phone, passwordHash, role (CUSTOMER/ADMIN), avatar, createdAt
- **Address** - id, userId, fullName, phone, addressLine1, addressLine2, city, state, pincode, isDefault

### Product Catalog
- **Category** - id, name, slug, image, parentId (self-referencing for subcategories)
- **Product** - id, name, slug, description, brand, basePrice, sellingPrice, discount, categoryId, gender (MEN/WOMEN/UNISEX), status (DRAFT/ACTIVE/ARCHIVED), createdAt
- **ProductVariant** - id, productId, size, color, colorHex, sku, stock, price (override)
- **ProductImage** - id, productId, url, altText, sortOrder, isPrimary

### Shopping
- **Cart** - id, userId, createdAt
- **CartItem** - id, cartId, variantId, quantity
- **Wishlist** - id, userId, productId

### Orders
- **Order** - id, userId, addressId, status (PENDING/CONFIRMED/SHIPPED/DELIVERED/CANCELLED), totalAmount, paymentMethod, paymentStatus, trackingNumber, createdAt
- **OrderItem** - id, orderId, variantId, quantity, price (snapshot)

### CMS
- **Banner** - id, title, image, link, position, isActive, sortOrder

## Folder Structure

```
shop/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── public/images/
├── src/
│   ├── app/
│   │   ├── (store)/           # Customer-facing
│   │   │   ├── page.tsx                  # Homepage
│   │   │   ├── products/
│   │   │   │   ├── page.tsx              # Product listing
│   │   │   │   └── [slug]/page.tsx       # Product detail
│   │   │   ├── cart/page.tsx
│   │   │   ├── wishlist/page.tsx
│   │   │   ├── checkout/page.tsx
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── account/page.tsx
│   │   │   └── category/[slug]/page.tsx
│   │   ├── admin/             # Admin panel
│   │   │   ├── page.tsx                  # Dashboard
│   │   │   ├── products/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/edit/page.tsx
│   │   │   ├── categories/page.tsx
│   │   │   ├── orders/page.tsx
│   │   │   └── banners/page.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts
│   │   │   ├── products/route.ts
│   │   │   ├── cart/route.ts
│   │   │   ├── orders/route.ts
│   │   │   └── upload/route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                # shadcn/ui
│   │   ├── store/             # Store components
│   │   ├── admin/             # Admin components
│   │   └── shared/            # Navbar, Footer, etc.
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── utils.ts
│   │   └── validators.ts
│   ├── hooks/
│   └── types/
├── .env
├── next.config.js
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

## Key Page Designs

### Homepage
- Auto-sliding banner carousel
- Category tiles grid
- New arrivals product cards (horizontal scroll)
- Promotional strips between sections

### Product Listing
- URL-based filters (`?category=tshirts&size=XL&color=blue&sort=price_asc&page=1`)
- Sticky sidebar filters (desktop) / bottom sheet (mobile)
- Grid: 2 cols mobile, 3 cols tablet, 4 cols desktop
- Pagination (SEO-friendly)

### Product Detail
- Image gallery with thumbnails
- Size selector (greys out unavailable)
- Color swatches
- Add to Cart + Wishlist
- Similar products section

### Cart
- DB-stored for logged-in users
- localStorage for guests, merged on login
- Optimistic UI updates

### Admin
- Protected by middleware (role === ADMIN)
- Sidebar layout
- DataTable with search & bulk actions
- Order status pipeline
- Image uploads to cloud storage

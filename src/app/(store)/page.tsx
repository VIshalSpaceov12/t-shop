import { prisma } from "@/lib/prisma";
import { BannerCarousel } from "@/components/store/banner-carousel";
import { CategoryGrid } from "@/components/store/category-grid";
import { ProductSection } from "@/components/store/product-section";

export default async function HomePage() {
  const [banners, categories, newArrivals, trending] = await Promise.all([
    prisma.banner.findMany({
      where: { isActive: true, position: "home_top" },
      orderBy: { sortOrder: "asc" },
      select: { id: true, title: true, image: true, link: true },
    }),
    prisma.category.findMany({
      where: { parentId: { not: null } },
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 2 },
      },
    }),
    prisma.product.findMany({
      where: { status: "ACTIVE", discount: { gte: 30 } },
      orderBy: { discount: "desc" },
      take: 8,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 2 },
      },
    }),
  ]);

  return (
    <div>
      {/* Banner Carousel */}
      <BannerCarousel banners={banners} />

      <div className="mx-auto max-w-7xl space-y-12 px-4 py-8">
        {/* Category Grid */}
        <CategoryGrid categories={categories} />

        {/* Promotional Strip */}
        <div className="rounded-lg bg-yellow-400 px-4 py-3 text-center">
          <p className="text-sm font-bold text-gray-900 sm:text-base">
            FREE SHIPPING on orders above ₹399 | COD Available | Easy Returns
          </p>
        </div>

        {/* New Arrivals */}
        <ProductSection
          title="New Arrivals"
          products={newArrivals}
          viewAllHref="/products?sort=newest"
        />

        {/* Trending Now */}
        <ProductSection
          title="Trending Now"
          products={trending}
          viewAllHref="/products?sort=discount"
        />
      </div>
    </div>
  );
}

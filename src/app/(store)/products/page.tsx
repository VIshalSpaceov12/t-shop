import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/store/product-card";
import { ProductFilters } from "@/components/store/product-filters";
import { SortDropdown } from "@/components/store/sort-dropdown";
import { Pagination } from "@/components/store/pagination";
import { PRODUCTS_PER_PAGE } from "@/lib/constants";

interface SearchParams {
  category?: string;
  size?: string;
  gender?: string;
  minPrice?: string;
  maxPrice?: string;
  discount?: string;
  sort?: string;
  search?: string;
  page?: string;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const page = parseInt(params.page || "1");
  const limit = PRODUCTS_PER_PAGE;
  const skip = (page - 1) * limit;

  // Build where clause
  const where: Record<string, unknown> = { status: "ACTIVE" };

  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: "insensitive" } },
      { brand: { contains: params.search, mode: "insensitive" } },
      { description: { contains: params.search, mode: "insensitive" } },
    ];
  }

  if (params.category) {
    const slugs = params.category.split(",").filter(Boolean);
    if (slugs.length > 0) {
      where.category = { slug: { in: slugs } };
    }
  }

  if (params.gender) {
    where.gender = params.gender;
  }

  if (params.minPrice || params.maxPrice) {
    where.sellingPrice = {};
    if (params.minPrice) (where.sellingPrice as Record<string, number>).gte = parseInt(params.minPrice);
    if (params.maxPrice) (where.sellingPrice as Record<string, number>).lte = parseInt(params.maxPrice);
  }

  if (params.discount) {
    where.discount = { gte: parseInt(params.discount) };
  }

  if (params.size) {
    const sizes = params.size.split(",").filter(Boolean);
    if (sizes.length > 0) {
      where.variants = { some: { size: { in: sizes }, stock: { gt: 0 } } };
    }
  }

  // Build orderBy
  let orderBy: Record<string, string> = { createdAt: "desc" };
  switch (params.sort) {
    case "price_asc":
      orderBy = { sellingPrice: "asc" };
      break;
    case "price_desc":
      orderBy = { sellingPrice: "desc" };
      break;
    case "discount":
      orderBy = { discount: "desc" };
      break;
    case "newest":
    default:
      orderBy = { createdAt: "desc" };
  }

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        images: { orderBy: { sortOrder: "asc" }, take: 2 },
      },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="mx-auto max-w-7xl overflow-hidden px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {params.search ? `Results for "${params.search}"` : "All Products"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {total} product{total !== 1 ? "s" : ""} found
        </p>
      </div>

      <div className="flex gap-8">
        {/* Desktop Filters Sidebar */}
        <Suspense>
          <ProductFilters categories={categories} />
        </Suspense>

        {/* Product Grid */}
        <div className="min-w-0 flex-1">
          {/* Sort bar */}
          <div className="mb-4 flex items-center justify-end">
            <Suspense>
              <SortDropdown />
            </Suspense>
          </div>

          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-lg font-medium text-gray-500">No products found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your filters
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              <div className="mt-8">
                <Suspense>
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalProducts={total}
                  />
                </Suspense>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

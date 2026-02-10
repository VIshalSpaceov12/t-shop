import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductDetailClient } from "@/components/store/product-detail-client";
import { ProductSection } from "@/components/store/product-section";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    include: { images: { where: { isPrimary: true }, take: 1 } },
  });

  if (!product) return { title: "Product Not Found" };

  return {
    title: `${product.name} - SHOP`,
    description: product.description || `Buy ${product.name} at the best price`,
    openGraph: {
      title: product.name,
      description: product.description || undefined,
      images: product.images[0]?.url ? [product.images[0].url] : undefined,
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: { select: { name: true, slug: true, parent: { select: { name: true, slug: true } } } },
      variants: { orderBy: [{ color: "asc" }, { size: "asc" }] },
      images: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!product) notFound();

  // Similar products (same category, different product)
  const similarProducts = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      categoryId: product.categoryId,
      NOT: { id: product.id },
    },
    take: 4,
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 2 },
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-gray-900">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        {product.category.parent && (
          <>
            <Link
              href={`/category/${product.category.parent.slug}`}
              className="hover:text-gray-900"
            >
              {product.category.parent.name}
            </Link>
            <ChevronRight className="h-3 w-3" />
          </>
        )}
        <Link
          href={`/category/${product.category.slug}`}
          className="hover:text-gray-900"
        >
          {product.category.name}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-gray-900">{product.name}</span>
      </nav>

      {/* Product Detail */}
      <ProductDetailClient product={product} />

      {/* Similar Products */}
      {similarProducts.length > 0 && (
        <div className="mt-16">
          <ProductSection
            title="Similar Products"
            products={similarProducts}
            viewAllHref={`/products?category=${product.category.slug}`}
          />
        </div>
      )}
    </div>
  );
}

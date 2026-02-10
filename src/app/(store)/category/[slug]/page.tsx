import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/store/product-card";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return { title: "Category Not Found" };

  return {
    title: `${category.name} - SHOP`,
    description: `Browse our ${category.name} collection`,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      parent: { select: { name: true, slug: true } },
      children: { select: { id: true, slug: true } },
    },
  });

  if (!category) notFound();

  // Get products from this category and its children
  const categoryIds = [category.id, ...category.children.map((c) => c.id)];

  const childSlugs = category.children.map((c) => c.slug);
  const allSlugs = [category.slug, ...childSlugs];

  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      category: { slug: { in: allSlugs } },
    },
    orderBy: { createdAt: "desc" },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 2 },
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-gray-900">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        {category.parent && (
          <>
            <Link
              href={`/category/${category.parent.slug}`}
              className="hover:text-gray-900"
            >
              {category.parent.name}
            </Link>
            <ChevronRight className="h-3 w-3" />
          </>
        )}
        <span className="text-gray-900">{category.name}</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {products.length} product{products.length !== 1 ? "s" : ""}
      </p>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-lg font-medium text-gray-500">
            No products in this category yet
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

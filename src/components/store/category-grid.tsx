import Link from "next/link";

type Category = {
  id: string;
  name: string;
  slug: string;
  _count: { products: number };
};

export function CategoryGrid({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;

  return (
    <section data-testid="category-grid">
      <h2 className="text-2xl font-bold text-gray-900">Shop by Category</h2>
      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {categories.map((cat) => (
          <Link
            key={cat.id}
            href={`/products?category=${cat.slug}`}
            className="group flex flex-col items-center rounded-xl bg-gray-50 p-4 transition-colors hover:bg-yellow-50"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-xl font-bold text-yellow-700 transition-transform group-hover:scale-110">
              {cat.name.charAt(0)}
            </div>
            <span className="mt-2 text-center text-sm font-medium text-gray-700 group-hover:text-gray-900">
              {cat.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {cat._count.products} items
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

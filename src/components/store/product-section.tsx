import { ProductCard } from "./product-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

type Product = {
  id: string;
  name: string;
  slug: string;
  brand: string | null;
  basePrice: number;
  sellingPrice: number;
  discount: number;
  images: { url: string; altText: string | null }[];
};

interface ProductSectionProps {
  title: string;
  products: Product[];
  viewAllHref?: string;
}

export function ProductSection({
  title,
  products,
  viewAllHref,
}: ProductSectionProps) {
  if (products.length === 0) return null;

  return (
    <section data-testid={`product-section-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {viewAllHref && (
          <Button variant="ghost" asChild>
            <Link href={viewAllHref}>
              View All
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

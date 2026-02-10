import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

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

export function ProductCard({ product }: { product: Product }) {
  const primaryImage = product.images[0]?.url;
  const secondImage = product.images[1]?.url;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block"
      data-testid="product-card"
    >
      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-gray-100">
        {primaryImage ? (
          <>
            <Image
              src={primaryImage}
              alt={product.name}
              fill
              className="object-cover transition-opacity duration-300 group-hover:opacity-0"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
            {secondImage && (
              <Image
                src={secondImage}
                alt={`${product.name} - alternate`}
                fill
                className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            No image
          </div>
        )}

        {/* Discount badge */}
        {product.discount > 0 && (
          <Badge className="absolute left-2 top-2 bg-red-500 text-white hover:bg-red-500">
            {product.discount}% OFF
          </Badge>
        )}
      </div>

      {/* Info */}
      <div className="mt-2 space-y-1">
        {product.brand && (
          <p className="text-xs font-semibold uppercase text-gray-500">
            {product.brand}
          </p>
        )}
        <p className="truncate text-sm font-medium text-gray-900 group-hover:text-yellow-600">
          {product.name}
        </p>
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900">
            {formatPrice(product.sellingPrice)}
          </span>
          {product.discount > 0 && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(product.basePrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

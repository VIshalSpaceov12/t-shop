"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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

interface WishlistCardProps {
  product: Product;
}

export function WishlistCard({ product }: WishlistCardProps) {
  const router = useRouter();
  const [removing, setRemoving] = useState(false);
  const [removed, setRemoved] = useState(false);

  const primaryImage = product.images[0]?.url;
  const secondImage = product.images[1]?.url;

  async function handleRemove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setRemoving(true);
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
      if (res.ok) {
        setRemoved(true);
        toast.success("Removed from wishlist");
        router.refresh();
      } else {
        toast.error("Failed to remove from wishlist");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setRemoving(false);
    }
  }

  function handleMoveToBag(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    // Navigate to product detail page so user can select size/color before adding to cart
    router.push(`/products/${product.slug}`);
  }

  if (removed) return null;

  return (
    <div className="group relative" data-testid="wishlist-card">
      <Link href={`/products/${product.slug}`} className="block">
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

          {/* Remove button */}
          <button
            onClick={handleRemove}
            disabled={removing}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md transition-colors hover:bg-red-50"
            aria-label="Remove from wishlist"
          >
            <X className="h-4 w-4 text-gray-600 hover:text-red-500" />
          </button>
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

      {/* Move to Bag button */}
      <Button
        onClick={handleMoveToBag}
        variant="outline"
        size="sm"
        className="mt-2 w-full border-yellow-400 text-gray-900 hover:bg-yellow-50"
      >
        <ShoppingBag className="mr-2 h-4 w-4" />
        Move to Bag
      </Button>
    </div>
  );
}

"use client";

import { useState, useMemo } from "react";
import { ImageGallery } from "./image-gallery";
import { ColorSelector } from "./color-selector";
import { SizeSelector } from "./size-selector";
import { AddToCartButton } from "./add-to-cart-button";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

type Variant = {
  id: string;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
};

type ProductImage = {
  id: string;
  url: string;
  altText: string | null;
};

interface ProductDetailClientProps {
  product: {
    id: string;
    name: string;
    slug: string;
    brand: string | null;
    description: string | null;
    basePrice: number;
    sellingPrice: number;
    discount: number;
    variants: Variant[];
    images: ProductImage[];
  };
  isWishlisted?: boolean;
}

export function ProductDetailClient({ product, isWishlisted = false }: ProductDetailClientProps) {
  const [selectedColor, setSelectedColor] = useState<string | null>(
    product.variants[0]?.color ?? null
  );
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  // Get unique colors
  const colors = useMemo(() => {
    const map = new Map<string, string>();
    product.variants.forEach((v) => map.set(v.color, v.colorHex));
    return Array.from(map, ([color, colorHex]) => ({ color, colorHex }));
  }, [product.variants]);

  // Get sizes for selected color with stock info
  const sizes = useMemo(() => {
    const sizeMap = new Map<string, boolean>();
    product.variants
      .filter((v) => !selectedColor || v.color === selectedColor)
      .forEach((v) => {
        const current = sizeMap.get(v.size) || false;
        sizeMap.set(v.size, current || v.stock > 0);
      });

    const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
    return Array.from(sizeMap, ([size, inStock]) => ({ size, inStock })).sort(
      (a, b) => sizeOrder.indexOf(a.size) - sizeOrder.indexOf(b.size)
    );
  }, [product.variants, selectedColor]);

  // Find selected variant
  const selectedVariant = useMemo(() => {
    if (!selectedColor || !selectedSize) return null;
    return (
      product.variants.find(
        (v) => v.color === selectedColor && v.size === selectedSize
      ) ?? null
    );
  }, [product.variants, selectedColor, selectedSize]);

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {/* Image Gallery */}
      <ImageGallery images={product.images} />

      {/* Product Info */}
      <div className="space-y-6">
        {/* Brand & Name */}
        <div>
          {product.brand && (
            <p className="text-sm font-semibold uppercase text-gray-500">
              {product.brand}
            </p>
          )}
          <h1 className="text-2xl font-bold text-gray-900 lg:text-3xl">
            {product.name}
          </h1>
        </div>

        {/* Pricing */}
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-gray-900">
            {formatPrice(product.sellingPrice)}
          </span>
          {product.discount > 0 && (
            <>
              <span className="text-lg text-gray-400 line-through">
                {formatPrice(product.basePrice)}
              </span>
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                {product.discount}% OFF
              </Badge>
            </>
          )}
        </div>

        <p className="text-xs text-muted-foreground">inclusive of all taxes</p>

        {/* Color Selector */}
        {colors.length > 0 && (
          <ColorSelector
            colors={colors}
            selected={selectedColor}
            onSelect={(color) => {
              setSelectedColor(color);
              setSelectedSize(null); // Reset size when color changes
            }}
          />
        )}

        {/* Size Selector */}
        {sizes.length > 0 && (
          <SizeSelector
            sizes={sizes}
            selected={selectedSize}
            onSelect={setSelectedSize}
          />
        )}

        {/* Stock info */}
        {selectedVariant && (
          <p className="text-sm text-muted-foreground">
            {selectedVariant.stock > 0
              ? `${selectedVariant.stock} in stock`
              : "Out of stock"}
          </p>
        )}

        {/* Add to Cart */}
        <AddToCartButton
          variantId={selectedVariant?.id ?? null}
          productId={product.id}
          productName={product.name}
          isWishlisted={isWishlisted}
        />

        {/* Description */}
        {product.description && (
          <div className="border-t pt-6">
            <h3 className="mb-2 font-semibold">Product Description</h3>
            <p className="text-sm leading-relaxed text-gray-600">
              {product.description}
            </p>
          </div>
        )}

        {/* Delivery Info */}
        <div className="rounded-lg border p-4">
          <h3 className="mb-2 text-sm font-semibold">Delivery & Returns</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            <li>Free shipping on orders above ₹399</li>
            <li>Cash on Delivery available</li>
            <li>Easy 15-day returns</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

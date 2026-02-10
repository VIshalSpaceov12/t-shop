"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

type ProductImage = {
  id: string;
  url: string;
  altText: string | null;
};

export function ImageGallery({ images }: { images: ProductImage[] }) {
  const [selected, setSelected] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[3/4] items-center justify-center rounded-lg bg-gray-100 text-gray-400">
        No images
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex flex-col gap-2">
          {images.map((img, i) => (
            <button
              key={img.id}
              onClick={() => setSelected(i)}
              className={cn(
                "relative h-16 w-16 overflow-hidden rounded-md border-2 transition-colors",
                i === selected ? "border-yellow-500" : "border-transparent hover:border-gray-300"
              )}
            >
              <Image
                src={img.url}
                alt={img.altText || "Thumbnail"}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main image */}
      <div className="relative flex-1 aspect-[3/4] overflow-hidden rounded-lg bg-gray-100">
        <Image
          src={images[selected].url}
          alt={images[selected].altText || "Product image"}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";

interface SizeSelectorProps {
  sizes: { size: string; inStock: boolean }[];
  selected: string | null;
  onSelect: (size: string) => void;
}

export function SizeSelector({ sizes, selected, onSelect }: SizeSelectorProps) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold uppercase text-gray-500">
        Select Size
      </h3>
      <div className="flex flex-wrap gap-2">
        {sizes.map(({ size, inStock }) => (
          <button
            key={size}
            onClick={() => inStock && onSelect(size)}
            disabled={!inStock}
            className={cn(
              "rounded-md border px-4 py-2 text-sm font-medium transition-colors",
              selected === size
                ? "border-gray-900 bg-gray-900 text-white"
                : inStock
                  ? "border-gray-200 hover:border-gray-900"
                  : "cursor-not-allowed border-gray-100 bg-gray-50 text-gray-300 line-through"
            )}
          >
            {size}
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface ColorSelectorProps {
  colors: { color: string; colorHex: string }[];
  selected: string | null;
  onSelect: (color: string) => void;
}

export function ColorSelector({ colors, selected, onSelect }: ColorSelectorProps) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold uppercase text-gray-500">
        Select Color
        {selected && <span className="ml-2 normal-case font-normal text-gray-700">— {selected}</span>}
      </h3>
      <div className="flex flex-wrap gap-2">
        {colors.map(({ color, colorHex }) => (
          <button
            key={color}
            onClick={() => onSelect(color)}
            className={cn(
              "relative h-9 w-9 rounded-full border-2 transition-all",
              selected === color
                ? "border-gray-900 ring-2 ring-gray-900 ring-offset-2"
                : "border-gray-200 hover:border-gray-400"
            )}
            style={{ backgroundColor: colorHex }}
            title={color}
            aria-label={`Select ${color}`}
          >
            {selected === color && (
              <Check
                className={cn(
                  "absolute inset-0 m-auto h-4 w-4",
                  colorHex === "#FFFFFF" || colorHex === "#ffffff"
                    ? "text-gray-900"
                    : "text-white"
                )}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

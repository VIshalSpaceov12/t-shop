"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SlidersHorizontal } from "lucide-react";
import { SIZES } from "@/lib/constants";

type Category = { id: string; name: string; slug: string };

interface ProductFiltersProps {
  categories: Category[];
}

function FilterContent({ categories }: ProductFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const activeCategories = searchParams.get("category")?.split(",").filter(Boolean) || [];
  const activeSizes = searchParams.get("size")?.split(",").filter(Boolean) || [];
  const activeGender = searchParams.get("gender") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page"); // Reset page on filter change
      router.push(`/products?${params.toString()}`);
    },
    [router, searchParams]
  );

  function toggleArrayFilter(key: string, value: string) {
    const current = searchParams.get(key)?.split(",").filter(Boolean) || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    updateFilter(key, updated.join(","));
  }

  function clearAll() {
    router.push("/products");
  }

  const hasFilters = activeCategories.length > 0 || activeSizes.length > 0 || activeGender || minPrice || maxPrice;

  return (
    <div className="space-y-6">
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="text-red-500 hover:text-red-700">
          Clear All Filters
        </Button>
      )}

      {/* Gender */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Gender</h3>
        <div className="space-y-2">
          {["MEN", "WOMEN", "UNISEX"].map((g) => (
            <label key={g} className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={activeGender === g}
                onCheckedChange={(checked) => updateFilter("gender", checked ? g : "")}
              />
              <span className="text-sm">{g === "MEN" ? "Men" : g === "WOMEN" ? "Women" : "Unisex"}</span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Category */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Category</h3>
        <div className="space-y-2">
          {categories.map((cat) => (
            <label key={cat.id} className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={activeCategories.includes(cat.slug)}
                onCheckedChange={() => toggleArrayFilter("category", cat.slug)}
              />
              <span className="text-sm">{cat.name}</span>
            </label>
          ))}
        </div>
      </div>

      <Separator />

      {/* Size */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Size</h3>
        <div className="flex flex-wrap gap-2">
          {SIZES.map((size) => (
            <button
              key={size}
              onClick={() => toggleArrayFilter("size", size)}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                activeSizes.includes(size)
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Price Range */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Price Range</h3>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => updateFilter("minPrice", e.target.value)}
            className="h-9"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => updateFilter("maxPrice", e.target.value)}
            className="h-9"
          />
        </div>
      </div>

      <Separator />

      {/* Discount */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase text-gray-500">Discount</h3>
        <div className="space-y-2">
          {[10, 20, 30, 40, 50].map((d) => (
            <label key={d} className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={searchParams.get("discount") === d.toString()}
                onCheckedChange={(checked) => updateFilter("discount", checked ? d.toString() : "")}
              />
              <span className="text-sm">{d}% and above</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProductFilters({ categories }: ProductFiltersProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="sticky top-4">
          <h2 className="mb-4 text-lg font-bold">Filters</h2>
          <FilterContent categories={categories} />
        </div>
      </aside>

      {/* Mobile filter drawer */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <FilterContent categories={categories} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}

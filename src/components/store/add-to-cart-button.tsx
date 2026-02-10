"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Heart } from "lucide-react";
import { toast } from "sonner";

interface AddToCartButtonProps {
  variantId: string | null;
  productName: string;
}

export function AddToCartButton({ variantId, productName }: AddToCartButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleAddToCart() {
    if (!variantId) {
      toast.error("Please select a size and color");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, quantity: 1 }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to add to cart");
        return;
      }

      toast.success(`${productName} added to cart`);
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-3">
      <Button
        onClick={handleAddToCart}
        disabled={loading || !variantId}
        className="flex-1 bg-yellow-400 text-gray-900 hover:bg-yellow-500"
        size="lg"
      >
        <ShoppingBag className="mr-2 h-5 w-5" />
        {loading ? "Adding..." : "Add to Cart"}
      </Button>
      <Button variant="outline" size="lg">
        <Heart className="h-5 w-5" />
      </Button>
    </div>
  );
}

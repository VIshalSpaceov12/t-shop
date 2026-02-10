"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Heart } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/hooks/use-cart";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface AddToCartButtonProps {
  variantId: string | null;
  productId: string;
  productName: string;
  isWishlisted?: boolean;
}

export function AddToCartButton({
  variantId,
  productId,
  productName,
  isWishlisted = false,
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [wishLoading, setWishLoading] = useState(false);
  const [wishlisted, setWishlisted] = useState(isWishlisted);

  async function handleAddToCart() {
    if (!session) {
      router.push("/login");
      return;
    }
    if (!variantId) {
      toast.error("Please select a size and color");
      return;
    }

    setLoading(true);
    try {
      const success = await addItem(variantId);
      if (success) {
        toast.success(`${productName} added to cart`);
      } else {
        toast.error("Failed to add to cart");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleWishlist() {
    if (!session) {
      router.push("/login");
      return;
    }

    setWishLoading(true);
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (res.ok) {
        const data = await res.json();
        setWishlisted(data.wishlisted);
        toast.success(
          data.wishlisted ? "Added to wishlist" : "Removed from wishlist"
        );
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setWishLoading(false);
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
      <Button
        variant="outline"
        size="lg"
        onClick={handleToggleWishlist}
        disabled={wishLoading}
        aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      >
        <Heart
          className={cn(
            "h-5 w-5",
            wishlisted && "fill-red-500 text-red-500"
          )}
        />
      </Button>
    </div>
  );
}

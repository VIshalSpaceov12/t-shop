"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function CartClient() {
  const { items, itemCount, loading, updateItem, removeItem } = useCart();
  const { data: session } = useSession();
  const router = useRouter();

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShoppingBag className="mb-4 h-16 w-16 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-900">
          Please login to view your cart
        </h2>
        <Link href="/login">
          <Button className="mt-4 bg-yellow-400 text-gray-900 hover:bg-yellow-500">
            Login
          </Button>
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <ShoppingBag className="mb-4 h-16 w-16 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-900">
          Your cart is empty
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add items to your cart to get started
        </p>
        <Link href="/products">
          <Button className="mt-4 bg-yellow-400 text-gray-900 hover:bg-yellow-500">
            Continue Shopping
          </Button>
        </Link>
      </div>
    );
  }

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0
  );
  const shippingFee = subtotal >= 399 ? 0 : 49;
  const total = subtotal + shippingFee;

  async function handleQuantity(itemId: string, quantity: number) {
    if (quantity < 1) return;
    const success = await updateItem(itemId, quantity);
    if (!success) {
      toast.error("Failed to update quantity");
    }
  }

  async function handleRemove(itemId: string) {
    const success = await removeItem(itemId);
    if (success) {
      toast.success("Item removed from cart");
    } else {
      toast.error("Failed to remove item");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Cart Items */}
      <div className="lg:col-span-2">
        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 rounded-lg border p-4"
              data-testid="cart-item"
            >
              {/* Product Image */}
              <Link
                href={`/products/${item.product.slug}`}
                className="relative h-28 w-24 flex-shrink-0 overflow-hidden rounded-md bg-gray-100"
              >
                {item.product.images[0] ? (
                  <Image
                    src={item.product.images[0].url}
                    alt={item.product.name}
                    fill
                    className="object-cover"
                    sizes="96px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-gray-400">
                    No image
                  </div>
                )}
              </Link>

              {/* Details */}
              <div className="flex flex-1 flex-col justify-between">
                <div>
                  {item.product.brand && (
                    <p className="text-xs font-semibold uppercase text-gray-500">
                      {item.product.brand}
                    </p>
                  )}
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="text-sm font-medium text-gray-900 hover:text-yellow-600"
                  >
                    {item.product.name}
                  </Link>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {item.variant.size}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <span
                        className="inline-block h-3 w-3 rounded-full border"
                        style={{ backgroundColor: item.variant.colorHex }}
                      />
                      <span className="text-xs text-muted-foreground">
                        {item.variant.color}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between">
                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        handleQuantity(item.id, item.quantity - 1)
                      }
                      disabled={loading || item.quantity <= 1}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">
                      {item.quantity}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        handleQuantity(item.id, item.quantity + 1)
                      }
                      disabled={
                        loading || item.quantity >= item.variant.stock
                      }
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Price + Remove */}
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900">
                      {formatPrice(
                        item.product.sellingPrice * item.quantity
                      )}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700"
                      onClick={() => handleRemove(item.id)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Order Summary */}
      <div>
        <div className="sticky top-20 rounded-lg border p-6">
          <h2 className="text-lg font-bold text-gray-900">Order Summary</h2>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Subtotal ({itemCount} item{itemCount !== 1 ? "s" : ""})
              </span>
              <span className="font-medium">{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span className="font-medium">
                {shippingFee === 0 ? (
                  <span className="text-green-600">FREE</span>
                ) : (
                  formatPrice(shippingFee)
                )}
              </span>
            </div>
            {shippingFee > 0 && (
              <p className="text-xs text-muted-foreground">
                Free shipping on orders above ₹399
              </p>
            )}
            <div className="border-t pt-3">
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          </div>
          <Button
            className="mt-6 w-full bg-yellow-400 text-gray-900 hover:bg-yellow-500"
            size="lg"
            onClick={() => router.push("/checkout")}
          >
            Proceed to Checkout
          </Button>
          <Link
            href="/products"
            className="mt-3 block text-center text-sm text-muted-foreground hover:text-gray-900"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

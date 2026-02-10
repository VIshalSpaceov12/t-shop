import { CartClient } from "@/components/store/cart-client";

export const metadata = {
  title: "Shopping Cart - SHOP",
};

export default function CartPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Shopping Cart</h1>
      <CartClient />
    </div>
  );
}

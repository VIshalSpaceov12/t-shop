import { CheckoutClient } from "@/components/store/checkout-client";

export const metadata = {
  title: "Checkout - SHOP",
};

export default function CheckoutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Checkout</h1>
      <CheckoutClient />
    </div>
  );
}

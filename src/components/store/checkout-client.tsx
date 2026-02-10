"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/hooks/use-cart";
import { useSession } from "next-auth/react";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Plus, Check, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type Address = {
  id: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

export function CheckoutClient() {
  const { items, itemCount, refresh } = useCart();
  const { data: session } = useSession();
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // Address form state
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    isDefault: false,
  });

  useEffect(() => {
    fetchAddresses();
  }, []);

  async function fetchAddresses() {
    try {
      const res = await fetch("/api/addresses");
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
        // Auto-select default address
        const defaultAddr = data.find((a: Address) => a.isDefault);
        if (defaultAddr) setSelectedAddress(defaultAddr.id);
        else if (data.length > 0) setSelectedAddress(data[0].id);
      }
    } catch {
      toast.error("Failed to load addresses");
    } finally {
      setLoadingAddresses(false);
    }
  }

  async function handleAddAddress(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        const newAddr = await res.json();
        setAddresses((prev) => [newAddr, ...prev]);
        setSelectedAddress(newAddr.id);
        setShowAddressForm(false);
        setForm({
          fullName: "",
          phone: "",
          addressLine1: "",
          addressLine2: "",
          city: "",
          state: "",
          pincode: "",
          isDefault: false,
        });
        toast.success("Address added");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to add address");
      }
    } catch {
      toast.error("Something went wrong");
    }
  }

  async function handlePlaceOrder() {
    if (!selectedAddress) {
      toast.error("Please select a delivery address");
      return;
    }

    setPlacing(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addressId: selectedAddress }),
      });

      if (res.ok) {
        const { orderId } = await res.json();
        await refresh();
        toast.success("Order placed successfully!");
        router.push(`/orders/${orderId}`);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to place order");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setPlacing(false);
    }
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  if (items.length === 0 && !placing) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-lg font-medium text-gray-500">Your cart is empty</p>
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

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Left: Address + Payment */}
      <div className="space-y-8 lg:col-span-2">
        {/* Address Section */}
        <div>
          <h2 className="mb-4 text-lg font-bold text-gray-900">
            Delivery Address
          </h2>

          {loadingAddresses ? (
            <div className="flex items-center gap-2 py-4 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading addresses...
            </div>
          ) : (
            <div className="space-y-3">
              {addresses.map((addr) => (
                <button
                  key={addr.id}
                  onClick={() => setSelectedAddress(addr.id)}
                  className={`w-full rounded-lg border p-4 text-left transition-colors ${
                    selectedAddress === addr.id
                      ? "border-yellow-400 bg-yellow-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{addr.fullName}</span>
                        {addr.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {addr.addressLine1}
                        {addr.addressLine2 && `, ${addr.addressLine2}`}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {addr.city}, {addr.state} - {addr.pincode}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Phone: {addr.phone}
                      </p>
                    </div>
                    {selectedAddress === addr.id && (
                      <Check className="h-5 w-5 text-yellow-600" />
                    )}
                  </div>
                </button>
              ))}

              {!showAddressForm && (
                <Button
                  variant="outline"
                  onClick={() => setShowAddressForm(true)}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Address
                </Button>
              )}
            </div>
          )}

          {/* Add Address Form */}
          {showAddressForm && (
            <form
              onSubmit={handleAddAddress}
              className="mt-4 space-y-4 rounded-lg border p-4"
            >
              <h3 className="font-medium">New Address</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={form.fullName}
                    onChange={(e) =>
                      setForm({ ...form, fullName: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) =>
                      setForm({ ...form, phone: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="addressLine1">Address Line 1</Label>
                <Input
                  id="addressLine1"
                  value={form.addressLine1}
                  onChange={(e) =>
                    setForm({ ...form, addressLine1: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="addressLine2">Address Line 2 (Optional)</Label>
                <Input
                  id="addressLine2"
                  value={form.addressLine2}
                  onChange={(e) =>
                    setForm({ ...form, addressLine2: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) =>
                      setForm({ ...form, city: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="state">State</Label>
                  <Input
                    id="state"
                    value={form.state}
                    onChange={(e) =>
                      setForm({ ...form, state: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input
                    id="pincode"
                    value={form.pincode}
                    onChange={(e) =>
                      setForm({ ...form, pincode: e.target.value })
                    }
                    maxLength={6}
                    required
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={form.isDefault}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, isDefault: checked === true })
                  }
                />
                <span className="text-sm">Set as default address</span>
              </label>
              <div className="flex gap-2">
                <Button type="submit" className="bg-yellow-400 text-gray-900 hover:bg-yellow-500">
                  Save Address
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddressForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>

        {/* Payment Method */}
        <div>
          <h2 className="mb-4 text-lg font-bold text-gray-900">
            Payment Method
          </h2>
          <div className="rounded-lg border border-yellow-400 bg-yellow-50 p-4">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-yellow-600" />
              <span className="font-medium">Cash on Delivery (COD)</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Pay when your order is delivered
            </p>
          </div>
        </div>
      </div>

      {/* Right: Order Summary */}
      <div>
        <div className="sticky top-20 rounded-lg border p-6">
          <h2 className="text-lg font-bold text-gray-900">Order Summary</h2>

          {/* Items */}
          <div className="mt-4 max-h-60 space-y-3 overflow-y-auto">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="relative h-16 w-14 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                  {item.product.images[0] && (
                    <Image
                      src={item.product.images[0].url}
                      alt={item.product.name}
                      fill
                      className="object-cover"
                      sizes="56px"
                    />
                  )}
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-medium leading-tight">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.variant.size} / {item.variant.color} x{" "}
                    {item.quantity}
                  </p>
                  <p className="font-medium">
                    {formatPrice(item.product.sellingPrice * item.quantity)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-4 space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                Subtotal ({itemCount} item{itemCount !== 1 ? "s" : ""})
              </span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>
                {shippingFee === 0 ? (
                  <span className="text-green-600">FREE</span>
                ) : (
                  formatPrice(shippingFee)
                )}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2 text-base font-bold">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          <Button
            className="mt-6 w-full bg-yellow-400 text-gray-900 hover:bg-yellow-500"
            size="lg"
            onClick={handlePlaceOrder}
            disabled={placing || !selectedAddress}
          >
            {placing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Placing Order...
              </>
            ) : (
              "Place Order (COD)"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, MapPin, Package, Heart, Trash2, Pencil, Star } from "lucide-react";

type Profile = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  createdAt: string;
};

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

export function AccountClient() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // Address form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState({
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    pincode: "",
    isDefault: false,
  });
  const [addressSaving, setAddressSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/account");
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
        setName(data.name || "");
        setPhone(data.phone || "");
      }
    } catch {
      toast.error("Failed to load profile");
    }
  }, []);

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await fetch("/api/addresses");
      if (res.ok) {
        const data = await res.json();
        setAddresses(data);
      }
    } catch {
      toast.error("Failed to load addresses");
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchProfile(), fetchAddresses()]).finally(() => setLoading(false));
  }, [fetchProfile, fetchAddresses]);

  async function handleProfileSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone: phone || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update profile");
        return;
      }
      setProfile(data);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  function openAddressForm(address?: Address) {
    if (address) {
      setEditingAddress(address);
      setAddressForm({
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || "",
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        isDefault: address.isDefault,
      });
    } else {
      setEditingAddress(null);
      setAddressForm({
        fullName: "",
        phone: "",
        addressLine1: "",
        addressLine2: "",
        city: "",
        state: "",
        pincode: "",
        isDefault: false,
      });
    }
    setShowAddressForm(true);
  }

  async function handleAddressSave() {
    setAddressSaving(true);
    try {
      const url = editingAddress
        ? `/api/addresses/${editingAddress.id}`
        : "/api/addresses";
      const method = editingAddress ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...addressForm,
          addressLine2: addressForm.addressLine2 || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save address");
        return;
      }
      toast.success(editingAddress ? "Address updated" : "Address added");
      setShowAddressForm(false);
      fetchAddresses();
    } catch {
      toast.error("Failed to save address");
    } finally {
      setAddressSaving(false);
    }
  }

  async function handleDeleteAddress(id: string) {
    if (!confirm("Delete this address?")) return;
    try {
      const res = await fetch(`/api/addresses/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to delete address");
        return;
      }
      toast.success("Address deleted");
      fetchAddresses();
    } catch {
      toast.error("Failed to delete address");
    }
  }

  async function handleSetDefault(id: string) {
    try {
      const address = addresses.find((a) => a.id === id);
      if (!address) return;
      const res = await fetch(`/api/addresses/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...address, isDefault: true }),
      });
      if (!res.ok) {
        toast.error("Failed to set default");
        return;
      }
      toast.success("Default address updated");
      fetchAddresses();
    } catch {
      toast.error("Failed to set default");
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="text-center py-20 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">My Account</h1>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="addresses" className="gap-2">
            <MapPin className="h-4 w-4" />
            Addresses
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="rounded-lg border bg-white p-6">
            <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="text-sm font-medium text-gray-700">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <Input
                  value={profile?.email || ""}
                  disabled
                  className="mt-1 bg-gray-50"
                />
                <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Enter phone number"
                  className="mt-1"
                />
              </div>
              <Button
                onClick={handleProfileSave}
                disabled={saving}
                className="bg-yellow-400 text-gray-900 hover:bg-yellow-500"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>

            {profile?.createdAt && (
              <p className="mt-6 text-xs text-muted-foreground">
                Member since{" "}
                {new Date(profile.createdAt).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "long",
                })}
              </p>
            )}
          </div>

          {/* Quick Links */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              href="/orders"
              className="flex items-center gap-3 rounded-lg border p-4 hover:bg-gray-50 transition-colors"
            >
              <Package className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">My Orders</p>
                <p className="text-sm text-muted-foreground">Track and view orders</p>
              </div>
            </Link>
            <Link
              href="/wishlist"
              className="flex items-center gap-3 rounded-lg border p-4 hover:bg-gray-50 transition-colors"
            >
              <Heart className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">My Wishlist</p>
                <p className="text-sm text-muted-foreground">Saved items</p>
              </div>
            </Link>
          </div>
        </TabsContent>

        {/* Addresses Tab */}
        <TabsContent value="addresses">
          <div className="rounded-lg border bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Saved Addresses</h2>
              <Button
                onClick={() => openAddressForm()}
                variant="outline"
                size="sm"
              >
                Add New Address
              </Button>
            </div>

            {/* Address Form */}
            {showAddressForm && (
              <div className="mb-6 rounded-lg border bg-gray-50 p-4">
                <h3 className="text-sm font-semibold mb-3">
                  {editingAddress ? "Edit Address" : "New Address"}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-medium text-gray-700">Full Name</label>
                    <Input
                      value={addressForm.fullName}
                      onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700">Phone</label>
                    <Input
                      value={addressForm.phone}
                      onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-gray-700">Address Line 1</label>
                    <Input
                      value={addressForm.addressLine1}
                      onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-gray-700">Address Line 2 (optional)</label>
                    <Input
                      value={addressForm.addressLine2}
                      onChange={(e) => setAddressForm({ ...addressForm, addressLine2: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700">City</label>
                    <Input
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700">State</label>
                    <Input
                      value={addressForm.state}
                      onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700">Pincode</label>
                    <Input
                      value={addressForm.pincode}
                      onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-5">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={addressForm.isDefault}
                      onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                    />
                    <label htmlFor="isDefault" className="text-sm">Set as default</label>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={handleAddressSave}
                    disabled={addressSaving}
                    className="bg-yellow-400 text-gray-900 hover:bg-yellow-500"
                    size="sm"
                  >
                    {addressSaving ? "Saving..." : "Save Address"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddressForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Address List */}
            {addresses.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                No addresses saved yet.
              </p>
            ) : (
              <div className="space-y-3">
                {addresses.map((address) => (
                  <div
                    key={address.id}
                    className="flex items-start justify-between rounded-lg border p-4"
                  >
                    <div className="text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900">
                          {address.fullName}
                        </p>
                        {address.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="mr-1 h-3 w-3" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground">{address.addressLine1}</p>
                      {address.addressLine2 && (
                        <p className="text-muted-foreground">{address.addressLine2}</p>
                      )}
                      <p className="text-muted-foreground">
                        {address.city}, {address.state} - {address.pincode}
                      </p>
                      <p className="text-muted-foreground">{address.phone}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {!address.isDefault && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSetDefault(address.id)}
                          title="Set as default"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openAddressForm(address)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteAddress(address.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { ShirtIcon, User, LogOut, Heart, Package, Home } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

interface MobileNavProps {
  onClose: () => void;
}

export function MobileNav({ onClose }: MobileNavProps) {
  const { data: session } = useSession();

  const navLinks = [
    { href: "/", label: "Home", icon: Home },
    { href: "/products?gender=MEN", label: "Men", icon: ShirtIcon },
    { href: "/products?gender=WOMEN", label: "Women", icon: ShirtIcon },
    { href: "/products", label: "All Products", icon: ShirtIcon },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b px-4 py-4">
        <span className="text-lg font-extrabold tracking-tight">
          SHOP<span className="text-yellow-500">.</span>
        </span>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-2 py-4">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <link.icon className="h-4 w-4" />
            {link.label}
          </Link>
        ))}

        <Separator className="my-3" />

        <Link
          href="/wishlist"
          onClick={onClose}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          <Heart className="h-4 w-4" />
          Wishlist
        </Link>
        <Link
          href="/orders"
          onClick={onClose}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          <Package className="h-4 w-4" />
          Orders
        </Link>
      </nav>

      {/* Footer */}
      <div className="border-t px-4 py-4">
        {session?.user ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
                <User className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">{session.user.name}</p>
                <p className="text-xs text-muted-foreground">{session.user.email}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                signOut({ callbackUrl: "/" });
                onClose();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        ) : (
          <Link href="/login" onClick={onClose}>
            <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold">
              Login / Register
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}

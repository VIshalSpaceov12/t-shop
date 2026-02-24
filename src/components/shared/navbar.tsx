"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { ShoppingCart, Heart, User, Search, Menu, LogOut, Package, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { MobileNav } from "./mobile-nav";
import { SearchBar } from "./search-bar";
import { useCart } from "@/hooks/use-cart";

export function Navbar() {
  const { data: session } = useSession();
  const { itemCount } = useCart();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        {/* Left: Mobile menu + Logo */}
        <div className="flex items-center gap-3">
          {mounted ? (
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  data-testid="mobile-menu-trigger"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <MobileNav onClose={() => setMobileNavOpen(false)} />
              </SheetContent>
            </Sheet>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              data-testid="mobile-menu-trigger"
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}

          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-extrabold tracking-tight text-gray-900">
              SHOP<span className="text-yellow-500">.</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="ml-8 hidden items-center gap-6 md:flex">
            <Link
              href="/products?gender=MEN"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Men
            </Link>
            <Link
              href="/products?gender=WOMEN"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Women
            </Link>
            <Link
              href="/products"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              All Products
            </Link>
          </nav>
        </div>

        {/* Center: Search bar (desktop) */}
        <div className="hidden flex-1 max-w-md mx-8 md:block">
          <SearchBar />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Mobile search */}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Search className="h-5 w-5" />
          </Button>

          {/* Wishlist */}
          <Link href="/wishlist">
            <Button variant="ghost" size="icon">
              <Heart className="h-5 w-5" />
            </Button>
          </Link>

          {/* Cart */}
          <Link href="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center"
                  data-testid="cart-badge"
                >
                  {itemCount}
                </Badge>
              )}
            </Button>
          </Link>

          {/* User menu */}
          {session?.user ? (
            mounted ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{session.user.name}</p>
                    <p className="text-xs text-muted-foreground">{session.user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/account" className="cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      My Account
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/orders" className="cursor-pointer">
                      <Package className="mr-2 h-4 w-4" />
                      My Orders
                    </Link>
                  </DropdownMenuItem>
                  {session.user.role === "ADMIN" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="cursor-pointer">
                          <Settings className="mr-2 h-4 w-4" />
                          Admin Panel
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-red-600"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            )
          ) : (
            <Link href="/login">
              <Button variant="ghost" size="sm" className="font-medium">
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

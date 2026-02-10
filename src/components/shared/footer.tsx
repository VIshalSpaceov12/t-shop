import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-block">
              <span className="text-xl font-extrabold tracking-tight text-gray-900">
                SHOP<span className="text-yellow-500">.</span>
              </span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Your one-stop destination for trendy fashion at unbeatable prices.
              Quality meets style, delivered to your doorstep.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Shop
            </h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/products?gender=MEN" className="text-sm text-muted-foreground hover:text-gray-900 transition-colors">
                  Men
                </Link>
              </li>
              <li>
                <Link href="/products?gender=WOMEN" className="text-sm text-muted-foreground hover:text-gray-900 transition-colors">
                  Women
                </Link>
              </li>
              <li>
                <Link href="/products" className="text-sm text-muted-foreground hover:text-gray-900 transition-colors">
                  All Products
                </Link>
              </li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Help
            </h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <span className="text-sm text-muted-foreground">Contact Us</span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">Shipping Info</span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">Returns & Exchange</span>
              </li>
              <li>
                <span className="text-sm text-muted-foreground">Track Order</span>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              Account
            </h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link href="/login" className="text-sm text-muted-foreground hover:text-gray-900 transition-colors">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/register" className="text-sm text-muted-foreground hover:text-gray-900 transition-colors">
                  Register
                </Link>
              </li>
              <li>
                <Link href="/orders" className="text-sm text-muted-foreground hover:text-gray-900 transition-colors">
                  My Orders
                </Link>
              </li>
              <li>
                <Link href="/wishlist" className="text-sm text-muted-foreground hover:text-gray-900 transition-colors">
                  Wishlist
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-10 border-t pt-6">
          <p className="text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} SHOP. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

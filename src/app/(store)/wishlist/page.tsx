import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { WishlistCard } from "@/components/store/wishlist-card";
import { Heart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Wishlist - SHOP",
};

export default async function WishlistPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const wishlist = await prisma.wishlist.findMany({
    where: { userId: session.user.id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          brand: true,
          basePrice: true,
          sellingPrice: true,
          discount: true,
          images: { orderBy: { sortOrder: "asc" }, take: 2 },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">
        My Wishlist ({wishlist.length})
      </h1>

      {wishlist.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Heart className="mb-4 h-16 w-16 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900">
            Your wishlist is empty
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Save items you love for later
          </p>
          <Link href="/products">
            <Button className="mt-4 bg-yellow-400 text-gray-900 hover:bg-yellow-500">
              Explore Products
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {wishlist.map((item) => (
            <WishlistCard key={item.id} product={item.product} />
          ))}
        </div>
      )}
    </div>
  );
}

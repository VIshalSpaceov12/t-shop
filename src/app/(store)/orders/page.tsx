import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { ORDER_STATUSES } from "@/lib/constants";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "My Orders - SHOP",
};

export default async function OrdersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const orders = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: {
                select: {
                  name: true,
                  images: { orderBy: { sortOrder: "asc" }, take: 1 },
                },
              },
            },
          },
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">My Orders</h1>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Package className="mb-4 h-16 w-16 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900">
            No orders yet
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Start shopping to see your orders here
          </p>
          <Link href="/products">
            <Button className="mt-4 bg-yellow-400 text-gray-900 hover:bg-yellow-500">
              Start Shopping
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusInfo = ORDER_STATUSES.find(
              (s) => s.value === order.status
            );
            const itemCount = order.items.reduce(
              (sum, item) => sum + item.quantity,
              0
            );

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block rounded-lg border p-4 transition-colors hover:bg-gray-50"
                data-testid="order-card"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground">
                        Order #{order.id.slice(-8).toUpperCase()}
                      </span>
                      <Badge className={statusInfo?.color || ""}>
                        {statusInfo?.label || order.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      {formatPrice(order.totalAmount)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {itemCount} item{itemCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {/* Item previews */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {order.items.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      className="rounded bg-gray-100 px-2 py-1 text-xs text-muted-foreground"
                    >
                      {item.variant.product.name} ({item.variant.size})
                    </span>
                  ))}
                  {order.items.length > 3 && (
                    <span className="rounded bg-gray-100 px-2 py-1 text-xs text-muted-foreground">
                      +{order.items.length - 3} more
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

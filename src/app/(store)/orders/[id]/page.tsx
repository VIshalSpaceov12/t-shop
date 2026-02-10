import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { ORDER_STATUSES } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { CheckCircle, MapPin, CreditCard, Package, Truck, ArrowLeft } from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return {
    title: `Order #${id.slice(-8).toUpperCase()} - SHOP`,
  };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      address: true,
      items: {
        include: {
          variant: {
            include: {
              product: {
                select: {
                  name: true,
                  slug: true,
                  brand: true,
                  images: { orderBy: { sortOrder: "asc" }, take: 1 },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!order || order.userId !== session.user.id) notFound();

  const statusInfo = ORDER_STATUSES.find((s) => s.value === order.status);
  const itemCount = order.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Back link */}
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </Link>

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              Order Confirmed
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Order #{order.id.slice(-8).toUpperCase()} placed on{" "}
            {new Date(order.createdAt).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <Badge className={`text-sm ${statusInfo?.color || ""}`}>
          {statusInfo?.label || order.status}
        </Badge>
      </div>

      {/* Tracking */}
      {order.trackingNumber && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <Truck className="h-5 w-5 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-900">Tracking Number</p>
            <p className="text-sm text-blue-700">{order.trackingNumber}</p>
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Order Items */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold">
            Items ({itemCount})
          </h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex gap-4 rounded-lg border p-4"
              >
                <Link
                  href={`/products/${item.variant.product.slug}`}
                  className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded bg-gray-100"
                >
                  {item.variant.product.images[0] && (
                    <Image
                      src={item.variant.product.images[0].url}
                      alt={item.variant.product.name}
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  )}
                </Link>
                <div className="flex-1">
                  <Link
                    href={`/products/${item.variant.product.slug}`}
                    className="text-sm font-medium text-gray-900 hover:text-yellow-600"
                  >
                    {item.variant.product.name}
                  </Link>
                  {item.variant.product.brand && (
                    <p className="text-xs text-muted-foreground">
                      {item.variant.product.brand}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {item.variant.size}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {item.variant.color}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Qty: {item.quantity}
                    </span>
                    <span className="font-bold">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Delivery Address */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Delivery Address</h3>
            </div>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-gray-900">
                {order.address.fullName}
              </p>
              <p>{order.address.addressLine1}</p>
              {order.address.addressLine2 && (
                <p>{order.address.addressLine2}</p>
              )}
              <p>
                {order.address.city}, {order.address.state} -{" "}
                {order.address.pincode}
              </p>
              <p className="mt-1">Phone: {order.address.phone}</p>
            </div>
          </div>

          {/* Payment */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Payment</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {order.paymentMethod} - {order.paymentStatus}
            </p>
          </div>

          {/* Order Total */}
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold">Order Total</h3>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {formatPrice(order.totalAmount)}
            </p>
          </div>

          <Link href="/products">
            <Button className="w-full bg-yellow-400 text-gray-900 hover:bg-yellow-500">
              Continue Shopping
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

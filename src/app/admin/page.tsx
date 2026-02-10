import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, FolderTree, ShoppingBag, Users } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export default async function AdminDashboard() {
  const [productCount, categoryCount, orderCount, userCount, revenue] =
    await Promise.all([
      prisma.product.count(),
      prisma.category.count(),
      prisma.order.count(),
      prisma.user.count(),
      prisma.order.aggregate({ _sum: { totalAmount: true } }),
    ]);

  const stats = [
    {
      title: "Total Products",
      value: productCount,
      icon: Package,
      color: "text-blue-600 bg-blue-50",
    },
    {
      title: "Categories",
      value: categoryCount,
      icon: FolderTree,
      color: "text-green-600 bg-green-50",
    },
    {
      title: "Total Orders",
      value: orderCount,
      icon: ShoppingBag,
      color: "text-purple-600 bg-purple-50",
    },
    {
      title: "Total Users",
      value: userCount,
      icon: Users,
      color: "text-orange-600 bg-orange-50",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Overview of your store
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue card */}
      <div className="mt-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {formatPrice(revenue._sum.totalAmount ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

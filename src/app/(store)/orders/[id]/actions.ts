"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function cancelOrder(orderId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "You must be logged in" };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, status: true },
  });

  if (!order) {
    return { error: "Order not found" };
  }

  if (order.userId !== session.user.id) {
    return { error: "Unauthorized" };
  }

  if (order.status !== "PENDING") {
    return { error: "Only pending orders can be cancelled" };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { status: "CANCELLED" },
  });

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");

  return { success: true };
}

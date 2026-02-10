"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Eye } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { ORDER_STATUSES } from "@/lib/constants";
import { toast } from "sonner";

type OrderListItem = {
  id: string;
  status: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  trackingNumber: string | null;
  createdAt: string;
  user: { name: string | null; email: string };
  address: { city: string; state: string };
  _count: { items: number };
};

type OrderDetail = {
  id: string;
  status: string;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  trackingNumber: string | null;
  createdAt: string;
  user: { name: string | null; email: string };
  address: {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    pincode: string;
  };
  items: {
    id: string;
    quantity: number;
    price: number;
    variant: {
      size: string;
      color: string;
      product: {
        name: string;
        slug: string;
        images: { url: string }[];
      };
    };
  }[];
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Detail modal
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString() });
      if (search) params.set("search", search);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/orders?${params}`);
      const data = await res.json();
      setOrders(data.orders);
      setTotalPages(data.pages);
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  async function openDetail(orderId: string) {
    setDetailLoading(true);
    setDetailOpen(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      const data = await res.json();
      setSelectedOrder(data);
      setNewStatus(data.status);
      setTrackingNumber(data.trackingNumber || "");
    } catch {
      toast.error("Failed to load order details");
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleStatusUpdate() {
    if (!selectedOrder || newStatus === selectedOrder.status) return;
    setUpdating(true);
    try {
      const body: Record<string, string> = { status: newStatus };
      if (trackingNumber) body.trackingNumber = trackingNumber;

      const res = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update status");
        return;
      }
      toast.success("Order status updated");
      setSelectedOrder({ ...selectedOrder, status: newStatus, trackingNumber: trackingNumber || null });
      fetchOrders();
    } catch {
      toast.error("Failed to update order");
    } finally {
      setUpdating(false);
    }
  }

  function getStatusBadge(status: string) {
    const info = ORDER_STATUSES.find((s) => s.value === status);
    return (
      <Badge className={info?.color || ""} variant="secondary">
        {info?.label || status}
      </Badge>
    );
  }

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage customer orders
        </p>
      </div>

      {/* Filters */}
      <div className="mt-6 flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by order ID or customer..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="mt-4 rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-center">Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No orders found.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <span className="font-mono text-sm">
                      #{order.id.slice(-8).toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.user.name || "N/A"}</p>
                      <p className="text-xs text-muted-foreground">{order.user.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{order._count.items}</TableCell>
                  <TableCell className="font-medium">{formatPrice(order.totalAmount)}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openDetail(order.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Order #{selectedOrder?.id.slice(-8).toUpperCase()}
            </DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading...</div>
          ) : selectedOrder ? (
            <div className="space-y-6">
              {/* Customer Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Customer</h3>
                <p className="text-sm">{selectedOrder.user.name || "N/A"}</p>
                <p className="text-sm text-muted-foreground">{selectedOrder.user.email}</p>
              </div>

              {/* Items */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Items</h3>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-md border p-2">
                      <div className="h-12 w-12 overflow-hidden rounded bg-gray-100 shrink-0">
                        {item.variant.product.images[0] ? (
                          <Image
                            src={item.variant.product.images[0].url}
                            alt={item.variant.product.name}
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                            No img
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.variant.product.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.variant.size} / {item.variant.color} &times; {item.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-medium">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Address */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Delivery Address</h3>
                <div className="text-sm text-muted-foreground">
                  <p>{selectedOrder.address.fullName}</p>
                  <p>{selectedOrder.address.addressLine1}</p>
                  {selectedOrder.address.addressLine2 && <p>{selectedOrder.address.addressLine2}</p>}
                  <p>{selectedOrder.address.city}, {selectedOrder.address.state} - {selectedOrder.address.pincode}</p>
                  <p>{selectedOrder.address.phone}</p>
                </div>
              </div>

              {/* Order Summary */}
              <div className="flex items-center justify-between border-t pt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Payment: {selectedOrder.paymentMethod}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    Status: {selectedOrder.paymentStatus.toLowerCase()}
                  </p>
                </div>
                <p className="text-lg font-bold">{formatPrice(selectedOrder.totalAmount)}</p>
              </div>

              {/* Status Update */}
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Update Status</h3>
                <div className="flex gap-3">
                  <Select value={newStatus} onValueChange={setNewStatus}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={selectedOrder.status}>
                        {ORDER_STATUSES.find((s) => s.value === selectedOrder.status)?.label || selectedOrder.status} (Current)
                      </SelectItem>
                      {(STATUS_TRANSITIONS[selectedOrder.status] || []).map((s) => (
                        <SelectItem key={s} value={s}>
                          {ORDER_STATUSES.find((os) => os.value === s)?.label || s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleStatusUpdate}
                    disabled={updating || newStatus === selectedOrder.status}
                    className="bg-yellow-400 text-gray-900 hover:bg-yellow-500"
                  >
                    {updating ? "Saving..." : "Save"}
                  </Button>
                </div>

                {(newStatus === "SHIPPED" || selectedOrder.status === "SHIPPED") && (
                  <div className="mt-3">
                    <label className="text-sm font-medium text-gray-700">Tracking Number</label>
                    <Input
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="Enter tracking number"
                      className="mt-1"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

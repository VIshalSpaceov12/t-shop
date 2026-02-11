import { cn } from "@/lib/utils";
import { Check, ShoppingBag, ClipboardCheck, Truck, PackageCheck, XCircle } from "lucide-react";

const TIMELINE_STEPS = [
  { key: "PENDING", label: "Placed", icon: ShoppingBag },
  { key: "CONFIRMED", label: "Confirmed", icon: ClipboardCheck },
  { key: "SHIPPED", label: "Shipped", icon: Truck },
  { key: "DELIVERED", label: "Delivered", icon: PackageCheck },
] as const;

const STATUS_ORDER: Record<string, number> = {
  PENDING: 0,
  CONFIRMED: 1,
  SHIPPED: 2,
  DELIVERED: 3,
};

export function OrderStatusTimeline({ status }: { status: string }) {
  const isCancelled = status === "CANCELLED";
  const currentIndex = STATUS_ORDER[status] ?? -1;

  if (isCancelled) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="font-semibold text-red-800">Order Cancelled</p>
            <p className="text-sm text-red-600">
              This order has been cancelled.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-6">
      <h3 className="mb-6 text-sm font-semibold text-gray-900">Order Status</h3>
      <div className="relative flex items-center justify-between">
        {/* Background connector line */}
        <div className="absolute left-0 right-0 top-5 h-0.5 bg-gray-200" />
        {/* Active connector line */}
        {currentIndex > 0 && (
          <div
            className="absolute top-5 left-0 h-0.5 bg-green-500 transition-all duration-500"
            style={{
              width: `${(currentIndex / (TIMELINE_STEPS.length - 1)) * 100}%`,
            }}
          />
        )}

        {TIMELINE_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          const StepIcon = step.icon;

          return (
            <div
              key={step.key}
              className="relative z-10 flex flex-col items-center"
            >
              {/* Circle */}
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                  isCompleted &&
                    "border-green-500 bg-green-500 text-white",
                  isCurrent &&
                    "border-green-500 bg-white text-green-600 ring-4 ring-green-100",
                  isFuture &&
                    "border-gray-300 bg-white text-gray-400"
                )}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <StepIcon className="h-5 w-5" />
                )}
              </div>

              {/* Label */}
              <span
                className={cn(
                  "mt-2 text-xs font-medium",
                  isCompleted && "text-green-700",
                  isCurrent && "text-green-600",
                  isFuture && "text-gray-400"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

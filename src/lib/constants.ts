export const SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"] as const;

export const GENDERS = [
  { label: "Men", value: "MEN" },
  { label: "Women", value: "WOMEN" },
  { label: "Unisex", value: "UNISEX" },
] as const;

export const ORDER_STATUSES = [
  { label: "Pending", value: "PENDING", color: "bg-yellow-100 text-yellow-800" },
  { label: "Confirmed", value: "CONFIRMED", color: "bg-blue-100 text-blue-800" },
  { label: "Shipped", value: "SHIPPED", color: "bg-purple-100 text-purple-800" },
  { label: "Delivered", value: "DELIVERED", color: "bg-green-100 text-green-800" },
  { label: "Cancelled", value: "CANCELLED", color: "bg-red-100 text-red-800" },
] as const;

export const PRODUCTS_PER_PAGE = 12;

export const SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Discount", value: "discount" },
] as const;

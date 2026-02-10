import { ProductForm } from "@/components/admin/product-form";

export default function NewProductPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Add Product</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create a new product in your catalog
      </p>
      <div className="mt-6">
        <ProductForm />
      </div>
    </div>
  );
}

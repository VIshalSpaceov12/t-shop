import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.banner.deleteMany();
  await prisma.address.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.create({
    data: {
      name: "Admin",
      email: "admin@shop.com",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  // Create customer user
  const customerPassword = await bcrypt.hash("password123", 12);
  const customer = await prisma.user.create({
    data: {
      name: "Test Customer",
      email: "customer@shop.com",
      passwordHash: customerPassword,
      role: "CUSTOMER",
    },
  });
  console.log(`Created customer user: ${customer.email}`);

  // Create categories
  const men = await prisma.category.create({
    data: { name: "Men", slug: "men" },
  });
  const women = await prisma.category.create({
    data: { name: "Women", slug: "women" },
  });
  const tshirts = await prisma.category.create({
    data: { name: "T-Shirts", slug: "t-shirts", parentId: men.id },
  });
  const joggers = await prisma.category.create({
    data: { name: "Joggers", slug: "joggers", parentId: men.id },
  });
  const dresses = await prisma.category.create({
    data: { name: "Dresses", slug: "dresses", parentId: women.id },
  });
  const tops = await prisma.category.create({
    data: { name: "Tops", slug: "tops", parentId: women.id },
  });
  console.log("Created 6 categories");

  // Create products
  const products = [
    {
      name: "Classic Cotton T-Shirt",
      slug: "classic-cotton-tshirt",
      description: "A comfortable everyday essential made from 100% pure cotton.",
      brand: "SHOP",
      basePrice: 799,
      sellingPrice: 499,
      discount: 38,
      categoryId: tshirts.id,
      gender: "MEN" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Graphic Print Tee",
      slug: "graphic-print-tee",
      description: "Express yourself with this bold graphic print t-shirt.",
      brand: "SHOP",
      basePrice: 999,
      sellingPrice: 599,
      discount: 40,
      categoryId: tshirts.id,
      gender: "MEN" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Slim Fit Joggers",
      slug: "slim-fit-joggers",
      description: "Comfortable slim fit joggers for everyday wear.",
      brand: "SHOP",
      basePrice: 1499,
      sellingPrice: 999,
      discount: 33,
      categoryId: joggers.id,
      gender: "MEN" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Cargo Joggers",
      slug: "cargo-joggers",
      description: "Utility-style cargo joggers with multiple pockets.",
      brand: "SHOP",
      basePrice: 1799,
      sellingPrice: 1299,
      discount: 28,
      categoryId: joggers.id,
      gender: "MEN" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Floral Summer Dress",
      slug: "floral-summer-dress",
      description: "A beautiful floral print dress perfect for summer outings.",
      brand: "SHOP",
      basePrice: 1999,
      sellingPrice: 1299,
      discount: 35,
      categoryId: dresses.id,
      gender: "WOMEN" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Casual Maxi Dress",
      slug: "casual-maxi-dress",
      description: "Elegant and comfortable maxi dress for any occasion.",
      brand: "SHOP",
      basePrice: 2499,
      sellingPrice: 1799,
      discount: 28,
      categoryId: dresses.id,
      gender: "WOMEN" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Crop Top",
      slug: "crop-top",
      description: "Trendy crop top for a stylish casual look.",
      brand: "SHOP",
      basePrice: 699,
      sellingPrice: 449,
      discount: 36,
      categoryId: tops.id,
      gender: "WOMEN" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Oversized T-Shirt",
      slug: "oversized-tshirt",
      description: "Relaxed fit oversized t-shirt for ultimate comfort.",
      brand: "SHOP",
      basePrice: 899,
      sellingPrice: 649,
      discount: 28,
      categoryId: tshirts.id,
      gender: "UNISEX" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Polo T-Shirt",
      slug: "polo-tshirt",
      description: "Classic polo t-shirt with a modern fit.",
      brand: "SHOP",
      basePrice: 1199,
      sellingPrice: 799,
      discount: 33,
      categoryId: tshirts.id,
      gender: "MEN" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Ribbed Knit Top",
      slug: "ribbed-knit-top",
      description: "Soft ribbed knit top with a flattering fit.",
      brand: "SHOP",
      basePrice: 899,
      sellingPrice: 599,
      discount: 33,
      categoryId: tops.id,
      gender: "WOMEN" as const,
      status: "ACTIVE" as const,
    },
  ];

  const colors = [
    { name: "Black", hex: "#000000" },
    { name: "White", hex: "#FFFFFF" },
    { name: "Navy", hex: "#1E3A5F" },
    { name: "Red", hex: "#DC2626" },
    { name: "Green", hex: "#16A34A" },
  ];
  const sizes = ["S", "M", "L", "XL"];

  for (const productData of products) {
    const product = await prisma.product.create({ data: productData });

    // Add 2 colors x 4 sizes = 8 variants per product
    const productColors = colors.slice(0, 2);
    for (const color of productColors) {
      for (const size of sizes) {
        await prisma.productVariant.create({
          data: {
            productId: product.id,
            size,
            color: color.name,
            colorHex: color.hex,
            sku: `${product.slug}-${color.name.toLowerCase()}-${size.toLowerCase()}`,
            stock: Math.floor(Math.random() * 50) + 5,
          },
        });
      }
    }

    // Add placeholder images
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: `https://placehold.co/600x800/f3f4f6/a3a3a3?text=${encodeURIComponent(product.name)}`,
        altText: product.name,
        sortOrder: 0,
        isPrimary: true,
      },
    });
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: `https://placehold.co/600x800/e5e7eb/737373?text=${encodeURIComponent(product.name)}+Back`,
        altText: `${product.name} - Back`,
        sortOrder: 1,
        isPrimary: false,
      },
    });
  }
  console.log(`Created ${products.length} products with variants and images`);

  // Create banners
  const banners = [
    {
      title: "New Arrivals",
      image: "https://placehold.co/1440x500/ffd232/000000?text=NEW+ARRIVALS+-+Up+to+50%25+Off",
      link: "/products?sort=newest",
      position: "home_top",
      isActive: true,
      sortOrder: 0,
    },
    {
      title: "Men's Collection",
      image: "https://placehold.co/1440x500/1e3a5f/ffffff?text=MEN%27S+COLLECTION",
      link: "/products?gender=MEN",
      position: "home_top",
      isActive: true,
      sortOrder: 1,
    },
    {
      title: "Women's Collection",
      image: "https://placehold.co/1440x500/dc2626/ffffff?text=WOMEN%27S+COLLECTION",
      link: "/products?gender=WOMEN",
      position: "home_top",
      isActive: true,
      sortOrder: 2,
    },
  ];

  for (const banner of banners) {
    await prisma.banner.create({ data: banner });
  }
  console.log(`Created ${banners.length} banners`);

  console.log("\nSeed completed!");
  console.log("Admin login: admin@shop.com / admin123");
  console.log("Customer login: customer@shop.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

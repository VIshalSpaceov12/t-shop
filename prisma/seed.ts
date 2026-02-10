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
      name: "Anime Oversized Tee",
      slug: "anime-oversized-tee",
      description: "Oversized drop-shoulder tee with bold anime-inspired graphic print. 100% cotton, perfect for the otaku streetwear look.",
      brand: "SHOP",
      basePrice: 999,
      sellingPrice: 599,
      discount: 40,
      categoryId: tshirts.id,
      gender: "MEN" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Manga Art Print Tee",
      slug: "manga-art-print-tee",
      description: "Express your inner weeb with this manga-style art print t-shirt. Premium quality with vibrant graphics that won't fade.",
      brand: "SHOP",
      basePrice: 899,
      sellingPrice: 549,
      discount: 39,
      categoryId: tshirts.id,
      gender: "MEN" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Streetwear Joggers",
      slug: "streetwear-joggers",
      description: "Slim fit joggers with Japanese kanji side stripe. Perfect pairing for your anime tees.",
      brand: "SHOP",
      basePrice: 1499,
      sellingPrice: 999,
      discount: 33,
      categoryId: joggers.id,
      gender: "MEN" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Cargo Tech Joggers",
      slug: "cargo-tech-joggers",
      description: "Utility-style cargo joggers with techwear aesthetic. Multiple pockets, tapered fit, cyberpunk vibes.",
      brand: "SHOP",
      basePrice: 1799,
      sellingPrice: 1299,
      discount: 28,
      categoryId: joggers.id,
      gender: "MEN" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Kawaii Summer Dress",
      slug: "kawaii-summer-dress",
      description: "Cute kawaii-inspired summer dress with playful patterns. Light and breezy for sunny adventures.",
      brand: "SHOP",
      basePrice: 1999,
      sellingPrice: 1299,
      discount: 35,
      categoryId: dresses.id,
      gender: "WOMEN" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Harajuku Maxi Dress",
      slug: "harajuku-maxi-dress",
      description: "Elegant maxi dress with Harajuku-inspired colorful patterns. Stand out with J-fashion style.",
      brand: "SHOP",
      basePrice: 2499,
      sellingPrice: 1799,
      discount: 28,
      categoryId: dresses.id,
      gender: "WOMEN" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Anime Crop Top",
      slug: "anime-crop-top",
      description: "Trendy crop top with anime character silhouette print. Pair with high-waist jeans for the perfect cosplay-casual look.",
      brand: "SHOP",
      basePrice: 699,
      sellingPrice: 449,
      discount: 36,
      categoryId: tops.id,
      gender: "WOMEN" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Naruto Graphic Tee",
      slug: "naruto-graphic-tee",
      description: "Oversized t-shirt featuring ninja-inspired graphic art. Heavy cotton, relaxed fit, street-ready.",
      brand: "SHOP",
      basePrice: 899,
      sellingPrice: 649,
      discount: 28,
      categoryId: tshirts.id,
      gender: "UNISEX" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Dragon Art Polo",
      slug: "dragon-art-polo",
      description: "Classic polo with embroidered dragon art motif. Japanese-inspired design meets smart casual.",
      brand: "SHOP",
      basePrice: 1199,
      sellingPrice: 799,
      discount: 33,
      categoryId: tshirts.id,
      gender: "MEN" as const,
      status: "ACTIVE" as const,
    },
    {
      name: "Sakura Knit Top",
      slug: "sakura-knit-top",
      description: "Soft ribbed knit top with delicate sakura (cherry blossom) pattern. Feminine and flattering.",
      brand: "SHOP",
      basePrice: 899,
      sellingPrice: 599,
      discount: 33,
      categoryId: tops.id,
      gender: "WOMEN" as const,
      status: "ACTIVE" as const,
    },
  ];

  // Unsplash image mapping per product (free to use)
  const productImages: Record<string, [string, string]> = {
    "anime-oversized-tee": [
      "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&h=800&fit=crop&q=80",
      "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=600&h=800&fit=crop&q=80",
    ],
    "manga-art-print-tee": [
      "https://images.unsplash.com/photo-1618517351616-38fb9c5210c6?w=600&h=800&fit=crop&q=80",
      "https://images.unsplash.com/photo-1523381294911-8d3cead13475?w=600&h=800&fit=crop&q=80",
    ],
    "streetwear-joggers": [
      "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600&h=800&fit=crop&q=80",
      "https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=800&fit=crop&q=80",
    ],
    "cargo-tech-joggers": [
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=600&h=800&fit=crop&q=80",
      "https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=600&h=800&fit=crop&q=80",
    ],
    "kawaii-summer-dress": [
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600&h=800&fit=crop&q=80",
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop&q=80",
    ],
    "harajuku-maxi-dress": [
      "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600&h=800&fit=crop&q=80",
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=600&h=800&fit=crop&q=80",
    ],
    "anime-crop-top": [
      "https://images.unsplash.com/photo-1604176354204-9268737828e4?w=600&h=800&fit=crop&q=80",
      "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&h=800&fit=crop&q=80",
    ],
    "naruto-graphic-tee": [
      "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=600&h=800&fit=crop&q=80",
      "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&h=800&fit=crop&q=80",
    ],
    "dragon-art-polo": [
      "https://images.unsplash.com/photo-1578587018452-892bacefd3f2?w=600&h=800&fit=crop&q=80",
      "https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=600&h=800&fit=crop&q=80",
    ],
    "sakura-knit-top": [
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop&q=80",
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=600&h=800&fit=crop&q=80",
    ],
  };

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

    // Add real product images from Unsplash
    const images = productImages[product.slug];
    if (images) {
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: images[0],
          altText: product.name,
          sortOrder: 0,
          isPrimary: true,
        },
      });
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: images[1],
          altText: `${product.name} - Back`,
          sortOrder: 1,
          isPrimary: false,
        },
      });
    }
  }
  console.log(`Created ${products.length} products with variants and images`);

  // Create banners with Unsplash images
  const banners = [
    {
      title: "New Arrivals",
      image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1440&h=500&fit=crop&q=80",
      link: "/products?sort=newest",
      position: "home_top",
      isActive: true,
      sortOrder: 0,
    },
    {
      title: "Men's Collection",
      image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1440&h=500&fit=crop&q=80",
      link: "/products?gender=MEN",
      position: "home_top",
      isActive: true,
      sortOrder: 1,
    },
    {
      title: "Women's Collection",
      image: "https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1440&h=500&fit=crop&q=80",
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

  // Create customer addresses
  const address1 = await prisma.address.create({
    data: {
      userId: customer.id,
      fullName: "Test Customer",
      phone: "9876543210",
      addressLine1: "123 MG Road",
      addressLine2: "Apt 4B",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      isDefault: true,
    },
  });
  const address2 = await prisma.address.create({
    data: {
      userId: customer.id,
      fullName: "Test Customer",
      phone: "9876543210",
      addressLine1: "456 Brigade Road",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560001",
      isDefault: false,
    },
  });
  console.log("Created 2 customer addresses");

  // Create sample orders
  // Get some variants for order items
  const sampleVariants = await prisma.productVariant.findMany({
    take: 5,
    include: { product: true },
  });

  if (sampleVariants.length >= 3) {
    // Order 1: Delivered
    const order1 = await prisma.order.create({
      data: {
        userId: customer.id,
        addressId: address1.id,
        status: "DELIVERED",
        totalAmount: sampleVariants[0].product.sellingPrice + sampleVariants[1].product.sellingPrice,
        paymentMethod: "COD",
        paymentStatus: "PAID",
        trackingNumber: "TRACK123456789",
      },
    });
    await prisma.orderItem.createMany({
      data: [
        {
          orderId: order1.id,
          variantId: sampleVariants[0].id,
          quantity: 1,
          price: sampleVariants[0].product.sellingPrice,
        },
        {
          orderId: order1.id,
          variantId: sampleVariants[1].id,
          quantity: 1,
          price: sampleVariants[1].product.sellingPrice,
        },
      ],
    });

    // Order 2: Shipped
    const order2 = await prisma.order.create({
      data: {
        userId: customer.id,
        addressId: address1.id,
        status: "SHIPPED",
        totalAmount: sampleVariants[2].product.sellingPrice * 2,
        paymentMethod: "COD",
        paymentStatus: "UNPAID",
        trackingNumber: "TRACK987654321",
      },
    });
    await prisma.orderItem.create({
      data: {
        orderId: order2.id,
        variantId: sampleVariants[2].id,
        quantity: 2,
        price: sampleVariants[2].product.sellingPrice,
      },
    });

    // Order 3: Pending
    const order3 = await prisma.order.create({
      data: {
        userId: customer.id,
        addressId: address2.id,
        status: "PENDING",
        totalAmount: sampleVariants[3].product.sellingPrice + sampleVariants[4].product.sellingPrice,
        paymentMethod: "COD",
        paymentStatus: "UNPAID",
      },
    });
    await prisma.orderItem.createMany({
      data: [
        {
          orderId: order3.id,
          variantId: sampleVariants[3].id,
          quantity: 1,
          price: sampleVariants[3].product.sellingPrice,
        },
        {
          orderId: order3.id,
          variantId: sampleVariants[4].id,
          quantity: 1,
          price: sampleVariants[4].product.sellingPrice,
        },
      ],
    });
    console.log("Created 3 sample orders with items");
  }

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

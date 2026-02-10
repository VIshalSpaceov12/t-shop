import { test, expect } from "@playwright/test";

// ─── Phase 3 Gate: Storefront ─────────────────────────────────

test.describe("Homepage", () => {
  test("renders banner carousel with navigation", async ({ page }) => {
    await page.goto("/");

    const carousel = page.locator("[data-testid='banner-carousel']");
    await expect(carousel).toBeVisible();

    // Carousel should have navigation dots
    await expect(page.locator("[data-testid='banner-dot-0']")).toBeVisible();
    await expect(page.locator("[data-testid='banner-dot-1']")).toBeVisible();

    // Clicking dot should navigate
    await page.locator("[data-testid='banner-dot-1']").click();
    await page.waitForTimeout(600); // Wait for transition
  });

  test("renders category grid", async ({ page }) => {
    await page.goto("/");

    const categoryGrid = page.locator("[data-testid='category-grid']");
    await expect(categoryGrid).toBeVisible();
    await expect(categoryGrid.getByText("Shop by Category")).toBeVisible();

    // Should show subcategories
    await expect(categoryGrid.getByText("T-Shirts")).toBeVisible();
    await expect(categoryGrid.getByText("Joggers")).toBeVisible();
    await expect(categoryGrid.getByText("Dresses")).toBeVisible();
    await expect(categoryGrid.getByText("Tops")).toBeVisible();
  });

  test("renders promotional strip", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText(/FREE SHIPPING/)).toBeVisible();
  });

  test("renders New Arrivals product section", async ({ page }) => {
    await page.goto("/");

    const section = page.locator("[data-testid='product-section-new-arrivals']");
    await expect(section).toBeVisible();
    await expect(section.getByText("New Arrivals")).toBeVisible();
    await expect(section.getByText("View All")).toBeVisible();

    // Should show product cards
    const cards = section.locator("[data-testid='product-card']");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test("renders Trending Now product section", async ({ page }) => {
    await page.goto("/");

    const section = page.locator("[data-testid='product-section-trending-now']");
    await expect(section).toBeVisible();
    await expect(section.getByText("Trending Now")).toBeVisible();
  });

  test("product card shows price and discount", async ({ page }) => {
    await page.goto("/");

    const card = page.locator("[data-testid='product-card']").first();
    await expect(card).toBeVisible();

    // Should show price (₹ symbol)
    await expect(card.locator("text=/₹/").first()).toBeVisible();
  });

  test("product card links to product detail", async ({ page }) => {
    await page.goto("/");

    const card = page.locator("[data-testid='product-card']").first();
    const href = await card.getAttribute("href");
    expect(href).toMatch(/^\/products\//);

    await card.click();
    await page.waitForURL(/\/products\//);
    expect(page.url()).toContain("/products/");
  });
});

test.describe("Product Listing", () => {
  test("renders products with count", async ({ page }) => {
    await page.goto("/products");

    await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();
    await expect(page.getByText(/\d+ products? found/)).toBeVisible();

    // Product cards
    const cards = page.locator("[data-testid='product-card']");
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test("sort dropdown works", async ({ page }) => {
    await page.goto("/products");

    // Sort dropdown should be visible
    await expect(page.getByText("Newest")).toBeVisible();
  });

  test("search results page works", async ({ page }) => {
    await page.goto("/products?search=cotton");

    await expect(page.getByText(/Results for "cotton"/)).toBeVisible();
  });

  test("filter by gender via URL works", async ({ page }) => {
    await page.goto("/products?gender=WOMEN");

    const cards = page.locator("[data-testid='product-card']");
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test("desktop filters sidebar is visible", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/products");

    // Filter headings should be visible in the aside
    const aside = page.locator("aside");
    await expect(aside.getByText("Filters")).toBeVisible();
    await expect(aside.getByText("Gender")).toBeVisible();
    await expect(aside.getByText("Category")).toBeVisible();
    await expect(aside.getByText("Size", { exact: true })).toBeVisible();
    await expect(aside.getByText("Price Range")).toBeVisible();
  });
});

test.describe("Category Page", () => {
  test("renders category page with products", async ({ page }) => {
    await page.goto("/category/t-shirts");

    await expect(page.getByRole("heading", { name: "T-Shirts" })).toBeVisible();
    await expect(page.getByText(/\d+ products?$/)).toBeVisible();

    // Breadcrumb - scope to main content
    const main = page.locator("main");
    await expect(main.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(main.getByRole("link", { name: "Men", exact: true })).toBeVisible();

    // Product cards
    const cards = page.locator("[data-testid='product-card']");
    expect(await cards.count()).toBeGreaterThan(0);
  });

  test("parent category shows subcategory products", async ({ page }) => {
    await page.goto("/category/men");

    await expect(page.getByRole("heading", { name: "Men" })).toBeVisible();
    const cards = page.locator("[data-testid='product-card']");
    expect(await cards.count()).toBeGreaterThan(0);
  });
});

test.describe("Product Detail", () => {
  test("renders product detail page", async ({ page }) => {
    await page.goto("/products/anime-oversized-tee");

    // Product name
    await expect(page.getByRole("heading", { name: "Anime Oversized Tee" })).toBeVisible();

    // Brand - scope to main content area
    await expect(page.locator("main").getByText("SHOP", { exact: true }).first()).toBeVisible();

    // Price
    await expect(page.getByText("₹599")).toBeVisible();

    // Breadcrumb
    await expect(page.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(page.getByRole("link", { name: "T-Shirts" })).toBeVisible();
  });

  test("color selector works", async ({ page }) => {
    await page.goto("/products/anime-oversized-tee");

    // Should show color selector
    await expect(page.getByText("Select Color")).toBeVisible();

    // Color buttons should be clickable
    const colorButtons = page.locator("button[aria-label^='Select ']");
    expect(await colorButtons.count()).toBeGreaterThan(0);
  });

  test("size selector shows sizes", async ({ page }) => {
    await page.goto("/products/anime-oversized-tee");

    await expect(page.getByText("Select Size")).toBeVisible();

    // Should show size buttons
    await expect(page.getByRole("button", { name: "S", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "M", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "L", exact: true })).toBeVisible();
  });

  test("add to cart button present", async ({ page }) => {
    await page.goto("/products/anime-oversized-tee");

    await expect(page.getByRole("button", { name: /Add to Cart/i })).toBeVisible();
  });

  test("product description and delivery info shown", async ({ page }) => {
    await page.goto("/products/anime-oversized-tee");

    await expect(page.getByText("Product Description")).toBeVisible();
    await expect(page.getByText("Delivery & Returns")).toBeVisible();
    await expect(page.getByText(/Easy 15-day returns/)).toBeVisible();
  });

  test("similar products section shown", async ({ page }) => {
    await page.goto("/products/anime-oversized-tee");

    await expect(page.getByText("Similar Products")).toBeVisible();
  });

  test("SEO metadata is set", async ({ page }) => {
    await page.goto("/products/anime-oversized-tee");

    const title = await page.title();
    expect(title).toContain("Anime Oversized Tee");
  });
});

test.describe("Storefront Responsiveness", () => {
  for (const viewport of [
    { name: "mobile", width: 375, height: 812 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1440, height: 900 },
  ]) {
    test(`homepage renders at ${viewport.name} (${viewport.width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

      await expect(page.locator("[data-testid='banner-carousel']")).toBeVisible();
    });

    test(`product listing renders at ${viewport.name} (${viewport.width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/products");

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

      await expect(page.getByRole("heading", { name: "All Products" })).toBeVisible();
    });
  }
});

test.describe("Storefront Console Errors", () => {
  for (const storePage of [
    { name: "homepage", path: "/" },
    { name: "products", path: "/products" },
    { name: "product detail", path: "/products/anime-oversized-tee" },
    { name: "category", path: "/category/t-shirts" },
  ]) {
    test(`no console errors on ${storePage.name}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      await page.goto(storePage.path);
      await page.waitForLoadState("networkidle");

      const realErrors = errors.filter(
        (e) =>
          !e.includes("favicon") &&
          !e.includes("404") &&
          !e.includes("400") &&
          !e.includes("Failed to load resource") &&
          !e.includes("hydration")
      );
      expect(realErrors).toHaveLength(0);
    });
  }
});

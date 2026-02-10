import { test, expect } from "@playwright/test";

// Helper: login as admin
async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.locator("input[name='email']").fill("admin@shop.com");
  await page.locator("input[name='password']").fill("admin123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("/", { timeout: 10000 });
}

// ─── Phase 2 Gate: Admin Panel ────────────────────────────────

test.describe("Admin Access Control", () => {
  test("unauthenticated user is redirected from /admin to /login", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("non-admin user is redirected from /admin", async ({ page }) => {
    await page.goto("/login");
    await page.locator("input[name='email']").fill("customer@shop.com");
    await page.locator("input[name='password']").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL("/", { timeout: 10000 });

    await page.goto("/admin");
    await page.waitForURL((url) => !url.pathname.startsWith("/admin"), {
      timeout: 10000,
    });
    expect(page.url()).not.toContain("/admin");
  });
});

test.describe("Admin Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("dashboard renders with stats cards", async ({ page }) => {
    await page.goto("/admin");

    // Use heading role to be specific
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    await expect(page.getByText("Total Products")).toBeVisible();
    await expect(page.getByText("Total Orders")).toBeVisible();
    await expect(page.getByText("Total Users")).toBeVisible();
    await expect(page.getByText("Total Revenue")).toBeVisible();
  });

  test("sidebar navigation works", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/admin");

    // Navigate to products via sidebar link
    await page.getByRole("link", { name: "Products" }).first().click();
    await page.waitForURL(/\/admin\/products/);
    expect(page.url()).toContain("/admin/products");

    // Navigate to categories
    await page.getByRole("link", { name: "Categories" }).first().click();
    await page.waitForURL(/\/admin\/categories/);
    expect(page.url()).toContain("/admin/categories");

    // Navigate to banners
    await page.getByRole("link", { name: "Banners" }).first().click();
    await page.waitForURL(/\/admin\/banners/);
    expect(page.url()).toContain("/admin/banners");
  });
});

test.describe("Admin Categories", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("categories page lists seeded categories", async ({ page }) => {
    await page.goto("/admin/categories");

    await expect(page.getByRole("heading", { name: "Categories" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add Category" })).toBeVisible();

    // Should see seeded categories in the table (use row-based checks)
    await expect(page.getByRole("cell", { name: "Men", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("cell", { name: "Women", exact: true }).first()).toBeVisible();
    await expect(page.getByRole("cell", { name: "T-Shirts", exact: true })).toBeVisible();
  });

  test("can open create category dialog", async ({ page }) => {
    await page.goto("/admin/categories");

    await page.getByRole("button", { name: "Add Category" }).click();

    // Dialog should be visible
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator("input#name")).toBeVisible();
    await expect(page.getByText("Parent Category")).toBeVisible();
  });
});

test.describe("Admin Products", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("products page lists seeded products", async ({ page }) => {
    await page.goto("/admin/products");

    await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();

    // Should see seeded products in the table
    const table = page.locator("table");
    await expect(table.getByText("Classic Cotton T-Shirt")).toBeVisible();
    await expect(table.getByText("Graphic Print Tee")).toBeVisible();
  });

  test("products page has search and status filter", async ({ page }) => {
    await page.goto("/admin/products");

    await expect(page.getByPlaceholder("Search products...")).toBeVisible();
    await expect(page.getByText("All Status")).toBeVisible();
  });

  test("add product page renders with form sections", async ({ page }) => {
    await page.goto("/admin/products/new");

    await expect(page.getByRole("heading", { name: "Add Product" })).toBeVisible();
    await expect(page.getByText("Basic Information")).toBeVisible();
    await expect(page.getByText("Pricing")).toBeVisible();
    await expect(page.getByText("Variants", { exact: true })).toBeVisible();
    await expect(page.getByText("Images", { exact: true })).toBeVisible();
  });
});

test.describe("Admin Banners", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("banners page lists seeded banners", async ({ page }) => {
    await page.goto("/admin/banners");

    await expect(page.getByRole("heading", { name: "Banners" })).toBeVisible();

    // Should see seeded banners in the table
    await expect(page.getByText("New Arrivals", { exact: true })).toBeVisible();
    await expect(page.getByText("Men's Collection", { exact: true })).toBeVisible();
    await expect(page.getByText("Women's Collection", { exact: true })).toBeVisible();
  });

  test("can open create banner dialog", async ({ page }) => {
    await page.goto("/admin/banners");

    await page.getByRole("button", { name: "Add Banner" }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator("input#title")).toBeVisible();
  });
});

test.describe("Admin Responsiveness", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  for (const viewport of [
    { name: "mobile", width: 375, height: 812 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1440, height: 900 },
  ]) {
    test(`admin dashboard renders at ${viewport.name} (${viewport.width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto("/admin");

      // No horizontal scroll
      const scrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth
      );
      const clientWidth = await page.evaluate(
        () => document.documentElement.clientWidth
      );
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

      // Dashboard loads
      await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
    });
  }
});

test.describe("Admin Console Errors", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  for (const adminPage of [
    { name: "dashboard", path: "/admin" },
    { name: "categories", path: "/admin/categories" },
    { name: "products", path: "/admin/products" },
    { name: "banners", path: "/admin/banners" },
  ]) {
    test(`no console errors on admin ${adminPage.name}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          errors.push(msg.text());
        }
      });

      await page.goto(adminPage.path);
      await page.waitForLoadState("networkidle");

      // Filter out expected errors (favicon, 404, image loading from placeholder service)
      const realErrors = errors.filter(
        (e) =>
          !e.includes("favicon") &&
          !e.includes("404") &&
          !e.includes("400") &&
          !e.includes("Failed to load resource")
      );
      expect(realErrors).toHaveLength(0);
    });
  }
});

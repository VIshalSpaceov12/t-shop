import { test, expect } from "@playwright/test";

// ─── Phase 4 Gate: Shopping Phase ────────────────────────────

// Helper: login as customer
async function loginAsCustomer(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.fill('input[name="email"]', "customer@shop.com");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("/", { timeout: 10000 });
}

// ─── Cart ────────────────────────────────────────────────────

test.describe("Cart", () => {
  test("cart page renders for logged-in user", async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto("/cart");
    await expect(
      page.getByRole("heading", { name: "Shopping Cart" })
    ).toBeVisible();
    // May be empty or have items from other tests
    const hasItems = await page.locator("[data-testid='cart-item']").count();
    if (hasItems === 0) {
      await expect(page.getByText("Your cart is empty")).toBeVisible();
      await expect(page.getByText("Continue Shopping")).toBeVisible();
    } else {
      await expect(page.getByText("Order Summary")).toBeVisible();
    }
  });

  test("cart page shows login prompt for unauthenticated user", async ({
    page,
  }) => {
    await page.goto("/cart");
    await expect(
      page.getByText("Please login to view your cart")
    ).toBeVisible();
  });

  test("add to cart from product detail", async ({ page }) => {
    await loginAsCustomer(page);

    // Go to first product
    await page.goto("/products");
    await page.locator("[data-testid='product-card']").first().click();
    await page.waitForURL(/\/products\//);

    // Select a color (first available)
    const colorButton = page.locator('[aria-label^="Select "]').first();
    if (await colorButton.isVisible()) {
      await colorButton.click();
    }

    // Select a size (first in-stock one)
    const sizeButton = page
      .locator("button")
      .filter({ hasText: /^(XS|S|M|L|XL|XXL|3XL)$/ })
      .first();
    if (await sizeButton.isVisible()) {
      await sizeButton.click();
    }

    // Click add to cart
    await page.click("text=Add to Cart");

    // Should see success toast
    await expect(page.getByText("added to cart")).toBeVisible({
      timeout: 5000,
    });
  });

  test("cart page shows items after adding", async ({ page }) => {
    await loginAsCustomer(page);

    // First add an item
    await page.goto("/products");
    await page.locator("[data-testid='product-card']").first().click();
    await page.waitForURL(/\/products\//);

    const colorButton = page.locator('[aria-label^="Select "]').first();
    if (await colorButton.isVisible()) await colorButton.click();

    const sizeButton = page
      .locator("button")
      .filter({ hasText: /^(XS|S|M|L|XL|XXL|3XL)$/ })
      .first();
    if (await sizeButton.isVisible()) await sizeButton.click();

    await page.click("text=Add to Cart");
    await expect(page.getByText("added to cart")).toBeVisible({
      timeout: 5000,
    });

    // Navigate to cart
    await page.goto("/cart");
    await expect(
      page.getByRole("heading", { name: "Shopping Cart" })
    ).toBeVisible();
    await expect(page.locator("[data-testid='cart-item']")).toHaveCount(1, {
      timeout: 5000,
    });

    // Should show order summary
    await expect(page.getByText("Order Summary")).toBeVisible();
    await expect(page.getByText("Proceed to Checkout")).toBeVisible();
  });

  test("cart badge updates in navbar after adding item", async ({ page }) => {
    await loginAsCustomer(page);

    // Add an item
    await page.goto("/products");
    await page.locator("[data-testid='product-card']").first().click();
    await page.waitForURL(/\/products\//);

    const colorButton = page.locator('[aria-label^="Select "]').first();
    if (await colorButton.isVisible()) await colorButton.click();

    const sizeButton = page
      .locator("button")
      .filter({ hasText: /^(XS|S|M|L|XL|XXL|3XL)$/ })
      .first();
    if (await sizeButton.isVisible()) await sizeButton.click();

    await page.click("text=Add to Cart");
    await expect(page.getByText("added to cart")).toBeVisible({
      timeout: 5000,
    });

    // Cart badge should appear
    await expect(page.locator("[data-testid='cart-badge']")).toBeVisible({
      timeout: 5000,
    });
  });
});

// ─── Wishlist ────────────────────────────────────────────────

test.describe("Wishlist", () => {
  test("wishlist page renders for logged-in user", async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto("/wishlist");
    await expect(
      page.getByRole("heading", { name: /My Wishlist/ })
    ).toBeVisible();
    // May be empty or have items from other tests
  });

  test("wishlist page redirects unauthenticated users", async ({ page }) => {
    await page.goto("/wishlist");
    await page.waitForURL(/\/login/);
  });

  test("heart button toggles wishlist on product detail", async ({
    page,
  }) => {
    await loginAsCustomer(page);

    await page.goto("/products");
    await page.locator("[data-testid='product-card']").first().click();
    await page.waitForURL(/\/products\//);

    // Click heart button - may add or remove depending on current state
    const heartButton = page.getByRole("button", {
      name: /wishlist/i,
    });
    await heartButton.click();

    // Should show either "Added to wishlist" or "Removed from wishlist"
    await expect(
      page.getByText(/(?:Added to|Removed from) wishlist/)
    ).toBeVisible({ timeout: 5000 });
  });
});

// ─── Checkout ────────────────────────────────────────────────

test.describe("Checkout", () => {
  test("checkout page redirects unauthenticated users", async ({ page }) => {
    await page.goto("/checkout");
    await page.waitForURL(/\/login/);
  });

  test("checkout page renders with address and payment sections", async ({
    page,
  }) => {
    await loginAsCustomer(page);

    // Add item to cart first
    await page.goto("/products");
    await page.locator("[data-testid='product-card']").first().click();
    await page.waitForURL(/\/products\//);

    const colorButton = page.locator('[aria-label^="Select "]').first();
    if (await colorButton.isVisible()) await colorButton.click();

    const sizeButton = page
      .locator("button")
      .filter({ hasText: /^(XS|S|M|L|XL|XXL|3XL)$/ })
      .first();
    if (await sizeButton.isVisible()) await sizeButton.click();

    await page.click("text=Add to Cart");
    await expect(page.getByText("added to cart")).toBeVisible({
      timeout: 5000,
    });

    // Navigate to cart, then to checkout
    await page.goto("/cart");
    await expect(page.getByText("Proceed to Checkout")).toBeVisible({
      timeout: 5000,
    });
    await page.click("text=Proceed to Checkout");
    await page.waitForURL(/\/checkout/);

    await expect(
      page.getByRole("heading", { name: "Checkout" })
    ).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Delivery Address")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText("Payment Method")).toBeVisible();
    await expect(page.getByText("Cash on Delivery")).toBeVisible();
    await expect(page.getByText("Order Summary")).toBeVisible();
  });

  test("can add new address on checkout", async ({ page }) => {
    await loginAsCustomer(page);

    // Add item to cart
    await page.goto("/products");
    await page.locator("[data-testid='product-card']").first().click();
    await page.waitForURL(/\/products\//);

    const colorButton = page.locator('[aria-label^="Select "]').first();
    if (await colorButton.isVisible()) await colorButton.click();

    const sizeButton = page
      .locator("button")
      .filter({ hasText: /^(XS|S|M|L|XL|XXL|3XL)$/ })
      .first();
    if (await sizeButton.isVisible()) await sizeButton.click();

    await page.click("text=Add to Cart");
    await expect(page.getByText("added to cart")).toBeVisible({
      timeout: 5000,
    });

    // Navigate via cart page
    await page.goto("/cart");
    await expect(page.getByText("Proceed to Checkout")).toBeVisible({
      timeout: 5000,
    });
    await page.click("text=Proceed to Checkout");
    await page.waitForURL(/\/checkout/);

    // Wait for address section to load
    await expect(page.getByText("Delivery Address")).toBeVisible({
      timeout: 10000,
    });
    await page.click("text=Add New Address");

    // Fill address form
    await page.fill("#fullName", "Test User");
    await page.fill("#phone", "9876543210");
    await page.fill("#addressLine1", "123 Test Street");
    await page.fill("#city", "Mumbai");
    await page.fill("#state", "Maharashtra");
    await page.fill("#pincode", "400001");

    await page.click("text=Save Address");
    await expect(page.getByText("Address added")).toBeVisible({
      timeout: 5000,
    });
  });
});

// ─── Orders ──────────────────────────────────────────────────

test.describe("Orders", () => {
  test("orders page renders empty state", async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto("/orders");
    // May have orders from previous tests or be empty
    await expect(
      page.getByRole("heading", { name: "My Orders" })
    ).toBeVisible();
  });

  test("orders page redirects unauthenticated users", async ({ page }) => {
    await page.goto("/orders");
    await page.waitForURL(/\/login/);
  });
});

// ─── Responsiveness ──────────────────────────────────────────

test.describe("Shopping Responsiveness", () => {
  const viewports = [
    { name: "mobile (375px)", width: 375, height: 812 },
    { name: "tablet (768px)", width: 768, height: 1024 },
    { name: "desktop (1440px)", width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    test(`cart page renders at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/cart");

      // Should render without errors
      await expect(
        page.getByRole("heading", { name: "Shopping Cart" })
      ).toBeVisible();

      // Check no horizontal scroll
      const scrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth
      );
      const clientWidth = await page.evaluate(
        () => document.documentElement.clientWidth
      );
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });
  }
});

// ─── Console Errors ──────────────────────────────────────────

test.describe("Shopping Console Errors", () => {
  const pages = [
    { name: "cart", url: "/cart" },
    { name: "wishlist (logged in)", url: "/wishlist", needsLogin: true },
    { name: "checkout", url: "/checkout" },
    { name: "orders", url: "/orders" },
  ];

  for (const p of pages) {
    test(`no console errors on ${p.name}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      if (p.needsLogin) {
        await loginAsCustomer(page);
      }

      await page.goto(p.url, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);

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

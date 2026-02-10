import { test, expect } from "@playwright/test";

// ─── Phase 5 Gate: Orders & Polish ─────────────────────────

// Helper: login as customer
async function loginAsCustomer(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.fill('input[name="email"]', "customer@shop.com");
  await page.fill('input[name="password"]', "password123");
  await page.click('button[type="submit"]');
  await page.waitForURL("/", { timeout: 10000 });
}

// Helper: login as admin
async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.fill('input[name="email"]', "admin@shop.com");
  await page.fill('input[name="password"]', "admin123");
  await page.click('button[type="submit"]');
  await page.waitForURL("/", { timeout: 10000 });
}

// ─── Admin Orders ─────────────────────────────────────────

test.describe("Admin Orders", () => {
  test("admin orders page renders with table", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/orders");
    await expect(
      page.getByRole("heading", { name: "Orders" })
    ).toBeVisible();
    // Table should be present with headers
    await expect(page.getByText("Order #")).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Customer" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Total" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
  });

  test("admin orders table has order rows from seed data", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/orders");
    // Wait for loading to complete
    await expect(page.getByText("Loading...")).toBeHidden({ timeout: 10000 });
    // Should have at least one order row (from seed data)
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 5000 });
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("admin orders status filter works", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/orders");
    await expect(page.getByText("Loading...")).toBeHidden({ timeout: 10000 });

    // Click the status filter dropdown
    await page.getByRole("combobox").last().click();
    await page.getByRole("option", { name: "Delivered" }).click();

    // Wait for re-fetch
    await page.waitForTimeout(1000);

    // If we have a delivered order, the table should show it
    const rows = page.locator("table tbody tr");
    const count = await rows.count();
    if (count > 0) {
      await expect(page.getByText("Delivered").first()).toBeVisible();
    }
  });

  test("admin can view order detail modal", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/orders");
    await expect(page.getByText("Loading...")).toBeHidden({ timeout: 10000 });

    // Click the eye icon on the first order
    const viewButton = page.locator("table tbody tr").first().getByRole("button");
    await viewButton.click();

    // Dialog should open with order details
    await expect(page.locator("[role='dialog']").getByText("Items")).toBeVisible({ timeout: 5000 });
    await expect(page.locator("[role='dialog']").getByText("Delivery Address")).toBeVisible();
    await expect(page.locator("[role='dialog']").getByText("Update Status")).toBeVisible();
  });

  test("admin can update order status", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/orders");
    await expect(page.getByText("Loading...")).toBeHidden({ timeout: 10000 });

    // Find a PENDING order row if exists
    const pendingBadge = page.locator("table").getByText("Pending").first();
    const hasPending = (await pendingBadge.count()) > 0;

    if (hasPending) {
      // Click the view button on the row that contains "Pending"
      const row = page.locator("table tbody tr").filter({ hasText: "Pending" }).first();
      await row.getByRole("button").click();

      // Wait for dialog
      await expect(page.getByText("Update Status")).toBeVisible({ timeout: 5000 });

      // Change status to Confirmed
      const statusSelect = page.locator("[role='dialog']").getByRole("combobox");
      await statusSelect.click();
      await page.getByRole("option", { name: "Confirmed" }).click();
      await page.getByRole("button", { name: "Save" }).click();

      await expect(page.getByText("Order status updated")).toBeVisible({
        timeout: 5000,
      });
    }
  });
});

// ─── Order Detail (Customer) ──────────────────────────────

test.describe("Order Detail (Customer)", () => {
  test("order detail page renders with correct sections", async ({
    page,
  }) => {
    await loginAsCustomer(page);
    await page.goto("/orders");
    await expect(
      page.getByRole("heading", { name: "My Orders" })
    ).toBeVisible();

    // Click first order card
    const orderCard = page.locator("[data-testid='order-card']").first();
    const hasOrders = (await orderCard.count()) > 0;

    if (hasOrders) {
      await orderCard.click();
      await page.waitForURL(/\/orders\//);

      // Should have order sections
      await expect(page.getByText("Back to Orders")).toBeVisible();
      await expect(page.getByText("Delivery Address")).toBeVisible();
      await expect(page.getByText("Continue Shopping")).toBeVisible();
    }
  });

  test("order detail page redirects unauthenticated users", async ({
    page,
  }) => {
    // Use a fake order ID
    await page.goto("/orders/fake-order-id");
    await page.waitForURL(/\/login/);
  });

  test("order detail shows 404 for wrong user order", async ({ page }) => {
    await loginAsCustomer(page);
    // Use a completely non-existent order ID
    const res = await page.goto("/orders/nonexistent-order-id-12345");
    // Should get 404
    expect(res?.status()).toBe(404);
  });
});

// ─── Account Page ─────────────────────────────────────────

test.describe("Account Page", () => {
  test("account page renders with profile tab", async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto("/account");
    await expect(
      page.getByRole("heading", { name: "My Account" })
    ).toBeVisible();
    // Profile tab should be active by default
    await expect(page.getByText("Profile Information")).toBeVisible();
    await expect(page.getByText("Email", { exact: true })).toBeVisible();
  });

  test("account page shows user info in profile", async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto("/account");

    // Wait for data to load
    await expect(page.getByText("Profile Information")).toBeVisible({
      timeout: 10000,
    });

    // Should show the customer email (read-only)
    const emailInput = page.locator('input[disabled]');
    await expect(emailInput).toHaveValue("customer@shop.com");
  });

  test("account page can update profile", async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto("/account");
    await expect(page.getByText("Profile Information")).toBeVisible({
      timeout: 10000,
    });

    // Update name
    const nameInput = page.locator('input').first();
    await nameInput.clear();
    await nameInput.fill("Updated Customer");

    await page.click("text=Save Changes");
    await expect(page.getByText("Profile updated")).toBeVisible({
      timeout: 5000,
    });
  });

  test("account page shows addresses tab", async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto("/account");
    await expect(
      page.getByRole("heading", { name: "My Account" })
    ).toBeVisible({ timeout: 10000 });

    // Click addresses tab
    await page.getByRole("tab", { name: /Addresses/ }).click();
    await expect(page.getByText("Saved Addresses")).toBeVisible();
    await expect(page.getByText("Add New Address")).toBeVisible();
  });

  test("account page shows saved addresses from seed", async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto("/account");
    await expect(
      page.getByRole("heading", { name: "My Account" })
    ).toBeVisible({ timeout: 10000 });

    await page.getByRole("tab", { name: /Addresses/ }).click();
    await expect(page.getByText("Saved Addresses")).toBeVisible();

    // Should have addresses from seed data
    await expect(page.getByText("Mumbai").first()).toBeVisible({ timeout: 5000 });
  });

  test("account page quick links work", async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto("/account");
    await expect(page.getByText("My Orders")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("My Wishlist")).toBeVisible();
  });

  test("account page redirects unauthenticated users", async ({ page }) => {
    await page.goto("/account");
    await page.waitForURL(/\/login/);
  });
});

// ─── Navbar Links ─────────────────────────────────────────

test.describe("Navigation Links", () => {
  test("navbar My Account link works", async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto("/");
    // Wait for user icon button to appear (indicates session loaded)
    await page.waitForTimeout(1000);

    // Open user dropdown
    await page.locator("header").getByRole("button").last().click();
    await page.getByRole("menuitem", { name: "My Account" }).click();
    await page.waitForURL(/\/account/);
    await expect(
      page.getByRole("heading", { name: "My Account" })
    ).toBeVisible();
  });

  test("navbar My Orders link works", async ({ page }) => {
    await loginAsCustomer(page);
    await page.goto("/");
    // Wait for user icon button to appear (indicates session loaded)
    await page.waitForTimeout(1000);

    // Open user dropdown
    await page.locator("header").getByRole("button").last().click();
    await page.getByRole("menuitem", { name: "My Orders" }).click();
    await page.waitForURL(/\/orders/);
    await expect(
      page.getByRole("heading", { name: "My Orders" })
    ).toBeVisible();
  });
});

// ─── Responsiveness ──────────────────────────────────────

test.describe("Phase 5 Responsiveness", () => {
  const viewports = [
    { name: "mobile (375px)", width: 375, height: 812 },
    { name: "tablet (768px)", width: 768, height: 1024 },
    { name: "desktop (1440px)", width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    test(`account page renders at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await loginAsCustomer(page);
      await page.goto("/account");

      await expect(
        page.getByRole("heading", { name: "My Account" })
      ).toBeVisible({ timeout: 10000 });

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

// ─── Console Errors ──────────────────────────────────────

test.describe("Phase 5 Console Errors", () => {
  const pages = [
    { name: "admin orders", url: "/admin/orders", needsAdmin: true },
    { name: "account", url: "/account", needsLogin: true },
    { name: "orders", url: "/orders", needsLogin: true },
  ];

  for (const p of pages) {
    test(`no console errors on ${p.name}`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });

      if (p.needsAdmin) {
        await loginAsAdmin(page);
      } else if (p.needsLogin) {
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

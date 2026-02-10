import { test, expect } from "@playwright/test";

// ─── Phase 1 Gate: Foundation Phase ────────────────────────────

test.describe("Navbar & Footer", () => {
  test("navbar renders with logo, links, and auth buttons on desktop", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    // Logo
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("header").getByText(/^SHOP/)).toBeVisible();

    // Desktop nav links (use exact to avoid "Men" matching "Women")
    await expect(page.locator("header nav").getByRole("link", { name: "Men", exact: true })).toBeVisible();
    await expect(page.locator("header nav").getByRole("link", { name: "Women" })).toBeVisible();

    // Login button (unauthenticated)
    await expect(page.locator("header").getByRole("link", { name: "Login" })).toBeVisible();

    // Cart icon
    await expect(page.locator("[data-testid='cart-badge']")).toBeVisible();
  });

  test("footer renders with all sections", async ({ page }) => {
    await page.goto("/");

    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    // Section headers
    await expect(footer.getByRole("heading", { name: "Shop", exact: true })).toBeVisible();
    await expect(footer.getByRole("heading", { name: "Help" })).toBeVisible();
    await expect(footer.getByRole("heading", { name: "Account" })).toBeVisible();

    // Copyright
    await expect(footer.getByText(/All rights reserved/)).toBeVisible();
  });

  test("mobile nav drawer opens and closes", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");

    // Mobile menu trigger should be visible
    const menuBtn = page.locator("[data-testid='mobile-menu-trigger']");
    await expect(menuBtn).toBeVisible();

    // Open drawer
    await menuBtn.click();

    // Drawer content should be visible - use the sheet content
    const drawer = page.locator("[data-state='open']");
    await expect(drawer.getByRole("link", { name: "Home" })).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Men", exact: true })).toBeVisible();
    await expect(drawer.getByRole("link", { name: "Women" })).toBeVisible();
  });
});

test.describe("Responsive Layout", () => {
  for (const viewport of [
    { name: "mobile", width: 375, height: 812 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1440, height: 900 },
  ]) {
    test(`homepage renders correctly at ${viewport.name} (${viewport.width}px)`, async ({
      page,
    }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await page.goto("/");

      // No horizontal scroll
      const scrollWidth = await page.evaluate(
        () => document.documentElement.scrollWidth
      );
      const clientWidth = await page.evaluate(
        () => document.documentElement.clientWidth
      );
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

      // Page renders without errors
      await expect(page.locator("header")).toBeVisible();
      await expect(page.locator("footer")).toBeVisible();
    });
  }
});

test.describe("Auth Pages", () => {
  test("register page renders with form", async ({ page }) => {
    await page.goto("/register");

    // CardTitle may render as div, so check by text
    await expect(page.getByText("Create an account")).toBeVisible();
    await expect(page.locator("input[name='name']")).toBeVisible();
    await expect(page.locator("input[name='email']")).toBeVisible();
    await expect(page.locator("input[name='password']")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create account/i })
    ).toBeVisible();

    // Link to login
    await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible();
  });

  test("login page renders with form", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("Welcome back")).toBeVisible();
    await expect(page.locator("input[name='email']")).toBeVisible();
    await expect(page.locator("input[name='password']")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /sign in/i })
    ).toBeVisible();

    // Link to register
    await expect(page.getByRole("link", { name: /create one/i })).toBeVisible();
  });

  test("register → auto-login end-to-end flow", async ({ page }) => {
    const testEmail = `test-${Date.now()}@example.com`;

    // 1. Register
    await page.goto("/register");
    await page.locator("input[name='name']").fill("Test User");
    await page.locator("input[name='email']").fill(testEmail);
    await page.locator("input[name='password']").fill("password123");
    await page.getByRole("button", { name: /create account/i }).click();

    // Should redirect to homepage after auto-login
    await page.waitForURL("/", { timeout: 10000 });
    await expect(page).toHaveURL("/");
  });

  test("login with valid credentials works", async ({ page }) => {
    const testEmail = `login-test-${Date.now()}@example.com`;

    // Register first via API
    await page.request.post("/api/auth/register", {
      data: { name: "Login Test", email: testEmail, password: "password123" },
    });

    // Login
    await page.goto("/login");
    await page.locator("input[name='email']").fill(testEmail);
    await page.locator("input[name='password']").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should redirect to homepage
    await page.waitForURL("/", { timeout: 10000 });
    await expect(page).toHaveURL("/");
  });

  test("login with invalid credentials shows error", async ({ page }) => {
    await page.goto("/login");
    await page.locator("input[name='email']").fill("wrong@example.com");
    await page.locator("input[name='password']").fill("wrongpassword");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Should show error toast
    await expect(page.getByText(/invalid email or password/i)).toBeVisible({
      timeout: 5000,
    });
  });
});

test.describe("Auth Redirects", () => {
  test("unauthenticated user is redirected from /checkout to /login", async ({
    page,
  }) => {
    await page.goto("/checkout");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("unauthenticated user is redirected from /orders to /login", async ({
    page,
  }) => {
    await page.goto("/orders");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });

  test("unauthenticated user is redirected from /admin to /login", async ({
    page,
  }) => {
    await page.goto("/admin");
    await page.waitForURL(/\/login/, { timeout: 10000 });
    expect(page.url()).toContain("/login");
  });
});

test.describe("Console Errors", () => {
  test("no console errors on homepage", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const realErrors = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("404") &&
        !e.includes("400") &&
        !e.includes("Failed to load resource")
    );
    expect(realErrors).toHaveLength(0);
  });

  test("no console errors on login page", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    const realErrors = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("404") &&
        !e.includes("400") &&
        !e.includes("Failed to load resource")
    );
    expect(realErrors).toHaveLength(0);
  });

  test("no console errors on register page", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/register");
    await page.waitForLoadState("networkidle");

    const realErrors = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("404") &&
        !e.includes("400") &&
        !e.includes("Failed to load resource")
    );
    expect(realErrors).toHaveLength(0);
  });
});

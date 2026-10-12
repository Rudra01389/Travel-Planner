import { chromium } from "playwright";
import assert from "node:assert/strict";
import { stop } from "./browser-preview.mjs";
const executablePath = process.env.WAYFARE_TEST_BROWSER;
const browser = await chromium.launch({
  ...(executablePath ? { executablePath } : {}),
  args:
    process.platform === "linux"
      ? [
          "--no-sandbox",
          "--no-zygote",
          "--single-process",
          "--disable-gpu",
          "--disable-software-rasterizer",
        ]
      : [],
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
page.setDefaultTimeout(10000);
const errors = [];
console.log("Browser ready");
page.on("pageerror", (e) => errors.push(e.message));
await page.route("https://tile.openstreetmap.org/**", (r) =>
  r.fulfill({
    status: 200,
    contentType: "image/png",
    body: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jXioAAAAASUVORK5CYII=",
      "base64",
    ),
  }),
);
try {
  console.log("Opening dashboard");
  await page.goto("http://127.0.0.1:5481/dashboard");
  await page.getByRole("heading", { name: "Your next chapter." }).waitFor();
  console.log("Dashboard loaded");
  await page.getByRole("link", { name: "New trip", exact: true }).click();
  await page.getByLabel("Destination", { exact: true }).fill("Mumbai");
  await page.getByRole("button", { name: "Mumbai", exact: true }).click();
  await page.getByLabel("Total group budget").fill("-1");
  await page.getByRole("button", { name: "Create trip" }).click();
  assert.equal(
    await page
      .getByLabel("Total group budget")
      .evaluate((el) => el.validity.valid),
    false,
  );
  await page.getByLabel("Total group budget").fill("10000");
  const end = new Date();
  end.setUTCDate(end.getUTCDate() + 1);
  await page.getByLabel("End date").fill(end.toISOString().slice(0, 10));
  await page
    .getByLabel("Budget currency (converts the amount)")
    .selectOption("USD");
  await page
    .getByRole("status")
    .filter({ hasText: "Budget converted" })
    .waitFor();
  assert.equal(await page.getByLabel("Total group budget").inputValue(), "120");
  await page.getByRole("button", { name: "Create trip" }).click();
  await page
    .getByRole("heading", { name: "Your itinerary", exact: true })
    .waitFor();
  console.log("Trip created");
  await page.getByLabel("Day title").first().fill("Museum day");
  await page.getByRole("button", { name: "Save itinerary" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Itinerary saved." })
    .waitFor();
  await page.getByRole("button", { name: "Add to itinerary" }).first().click();
  await page.getByRole("button", { name: "Save itinerary" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Itinerary saved." })
    .waitFor();
  await page.getByRole("button", { name: "Add to itinerary" }).first().click();
  await page.getByRole("button", { name: "Save itinerary" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Itinerary saved." })
    .waitFor();
  await page.getByRole("button", { name: "Route: Day 1", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Walking route:" })
    .waitFor();
  await page
    .locator(".activity")
    .first()
    .dragTo(page.locator(".editor-day").nth(1));
  await page.getByRole("button", { name: "Save itinerary" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Itinerary saved." })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.getByRole("checkbox", { name: "Passport / ID" }).check();
  await page.getByRole("button", { name: "Save checklist" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Checklist saved." })
    .waitFor();
  const pdf = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download itinerary PDF" }).click();
  assert.match((await pdf).suggestedFilename(), /\.pdf$/);
  const calendar = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download calendar reminder" })
    .click();
  assert.match((await calendar).suggestedFilename(), /\.ics$/);
  await page.getByRole("button", { name: "Manage expenses" }).click();
  await page.getByLabel("Description", { exact: true }).fill("Dinner");
  await page.getByLabel("Amount paid in selected currency").fill("12");
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Expense saved" }).waitFor();
  assert.ok((await page.locator(".tx-table").textContent()).includes("Dinner"));
  await page.getByLabel("Display currency").selectOption("INR");
  await page.getByRole("status").filter({ hasText: "1 USD =" }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.getByRole("link", { name: "Profile", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Updated Traveller");
  await page.getByRole("button", { name: "Save profile" }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Profile saved." })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Browser flow passed: converted budget, saved itinerary/checklist, recommendations, PDF/calendar downloads, expenses, profile, mobile width, no runtime errors.",
  );
} catch (e) {
  console.log("UI failure:", String(e));
  throw e;
} finally {
  console.log("Closing preview");
  await browser.close();
  await stop();
}

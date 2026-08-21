import { chromium } from "playwright";

const base = "http://127.0.0.1:8080";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("pageerror", (e) => console.log("PAGEERR", String(e)));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CON", m.text().slice(0, 300));
});
page.on("requestfailed", (r) => console.log("FAIL", r.method(), r.url().slice(0, 160), r.failure()?.errorText));

await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 25000 });
await page.getByRole("button", { name: "Enter demo" }).first().waitFor({ timeout: 15000 });
await page.waitForTimeout(1200);
console.log("landing buttons", await page.getByRole("button", { name: "Enter demo" }).count());
await page.screenshot({ path: "/workspace/screenshots/diag-landing.png" });
await page.getByRole("button", { name: "Enter demo" }).first().click();
const opening = await page.getByRole("button", { name: /Opening/ }).count();
console.log("opening count", opening);
try {
  await page.waitForURL((u) => u.pathname.startsWith("/app"), { timeout: 60000 });
  console.log("entered", page.url());
} catch (e) {
  console.log("enter failed", page.url(), (await page.locator("body").innerText()).slice(0, 400));
  await page.screenshot({ path: "/workspace/screenshots/diag-enter-fail.png" });
  throw e;
}
await page.waitForTimeout(1000);
await page.goto(base + "/app/patients", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(1200);
const hart = page.locator("a[href*='/app/patients/']").filter({ hasText: "Hart" }).first();
console.log("hart", await hart.count(), await hart.getAttribute("href"));
const t0 = Date.now();
await hart.click();
for (let i = 0; i < 24; i++) {
  await page.waitForTimeout(500);
  const hasName = (await page.getByTestId("chart-name").count()) > 0;
  const hasSkel = (await page.getByTestId("chart-skeleton").count()) > 0;
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 220);
  console.log(`t+${Date.now() - t0} url=${page.url()} name=${hasName} skel=${hasSkel} ${body}`);
  if (hasName || body.includes("Could not open")) break;
}
await page.screenshot({ path: "/workspace/screenshots/diag-chart.png", fullPage: true });
const buttons = await page.evaluate(() =>
  [...document.querySelectorAll("button")].map((el) =>
    (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40),
  ),
);
console.log("buttons", buttons);
await browser.close();

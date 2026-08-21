import { chromium } from "playwright";

const base = "http://127.0.0.1:8080";
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push("PAGE " + String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("CON " + m.text());
});

async function shot(name) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `/workspace/screenshots/${name}.png`, fullPage: false });
  console.log("shot", name, page.url());
}

async function go(path) {
  await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForTimeout(700);
}

await go("/signup");
const email = `qa${Date.now()}@lumen.test`;
await page.getByLabel("Your name").fill("Harjinder Gahir");
await page.getByLabel("Email").fill(email);
await page.getByLabel("Password").fill("practice123");
await page.getByRole("button", { name: "Create workspace" }).click();
await page.waitForURL("**/app**", { timeout: 20000 });
await page.waitForTimeout(1200);
await shot("03-floor");

await go("/app/calendar");
await shot("04-calendar");

await go("/app/patients");
await shot("05-patients");

const first = page.locator("a[href*='/app/patients/']").first();
if (await first.count()) {
  await first.click();
  await page.waitForTimeout(800);
  await shot("05b-chart");
}

await go("/app/journey");
await shot("06-journey");

await go("/app/orders");
await shot("07-orders");

await go("/app/inbox");
await shot("08-inbox");

await go("/app/admin");
await shot("09-admin");

await go("/app/onboard");
await shot("09b-onboard");

await go("/care");
await shot("10-care");

await go("/care/book");
await shot("10b-book");

await page.setViewportSize({ width: 390, height: 844 });
await go("/");
await shot("11-landing-mobile");
await go("/app");
await shot("12-floor-mobile");
await go("/app/calendar");
await shot("13-calendar-mobile");

console.log("ERRORS", errors);
await browser.close();

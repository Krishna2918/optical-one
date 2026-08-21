import { chromium } from "playwright";

const base = "http://127.0.0.1:8080";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
const results = [];
page.on("pageerror", (e) => errors.push("PAGE " + String(e)));
page.on("console", (m) => {
  if (m.type() === "error") errors.push("CON " + m.text().slice(0, 240));
});
page.on("response", (r) => {
  if (r.status() >= 500) errors.push(`HTTP ${r.status()} ${r.url().slice(0, 160)}`);
});

function ok(name, pass, extra = "") {
  results.push({ name, pass, extra });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${extra ? " — " + extra : ""}`);
}

async function go(path) {
  await page.goto(base + path, { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForTimeout(700);
}
async function shot(name) {
  await page.screenshot({ path: `/workspace/screenshots/${name}.png` });
}
async function text() {
  return page.locator("body").innerText();
}

try {
  await go("/");
  const land = await text();
  ok("Landing renders", /The book your doctors actually share/.test(land));
  ok("Enter demo CTA", land.includes("Enter demo"));
  await shot("audit-01-landing");

  if (await page.getByRole("button", { name: "Enter demo" }).count()) {
    await page.getByRole("button", { name: "Enter demo" }).first().click();
    await page.waitForURL("**/app**", { timeout: 25000, waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
  } else {
    await go("/app");
  }
  const floor = await text();
  ok("Floor shell", floor.includes("The floor") && floor.includes("Optical One"));
  ok("Demo owner", floor.includes("Harjinder"));
  ok("Coming up lists Ciara 2:00", floor.includes("Ciara Hart") && floor.includes("2:00"));
  await shot("audit-02-floor");

  await go("/app/calendar");
  const dateVal = await page.locator('input[type="date"]').inputValue();
  const cal = await text();
  ok("Calendar +2 cluster date", Boolean(dateVal), dateVal);
  ok("Ciara booked at 2:00", cal.includes("2:00") && cal.includes("Ciara"));
  ok("Neighbor hours open", cal.includes("1:00 PM") && cal.includes("3:00 PM"));
  ok("Distant hours closed", cal.includes("Closed"));
  await shot("audit-03-calendar");

  if (await page.getByRole("button", { name: /Closed/ }).count()) {
    await page.getByRole("button", { name: /Closed/ }).first().click();
    await page.waitForTimeout(200);
    ok("Locked slot stays closed", (await page.getByRole("heading", { name: "New visit" }).count()) === 0);
  }

  const before = await page.locator('input[type="date"]').inputValue();
  await page.getByRole("button", { name: "Next" }).click();
  await page.waitForTimeout(200);
  const afterNext = await page.locator('input[type="date"]').inputValue();
  await page.getByRole("button", { name: "Prev" }).click();
  await page.waitForTimeout(200);
  const afterPrev = await page.locator('input[type="date"]').inputValue();
  ok("Date next/prev", afterNext !== before && afterPrev === before, `${before} ${afterNext} ${afterPrev}`);

  await page.getByRole("button", { name: "Today" }).click();
  await page.waitForTimeout(250);
  ok("Today button", /^\d{4}-\d{2}-\d{2}$/.test(await page.locator('input[type="date"]').inputValue()));

  await go("/app/patients");
  ok("Patient list", (await text()).includes("Hart") && (await text()).includes("Brar"));
  const hart = page.locator("a[href*='/app/patients/']").filter({ hasText: "Hart" }).first();
  ok("Ciara chart link", (await hart.count()) > 0);
  await Promise.all([
    page.waitForURL((u) => /\/app\/patients\/[^/?]+/.test(u.pathname), { timeout: 15000 }),
    hart.click(),
  ]);
  await page.getByTestId("chart-name").waitFor({ timeout: 20000 });
  const chart = await text();
  ok(
    "Chart page",
    /\/app\/patients\/[^/]+/.test(new URL(page.url()).pathname) && chart.includes("Ciara"),
    page.url(),
  );
  ok(
    "Visit shows 2:00 PM",
    chart.includes("2:00 PM") && chart.includes("Visits"),
    chart.includes("Visits") ? "has Visits" : "no Visits",
  );
  await shot("audit-05-chart");

  for (const tab of ["Family", "Insurance", "Vision Rx", "Orders", "Journey"]) {
    const testId = `chart-tab-${tab.replace(/\s+/g, "-")}`;
    const btn = page.getByTestId(testId);
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(250);
      ok(`Tab ${tab}`, true);
    } else {
      ok(`Tab ${tab}`, false, "missing " + page.url());
    }
  }
  await shot("audit-05b-tabs");

  await go("/app/journey");
  ok("Journey board", (await text()).includes("Tracking"));
  await shot("audit-06-journey");

  await go("/app/orders");
  const ord = await text();
  ok("Orders", ord.includes("At lab") || ord.includes("Ready to call") || ord.includes("Orders"));
  await shot("audit-07-orders");

  await go("/app/inbox");
  const mail = await text();
  ok(
    "Inbox",
    mail.includes("Mail") &&
      (mail.includes("confirmed") || mail.includes("Welcome") || mail.includes("ready") || mail.includes("Visit")),
  );
  await shot("audit-08-inbox");

  await go("/app/admin");
  ok("Admin people", (await text()).includes("Invite") && (await text()).includes("Harjinder"));
  await page.getByRole("button", { name: "doctors" }).click();
  await page.waitForTimeout(300);
  ok("Admin doctors", (await text()).includes("Amrik"));
  await shot("audit-09-admin");

  await go("/app/onboard");
  ok("Onboard wizard", (await text()).includes("New chart") && (await text()).includes("Identity"));
  await shot("audit-10-onboard");

  await go("/care");
  const care = await text();
  ok("Care portal reachable", /Hi,|Book a visit|Staff preview|No chart/.test(care));
  await shot("audit-11-care");

  await go("/care/book");
  ok("Care book", (await text()).includes("Book a visit"));
  await shot("audit-11b-book");

  await page.setViewportSize({ width: 390, height: 844 });
  await go("/app");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  );
  ok("Mobile no overflow", !overflow);
  const mob = await text();
  ok("Mobile Mail+Admin", mob.includes("Mail") && mob.includes("Admin"));
  await shot("audit-12-mobile");
} catch (e) {
  ok("Runner", false, String(e).slice(0, 240));
  await shot("audit-fail");
}

const failed = results.filter((r) => !r.pass);
console.log("\n--- SUMMARY ---");
console.log(`passed ${results.filter((r) => r.pass).length}/${results.length}`);
for (const f of failed) console.log("FAIL", f.name, f.extra);
console.log("ERRORS", errors);
await browser.close();
process.exit(failed.length || errors.some((e) => !e.includes("favicon")) ? 1 : 0);

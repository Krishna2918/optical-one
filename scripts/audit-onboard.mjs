import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const base = "http://127.0.0.1:8080";
const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const results = [];
function ok(name, pass, extra = "") {
  results.push({ name, pass, extra });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${extra ? " — " + extra : ""}`);
}

async function waitPath(page, test, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const path = new URL(page.url()).pathname;
    if (typeof test === "function" ? test(path) : test.test(path)) return path;
    await page.waitForTimeout(150);
  }
  throw new Error(`Timed out waiting for path ${test} (now ${page.url()})`);
}

async function enterDemo(page) {
  await page.goto(base + "/", { waitUntil: "domcontentloaded", timeout: 25000 });
  const demo = page.getByRole("button", { name: "Enter demo" }).last();
  await demo.waitFor({ state: "visible", timeout: 15000 });
  const deadline = Date.now() + 45000;
  let lastClick = 0;
  while (Date.now() < deadline) {
    if (new URL(page.url()).pathname.startsWith("/app")) break;
    const starting = (await page.getByText("Starting the clinic").count()) > 0;
    if (!starting && Date.now() - lastClick > 2500) {
      await demo.click({ timeout: 5000 }).catch(() => {});
      lastClick = Date.now();
    }
    await page.waitForTimeout(300);
  }
  if (!new URL(page.url()).pathname.startsWith("/app")) {
    throw new Error("Enter demo did not reach /app, at " + page.url());
  }
  await page.getByRole("heading", { name: "The floor" }).waitFor({ timeout: 20000 });
}

async function run(label, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGE " + String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("CON " + m.text().slice(0, 280));
  });
  page.on("response", (r) => {
    if (r.status() >= 500) errors.push(`HTTP ${r.status()} ${r.url().slice(0, 160)}`);
  });
  const shot = (name) =>
    page.screenshot({ path: `/workspace/screenshots/onboard-${label}-${name}.png`, fullPage: false });

  const uncovered = async (locator, name) => {
    const loc = locator.first();
    if (!(await loc.count())) {
      ok(`${label}: ${name} present`, false);
      return false;
    }
    const box = await loc.boundingBox();
    const visible = await loc.isVisible();
    const enabled = await loc.isEnabled();
    ok(`${label}: ${name} visible+enabled`, visible && enabled, box ? `y=${Math.round(box.y)}` : "no box");
    if (!box || !visible || !enabled) return false;
    const hit = await page.evaluate(
      ({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        return el ? (el.innerText || el.getAttribute("aria-label") || el.tagName).toString().slice(0, 48) : "none";
      },
      { x: box.x + box.width / 2, y: box.y + Math.min(20, box.height / 2) },
    );
    const selfText = ((await loc.innerText()) || "").slice(0, 24);
    const covers = !String(hit).includes(selfText.split("\n")[0].slice(0, 8)) && /Floor|Book|Patients|Journey|Orders/.test(String(hit));
    ok(`${label}: ${name} not covered by nav`, !covers, `hit=${hit}`);
    return !covers;
  };

  try {
    await enterDemo(page);
    ok(`${label}: entered floor`, true);
    await shot("01-floor");

    await page.getByRole("link", { name: "New patient" }).click();
    await waitPath(page, /\/app\/onboard/);
    await page.getByRole("heading", { name: "New chart" }).waitFor();
    ok(`${label}: New patient opens wizard`, true);
    await shot("02-identity");

    // Empty continue should stay and toast
    await uncovered(page.getByTestId("onboard-continue"), "Continue");
    await page.getByTestId("onboard-continue").click();
    await page.waitForTimeout(400);
    ok(
      `${label}: empty Continue stays on Identity`,
      (await page.getByLabel("First name").count()) > 0,
    );
    ok(
      `${label}: empty Continue toasts`,
      (await page.getByText(/First and last name are required/i).count()) > 0,
    );

    // Contact pill without names
    await page.getByTestId("onboard-step-Contact").click();
    await page.waitForTimeout(250);
    ok(
      `${label}: Contact pill blocked without name`,
      (await page.getByLabel("First name").count()) > 0,
    );

    await page.getByLabel("Title").selectOption("Ms");
    await page.getByLabel("Sex").selectOption("Female");
    await page.getByLabel("First name").fill("Priya");
    await page.getByLabel("Last name").fill("Nair");
    await page.getByLabel("Birth date").fill("1988-04-12");
    await shot("03-identity-filled");
    await page.getByText(/First and last name are required/i).waitFor({ state: "hidden", timeout: 5000 }).catch(() => {});

    await page.getByTestId("onboard-step-Contact").click();
    await page.waitForTimeout(250);
    ok(`${label}: Contact pill after names`, (await page.getByLabel("Email").count()) > 0);
    await page.getByTestId("onboard-step-Identity").click();
    await page.waitForTimeout(200);
    ok(`${label}: Identity pill back`, (await page.getByLabel("First name").inputValue()) === "Priya");

    await page.getByTestId("onboard-continue").click();
    await page.waitForTimeout(200);
    await page.getByLabel("Email").fill("priya.nair@example.com");
    await page.getByLabel("Mobile").fill("4165550199");
    await page.getByLabel("Home").fill("4165550100");
    await page.getByLabel("Address").fill("18 Queen St W");
    await page.getByLabel("City").fill("Brampton");
    await page.getByLabel("Province").fill("ON");
    await page.getByLabel("Postal").fill("L6Y 1M2");
    await shot("04-contact");

    await uncovered(page.getByTestId("onboard-back"), "Back");
    await page.getByTestId("onboard-back").click();
    await page.waitForTimeout(200);
    ok(`${label}: Back to Identity keeps name`, (await page.getByLabel("First name").inputValue()) === "Priya");
    await page.getByTestId("onboard-continue").click();
    await page.getByTestId("onboard-continue").click();
    await page.waitForTimeout(200);
    ok(`${label}: Coverage`, (await page.getByLabel("Employer").count()) > 0);
    await page.getByLabel("Employer").fill("Peel District");
    await page.getByLabel("Health card").fill("1234-567-890");
    await page.getByLabel("Notes").fill("Prefers morning slots.");
    await shot("05-coverage");

    await page.getByTestId("onboard-continue").click();
    await page.waitForTimeout(200);
    ok(`${label}: Consent`, (await page.getByLabel(/PHIPA/i).count()) > 0);
    await shot("06-consent");

    await uncovered(page.getByTestId("onboard-open"), "Open chart");
    await page.getByTestId("onboard-open").click();
    await page.waitForTimeout(500);
    ok(
      `${label}: Open chart without PHIPA stays`,
      page.url().includes("/app/onboard"),
      page.url(),
    );
    ok(
      `${label}: PHIPA toast`,
      (await page.getByText(/PHIPA consent is required/i).count()) > 0,
    );

    await page.getByLabel(/PHIPA/i).check();
    await page.getByTestId("onboard-open").click();
    await waitPath(page, (p) => /\/app\/patients\/[^/]+/.test(p), 20000);
    await page.getByTestId("chart-name").waitFor({ timeout: 15000 });
    const chartName = await page.getByTestId("chart-name").innerText();
    ok(`${label}: chart opened`, /Priya/.test(chartName) && /Nair/.test(chartName), chartName);
    await shot("07-chart");

    await page.getByRole("button", { name: "Invite to portal" }).click();
    await page.waitForTimeout(700);
    ok(
      `${label}: Invite to portal`,
      (await page.getByText(/Portal invite mailed|Failed|email first/i).count()) > 0,
    );

    await page.getByTestId("chart-tab-Family").click();
    await page.waitForTimeout(200);
    await page.getByRole("button", { name: "Link" }).click();
    await page.waitForTimeout(800);
    ok(
      `${label}: Family Link`,
      (await page.getByText(/Family linked/i).count()) > 0 ||
        (await page.locator("body").innerText()).includes("guarantor"),
    );
    await shot("08-family");

    await page.getByTestId("chart-tab-Insurance").click();
    await page.waitForTimeout(200);
    await page.getByLabel("Carrier").fill("Manulife");
    await page.getByLabel("Plan").fill("Flex");
    await page.getByLabel("Member ID").fill("M-9911");
    await page.getByLabel("Group").fill("PEEL");
    await page.getByRole("button", { name: "Add coverage" }).click();
    await page.waitForTimeout(800);
    ok(`${label}: Add coverage`, (await page.locator("body").innerText()).includes("Manulife"));
    await shot("09-insurance");

    await page.getByTestId("chart-tab-Vision-Rx").click();
    await page.waitForTimeout(200);
    await page.getByLabel("OD sph").fill("-1.25");
    await page.getByLabel("OS sph").fill("-1.50");
    await page.getByRole("button", { name: "File Rx" }).click();
    await page.waitForTimeout(800);
    ok(`${label}: File Rx`, (await page.locator("body").innerText()).includes("-1.25"));
    await shot("10-rx");

    await page.getByTestId("chart-tab-Orders").click();
    await page.waitForTimeout(200);
    await page.getByLabel("Frame").fill("Lindberg 6500");
    await page.getByLabel("Lens").fill("Varilux");
    await page.getByRole("button", { name: "Create order" }).click();
    await page.waitForTimeout(800);
    ok(`${label}: Create order`, (await page.locator("body").innerText()).includes("Lindberg"));
    await shot("11-orders");

    await page.getByTestId("chart-tab-Journey").click();
    await page.waitForTimeout(200);
    await page.getByRole("button", { name: "Ready", exact: true }).click();
    await page.waitForTimeout(500);
    ok(`${label}: Journey Ready`, (await page.locator("body").innerText()).includes("Ready"));
    await shot("12-journey");

    await page.goto(base + "/app/patients", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Patients" }).waitFor({ timeout: 10000 });
    await page.getByText("Voss").first().waitFor({ timeout: 10000 });
    const listText = await page.locator("body").innerText();
    ok(`${label}: list shows Priya`, listText.includes("Nair") && listText.includes("Priya"), listText.slice(0, 200).replace(/\n/g, " | "));
    await page.getByRole("link", { name: "Onboard someone" }).click();
    await waitPath(page, /\/app\/onboard/);
    ok(`${label}: Onboard someone`, page.url().includes("/app/onboard"));

    await page.goto(base + "/care/onboard", { waitUntil: "domcontentloaded" });
    await page.getByRole("heading", { name: "Your details" }).waitFor({ timeout: 15000 });
    await shot("13-care-onboard");
    const careSave = page.getByTestId("care-save");
    ok(`${label}: care Save present`, (await careSave.count()) > 0);
    const phipa = page.getByLabel(/PHIPA/i);
    if (await phipa.count()) {
      const checked = await phipa.isChecked();
      if (!checked) await phipa.check();
    }
    await careSave.click();
    await waitPath(page, (p) => p === "/care" || p === "/care/", 15000);
    ok(`${label}: care save → home`, true, page.url());
    await shot("14-care-home");
  } catch (e) {
    ok(`${label}: uncaught`, false, String(e).slice(0, 500));
    await shot("99-error").catch(() => {});
  }

  const uniqueErr = [...new Set(errors)].filter((e) => !e.includes("favicon"));
  ok(`${label}: no console/http 500s`, uniqueErr.length === 0, uniqueErr.slice(0, 6).join(" || "));
  await context.close();
}

await run("desk", { width: 1440, height: 900 });
await run("phone", { width: 390, height: 720 });

await browser.close();
const failed = results.filter((r) => !r.pass);
console.log("\n--- SUMMARY ---");
console.log(`${results.filter((r) => r.pass).length}/${results.length} passed`);
for (const f of failed) console.log("FAIL", f.name, f.extra);
writeFileSync("/workspace/screenshots/onboard-audit.json", JSON.stringify({ results, failed }, null, 2));
process.exit(failed.length ? 1 : 0);

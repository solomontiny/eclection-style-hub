import { chromium } from "file:///C:/Users/HP/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs";

const results = [];
function check(name, cond, detail) {
  const pass = !!cond;
  results.push({ name, pass, detail: detail || "" });
  console.log(`[${pass ? "PASS" : "FAIL"}] ${name}${detail ? " -> " + detail : ""}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 800 } });

try {
  await page.goto("http://localhost:8080/", { waitUntil: "networkidle" });

  // Open the customer-care chat.
  const fab = await page.$('button[aria-label="Customer care chat"]');
  check("customer-care: chat FAB present", !!fab, fab ? "found" : "missing");
  if (fab) await fab.click();
  await page.waitForTimeout(300);

  // Type the delivery query.
  const input = await page.$('input[placeholder="Type a message…"]');
  check("customer-care: message input present", !!input);
  if (input) {
    await input.fill("Delivery & shipping");
    const sendBtn = await page.$('button[aria-label="Send"]');
    if (sendBtn) await sendBtn.click();
    await page.waitForTimeout(700);
  }

  // The bot reply should contain the new international delivery wording.
  const reply = await page.evaluate(() => {
    const boxes = document.querySelectorAll(".bg-background.border.border-border");
    return Array.from(boxes).map((b) => b.textContent).join("\n---\n");
  });
  const hasNewText = reply.includes("International Delivery: Orders are weighed by our logistics agent");
  const hasBusExpress = reply.includes("Bus, Express & Cargo options are available");
  const hasPhotoConfirm = reply.includes("send your package with a photo for confirmation");
  check("customer-care: new international delivery wording present", hasNewText, reply.slice(0, 80));
  check("customer-care: Bus/Express/Cargo options present", hasBusExpress);
  check("customer-care: photo confirmation present", hasPhotoConfirm);

  // Outdated text must be gone.
  const hasOldText = reply.includes("2–14 working days") || reply.includes("2-14 working days");
  check("customer-care: outdated '2–14 working days' removed", !hasOldText);

  // Quick replies should still work.
  const quickReply = await page.$('button:has-text("Email support")');
  check("customer-care: quick replies preserved", !!quickReply);
  if (quickReply) await quickReply.click();
  await page.waitForTimeout(700);
  const emailReply = await page.evaluate(() => {
    const boxes = document.querySelectorAll(".bg-background.border.border-border");
    return Array.from(boxes).map((b) => b.textContent).join("\n---\n");
  });
  check("customer-care: email support quick reply works", emailReply.includes("care team"));
} finally {
  await browser.close();
}

console.log("\n=== SUMMARY ===");
const failed = results.filter((r) => !r.pass);
console.log(`total=${results.length} passed=${results.length - failed.length} failed=${failed.length}`);
if (failed.length) {
  failed.forEach((f) => console.log("FAILED:", f.name, f.detail));
  process.exit(1);
}
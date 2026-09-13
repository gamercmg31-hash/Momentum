import { chromium } from "@playwright/test";

const baseURL = process.env.AUDIT_URL ?? "http://127.0.0.1:4020";
const browser = await chromium.launch({ headless: true });
const findings = [];

function pass(name) {
  findings.push({ ok: true, name });
  console.log(`PASS  ${name}`);
}
function fail(name, error) {
  const detail = error instanceof Error ? error.message : String(error);
  findings.push({ ok: false, name, detail });
  console.error(`FAIL  ${name}: ${detail}`);
}
async function test(name, fn) {
  try { await fn(); pass(name); } catch (error) { fail(name, error); }
}
function assert(value, message) {
  if (!value) throw new Error(message);
}

const me = { id: "11111111-1111-1111-1111-111111111111", key: "11111111-1111-1111-1111-111111111111", name: "alice", color: "#a3e635" };
const partnerUser = { id: "22222222-2222-2222-2222-222222222222", key: "22222222-2222-2222-2222-222222222222", name: "bob", color: "#38bdf8" };
const today = new Date();
const todayKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
let habits = [
  { id: 1, userId: me.id, name: "Read", icon: "book-open", color: "violet", sortOrder: 1, createdKey: todayKey },
  { id: 2, userId: me.id, name: "Breakfast", icon: "coffee", color: "orange", sortOrder: 2, createdKey: todayKey },
];
let logs = [];
let txns = [];
let xpEvents = [];
let nextHabitId = 3;

function json(route, body, status = 200, headers = {}) {
  return route.fulfill({ status, contentType: "application/json", headers, body: JSON.stringify(body) });
}

async function mockApi(page, signedIn = true) {
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();
    let body = null;
    try { body = req.postDataJSON(); } catch {}

    if (path === "/api/auth/me") return json(route, { user: signedIn ? me : null });
    if (path === "/api/accounts" && method === "GET") {
      return json(route, { accounts: signedIn ? [me, partnerUser] : [], slotsOpen: signedIn ? 0 : 2, maxAccounts: 2 });
    }
    if (path === "/api/accounts" && method === "POST") {
      return json(route, { ok: true, user: { ...me, name: body.username }, requiresConfirmation: false }, 201);
    }
    if (path === "/api/auth/signin") return json(route, { ok: true, user: me });
    if (path === "/api/auth/signout") return json(route, { ok: true });
    if (path === "/api/auth/password") return json(route, { ok: true });
    if (path === "/api/bootstrap") {
      return json(route, {
        me,
        slice: { seeded: true, habits, logs },
        txns,
        xp: { totalXp: xpEvents.reduce((n,e)=>n+e.amount,0), events: xpEvents, quests: [], achievements: [] },
        partner: {
          user: partnerUser,
          slice: { seeded: true, habits: [{ id: 20, userId: partnerUser.id, name: "Exercise", icon: "dumbbell", color: "sky", sortOrder: 1, createdKey: todayKey }], logs: [] },
          xp: { totalXp: 0, level: 1, events: [] },
        },
      });
    }
    if (path === "/api/partner") {
      return json(route, { partner: { user: partnerUser, slice: { seeded: true, habits: [], logs: [] }, xp: { totalXp: 0, events: [] } } });
    }
    if (path === "/api/habits" && method === "POST") {
      const habit = { id: nextHabitId++, userId: me.id, name: body.name, icon: body.icon, color: body.color, sortOrder: habits.length + 1, createdKey: todayKey };
      habits = [...habits, habit];
      return json(route, { habit });
    }
    const habitMatch = path.match(/^\/api\/habits\/(\d+)$/);
    if (habitMatch && method === "PATCH") {
      const id = Number(habitMatch[1]);
      habits = habits.map((h) => h.id === id ? { ...h, ...body } : h);
      return json(route, { ok: true });
    }
    if (habitMatch && method === "DELETE") {
      const id = Number(habitMatch[1]);
      habits = habits.filter((h) => h.id !== id);
      logs = logs.filter((l) => l.habitId !== id);
      return json(route, { ok: true });
    }
    const logMatch = path.match(/^\/api\/habits\/(\d+)\/log$/);
    if (logMatch && method === "PUT") {
      const id = Number(logMatch[1]);
      logs = logs.filter((l) => !(l.habitId === id && l.date === body.date));
      if (body.status !== null) logs.push({ userId: me.id, habitId: id, date: body.date, status: body.status });
      return json(route, { ok: true });
    }
    if (path === "/api/wallet" && method === "POST") {
      txns = [body.txn, ...txns];
      return json(route, { txn: body.txn });
    }
    const txnMatch = path.match(/^\/api\/wallet\/([^/]+)$/);
    if (txnMatch && method === "PATCH") {
      txns = txns.map((t) => t.id === txnMatch[1] ? { ...t, ...body } : t);
      return json(route, { ok: true });
    }
    if (txnMatch && method === "DELETE") {
      txns = txns.filter((t) => t.id !== txnMatch[1]);
      return json(route, { ok: true });
    }
    if (path === "/api/xp/grant") {
      const gained = (body.grants ?? []).filter((g) => !xpEvents.some((e) => e.key === g.key)).map((g) => ({ ...g, day: todayKey, at: Date.now() }));
      xpEvents = [...xpEvents, ...gained];
      return json(route, { gained, totalXp: xpEvents.reduce((n,e)=>n+e.amount,0) });
    }
    if (path === "/api/backup") {
      return route.fulfill({ status: 200, contentType: "application/json", headers: { "content-disposition": "attachment; filename=backup.json" }, body: JSON.stringify({ format: "momentum-backup", version: 1 }) });
    }
    if (path === "/api/backup/restore") return json(route, { ok: true });
    return json(route, { error: `Unmocked ${method} ${path}` }, 501);
  });
}

async function newPage(viewport, signedIn = true) {
  const page = await browser.newPage({ viewport });
  const errors = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(`console: ${msg.text()}`); });
  page.on("pageerror", (error) => errors.push(`page: ${error.message}`));
  page.on("requestfailed", (req) => errors.push(`request: ${req.url()} ${req.failure()?.errorText}`));
  await mockApi(page, signedIn);
  return { page, errors };
}

for (const [label, viewport] of [["desktop", { width: 1440, height: 1000 }], ["mobile", { width: 390, height: 844 }]]) {
  // Each viewport starts from the same clean persisted state.
  logs = [];
  const { page, errors } = await newPage(viewport, true);
  page.setDefaultTimeout(8000);
  await test(`${label}: dashboard loads`, async () => {
    await page.goto(baseURL);
    await page.getByText("Read", { exact: true }).waitFor();
    assert(await page.getByText("bob", { exact: false }).count() > 0, "partner not rendered");
  });
  await test(`${label}: no horizontal overflow`, async () => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(overflow <= 1, `horizontal overflow ${overflow}px`);
  });
  await test(`${label}: habit completion persists after reload`, async () => {
    await page.getByRole("button", { name: "Complete Read" }).click();
    await page.waitForTimeout(500);
    assert(logs.some((l) => l.habitId === 1 && l.status === "completed"), "completion not sent to API");
    await page.reload();
    await page.getByText("Read", { exact: true }).waitFor();
    assert(logs.some((l) => l.habitId === 1 && l.status === "completed"), "completion lost on reload");
  });
  await test(`${label}: wallet opens and returns`, async () => {
    await page.getByRole("button", { name: /Wallet/i }).first().click();
    await page.getByText("Wallet", { exact: true }).first().waitFor();
    await page.getByRole("button", { name: /Habits/i }).first().click();
    await page.getByText("Read", { exact: true }).waitFor();
  });
  await test(`${label}: leveling opens and returns`, async () => {
    await page.getByRole("button", { name: /Leveling|Ascend/i }).first().click();
    await page.getByText(/Ascend|Level/i).first().waitFor();
    const back = page.getByRole("button", { name: /Habits|Back/i }).first();
    await back.click();
    await page.getByText("Read", { exact: true }).waitFor();
  });
  await test(`${label}: password modal opens and closes`, async () => {
    await page.getByTitle("Change password").click();
    await page.getByText("Change password", { exact: true }).waitFor();
    const close = page.getByRole("button", { name: /Close|Cancel/i }).first();
    await close.click();
    await page.getByText("Change password", { exact: true }).waitFor({ state: "detached" });
  });
  await test(`${label}: no browser console or request errors`, async () => {
    assert(errors.length === 0, errors.join(" | "));
  });
  await page.close();
}

await test("login: fields, visibility toggle, and signup navigation", async () => {
  const { page, errors } = await newPage({ width: 390, height: 844 }, false);
  await page.goto(`${baseURL}/login`);
  await page.getByLabel("Username").fill("alice");
  const pw = page.locator("#login-password");
  await pw.fill("secret1");
  assert(await pw.getAttribute("type") === "password", "password visible initially");
  await page.getByRole("button", { name: "Show password" }).click();
  assert(await pw.getAttribute("type") === "text", "visibility toggle failed");
  assert(await page.getByRole("link", { name: /Create an account/i }).count() === 1, "signup link missing");
  assert(errors.length === 0, errors.join(" | "));
  await page.close();
});

await test("signup: validation and successful account creation", async () => {
  const { page, errors } = await newPage({ width: 1440, height: 1000 }, false);
  await page.goto(`${baseURL}/signup`);
  await page.getByLabel("Username").fill("ab");
  await page.getByText(/at least 3/i).waitFor();
  await page.getByLabel("Username").fill("alice_1");
  const passwordFields = page.locator('input[type="password"]');
  await passwordFields.nth(0).fill("secret1");
  await passwordFields.nth(1).fill("secret1");
  await page.getByRole("button", { name: /Create account/i }).click();
  await page.getByText("Welcome, alice_1", { exact: true }).waitFor();
  assert(errors.length === 0, errors.join(" | "));
  await page.close();
});

const failed = findings.filter((item) => !item.ok);
console.log(`\nBROWSER AUDIT: ${findings.length - failed.length}/${findings.length} passed`);
await browser.close();
process.exit(failed.length ? 1 : 0);
;

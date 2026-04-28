const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.e2e') });
const playwright = require('playwright');

const TARGET_URL = process.env.E2E_URL || 'http://localhost:5173/';
const USER = process.env.E2E_USER;
const PASS = process.env.E2E_PASS;
const CARD = (process.env.E2E_CARD_NUMBER || '4242424242424242').replace(/\s+/g, '');
const EXP = process.env.E2E_CARD_EXP || '11/30';
const CVV = process.env.E2E_CARD_CVV || '123';
const OTHER = process.env.E2E_MERCADOPAGO_OTHER || '123456789';
const N8N_URL = process.env.N8N_URL || process.env.URL_N8N;
const N8N_USER = process.env.N8N_USER || process.env.USER_N8N;
const N8N_PASS = process.env.N8N_PASS || process.env.PASS_N8N;

const RESULTS_DIR = path.join(process.cwd(), 'results');
if (!fs.existsSync(RESULTS_DIR)) fs.mkdirSync(RESULTS_DIR, { recursive: true });

const report = {
  name: 'planes_saldos',
  start: new Date().toISOString(),
  target: TARGET_URL,
  steps: []
};

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    console.log('Goto', TARGET_URL);
    await page.goto(TARGET_URL, { waitUntil: 'networkidle', timeout: 30000 });
    report.steps.push({ step: 'open', ok: true, note: 'loaded target URL' });

    // Try to detect login form on root; if not found, try explicit /login path
    let emailSel = await page.$('input[type="email"], input[name="email"], input#email, input[placeholder*="correo"], input[placeholder*="Email"], input[name="username"]');
    if (!emailSel) {
      const loginUrl = new URL('/login', TARGET_URL).href;
      console.log('No login detected on root — trying', loginUrl);
      try {
        await page.goto(loginUrl, { waitUntil: 'networkidle', timeout: 15000 });
      } catch (e) {}
      emailSel = await page.$('input[type="email"], input[name="email"], input#email, input[placeholder*="correo"], input[placeholder*="Email"], input[name="username"]');
    }

    if (emailSel) {
      console.log('Filling login');
      await emailSel.fill(USER);
      const passSel = await page.$('input[type="password"], input[name="password"], input#password');
      if (passSel) {
        await passSel.fill(PASS);
      }
      // click submit - use locator() and avoid mixing text= inside a CSS list
      let loginBtn = page.locator('button[type="submit"], button:has-text("Entrar"), button:has-text("Ingresar"), button:has-text("Iniciar sesión")');
      if ((await loginBtn.count()) === 0) {
        // fallback to a text selector if no button found
        loginBtn = page.locator('text=Login');
      }
      if ((await loginBtn.count()) > 0) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {}),
          loginBtn.first().click().catch(() => {})
        ]);
      } else {
        await page.keyboard.press('Enter').catch(() => {});
        await page.waitForTimeout(2000);
      }
      report.steps.push({ step: 'login', ok: true, note: 'attempted login' });

      // verify login succeeded by checking for dashboard markers
      let loggedIn = false;
      try {
        await page.waitForSelector('text=Cerrar Sesión, text=Dashboard, nav >> text=Dashboard', { timeout: 8000 });
        loggedIn = true;
      } catch (e) {}
      report.steps.push({ step: 'verify_login', ok: loggedIn, note: loggedIn ? 'login appears successful' : 'login not verified' });
    } else {
      report.steps.push({ step: 'login', ok: false, note: 'no login form detected (may already be logged in)' });
    }

    // close possible instagram/config modal
    const modalButtons = ['button[aria-label="Close"]', 'button:has-text("Cerrar")', 'button:has-text("Saltar")', 'button:has-text("Skip")', 'button:has-text("No ahora")'];
    for (const s of modalButtons) {
      const b = await page.$(s);
      if (b) {
        await b.click().catch(() => {});
        await page.waitForTimeout(500);
      }
    }

    // navigate to plans module
    let wentToPlans = false;
    const navSelectors = ['a:has-text("Planes")', 'a:has-text("Planes y Saldos")', 'a:has-text("Saldos")', 'nav >> text=Planes'];
    for (const s of navSelectors) {
      const el = await page.$(s);
      if (el) {
        await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 }).catch(() => {}), el.click().catch(() => {})]);
        wentToPlans = true;
        break;
      }
    }
    if (!wentToPlans) {
      // try direct dashboard path with plans active tab
      try { await page.goto(new URL('/dashboard?activeTab=plans', TARGET_URL).href, { waitUntil: 'networkidle', timeout: 8000 }); wentToPlans = true; } catch (e) {}
      if (!wentToPlans) {
        // fallback to old /planes path
        try { await page.goto(new URL('/planes', TARGET_URL).href, { waitUntil: 'networkidle', timeout: 8000 }); wentToPlans = true; } catch (e) {}
      }
    }
    report.steps.push({ step: 'navigate_plans', ok: wentToPlans, note: wentToPlans ? 'arrived to plans page' : 'could not find plans navigation' });

    // find buy/plan controls
    // wait for grid to render and allow more time for client hydration
    await page.waitForTimeout(1200);
    await page.waitForSelector('div.grid, .grid', { timeout: 10000 }).catch(() => {});
    // wait until there is at least one card rendered inside the grid (best-effort)
    try {
      await page.waitForFunction(() => {
        const g = document.querySelector('div.grid, .grid');
        if (!g) return false;
        return g.querySelectorAll('div, article, section').length > 0;
      }, { timeout: 8000 });
    } catch (e) {
      // proceed even if not all rendered
    }

    // detect plan buttons by scanning all clickable elements and filtering by known keywords
    const candidateLocator = page.locator('button, a, [role="button"], [onclick]');
    const candCount = await candidateLocator.count();
    const keywords = /Elegir|Potenciar|Dominar|Plan Base|Tu Plan Actual|Potenciar mi Tienda|Elegir Básico|Elegir Pro|Elegir Full/i;
    const matchedIndices = [];
    for (let ci = 0; ci < candCount; ci++) {
      try {
        const txt = (await candidateLocator.nth(ci).innerText()).trim();
        if (keywords.test(txt)) matchedIndices.push(ci);
      } catch (e) {
        // ignore
      }
    }
    const count = matchedIndices.length;
    console.log('Candidate clickable elements:', candCount, 'Matched plan CTAs:', count, 'indices:', matchedIndices.slice(0,10));
    if (count === 0) {
      report.steps.push({ step: 'find_plans', ok: false, note: 'no purchase buttons found' });
      // Save HTML snapshot and inner grid HTML to help debug selectors
      try {
        const html = await page.content();
        const dumpPath = path.join(RESULTS_DIR, `planes_saldos_${Date.now()}_page.html`);
        fs.writeFileSync(dumpPath, html);
        console.log('Saved page snapshot to', dumpPath);
        report.steps.push({ step: 'debug_snapshot', ok: true, note: `snapshot:${dumpPath}` });
        // save inner grid HTML if present
        const gridHandle = await page.$('div.grid, .grid');
        if (gridHandle) {
          const inner = await gridHandle.evaluate(n => n.innerHTML).catch(() => null);
          if (inner) {
            const gridPath = path.join(RESULTS_DIR, `planes_saldos_${Date.now()}_grid.html`);
            fs.writeFileSync(gridPath, inner);
            console.log('Saved grid inner HTML to', gridPath);
            report.steps.push({ step: 'debug_grid', ok: true, note: `grid:${gridPath}` });
          }
        }
        // save first N clickable elements text for debugging
        try {
          const clickables = [];
          const ccount = await candidateLocator.count();
          const maxDump = Math.min(200, ccount);
          for (let ci = 0; ci < maxDump; ci++) {
            try {
              const t = (await candidateLocator.nth(ci).innerText()).replace(/\s+/g,' ').trim().slice(0,200);
              clickables.push({ index: ci, text: t });
            } catch (e) {
              clickables.push({ index: ci, text: null });
            }
          }
          const clicksPath = path.join(RESULTS_DIR, `planes_saldos_${Date.now()}_clickables.json`);
          fs.writeFileSync(clicksPath, JSON.stringify(clickables, null, 2));
          console.log('Saved clickables debug to', clicksPath);
          report.steps.push({ step: 'debug_clickables', ok: true, note: `clickables:${clicksPath}` });
        } catch (e) {
          // ignore
        }
      } catch (e) {
        report.steps.push({ step: 'debug_snapshot', ok: false, note: 'snapshot_failed' });
      }
    } else {
      report.steps.push({ step: 'find_plans', ok: true, note: `found ${count} plan buttons` });
    }

    const results = [];
    for (let i = 0; i < count; i++) {
      const idx = matchedIndices[i];
      const item = { index: i, ok: false, notes: [] };
      try {
        // extract a label near the button
        const label = await candidateLocator.nth(idx).evaluate((el) => {
          const card = el.closest('article, .card, .plan-card, .plan, div');
          if (card) return card.innerText.slice(0, 120);
          return el.innerText;
        }).catch(() => null);
        item.label = label;

        // click and wait for navigation or popup
        console.log('Clicking buy button for plan', i, 'element index', idx);
        const [popupPromise, navPromise] = [context.waitForEvent('page').catch(() => null), page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => null)];
        await candidateLocator.nth(idx).click({ force: true }).catch(() => {});
        const newPage = await popupPromise;
        await navPromise;
        const currentPage = newPage || page;

        item.checkout_url = currentPage.url();
        item.notes.push('checkout_opened:' + item.checkout_url);

        // attempt to detect mercadopago domain
        const isMP = /mercadopago|mercadopago.com|sandbox.mp|mpago/gi.test(item.checkout_url);

        // helper to fill card in a Page or Frame
        async function tryFill(framePage) {
          try {
            // try common input selectors
            const selectors = ['input[name="cardNumber"]', "input#cardNumber", 'input[placeholder*="Número"]', 'input[placeholder*="Card number"]', 'input[name*="card"]', 'input[type="text"][inputmode="numeric"]'];
            for (const s of selectors) {
              const el = await framePage.$(s);
              if (el) {
                await el.fill(CARD).catch(() => {});
              }
            }
            // expiry
            const expirySelectors = ['input[name="cardExpiration"]', 'input[name*="expiry"]', 'input[placeholder*="MM/YY"]', 'input[placeholder*="MM / YY"]'];
            for (const s of expirySelectors) {
              const el = await framePage.$(s);
              if (el) await el.fill(EXP).catch(() => {});
            }
            // cvv
            const cvvSelectors = ['input[name="cardCvv"]', 'input[name*="cvv"]', 'input[placeholder*="CVV"]'];
            for (const s of cvvSelectors) {
              const el = await framePage.$(s);
              if (el) await el.fill(CVV).catch(() => {});
            }
            // email
            const emailSelectors = ['input[type="email"]', 'input[name="email"]', 'input[placeholder*="Email"]'];
            for (const s of emailSelectors) {
              const el = await framePage.$(s);
              if (el) await el.fill(USER).catch(() => {});
            }
            // try to click pay
            const payBtn = await framePage.$('button:has-text("Pagar"), button:has-text("Pay"), button:has-text("Pague"), button:has-text("Pagar ahora"), button:has-text("Pagar y confirmar")');
            if (payBtn) {
              await Promise.all([framePage.waitForNavigation({ waitUntil: 'networkidle', timeout: 20000 }).catch(() => {}), payBtn.click().catch(() => {})]);
              return true;
            }
            return false;
          } catch (e) {
            return false;
          }
        }

        // iterate frames in currentPage
        let paid = false;
        for (const f of currentPage.frames()) {
          if (await f.$('input')) {
            paid = await tryFill(f);
            if (paid) break;
          }
        }
        if (!paid) {
          // try directly on page
          paid = await tryFill(currentPage);
        }

        if (paid) {
          item.notes.push('payment_submitted');
        } else {
          item.notes.push('payment_skipped_or_inputs_not_found');
        }

        // wait for possible success indicator
        try {
          await currentPage.waitForURL('**/payment-result**', { timeout: 20000 }).catch(() => {});
          const url = currentPage.url();
          if (/payment-result/.test(url)) {
            item.ok = true;
            item.notes.push('returned_to_app:' + url);
          }
        } catch (e) {}

        // short sleep
        await page.waitForTimeout(2000);

        // query n8n for executions
        if (N8N_URL && N8N_USER && N8N_PASS) {
          try {
            const req = await playwright.request.newContext({ baseURL: N8N_URL });
            const login = await req.post('/rest/login', { headers: { 'Content-Type': 'application/json' }, data: { emailOrLdapLoginId: N8N_USER, password: N8N_PASS } });
            const loginBody = await login.text();
            item.notes.push('n8n_login_status:' + login.status());
            const execs = await req.get('/rest/executions?limit=30');
            const execJson = await execs.json().catch(() => null);
            item.n8n_executions = execJson && execJson.data && execJson.data.results ? execJson.data.results.slice(0,10) : execJson;
            await req.dispose();
          } catch (e) {
            item.notes.push('n8n_query_error:' + String(e));
          }
        }

        results.push(item);

      } catch (err) {
        console.error('plan loop error', err);
        results.push({ index: i, ok: false, error: String(err) });
      }

      // try to go back to plans page to continue (safe fallback)
      try { await page.goto(new URL('/planes', TARGET_URL).href, { waitUntil: 'networkidle', timeout: 8000 }).catch(()=>{}); } catch (e) {}
      await page.waitForTimeout(1000);
    }

    report.end = new Date().toISOString();
    report.results = results;

    const outPath = path.join(RESULTS_DIR, `planes_saldos_${Date.now()}.json`);
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log('E2E report saved to', outPath);

  } catch (err) {
    console.error('E2E runner error', err);
    report.error = String(err);
    fs.writeFileSync(path.join(RESULTS_DIR, `planes_saldos_error_${Date.now()}.json`), JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
  }

  process.exit(0);
})();

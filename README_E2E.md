E2E runner (planes/saldos)

Usage:

1) Install dependencies:

```bash
npm install
```

2) Configure `.env.e2e` (already provided in repo) or export env vars.

3) Run the E2E smoke test:

```bash
npm run e2e
```

Results are saved under `results/planes_saldos_*.json`.

Notes:
- The test attempts to login at the given `E2E_URL`, navigate to Planes/Saldos, iterate found purchase buttons and attempt a checkout using the supplied MercadoPago test card.
- The runner also logs n8n executions by calling the n8n REST API (using `N8N_URL`, `N8N_USER`, `N8N_PASS` from `.env.e2e` or `.env.local`).
- This is an initial scaffold: selectors are generic; depending on the app structure selectors may need refinement.

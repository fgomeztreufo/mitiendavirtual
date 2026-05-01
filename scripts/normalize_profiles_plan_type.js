#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadEnvFile() {
  const envPath = path.resolve(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) return
  const content = fs.readFileSync(envPath, 'utf8')
  content.split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)\s*$/)
    if (m) {
      const k = m[1]
      let v = m[2]
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
      if (!process.env[k]) process.env[k] = v
    }
  })
}

loadEnvFile()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env or .env.local')
  process.exit(1)
}

function sanitize(input) {
  if (!input) return ''
  return input
    .toString()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .trim()
}

function normalizePlanType(input) {
  const s = sanitize(input || '')
  if (!s) return 'free'
  if (s.includes('free') || s.includes('semilla') || s.includes('gratis')) return 'free'
  if (s.includes('basi') || s.includes('basico') || s.includes('emprend')) return 'basic'
  if (s.includes('empres') || s === 'pro' || s.includes('crecim') || s.includes('crecimiento')) return 'pro'
  if (s.includes('full') || s.includes('complet') || s.includes('completo')) return 'full'
  return s
}

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, opts)
  const text = await res.text()
  try { return JSON.parse(text) } catch(e) { throw new Error(`Invalid JSON from ${url}: ${text}`) }
}

async function main() {
  const base = SUPABASE_URL.replace(/\/$/, '')
  console.log('Using Supabase URL:', base)

  // 1) Get profiles
  const profiles = await fetchJson(`${base}/rest/v1/profiles?select=id,plan_type`, {
    headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }
  })

  console.log(`Found ${profiles.length} profiles`)

  let updated = 0

  for (const p of profiles) {
    const id = p.id
    const current = p.plan_type
    const normalized = normalizePlanType(current)
    if (!id) continue
    if (String(current || '').toLowerCase() === String(normalized).toLowerCase()) continue

    // fetch plan details
    let planDetails = []
    try {
      planDetails = await fetchJson(`${base}/rest/v1/plans?select=code,messages_limit,products_limit&code=eq.${encodeURIComponent(normalized)}`, {
        headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` }
      })
    } catch(e) {
      console.warn('Could not fetch plan details for', normalized, e.message)
    }

    const body = { plan_type: normalized }
    if (planDetails && planDetails.length > 0) {
      const pd = planDetails[0]
      if (pd.messages_limit !== null && pd.messages_limit !== undefined) body.monthly_limit = pd.messages_limit
    }

    // PATCH profile
    const patchRes = await fetch(`${base}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        'apikey': KEY,
        'Authorization': `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(body)
    })

    if (!patchRes.ok) {
      const text = await patchRes.text()
      console.error('Failed to patch', id, patchRes.status, text)
    } else {
      const resJson = await patchRes.json()
      console.log('Patched', id, '->', normalized)
      updated++
    }
  }

  console.log(`Normalization complete. Updated ${updated} profiles.`)
}

main().catch(err => { console.error(err); process.exit(2) })

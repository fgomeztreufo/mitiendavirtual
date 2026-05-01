#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
const { Client } = pg

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const sqlFile = path.join(__dirname, '..', 'db', '001_create_plans_table.sql')
if (!fs.existsSync(sqlFile)) {
  console.error('SQL file not found:', sqlFile)
  process.exit(1)
}

const sql = fs.readFileSync(sqlFile, 'utf8')
const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL
if (!connectionString) {
  console.error('No SUPABASE_DB_URL or DATABASE_URL set in env')
  process.exit(1)
}

async function run() {
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  })

  try {
    await client.connect()
    console.log('Connected to DB')

    // Split statements by semicolon and execute sequentially
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    for (const stmt of statements) {
      console.log('Executing statement...')
      await client.query(stmt)
    }

    console.log('Migration finished successfully')
    await client.end()
    process.exit(0)
  } catch (err) {
    console.error('Migration error:', err && err.message ? err.message : err)
    try { await client.end() } catch(e) {}
    process.exit(2)
  }
}

run()

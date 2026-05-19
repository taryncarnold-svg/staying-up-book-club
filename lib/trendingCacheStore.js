import { supabaseAdmin } from '@/lib/supabase-admin'

const CACHE_ID = 'bookclubs'
const STORAGE_BUCKET = 'app-cache'
const STORAGE_PATH = 'trending.json'
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

function parseOverride() {
  const raw = process.env.TRENDING_BOOKS_JSON
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return { books: parsed, updated_at: new Date().toISOString() }
    if (parsed.books) return parsed
    return null
  } catch {
    return null
  }
}

async function readFromTable() {
  const { data, error } = await supabaseAdmin
    .from('trending_cache')
    .select('books, updated_at')
    .eq('id', CACHE_ID)
    .maybeSingle()

  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') return null
    throw error
  }
  if (!data) return null
  return { books: data.books, updated_at: data.updated_at }
}

async function writeToTable(books, updated_at) {
  const { error } = await supabaseAdmin.from('trending_cache').upsert({
    id: CACHE_ID,
    books,
    updated_at,
  })
  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') return false
    throw error
  }
  return true
}

async function readFromStorage() {
  const { data, error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .download(STORAGE_PATH)

  if (error) return null
  const text = await data.text()
  return JSON.parse(text)
}

async function writeToStorage(payload) {
  const body = JSON.stringify(payload)
  const { error } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(STORAGE_PATH, body, { upsert: true, contentType: 'application/json' })

  if (error) throw error
}

export function isCacheStale(updated_at) {
  if (!updated_at) return true
  return Date.now() - new Date(updated_at).getTime() > CACHE_MAX_AGE_MS
}

export async function getTrendingCache() {
  const override = parseOverride()
  if (override) return override

  const fromTable = await readFromTable()
  if (fromTable) return fromTable

  return readFromStorage()
}

export async function setTrendingCache(books) {
  const payload = { books, updated_at: new Date().toISOString() }
  const wroteTable = await writeToTable(books, payload.updated_at)
  if (!wroteTable) {
    await writeToStorage(payload)
  }
  return payload
}

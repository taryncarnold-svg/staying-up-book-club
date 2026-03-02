import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

async function fetchCoverImage(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) })
    const html = await res.text()
    const match = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
    return match ? match[1] : null
  } catch { return null }
}

export async function POST(request) {
  const { title, author, note, submitted_by, book_url } = await request.json()
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  let cover_image = null
  if (book_url) cover_image = await fetchCoverImage(book_url)
  const { data, error } = await supabase.from('books').insert([{ title, author, note, submitted_by, book_url, cover_image }]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

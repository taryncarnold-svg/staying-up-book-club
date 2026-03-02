import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { fetchCoverImage } from '@/lib/fetchCoverImage'

export async function POST(request) {
  const { title, author, note, submitted_by, book_url } = await request.json()
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  let cover_image = null
  if (book_url) cover_image = await fetchCoverImage(book_url)
  const { data, error } = await supabase.from('books').insert([{ title, author, note, submitted_by, book_url, cover_image }]).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

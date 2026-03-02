import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { fetchCoverImage } from '@/lib/fetchCoverImage'

export async function POST() {
  const { data: books, error } = await supabase
    .from('books')
    .select('id, book_url')
    .is('cover_image', null)
    .not('book_url', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!books.length) return NextResponse.json({ updated: 0, message: 'Nothing to backfill' })

  let updated = 0
  for (const book of books) {
    const cover_image = await fetchCoverImage(book.book_url)
    if (cover_image) {
      await supabase.from('books').update({ cover_image }).eq('id', book.id)
      updated++
    }
  }

  return NextResponse.json({ updated, total: books.length })
}

import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

async function fetchCoverFromOpenLibrary(title, author) {
  try {
    const q = encodeURIComponent(`${title}${author ? ' ' + author : ''}`)
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${q}&limit=1&fields=cover_i`,
      { signal: AbortSignal.timeout(6000) }
    )
    const data = await res.json()
    const coverId = data.docs?.[0]?.cover_i
    if (!coverId) return null
    return `https://covers.openlibrary.org/b/id/${coverId}-M.jpg`
  } catch {
    return null
  }
}

export async function GET() {
  const { data, error } = await supabase
    .from('past_reads')
    .select('*')
    .order('month', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // For any row missing a cover, fetch from Open Library and save back
  const needsCovers = data.filter(b => !b.cover_image && b.title)
  await Promise.all(needsCovers.map(async (book) => {
    const cover = await fetchCoverFromOpenLibrary(book.title, book.author)
    if (cover) {
      await supabase.from('past_reads').update({ cover_image: cover }).eq('id', book.id)
      book.cover_image = cover
    }
  }))

  return NextResponse.json(data)
}

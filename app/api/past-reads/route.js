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

async function fetchCoverFromGoogleBooks(title, author) {
  try {
    const q = encodeURIComponent(`intitle:${title}${author ? `+inauthor:${author}` : ''}`)
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`,
      { signal: AbortSignal.timeout(6000) }
    )
    const data = await res.json()
    const thumbnail = data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail
    if (!thumbnail) return null
    return thumbnail.replace('http://', 'https://').replace('zoom=1', 'zoom=2')
  } catch {
    return null
  }
}

async function fetchCover(title, author) {
  return (await fetchCoverFromOpenLibrary(title, author))
      || (await fetchCoverFromGoogleBooks(title, author))
}

export async function GET() {
  const { data, error } = await supabase
    .from('past_reads')
    .select('*')
    .order('month', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const needsCovers = data.filter(b => !b.cover_image && b.title)
  await Promise.all(needsCovers.map(async (book) => {
    const cover = await fetchCover(book.title, book.author)
    if (cover) {
      await supabase.from('past_reads').update({ cover_image: cover }).eq('id', book.id)
      book.cover_image = cover
    }
  }))

  return NextResponse.json(data)
}

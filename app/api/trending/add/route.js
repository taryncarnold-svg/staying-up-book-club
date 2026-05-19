import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { fetchCoverImage } from '@/lib/fetchCoverImage'
import { lookupBookUrl, lookupGoodreadsSearchUrl } from '@/lib/lookupBookUrl'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function generateBlurb(title, author) {
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{
        role: 'user',
        content: `Write a single short sentence (max 25 words) about the book "${title}"${author ? ` by ${author}` : ''}. Focus on themes and why readers love it — no spoilers, no fluff. Do not start with the title. Do not use quotes. Just the sentence.`,
      }],
    })
    return `__ai__${msg.content[0].text.trim()}`
  } catch {
    return null
  }
}

export async function POST(request) {
  const { title, author } = await request.json()
  if (!title?.trim()) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 })
  }

  const { data: existing } = await supabase
    .from('books')
    .select('id, title')
    .ilike('title', title.trim())

  if (existing?.length) {
    return NextResponse.json({ error: 'Already on the list', existing: true }, { status: 409 })
  }

  const book_url =
    (await lookupBookUrl(title.trim(), author?.trim())) ||
    (await lookupGoodreadsSearchUrl(title.trim(), author?.trim()))

  const [cover_image, aiBlurb] = await Promise.all([
    book_url ? fetchCoverImage(book_url) : Promise.resolve(null),
    generateBlurb(title.trim(), author?.trim()),
  ])

  const { data, error } = await supabase
    .from('books')
    .insert([{
      title: title.trim(),
      author: author?.trim() || null,
      note: aiBlurb,
      submitted_by: 'trending pick',
      book_url,
      cover_image,
    }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

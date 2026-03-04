import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import { fetchCoverImage } from '@/lib/fetchCoverImage'
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
  const { title, author, note, submitted_by, book_url } = await request.json()
  if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 })

  const [cover_image, aiBlurb] = await Promise.all([
    book_url ? fetchCoverImage(book_url) : Promise.resolve(null),
    !note?.trim() ? generateBlurb(title, author) : Promise.resolve(null),
  ])

  const finalNote = note?.trim() || aiBlurb || null

  const { data, error } = await supabase
    .from('books')
    .insert([{ title, author, note: finalNote, submitted_by, book_url, cover_image }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

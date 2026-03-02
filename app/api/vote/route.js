import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const { book_id, voter_token } = await request.json()
  if (!book_id || !voter_token) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  const { data: existing } = await supabase.from('votes').select('id').eq('book_id', book_id).eq('voter_token', voter_token).single()
  if (existing) {
    await supabase.from('votes').delete().eq('id', existing.id)
    await supabase.rpc('decrement_votes', { book_id })
    return NextResponse.json({ voted: false })
  } else {
    await supabase.from('votes').insert([{ book_id, voter_token }])
    await supabase.rpc('increment_votes', { book_id })
    return NextResponse.json({ voted: true })
  }
}

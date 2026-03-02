import { supabase } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const sort = searchParams.get('sort') || 'votes'
  const orderColumn = sort === 'recent' ? 'created_at' : 'votes'
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .order(orderColumn, { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

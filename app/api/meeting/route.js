import { NextResponse } from 'next/server'
import { getMeetingVotes } from '@/lib/meetingPollStore'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const meeting_key = searchParams.get('meeting_key')
  const voter_token = searchParams.get('voter_token')

  if (!meeting_key) {
    return NextResponse.json({ error: 'meeting_key required' }, { status: 400 })
  }

  try {
    const votes = await getMeetingVotes(meeting_key)
    const counts = {}
    const votedKeys = []

    for (const vote of votes) {
      counts[vote.slot_key] = (counts[vote.slot_key] || 0) + 1
      if (voter_token && vote.voter_token === voter_token) {
        votedKeys.push(vote.slot_key)
      }
    }

    return NextResponse.json({ counts, votedKeys })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

import { NextResponse } from 'next/server'
import { getMeetingVotes, setMeetingVotes } from '@/lib/meetingPollStore'

export async function POST(request) {
  const { meeting_key, slot_key, voter_token } = await request.json()

  if (!meeting_key || !slot_key || !voter_token) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  try {
    const votes = await getMeetingVotes(meeting_key)
    const existingIndex = votes.findIndex(
      v => v.slot_key === slot_key && v.voter_token === voter_token
    )

    if (existingIndex >= 0) {
      votes.splice(existingIndex, 1)
      await setMeetingVotes(meeting_key, votes)
      return NextResponse.json({ voted: false })
    }

    votes.push({ slot_key, voter_token })
    await setMeetingVotes(meeting_key, votes)
    return NextResponse.json({ voted: true })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

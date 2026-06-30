import { supabaseAdmin } from '@/lib/supabase-admin'

const BUCKET = 'app-cache'

function storagePath(meetingKey) {
  return `meeting-${meetingKey}.json`
}

export async function getMeetingVotes(meetingKey) {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET)
    .download(storagePath(meetingKey))

  if (error) return []
  const parsed = JSON.parse(await data.text())
  return parsed.votes || []
}

export async function setMeetingVotes(meetingKey, votes) {
  const body = JSON.stringify({ votes })
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(storagePath(meetingKey), body, { upsert: true, contentType: 'application/json' })

  if (error) throw error
}

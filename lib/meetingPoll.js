// Update `key` and `days` each month when the pick is announced.
export const MEETING_POLL = {
  key: '2026-07',
  days: [
    {
      label: 'Sat Jul 12',
      times: [
        { key: 'sat-jul-12-11am', label: '11am' },
        { key: 'sat-jul-12-2pm', label: '2pm' },
        { key: 'sat-jul-12-5pm', label: '5pm' },
      ],
    },
    {
      label: 'Sun Jul 13',
      times: [
        { key: 'sun-jul-13-11am', label: '11am' },
        { key: 'sun-jul-13-2pm', label: '2pm' },
        { key: 'sun-jul-13-5pm', label: '5pm' },
      ],
    },
    {
      label: 'Sat Jul 19',
      times: [
        { key: 'sat-jul-19-11am', label: '11am' },
        { key: 'sat-jul-19-2pm', label: '2pm' },
        { key: 'sat-jul-19-5pm', label: '5pm' },
      ],
    },
    {
      label: 'Sun Jul 20',
      times: [
        { key: 'sun-jul-20-11am', label: '11am' },
        { key: 'sun-jul-20-2pm', label: '2pm' },
        { key: 'sun-jul-20-5pm', label: '5pm' },
      ],
    },
  ],
}

export function getMeetingSlots(poll = MEETING_POLL) {
  return poll.days.flatMap(day =>
    day.times.map(time => ({
      ...time,
      dayLabel: day.label,
      fullLabel: `${day.label} · ${time.label} PT`,
    }))
  )
}

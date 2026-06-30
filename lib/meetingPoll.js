// Update `key`, `days`, and `voteDeadline` each month when the pick is announced.
export const MEETING_POLL = {
  key: '2026-07-v2',
  // End of day July 10, 2026 PT (UTC-7)
  voteDeadline: '2026-07-11T06:59:59.000Z',
  voteDeadlineLabel: 'July 10',
  days: [
    {
      label: 'Sat Jul 18',
      times: [
        { key: 'sat-jul-18-830am', label: '8:30am' },
        { key: 'sat-jul-18-10am', label: '10am' },
        { key: 'sat-jul-18-3pm', label: '3pm' },
      ],
    },
    {
      label: 'Sun Jul 19',
      times: [
        { key: 'sun-jul-19-10am', label: '10am' },
        { key: 'sun-jul-19-11am', label: '11am' },
        { key: 'sun-jul-19-3pm', label: '3pm' },
      ],
    },
    {
      label: 'Sat Jul 26',
      times: [
        { key: 'sat-jul-26-10am', label: '10am' },
        { key: 'sat-jul-26-11am', label: '11am' },
        { key: 'sat-jul-26-3pm', label: '3pm' },
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

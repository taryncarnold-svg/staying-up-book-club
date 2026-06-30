'use client'

import { useState, useEffect, useCallback } from 'react'
import { MEETING_POLL, getMeetingSlots } from '@/lib/meetingPoll'

const SYS = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

export default function Home() {
  const [books, setBooks] = useState([])
  const [voterToken] = useState(() => {
    if (typeof window === 'undefined') return null
    let token = window.localStorage.getItem('voter_token')
    if (!token) {
      token = crypto.randomUUID()
      window.localStorage.setItem('voter_token', token)
    }
    return token
  })
  const [votedIds, setVotedIds] = useState(() => {
    if (typeof window === 'undefined') return new Set()
    const voted = JSON.parse(window.localStorage.getItem('voted_ids') || '[]')
    return new Set(voted)
  })
  const [sort, setSort] = useState('votes')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ title: '', author: '', note: '', submitted_by: '', book_url: '' })
  const [pastReads, setPastReads] = useState([])
  const [pastLoading, setPastLoading] = useState(false)
  const [trendingBooks, setTrendingBooks] = useState([])
  const [trendingLoading, setTrendingLoading] = useState(true)
  const [trendingStale, setTrendingStale] = useState(false)
  const [addingTrending, setAddingTrending] = useState(null)
  const [addedTrending, setAddedTrending] = useState(new Set())
  const [meetingCounts, setMeetingCounts] = useState({})
  const [meetingVotedKeys, setMeetingVotedKeys] = useState(new Set())
  const [meetingLoading, setMeetingLoading] = useState(true)
  const [meetingCountdown, setMeetingCountdown] = useState(null)

  const fetchBooks = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/books?sort=${sort}`)
    const data = await res.json()
    setBooks(data)
    setLoading(false)
  }, [sort])

  const fetchPastReads = useCallback(async () => {
    setPastLoading(true)
    const res = await fetch('/api/past-reads')
    const data = await res.json()
    setPastReads(data)
    setPastLoading(false)
  }, [])

  const fetchMeetingPoll = useCallback(async () => {
    if (!voterToken) return
    setMeetingLoading(true)
    try {
      const res = await fetch(
        `/api/meeting?meeting_key=${MEETING_POLL.key}&voter_token=${voterToken}`
      )
      const data = await res.json()
      setMeetingCounts(data.counts || {})
      setMeetingVotedKeys(new Set(data.votedKeys || []))
    } finally {
      setMeetingLoading(false)
    }
  }, [voterToken])

  useEffect(() => {
    if (sort === 'past') {
      void fetchPastReads()
    } else {
      void fetchBooks()
    }
  }, [sort, fetchBooks, fetchPastReads])

  useEffect(() => {
    void fetchMeetingPoll()
  }, [fetchMeetingPoll])

  useEffect(() => {
    if (!MEETING_POLL.voteDeadline) return undefined
    const deadline = new Date(MEETING_POLL.voteDeadline)
    function tick() {
      const diff = deadline - Date.now()
      if (diff <= 0) {
        setMeetingCountdown('closed')
        return
      }
      setMeetingCountdown({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        mins: Math.floor((diff % 3600000) / 60000),
        secs: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    async function loadTrending() {
      setTrendingLoading(true)
      try {
        const res = await fetch('/api/trending')
        const data = await res.json()
        setTrendingBooks(data.books || [])
        setTrendingStale(!!data.stale)
      } catch {
        setTrendingBooks([])
      } finally {
        setTrendingLoading(false)
      }
    }
    void loadTrending()
  }, [])

  function isBookOnList(title) {
    const normalized = title.trim().toLowerCase()
    return books.some(b => b.title.trim().toLowerCase() === normalized)
  }

  async function handleTrendingAdd(book) {
    if (isBookOnList(book.title) || addedTrending.has(book.title)) return
    setAddingTrending(book.title)
    try {
      const res = await fetch('/api/trending/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: book.title, author: book.author }),
      })
      if (res.status === 409) {
        setAddedTrending(prev => new Set([...prev, book.title]))
        return
      }
      if (!res.ok) return
      setAddedTrending(prev => new Set([...prev, book.title]))
      if (sort !== 'past') void fetchBooks()
    } finally {
      setAddingTrending(null)
    }
  }

  function formatMonth(str) {
    if (!str) return ''
    const d = new Date(str + 'T00:00:00')
    return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  async function handleSubmit() {
    if (!form.title.trim()) return
    setSubmitting(true)
    await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setForm({ title: '', author: '', note: '', submitted_by: '', book_url: '' })
    setShowForm(false)
    setSubmitting(false)
    fetchBooks()
  }

  async function handleVote(id) {
    const res = await fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book_id: id, voter_token: voterToken }),
    })
    const { voted } = await res.json()
    const newVoted = new Set(votedIds)
    if (voted) newVoted.add(id)
    else newVoted.delete(id)
    setVotedIds(newVoted)
    localStorage.setItem('voted_ids', JSON.stringify([...newVoted]))
    setBooks(books.map(b => b.id === id ? { ...b, votes: b.votes + (voted ? 1 : -1) } : b))
  }

  async function handleMeetingVote(slotKey) {
    const res = await fetch('/api/meeting/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        meeting_key: MEETING_POLL.key,
        slot_key: slotKey,
        voter_token: voterToken,
      }),
    })
    const { voted } = await res.json()
    setMeetingVotedKeys(prev => {
      const next = new Set(prev)
      if (voted) next.add(slotKey)
      else next.delete(slotKey)
      return next
    })
    setMeetingCounts(prev => ({
      ...prev,
      [slotKey]: Math.max(0, (prev[slotKey] || 0) + (voted ? 1 : -1)),
    }))
  }

  const bestMeetingSlot = getMeetingSlots().reduce((best, slot) => {
    const count = meetingCounts[slot.key] || 0
    if (!best || count > best.count) return { ...slot, count }
    return best
  }, null)

  const meetingPollClosed = meetingCountdown === 'closed'

  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    background: '#fff',
    border: '1px solid rgba(0,0,0,0.15)',
    borderRadius: '10px',
    fontFamily: SYS,
    fontSize: '15px',
    color: '#1d1d1f',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 500,
    color: '#3a3a3c',
    marginBottom: '6px',
    fontFamily: SYS,
  }

  function renderBookNote(book, compact = false) {
    if (!book.note) return null
    const isAI = book.note.startsWith('__ai__')
    const text = isAI ? book.note.slice(6) : book.note
    return (
      <div className={compact ? 'book-tile-note' : undefined} style={compact ? undefined : {
        fontSize: '13px',
        color: '#6e6e73',
        fontStyle: 'italic',
        lineHeight: 1.45,
        marginBottom: book.submitted_by ? '5px' : 0,
      }}>
        {isAI
          ? <><span style={{ fontStyle: 'normal', fontWeight: 600, color: '#8B7355' }}>The internet says</span> {text}</>
          : `"${text}"`
        }
      </div>
    )
  }

  function renderVoteButton(book, voted, compact = false) {
    return (
      <button
        type="button"
        className={`vote-btn${compact ? ' vote-btn-compact' : ''}${voted ? ' voted' : ''}`}
        onClick={() => handleVote(book.id)}
        style={compact ? undefined : {
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          padding: '12px 16px',
          borderRadius: '12px',
          border: 'none',
          background: voted ? '#8B2020' : 'rgba(0,0,0,0.05)',
          cursor: 'pointer',
          minWidth: '62px',
          minHeight: '60px',
        }}
      >
        <span className="vote-icon" style={{ fontSize: compact ? '10px' : '13px', color: voted ? 'rgba(255,255,255,0.85)' : '#6e6e73', lineHeight: 1 }}>
          {voted ? '✓' : '▲'}
        </span>
        <span className="vote-count" style={{ fontSize: compact ? '14px' : '19px', fontWeight: 700, color: voted ? '#fff' : '#1d1d1f', lineHeight: 1.1 }}>
          {book.votes}
        </span>
        <span className="vote-label" style={{
          fontSize: compact ? '10px' : '11px',
          fontWeight: 600,
          color: voted ? 'rgba(255,255,255,0.75)' : '#aeaeb2',
          lineHeight: 1,
          letterSpacing: '0.2px',
        }}>
          {voted ? 'Voted' : 'Vote'}
        </span>
      </button>
    )
  }

  function renderBookCover(book, size = 'full') {
    const isCompact = size === 'compact'
    return (
      <a
        href={book.book_url || undefined}
        target={book.book_url ? '_blank' : undefined}
        rel={book.book_url ? 'noopener noreferrer' : undefined}
        className={isCompact ? undefined : 'card-cover'}
        style={{
          flexShrink: 0,
          display: 'block',
          width: isCompact ? '100%' : '60px',
          height: isCompact ? '88px' : '84px',
          borderRadius: isCompact ? '6px' : '7px',
          overflow: 'hidden',
          background: '#e5e5ea',
          boxShadow: isCompact ? '0 1px 4px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.12)',
          cursor: book.book_url ? 'pointer' : 'default',
          marginBottom: isCompact ? '8px' : 0,
        }}
      >
        {book.cover_image ? (
          <img
            src={book.cover_image}
            alt={book.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: isCompact ? '18px' : '22px', color: '#aeaeb2' }}>
              {book.title.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </a>
    )
  }

  function renderFullBookCard(book, i) {
    const voted = votedIds.has(book.id)
    return (
      <div
        key={book.id}
        className="book-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          background: '#fff',
          borderRadius: '14px',
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          padding: '16px 20px',
        }}
      >
        {renderBookCover(book, 'full')}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '11px', fontWeight: 500, color: '#aeaeb2', marginBottom: '4px' }}>
            #{i + 1}
          </div>
          {book.book_url ? (
            <a
              href={book.book_url}
              target="_blank"
              rel="noopener noreferrer"
              className="card-title"
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: '#1d1d1f',
                lineHeight: 1.3,
                textDecoration: 'none',
                display: 'block',
                marginBottom: '3px',
              }}
            >
              {book.title}
            </a>
          ) : (
            <div
              className="card-title"
              style={{ fontSize: '16px', fontWeight: 600, color: '#1d1d1f', lineHeight: 1.3, marginBottom: '3px' }}
            >
              {book.title}
            </div>
          )}
          {book.author && (
            <div style={{ fontSize: '13px', color: '#6e6e73', marginBottom: book.note ? '6px' : 0 }}>
              {book.author}
            </div>
          )}
          {renderBookNote(book)}
          {book.submitted_by && (
            <div style={{ fontSize: '11px', color: '#aeaeb2', fontWeight: 500 }}>
              via {book.submitted_by}
            </div>
          )}
        </div>
        {renderVoteButton(book, voted)}
      </div>
    )
  }

  function renderCompactBookTile(book, i) {
    const voted = votedIds.has(book.id)
    return (
      <div
        key={book.id}
        className="book-tile book-card"
        style={{
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid rgba(0,0,0,0.07)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          padding: '10px',
        }}
      >
        <div className="book-tile-body">
          <div style={{ fontSize: '10px', fontWeight: 600, color: '#aeaeb2', marginBottom: '6px' }}>
            #{i + 1}
          </div>
          {renderBookCover(book, 'compact')}
          {book.book_url ? (
            <a
              href={book.book_url}
              target="_blank"
              rel="noopener noreferrer"
              title={book.title}
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#1d1d1f',
                lineHeight: 1.25,
                textDecoration: 'none',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                marginBottom: '2px',
              }}
            >
              {book.title}
            </a>
          ) : (
            <div
              title={book.title}
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: '#1d1d1f',
                lineHeight: 1.25,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                marginBottom: '2px',
              }}
            >
              {book.title}
            </div>
          )}
          {book.author && (
            <div style={{
              fontSize: '11px',
              color: '#6e6e73',
              marginBottom: book.note ? '0' : '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {book.author}
            </div>
          )}
          {renderBookNote(book, true)}
        </div>
        {renderVoteButton(book, voted, true)}
      </div>
    )
  }

  return (
    <>
      <style>{`
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F5F5F7; font-family: ${SYS}; -webkit-font-smoothing: antialiased; }
        input:focus, textarea:focus { border-color: #8B2020 !important; box-shadow: 0 0 0 3px rgba(139,32,32,0.12) !important; }
        input::placeholder, textarea::placeholder { color: #aeaeb2; }

        .book-card { transition: box-shadow 0.2s ease, transform 0.2s ease; }
        .book-card:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.09) !important; }

        .vote-btn { transition: background 0.15s ease, transform 0.1s ease; }
        .vote-btn:not(.voted):hover { background: rgba(139,32,32,0.09) !important; }
        .vote-btn:not(.voted):hover .vote-icon,
        .vote-btn:not(.voted):hover .vote-label,
        .vote-btn:not(.voted):hover .vote-count { color: #8B2020 !important; }
        .vote-btn:active { transform: scale(0.94) !important; }
        .vote-btn.voted { animation: votePop 0.28s ease forwards; }
        .vote-btn.voted:hover { background: #7a1b1b !important; }
        @keyframes votePop {
          0%   { transform: scale(1); }
          45%  { transform: scale(1.1); }
          100% { transform: scale(1); }
        }

        .submit-cta:hover:not(:disabled) { background: #7a1b1b !important; }
        .submit-cta:active:not(:disabled) { transform: scale(0.97); }
        .cancel-btn:hover { background: rgba(0,0,0,0.07) !important; }

        @media (max-width: 600px) {
          .march-pick-inner { flex-direction: column !important; }
          .march-pick-cover { width: 80px !important; height: 112px !important; }
          .meeting-day-row { flex-direction: column !important; align-items: stretch !important; }
          .meeting-day-label { min-width: 0 !important; margin-bottom: 8px; }
          .meeting-time-buttons { justify-content: flex-start !important; }
          .meeting-countdown-inner { flex-direction: column !important; align-items: flex-start !important; }
        }

        .form-slide { animation: slideDown 0.22s ease; }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .home-layout { display: flex; gap: 24px; align-items: flex-start; max-width: 1040px; margin: 0 auto; padding: 0 20px; }
        .home-main { flex: 1; min-width: 0; max-width: 680px; }
        .trending-sidebar {
          width: 300px; flex-shrink: 0; position: sticky; top: 24px;
          max-height: calc(100vh - 48px); overflow-y: auto;
        }
        .trending-add-btn:hover:not(:disabled) { background: #7a1b1b !important; }
        .books-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .book-tile {
          transition: box-shadow 0.2s ease, transform 0.2s ease;
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .book-tile:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08) !important; }
        .book-tile-body { flex: 1; min-height: 0; }
        .book-tile-note {
          font-size: 11px;
          color: #6e6e73;
          font-style: italic;
          line-height: 1.4;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
          margin: 6px 0 10px;
        }
        .book-tile .vote-btn-compact {
          align-self: stretch;
          flex-shrink: 0;
          display: inline-flex !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 5px !important;
          margin-top: auto;
          padding: 6px 10px !important;
          min-height: 0 !important;
          min-width: 0 !important;
          width: 100% !important;
          border-radius: 8px !important;
          border: 1px solid rgba(0,0,0,0.12) !important;
          background: linear-gradient(180deg, #fff 0%, #f5f5f7 100%) !important;
          box-shadow: 0 1px 2px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9) !important;
          cursor: pointer;
        }
        .book-tile .vote-btn-compact:not(.voted):hover {
          background: linear-gradient(180deg, #fff 0%, #f0ebe8 100%) !important;
          border-color: rgba(139,32,32,0.35) !important;
          box-shadow: 0 2px 6px rgba(139,32,32,0.12), inset 0 1px 0 rgba(255,255,255,0.9) !important;
        }
        .book-tile .vote-btn-compact:not(.voted):hover .vote-icon,
        .book-tile .vote-btn-compact:not(.voted):hover .vote-count,
        .book-tile .vote-btn-compact:not(.voted):hover .vote-label { color: #8B2020 !important; }
        .book-tile .vote-btn-compact.voted {
          background: linear-gradient(180deg, #9a2a2a 0%, #8B2020 100%) !important;
          border-color: #7a1b1b !important;
          box-shadow: 0 1px 3px rgba(139,32,32,0.35), inset 0 1px 0 rgba(255,255,255,0.15) !important;
        }
        .book-tile .vote-btn-compact.voted:hover { background: #7a1b1b !important; }
        @media (max-width: 900px) {
          .home-layout { flex-direction: column; padding: 0 20px; }
          .home-main { max-width: none; width: 100%; }
          .trending-sidebar { width: 100%; position: static; max-height: none; order: 2; }
        }
        @media (max-width: 600px) {
          .books-grid { grid-template-columns: repeat(2, 1fr); }
          .card-cover { width: 52px !important; height: 72px !important; }
          .card-title { font-size: 15px !important; }
          .vote-btn { padding: 10px 13px !important; min-width: 56px !important; }
          .vote-count { font-size: 17px !important; }
          .controls-row { flex-direction: column; align-items: stretch !important; gap: 12px !important; }
          .submit-cta { width: 100%; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#F5F5F7', fontFamily: SYS }}>

        {/* Header */}
        <header style={{ padding: '64px 24px 48px', textAlign: 'center' }}>
          <p style={{
            fontSize: '12px',
            fontWeight: 500,
            letterSpacing: '0.8px',
            textTransform: 'uppercase',
            color: '#aeaeb2',
            marginBottom: '14px',
          }}>
            staying up with cammie & taryn
          </p>
          <h1 style={{
            fontFamily: SYS,
            fontSize: 'clamp(42px, 7vw, 68px)',
            fontWeight: 700,
            letterSpacing: '-1px',
            color: '#1d1d1f',
            lineHeight: 1.05,
            marginBottom: '14px',
          }}>
            📖 book club 📖
          </h1>
          <p style={{
            fontSize: '17px',
            color: '#6e6e73',
            lineHeight: 1.5,
            marginBottom: '0',
          }}>
            Vote on what we read next, or suggest a book you love.
          </p>
        </header>

        <div className="home-layout">
        <div className="home-main">
        {/* July Pick + time poll — single card */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ background: '#fff', border: '2px solid #8B2020', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 20px rgba(139,32,32,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🎉</span>
                <span style={{ fontFamily: SYS, fontSize: '14px', fontWeight: 700, color: '#1a1a1a' }}>july pick is in!</span>
              </div>
              <span style={{
                display: 'inline-block',
                background: '#8B2020',
                color: '#fff',
                fontFamily: SYS,
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                padding: '4px 10px',
                borderRadius: '6px',
              }}>
                📖 July Pick
              </span>
            </div>

            <div className="march-pick-inner" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginBottom: '20px' }}>
              <a
                href="https://www.goodreads.com/book/show/43317482-in-the-dream-house"
                target="_blank"
                rel="noopener noreferrer"
                className="march-pick-cover"
                style={{ flexShrink: 0, display: 'block', width: '96px', height: '134px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}
              >
                <img
                  src="https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1547869259i/43317482.jpg"
                  alt="In the Dream House"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </a>
              <div style={{ flex: 1, minWidth: 0 }}>
                <a
                  href="https://www.goodreads.com/book/show/43317482-in-the-dream-house"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontFamily: SYS, fontSize: '20px', fontWeight: 700, color: '#1d1d1f', lineHeight: 1.2, textDecoration: 'none', display: 'block', marginBottom: '4px' }}
                >
                  In the Dream House
                </a>
                <div style={{ fontFamily: SYS, fontSize: '14px', color: '#6e6e73', marginBottom: '10px' }}>Carmen Maria Machado</div>
                <div style={{ fontFamily: SYS, fontSize: '13px', color: '#6e6e73', fontStyle: 'italic', lineHeight: 1.5 }}>
                  &quot;A genre-bending memoir of love, abuse, and survival, told in haunting, inventive vignettes.&quot;
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '18px' }}>
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontFamily: SYS, fontSize: '15px', fontWeight: 700, color: '#1d1d1f', marginBottom: '4px' }}>
                  When can you make it?
                </div>
                <div style={{ fontFamily: SYS, fontSize: '13px', color: '#6e6e73', marginBottom: '12px' }}>
                  Tap any times that work — all times PT.
                </div>

                {MEETING_POLL.voteDeadline && meetingCountdown && (
                  <div style={{
                    background: '#EDE8DD',
                    border: '1px solid #c8bfaa',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginBottom: '14px',
                    width: 'fit-content',
                    maxWidth: '100%',
                  }}>
                    {meetingPollClosed ? (
                      <div style={{ fontFamily: SYS, fontSize: '13px', fontWeight: 600, color: '#8B7355' }}>
                        Time voting closed — we&apos;ll announce the date on Patreon soon.
                      </div>
                    ) : (
                      <div className="meeting-countdown-inner" style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        <div style={{ fontFamily: SYS, fontSize: '13px', color: '#6e6e73', lineHeight: 1.4 }}>
                          Pick a time by end of day{' '}
                          <strong style={{ color: '#8B2020' }}>{MEETING_POLL.voteDeadlineLabel}</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {[['days', meetingCountdown.days], ['hrs', meetingCountdown.hours], ['min', meetingCountdown.mins], ['sec', meetingCountdown.secs]].map(([label, val]) => (
                            <div key={label} style={{ background: '#F5F0E8', border: '1px solid #c8bfaa', borderRadius: '8px', padding: '6px 8px', minWidth: '38px', textAlign: 'center' }}>
                              <div style={{ fontFamily: SYS, fontSize: '16px', fontWeight: 700, color: '#8B2020', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
                                {String(val).padStart(2, '0')}
                              </div>
                              <div style={{ fontFamily: SYS, fontSize: '8px', letterSpacing: '1px', textTransform: 'uppercase', color: '#8B7355', marginTop: '2px' }}>
                                {label}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {meetingLoading ? (
                <div style={{ fontFamily: SYS, fontSize: '13px', color: '#aeaeb2' }}>Loading times…</div>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                    {MEETING_POLL.days.map(day => (
                      <div
                        key={day.label}
                        className="meeting-day-row"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 12px',
                          borderRadius: '12px',
                          border: '1px solid rgba(0,0,0,0.07)',
                          background: '#fafafa',
                          width: 'fit-content',
                          maxWidth: '100%',
                        }}
                      >
                        <div
                          className="meeting-day-label"
                          style={{
                            flexShrink: 0,
                            minWidth: '84px',
                            fontFamily: SYS,
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#1d1d1f',
                          }}
                        >
                          {day.label}
                        </div>
                        <div
                          className="meeting-time-buttons"
                          style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}
                        >
                          {day.times.map(time => {
                            const voted = meetingVotedKeys.has(time.key)
                            const count = meetingCounts[time.key] || 0
                            const isBest = bestMeetingSlot?.key === time.key && count > 0
                            return (
                              <button
                                key={time.key}
                                type="button"
                                onClick={() => handleMeetingVote(time.key)}
                                disabled={meetingPollClosed}
                                style={{
                                  padding: '7px 12px',
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  fontFamily: SYS,
                                  border: isBest ? '1.5px solid #8B2020' : 'none',
                                  borderRadius: '10px',
                                  cursor: meetingPollClosed ? 'not-allowed' : 'pointer',
                                  opacity: meetingPollClosed ? 0.55 : 1,
                                  background: voted ? '#8B2020' : 'rgba(0,0,0,0.06)',
                                  color: voted ? '#fff' : '#1d1d1f',
                                  transition: 'background 0.15s ease',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {voted ? `✓ ${time.label}` : time.label}
                                {count > 0 && (
                                  <span style={{
                                    marginLeft: '6px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: voted ? 'rgba(255,255,255,0.75)' : '#6e6e73',
                                  }}>
                                    · {count}
                                  </span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {bestMeetingSlot && bestMeetingSlot.count > 0 && (
                    <div style={{
                      fontFamily: SYS,
                      fontSize: '12px',
                      color: '#8B7355',
                      marginTop: '12px',
                      fontWeight: 600,
                    }}>
                      Best so far: {bestMeetingSlot.fullLabel} ({bestMeetingSlot.count} can make it)
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Main */}
        <main style={{ padding: '0 0 80px' }}>

          {/* Controls */}
          <div className="controls-row" style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '20px',
          }}>

            {/* Segmented control */}
            <div style={{
              display: 'inline-flex',
              background: 'rgba(0,0,0,0.06)',
              borderRadius: '10px',
              padding: '3px',
            }}>
              {[
                { key: 'votes', label: 'Top' },
                { key: 'recent', label: 'Recent' },
                { key: 'past', label: 'Past reads' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setSort(key)}
                  style={{
                    padding: '7px 16px',
                    fontSize: '14px',
                    fontWeight: sort === key ? 600 : 400,
                    fontFamily: SYS,
                    border: 'none',
                    borderRadius: '8px',
                    background: sort === key ? '#fff' : 'transparent',
                    color: sort === key ? '#1d1d1f' : '#6e6e73',
                    cursor: 'pointer',
                    boxShadow: sort === key ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
                    transition: 'all 0.18s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Primary CTA */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
              <button
                className={showForm ? 'cancel-btn' : 'submit-cta'}
                onClick={() => setShowForm(!showForm)}
                style={{
                  padding: '10px 22px',
                  fontSize: '14px',
                  fontWeight: 600,
                  fontFamily: SYS,
                  background: showForm ? 'rgba(0,0,0,0.05)' : '#8B2020',
                  color: showForm ? '#1d1d1f' : '#fff',
                  border: 'none',
                  borderRadius: '980px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {showForm ? 'Cancel' : '+ Submit a book'}
              </button>
              {!showForm && (
                <span style={{ fontSize: '11px', color: '#aeaeb2', textAlign: 'right' }}>
                  Add a book, then everyone can vote.
                </span>
              )}
            </div>
          </div>

          {/* Form */}
          {showForm && (
            <div className="form-slide" style={{
              background: '#fff',
              borderRadius: '16px',
              border: '1px solid rgba(0,0,0,0.08)',
              padding: '28px',
              marginBottom: '20px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Book Title <span style={{ color: '#8B2020' }}>*</span></label>
                  <input
                    style={inputStyle}
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    placeholder="The Body Keeps the Score"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Author</label>
                  <input
                    style={inputStyle}
                    value={form.author}
                    onChange={e => setForm({ ...form, author: e.target.value })}
                    placeholder="Bessel van der Kolk"
                  />
                </div>
                <div>
                  <label style={labelStyle}>Your Name</label>
                  <input
                    style={inputStyle}
                    value={form.submitted_by}
                    onChange={e => setForm({ ...form, submitted_by: e.target.value })}
                    placeholder="optional"
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Amazon or Goodreads Link</label>
                  <input
                    style={inputStyle}
                    value={form.book_url}
                    onChange={e => setForm({ ...form, book_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Why we&apos;d love it</label>
                  <textarea
                    style={{ ...inputStyle, resize: 'none', height: '80px' }}
                    value={form.note}
                    onChange={e => setForm({ ...form, note: e.target.value })}
                    placeholder="One sentence on why this book belongs in the club"
                  />
                </div>
              </div>
              <button
                className="submit-cta"
                onClick={handleSubmit}
                disabled={!form.title.trim() || submitting}
                style={{
                  width: '100%',
                  padding: '13px',
                  fontSize: '15px',
                  fontWeight: 600,
                  fontFamily: SYS,
                  background: form.title.trim() ? '#8B2020' : '#d1d1d6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: form.title.trim() ? 'pointer' : 'not-allowed',
                  transition: 'background 0.15s ease',
                }}
              >
                {submitting ? 'Submitting…' : 'Submit Book'}
              </button>
            </div>
          )}

          {/* Past Reads */}
          {sort === 'past' ? (
            pastLoading ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#aeaeb2', fontSize: '15px' }}>
                Loading…
              </div>
            ) : pastReads.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <div style={{ fontSize: '15px', fontWeight: 600, color: '#1d1d1f', marginBottom: '6px' }}>
                  No past reads yet
                </div>
                <div style={{ fontSize: '14px', color: '#aeaeb2' }}>Check back soon.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pastReads.map(book => (
                  <div
                    key={book.id}
                    className="book-card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      background: '#fff',
                      borderRadius: '14px',
                      border: '1px solid rgba(0,0,0,0.07)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      padding: '14px 18px',
                    }}
                  >
                    {/* Cover */}
                    <div
                      className="card-cover"
                      style={{
                        flexShrink: 0,
                        width: '48px',
                        height: '68px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        background: '#e5e5ea',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.10)',
                      }}
                    >
                      {book.cover_image ? (
                        <img
                          src={book.cover_image}
                          alt={book.title}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: '18px', color: '#aeaeb2' }}>{book.title.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="card-title" style={{ fontSize: '15px', fontWeight: 600, color: '#1d1d1f', lineHeight: 1.3, marginBottom: '2px' }}>
                        {book.title}
                      </div>
                      {book.author && (
                        <div style={{ fontSize: '13px', color: '#6e6e73' }}>{book.author}</div>
                      )}
                    </div>

                    {/* Right: date + link */}
                    <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: '#6e6e73', whiteSpace: 'nowrap' }}>
                        {formatMonth(book.month)}
                      </span>
                      {book.patreon_url ? (
                        <a
                          href={book.patreon_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#8B2020',
                            textDecoration: 'none',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Watch / Listen ↗
                        </a>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#aeaeb2', whiteSpace: 'nowrap' }}>Recording coming soon</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (

          /* Book List */
          loading ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#aeaeb2', fontSize: '15px' }}>
              Loading…
            </div>
          ) : books.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#1d1d1f', marginBottom: '6px' }}>
                No books yet
              </div>
              <div style={{ fontSize: '14px', color: '#aeaeb2' }}>
                Be the first to suggest one.
              </div>
            </div>
          ) : (() => {
              return (
            <>
            <div style={{ marginBottom: '16px' }}>
              <h2 style={{ fontFamily: SYS, fontSize: '20px', fontWeight: 700, color: '#1d1d1f', margin: 0 }}>
                What will our August read be? 📚
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {books.slice(0, 5).map((book, i) => renderFullBookCard(book, i))}
            </div>
            {books.length > 5 && (
              <>
                <p style={{
                  fontFamily: SYS,
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#aeaeb2',
                  marginTop: '16px',
                  marginBottom: '10px',
                }}>
                  More nominees
                </p>
                <div className="books-grid">
                  {books.slice(5).map((book, i) => renderCompactBookTile(book, i + 5))}
                </div>
              </>
            )}

            </>
            )
          })()
          )}
        </main>
        </div>

        <aside className="trending-sidebar">
          <div style={{
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <h2 style={{
              fontFamily: SYS,
              fontSize: '15px',
              fontWeight: 700,
              color: '#1d1d1f',
              lineHeight: 1.4,
              marginBottom: '8px',
            }}>
              Not in love with the submissions? Here&apos;s what&apos;s trending in other book clubs.
            </h2>
            <p style={{ fontSize: '12px', color: '#aeaeb2', marginBottom: trendingStale ? '8px' : '16px' }}>
              <a
                href="https://bookclubs.com/best-book-club-books/this-month"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#8B2020', textDecoration: 'none', fontWeight: 600 }}
              >
                via Bookclubs ↗
              </a>
            </p>
            {trendingStale && (
              <p style={{ fontSize: '11px', color: '#8B7355', marginBottom: '12px', lineHeight: 1.4 }}>
                Couldn&apos;t refresh — showing last available picks.
              </p>
            )}
            {trendingLoading ? (
              <div style={{ fontSize: '13px', color: '#aeaeb2', padding: '12px 0' }}>Loading trending…</div>
            ) : trendingBooks.length === 0 ? (
              <div style={{ fontSize: '13px', color: '#aeaeb2', padding: '12px 0' }}>Trending picks unavailable right now.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {trendingBooks.map(book => {
                  const onList = isBookOnList(book.title) || addedTrending.has(book.title)
                  const isAdding = addingTrending === book.title
                  return (
                    <div
                      key={book.rank}
                      style={{
                        paddingBottom: '14px',
                        borderBottom: book.rank < trendingBooks.length ? '1px solid rgba(0,0,0,0.06)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px' }}>
                        {book.cover_image ? (
                          <div style={{
                            flexShrink: 0,
                            width: '44px',
                            height: '64px',
                            borderRadius: '5px',
                            overflow: 'hidden',
                            background: '#e5e5ea',
                            boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                          }}>
                            <img
                              src={book.cover_image}
                              alt={book.title}
                              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                          </div>
                        ) : (
                          <div style={{
                            flexShrink: 0,
                            width: '44px',
                            height: '64px',
                            borderRadius: '5px',
                            background: '#e5e5ea',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            color: '#aeaeb2',
                            fontWeight: 600,
                          }}>
                            {book.title.charAt(0)}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: '#aeaeb2', marginBottom: '4px' }}>
                            #{book.rank}
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#1d1d1f', lineHeight: 1.3, marginBottom: '2px' }}>
                            {book.title}
                          </div>
                          {book.author && (
                            <div style={{ fontSize: '12px', color: '#6e6e73', marginBottom: book.description ? '4px' : 0 }}>
                              {book.author}
                            </div>
                          )}
                          {book.description && (
                            <div style={{ fontSize: '11px', color: '#6e6e73', lineHeight: 1.4 }}>
                              {book.description}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="trending-add-btn"
                        disabled={onList || isAdding}
                        onClick={() => handleTrendingAdd(book)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          fontFamily: SYS,
                          background: onList ? 'rgba(0,0,0,0.05)' : '#8B2020',
                          color: onList ? '#6e6e73' : '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: onList || isAdding ? 'not-allowed' : 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                      >
                        {isAdding ? 'Adding…' : onList ? 'Already on the list' : 'Add to our list'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </aside>
        </div>

        {/* Footer */}
        <footer style={{ textAlign: 'center', padding: '32px 24px', fontSize: '12px', color: '#aeaeb2' }}>
          staying up · book club
        </footer>

      </div>
    </>
  )
}

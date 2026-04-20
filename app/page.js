'use client'

import { useState, useEffect } from 'react'

const SYS = 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif'

export default function Home() {
  const [books, setBooks] = useState([])
  const [votedIds, setVotedIds] = useState(new Set())
  const [voterToken, setVoterToken] = useState(null)
  const [sort, setSort] = useState('votes')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ title: '', author: '', note: '', submitted_by: '', book_url: '' })
  const [pastReads, setPastReads] = useState([])
  const [pastLoading, setPastLoading] = useState(false)
  useEffect(() => {
    let token = localStorage.getItem('voter_token')
    if (!token) {
      token = crypto.randomUUID()
      localStorage.setItem('voter_token', token)
    }
    setVoterToken(token)

    const voted = JSON.parse(localStorage.getItem('voted_ids') || '[]')
    setVotedIds(new Set(voted))
  }, [])

  useEffect(() => {
    if (sort === 'past') fetchPastReads()
    else fetchBooks()
  }, [sort])

  async function fetchBooks() {
    setLoading(true)
    const res = await fetch(`/api/books?sort=${sort}`)
    const data = await res.json()
    setBooks(data)
    setLoading(false)
  }

  async function fetchPastReads() {
    setPastLoading(true)
    const res = await fetch('/api/past-reads')
    const data = await res.json()
    setPastReads(data)
    setPastLoading(false)
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
        }

        .form-slide { animation: slideDown 0.22s ease; }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 600px) {
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

        {/* May Pick — hardcoded */}
        <div style={{ maxWidth: '680px', margin: '0 auto 32px', padding: '0 20px' }}>
          {/* Announcement banner */}
          <div style={{ background: '#EDE8DD', border: '1.5px solid #c8bfaa', borderRadius: '14px', padding: '14px 20px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '20px' }}>🎉</span>
            <div>
              <span style={{ fontFamily: SYS, fontSize: '14px', fontWeight: 700, color: '#1a1a1a' }}>may pick is in!</span>
              <span style={{ fontFamily: SYS, fontSize: '13px', color: '#8B7355', marginLeft: '8px' }}>
                book club live date announced soon on <a href="https://www.patreon.com/c/StayingUp" target="_blank" rel="noopener noreferrer" style={{ color: '#8B2020', textDecoration: 'none', fontWeight: 600 }}>Patreon</a>
                {' · '}
                <a href="https://rallly.co/invite/0nSKDVq4LmlG" target="_blank" rel="noopener noreferrer" style={{ color: '#8B2020', textDecoration: 'none', fontWeight: 600 }}>vote on a time ↗</a>
              </span>
            </div>
          </div>

          <div style={{ background: '#fff', border: '2px solid #8B2020', borderRadius: '16px', padding: '20px', boxShadow: '0 4px 20px rgba(139,32,32,0.08)' }}>
            <div style={{ marginBottom: '12px' }}>
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
                📖 May Pick
              </span>
            </div>
            <div className="march-pick-inner" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
              <a
                href="https://www.goodreads.com/book/show/32620332-the-seven-husbands-of-evelyn-hugo"
                target="_blank"
                rel="noopener noreferrer"
                className="march-pick-cover"
                style={{ flexShrink: 0, display: 'block', width: '96px', height: '134px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}
              >
                <img
                  src="https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1664458703i/32620332.jpg"
                  alt="The Seven Husbands of Evelyn Hugo"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </a>
              <div style={{ flex: 1, minWidth: 0 }}>
                <a
                  href="https://www.goodreads.com/book/show/32620332-the-seven-husbands-of-evelyn-hugo"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontFamily: SYS, fontSize: '20px', fontWeight: 700, color: '#1d1d1f', lineHeight: 1.2, textDecoration: 'none', display: 'block', marginBottom: '4px' }}
                >
                  The Seven Husbands of Evelyn Hugo
                </a>
                <div style={{ fontFamily: SYS, fontSize: '14px', color: '#6e6e73', marginBottom: '10px' }}>Taylor Jenkins Reid</div>
                <div style={{ fontFamily: SYS, fontSize: '13px', color: '#6e6e73', fontStyle: 'italic', lineHeight: 1.5 }}>
                  "A dazzling novel about Old Hollywood glamour, ambition, and the price of keeping secrets."
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main */}
        <main style={{ maxWidth: '680px', margin: '0 auto', padding: '0 20px 80px' }}>

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
                  <label style={labelStyle}>Why we'd love it</label>
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
                What will our May read be? 📚
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {books.map((book, i) => {
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
                    {/* Cover */}
                    <a
                      href={book.book_url || undefined}
                      target={book.book_url ? '_blank' : undefined}
                      rel={book.book_url ? 'noopener noreferrer' : undefined}
                      className="card-cover"
                      style={{
                        flexShrink: 0,
                        display: 'block',
                        width: '60px',
                        height: '84px',
                        borderRadius: '7px',
                        overflow: 'hidden',
                        background: '#e5e5ea',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        cursor: book.book_url ? 'pointer' : 'default',
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
                          <span style={{ fontSize: '22px', color: '#aeaeb2' }}>
                            {book.title.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </a>

                    {/* Content */}
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
                      {book.note && (() => {
                        const isAI = book.note.startsWith('__ai__')
                        const text = isAI ? book.note.slice(6) : book.note
                        return (
                          <div style={{
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
                      })()}
                      {book.submitted_by && (
                        <div style={{ fontSize: '11px', color: '#aeaeb2', fontWeight: 500 }}>
                          via {book.submitted_by}
                        </div>
                      )}
                    </div>

                    {/* Vote */}
                    <button
                      className={`vote-btn${voted ? ' voted' : ''}`}
                      onClick={() => handleVote(book.id)}
                      style={{
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
                      <span className="vote-icon" style={{ fontSize: '13px', color: voted ? 'rgba(255,255,255,0.85)' : '#6e6e73', lineHeight: 1 }}>
                        {voted ? '✓' : '▲'}
                      </span>
                      <span className="vote-count" style={{ fontSize: '19px', fontWeight: 700, color: voted ? '#fff' : '#1d1d1f', lineHeight: 1.1 }}>
                        {book.votes}
                      </span>
                      <span className="vote-label" style={{ fontSize: '11px', fontWeight: 600, color: voted ? 'rgba(255,255,255,0.75)' : '#aeaeb2', lineHeight: 1, letterSpacing: '0.2px' }}>
                        {voted ? 'Voted' : 'Vote'}
                      </span>
                    </button>
                  </div>
                )
              })}
            </div>
            </>
            )
          })()
          )}
        </main>

        {/* Footer */}
        <footer style={{ textAlign: 'center', padding: '32px 24px', fontSize: '12px', color: '#aeaeb2' }}>
          staying up · book club
        </footer>

      </div>
    </>
  )
}

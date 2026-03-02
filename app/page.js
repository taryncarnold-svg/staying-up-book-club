'use client'

import { useState, useEffect } from 'react'

export default function Home() {
  const [books, setBooks] = useState([])
  const [votedIds, setVotedIds] = useState(new Set())
  const [voterToken, setVoterToken] = useState(null)
  const [sort, setSort] = useState('votes')
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ title: '', author: '', note: '', submitted_by: '', book_url: '' })

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
    fetchBooks()
  }, [sort])

  async function fetchBooks() {
    setLoading(true)
    const res = await fetch(`/api/books?sort=${sort}`)
    const data = await res.json()
    setBooks(data)
    setLoading(false)
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
    background: '#F5F0E8',
    border: '1px solid #c8bfaa',
    borderRadius: 0,
    fontFamily: 'Georgia, serif',
    fontSize: '14px',
    color: '#1a1a1a',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  }

  const labelStyle = {
    display: 'block',
    fontSize: '9px',
    letterSpacing: '3px',
    textTransform: 'uppercase',
    color: '#8B7355',
    marginBottom: '5px',
    fontFamily: 'Georgia, serif',
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #F5F0E8; }
        input:focus, textarea:focus { border-color: #8B7355 !important; }
        input::placeholder, textarea::placeholder { color: #b8a98a; }
        .book-card { transition: background 0.15s; }
        .book-card:hover { background: #E8E2D6 !important; }
        .vote-btn { transition: all 0.15s; }
        .vote-btn:hover { opacity: 0.85; }
        .sort-btn { transition: all 0.15s; }
        .submit-btn { transition: all 0.2s; }
        .submit-btn:hover { background: #6e1818 !important; }
        .form-container {
          animation: slideDown 0.2s ease;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#F5F0E8', fontFamily: 'Georgia, serif' }}>

        {/* Header */}
        <header style={{
          borderBottom: '1px solid #c8bfaa',
          padding: '56px 24px 40px',
          textAlign: 'center',
          background: '#F5F0E8',
        }}>
          <p style={{
            fontSize: '9px',
            letterSpacing: '5px',
            textTransform: 'uppercase',
            color: '#8B7355',
            marginBottom: '14px',
            fontFamily: 'Georgia, serif',
          }}>
            staying up with taryn & cammie
          </p>
          <h1 style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 'clamp(44px, 7vw, 72px)',
            fontWeight: 400,
            letterSpacing: '-1.5px',
            color: '#1a1a1a',
            lineHeight: 1,
            marginBottom: '12px',
          }}>
            book club
          </h1>
          <div style={{
            width: '32px',
            height: '1px',
            background: '#8B2020',
            margin: '16px auto 14px',
          }} />
          <p style={{
            fontSize: '13px',
            color: '#8B7355',
            fontStyle: 'italic',
            letterSpacing: '0.3px',
          }}>
            submit a book you love · vote for what we read next
          </p>
        </header>

        {/* Main */}
        <main style={{ maxWidth: '720px', margin: '0 auto', padding: '36px 24px 80px' }}>

          {/* Controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}>
            <div style={{ display: 'flex', gap: '2px' }}>
              {['votes', 'recent'].map(s => (
                <button
                  key={s}
                  className="sort-btn"
                  onClick={() => setSort(s)}
                  style={{
                    padding: '7px 16px',
                    fontSize: '9px',
                    letterSpacing: '3px',
                    textTransform: 'uppercase',
                    fontFamily: 'Georgia, serif',
                    border: '1px solid',
                    borderColor: sort === s ? '#1a1a1a' : '#c8bfaa',
                    background: sort === s ? '#1a1a1a' : 'transparent',
                    color: sort === s ? '#F5F0E8' : '#8B7355',
                    cursor: 'pointer',
                  }}
                >
                  {s === 'votes' ? 'top' : 'recent'}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowForm(!showForm)}
              style={{
                padding: '9px 20px',
                fontSize: '9px',
                letterSpacing: '3px',
                textTransform: 'uppercase',
                fontFamily: 'Georgia, serif',
                border: '1px solid #8B2020',
                background: showForm ? '#8B2020' : 'transparent',
                color: showForm ? '#F5F0E8' : '#8B2020',
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {showForm ? '✕ cancel' : '+ submit a book'}
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <div className="form-container" style={{
              background: '#EDE8DD',
              border: '1px solid #c8bfaa',
              padding: '32px',
              marginBottom: '32px',
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Book Title *</label>
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
                    style={{ ...inputStyle, resize: 'none', height: '72px' }}
                    value={form.note}
                    onChange={e => setForm({ ...form, note: e.target.value })}
                    placeholder="one sentence on why this book belongs in the club"
                  />
                </div>
              </div>
              <button
                className="submit-btn"
                onClick={handleSubmit}
                disabled={!form.title.trim() || submitting}
                style={{
                  width: '100%',
                  padding: '13px',
                  background: form.title.trim() ? '#8B2020' : '#c8bfaa',
                  color: '#F5F0E8',
                  border: 'none',
                  fontFamily: 'Georgia, serif',
                  fontSize: '9px',
                  letterSpacing: '3px',
                  textTransform: 'uppercase',
                  cursor: form.title.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                {submitting ? 'submitting...' : 'submit book'}
              </button>
            </div>
          )}

          {/* Book List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '80px 0', color: '#8B7355', fontStyle: 'italic', fontSize: '14px' }}>
              loading...
            </div>
          ) : books.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '100px 0' }}>
              <div style={{ fontSize: '11px', letterSpacing: '4px', textTransform: 'uppercase', color: '#c8bfaa', marginBottom: '12px' }}>
                no submissions yet
              </div>
              <div style={{ fontSize: '13px', color: '#8B7355', fontStyle: 'italic' }}>
                be the first to suggest a book
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {books.map((book, i) => (
                <div
                  key={book.id}
                  className="book-card"
                  style={{
                    display: 'flex',
                    background: '#EDE8DD',
                    border: '1px solid #c8bfaa',
                    overflow: 'hidden',
                  }}
                >
                  {/* Vote */}
                  <button
                    className="vote-btn"
                    onClick={() => handleVote(book.id)}
                    style={{
                      width: '64px',
                      flexShrink: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      border: 'none',
                      borderRight: '1px solid #c8bfaa',
                      background: votedIds.has(book.id) ? '#8B2020' : 'transparent',
                      cursor: 'pointer',
                      padding: '16px 0',
                    }}
                  >
                    <span style={{
                      fontSize: '8px',
                      color: votedIds.has(book.id) ? 'rgba(245,240,232,0.7)' : '#c8bfaa',
                      lineHeight: 1,
                    }}>▲</span>
                    <span style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: '20px',
                      fontWeight: 400,
                      color: votedIds.has(book.id) ? '#F5F0E8' : '#1a1a1a',
                      lineHeight: 1,
                    }}>{book.votes}</span>
                  </button>

                  {/* Cover */}
                  <div style={{
                    width: '72px',
                    flexShrink: 0,
                    background: '#d4cbb8',
                    borderRight: '1px solid #c8bfaa',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {book.cover_image ? (
                      <img
                        src={book.cover_image}
                        alt={book.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <span style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontSize: '28px',
                        color: '#8B7355',
                        opacity: 0.5,
                      }}>
                        {book.title.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* Content */}
                  <div style={{ padding: '16px 20px', flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: '16px',
                      fontWeight: 400,
                      color: '#1a1a1a',
                      marginBottom: '3px',
                      lineHeight: 1.3,
                    }}>
                      {book.title}
                    </div>
                    {book.author && (
                      <div style={{
                        fontSize: '11px',
                        color: '#8B7355',
                        marginBottom: book.note ? '8px' : '0',
                        letterSpacing: '0.3px',
                      }}>
                        {book.author}
                      </div>
                    )}
                    {book.note && (
                      <div style={{
                        fontSize: '12px',
                        color: '#6b5c45',
                        fontStyle: 'italic',
                        lineHeight: 1.5,
                        marginBottom: book.submitted_by ? '8px' : '0',
                      }}>
                        "{book.note}"
                      </div>
                    )}
                    {book.submitted_by && (
                      <div style={{
                        fontSize: '9px',
                        letterSpacing: '2px',
                        textTransform: 'uppercase',
                        color: '#c8bfaa',
                      }}>
                        via {book.submitted_by}
                      </div>
                    )}
                  </div>

                  {/* Rank */}
                  <div style={{
                    width: '36px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    color: '#d4cbb8',
                    fontFamily: 'Georgia, serif',
                  }}>
                    {i + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Footer */}
        <footer style={{
          borderTop: '1px solid #c8bfaa',
          padding: '28px 24px',
          textAlign: 'center',
          fontSize: '9px',
          letterSpacing: '4px',
          textTransform: 'uppercase',
          color: '#c8bfaa',
        }}>
          staying up · book club
        </footer>
      </div>
    </>
  )
}
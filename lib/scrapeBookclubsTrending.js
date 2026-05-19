const SOURCE_URL = 'https://bookclubs.com/best-book-club-books/this-month'
const DEFAULT_LIMIT = 5

function cleanTitle(title) {
  if (!title) return ''
  return title
    .replace(/\s*:\s*A\s+Novel\s*$/i, '')
    .replace(/\s*:\s*A\s+GMA\s+Book\s+Club\s+Pick\s*$/i, '')
    .replace(/\s*:\s*Oprah'?s?\s+Book\s+Club\s*$/i, '')
    .replace(/\s*:\s*Reese'?s?\s+Book\s+Club\s+Pick\s*$/i, '')
    .replace(/\s*\([^)]*\)\s*$/g, '')
    .trim()
}

function stripHtml(html) {
  if (!html) return ''
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&bull;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&lsquo;|&rsquo;/g, "'")
    .replace(/&hellip;/g, '...')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function truncate(text, max = 120) {
  if (!text || text.length <= max) return text
  return text.slice(0, max - 1).trimEnd() + '…'
}

function parseReduxState(html) {
  const match = html.match(/window\.__REDUX_STATE__\s*=\s*(\{[\s\S]*?\});\s*\n/)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return null
  }
}

/**
 * @param {number} limit
 * @returns {Promise<Array<{ rank: number, title: string, author: string, description: string, cover_image: string | null, source_url: string }>>}
 */
export async function scrapeBookclubsTrending(limit = DEFAULT_LIMIT) {
  const res = await fetch(SOURCE_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; StayingUpBookClub/1.0; +https://github.com/taryncarnold-svg/staying-up-book-club)',
      Accept: 'text/html',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    throw new Error(`Bookclubs fetch failed: ${res.status}`)
  }

  const html = await res.text()
  const state = parseReduxState(html)
  const rawBooks = state?.topBooks?.popularBooks || state?.popularBooks?.data || []

  if (!Array.isArray(rawBooks) || rawBooks.length === 0) {
    throw new Error('Could not parse trending books from Bookclubs')
  }

  return rawBooks.slice(0, limit).map((book, index) => {
    const title = cleanTitle(book.title)
    const author =
      book.get_author_name ||
      book.authors?.[0]?.name ||
      ''
    const description = truncate(stripHtml(book.description))

    return {
      rank: index + 1,
      title,
      author,
      description,
      cover_image: book.image_url || null,
      source_url: SOURCE_URL,
    }
  })
}

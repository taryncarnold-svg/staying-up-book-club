/**
 * Find a Goodreads or Amazon URL for cover fetching via submit API.
 */
export async function lookupBookUrl(title, author) {
  try {
    const q = encodeURIComponent(`intitle:${title}${author ? `+inauthor:${author}` : ''}`)
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`,
      { signal: AbortSignal.timeout(6000) }
    )
    const data = await res.json()
    const info = data.items?.[0]?.volumeInfo
    if (!info) return null

    const goodreads = info.infoLink?.includes('google')
      ? null
      : info.infoLink
    if (info.previewLink) return info.previewLink
    if (info.canonicalVolumeLink) return info.canonicalVolumeLink
    return goodreads
  } catch {
    return null
  }
}

export async function lookupGoodreadsSearchUrl(title, author) {
  const q = encodeURIComponent(`${title} ${author || ''}`.trim())
  return `https://www.goodreads.com/search?q=${q}`
}

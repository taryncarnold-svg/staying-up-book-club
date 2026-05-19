import { NextResponse } from 'next/server'
import { scrapeBookclubsTrending } from '@/lib/scrapeBookclubsTrending'
import { getTrendingCache, setTrendingCache, isCacheStale } from '@/lib/trendingCacheStore'

export async function GET() {
  try {
    let cache = await getTrendingCache()
    let stale = false

    if (!cache?.books?.length || isCacheStale(cache.updated_at)) {
      try {
        const books = await scrapeBookclubsTrending(5)
        cache = await setTrendingCache(books)
      } catch (scrapeError) {
        console.error('Trending scrape failed:', scrapeError)
        if (cache?.books?.length) {
          stale = true
        } else {
          return NextResponse.json({
            books: [],
            updated_at: null,
            stale: true,
            error: 'Could not load trending books',
          })
        }
      }
    }

    return NextResponse.json({
      books: cache.books,
      updated_at: cache.updated_at,
      stale,
    })
  } catch (error) {
    console.error('GET /api/trending:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

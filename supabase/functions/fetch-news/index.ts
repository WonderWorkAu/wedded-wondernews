
import { corsHeaders } from '../_shared/cors.ts'

const SERP_API_KEY = Deno.env.get('SERP_API_KEY')
const SERP_API_URL = 'https://serpapi.com/search.json'

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Construct the search query for wedding news
    const params = new URLSearchParams({
      q: 'wedding news celebrity marriage',
      tbm: 'nws', // News search
      api_key: SERP_API_KEY!,
      num: '9' // Number of results
    })

    console.log('Fetching news from SERP API...')
    const response = await fetch(`${SERP_API_URL}?${params}`)
    const data = await response.json()

    // Transform the SERP API response to match our NewsArticle interface
    const articles = data.news_results?.map((result: any) => ({
      title: result.title,
      link: result.link,
      snippet: result.snippet,
      source: result.source,
      published: result.date,
      thumbnail: result.thumbnail
    })) || []

    console.log(`Transformed ${articles.length} articles`)

    return new Response(
      JSON.stringify({
        articles,
        status: 'success'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    console.error('Error fetching news:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch news',
        status: 'error'
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 500
      }
    )
  }
})

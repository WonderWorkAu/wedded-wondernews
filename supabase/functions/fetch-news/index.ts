
import { corsHeaders } from '../_shared/cors.ts'

const SERP_API_KEY = Deno.env.get('SERP_API_KEY')
const SERP_API_URL = 'https://serpapi.com/search.json'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!SERP_API_KEY) {
      console.error('SERP_API_KEY is not set')
      throw new Error('SERP API key is not configured')
    }

    console.log('Starting news fetch from SERP API with key:', SERP_API_KEY.substring(0, 5) + '...')
    
    const params = new URLSearchParams({
      q: 'wedding news celebrity marriage',
      tbm: 'nws',
      api_key: SERP_API_KEY,
      num: '10'
    })

    console.log('Making request to SERP API...')
    const response = await fetch(`${SERP_API_URL}?${params}`)
    const data = await response.json()
    console.log('SERP API response status:', response.status)
    console.log('SERP API raw response:', JSON.stringify(data))

    if (!data.news_results) {
      console.error('No news results found in SERP API response')
      throw new Error('No news results found in API response')
    }

    const articles = data.news_results.map((result: any) => ({
      title: result.title,
      link: result.link,
      snippet: result.snippet,
      source: result.source,
      published: result.date,
      thumbnail: result.thumbnail
    }))

    console.log(`Successfully transformed ${articles.length} articles`)

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
    console.error('Error in fetch-news function:', error.message)
    console.error('Full error:', error)
    
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch news',
        status: 'error',
        message: error.message,
        details: error.toString()
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

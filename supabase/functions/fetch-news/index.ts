
import { corsHeaders } from '../_shared/cors.ts'

const SERP_API_KEY = Deno.env.get('SERP_API_KEY')
const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY')
const GOOGLE_CX = Deno.env.get('GOOGLE_CX')
const SERP_API_URL = 'https://serpapi.com/search.json'

async function fetchImageForArticle(title: string): Promise<string | null> {
  try {
    if (!GOOGLE_API_KEY || !GOOGLE_CX) {
      console.error('Google API credentials not configured')
      return null
    }

    const searchQuery = encodeURIComponent(`${title} wedding high quality`)
    const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${searchQuery}&searchType=image&num=1&imgSize=LARGE`
    
    console.log(`Fetching image for article: "${title}"`)
    const response = await fetch(url)
    
    if (!response.ok) {
      console.error(`Google API error for "${title}":`, response.status)
      return null
    }

    const data = await response.json()
    if (data.items?.[0]?.link) {
      console.log(`Found high quality image for "${title}"`)
      return data.items[0].link
    }
    
    console.log(`No image found for "${title}"`)
    return null
  } catch (error) {
    console.error(`Error fetching image for "${title}":`, error)
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!SERP_API_KEY) {
      console.error('SERP_API_KEY is not set')
      throw new Error('SERP API key is not configured')
    }

    console.log('Starting news fetch from SERP API...')
    
    const params = new URLSearchParams({
      q: 'wedding news celebrity marriage',
      tbm: 'nws',
      api_key: SERP_API_KEY,
      num: '10'
    })

    const url = `${SERP_API_URL}?${params}`
    console.log('Making request to SERP API:', url.replace(SERP_API_KEY, '[REDACTED]'))
    
    const response = await fetch(url)
    console.log('SERP API response status:', response.status)
    
    if (!response.ok) {
      throw new Error(`SERP API returned status ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.news_results) {
      console.error('No news_results found in response:', JSON.stringify(data))
      throw new Error('No news results found in API response')
    }

    console.log(`Found ${data.news_results.length} news results`)
    
    // Process articles and fetch high-quality images
    const articles = await Promise.all(data.news_results.map(async (result: any) => {
      console.log('-------------------')
      console.log(`Processing article: ${result.title}`)
      
      // Fetch a high-quality image using Google Custom Search
      const highQualityImage = await fetchImageForArticle(result.title)
      
      return {
        title: result.title,
        link: result.link,
        snippet: result.snippet,
        source: result.source,
        published: result.date,
        image: highQualityImage || result.thumbnail // Fallback to thumbnail if no high-quality image found
      }
    }))

    console.log('Successfully processed articles')
    console.log('Articles with images:', articles.filter(a => a.image).length)

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

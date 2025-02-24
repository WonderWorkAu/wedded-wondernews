
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
    console.log('SERP API response type:', typeof data)
    console.log('SERP API response keys:', Object.keys(data))
    console.log('Raw SERP API response data:', JSON.stringify(data, null, 2))

    if (!data.news_results) {
      console.error('No news_results found in response:', JSON.stringify(data))
      throw new Error('No news results found in API response')
    }

    console.log(`Found ${data.news_results.length} news results`)
    
    const articles = data.news_results.map((result: any) => {
      console.log('-------------------')
      console.log(`Processing article: ${result.title}`)
      console.log('All available fields for article:', Object.keys(result))
      console.log('Raw article data:', JSON.stringify(result, null, 2))
      
      // Try different image fields in order of preference
      const imageUrl = result.main_image || 
                      result.images?.[0] ||
                      result.original_image ||
                      result.image ||
                      result.thumbnail ||
                      result.thumbnail_image ||
                      null
                      
      console.log('Selected image URL:', imageUrl)
      
      return {
        title: result.title,
        link: result.link,
        snippet: result.snippet,
        source: result.source,
        published: result.date,
        image: imageUrl
      }
    })

    console.log('Successfully processed articles')
    console.log('Final articles with images:', articles.map(a => ({
      title: a.title,
      image: a.image
    })))

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

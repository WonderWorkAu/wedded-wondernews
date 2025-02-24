
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
    
    if (!data.news_results) {
      console.error('No news_results found in response:', JSON.stringify(data))
      throw new Error('No news results found in API response')
    }

    console.log(`Found ${data.news_results.length} news results`)
    
    const articles = data.news_results.map((result: any) => {
      console.log('-------------------')
      console.log(`Processing article: ${result.title}`)
      
      // Try to find the best quality image from multiple possible fields
      let bestImage = null;
      
      // Check original_image first (highest quality)
      if (result.original_image) {
        console.log('Using original_image (highest quality)')
        bestImage = result.original_image;
      }
      // Then try source_image
      else if (result.source_image) {
        console.log('Using source_image (high quality)')
        bestImage = result.source_image;
      }
      // Then try large_image
      else if (result.large_image) {
        console.log('Using large_image (medium quality)')
        bestImage = result.large_image;
      }
      // Finally fall back to thumbnail only if no better options exist
      else if (result.thumbnail) {
        console.log('Falling back to thumbnail (lowest quality)')
        bestImage = result.thumbnail;
      }
      
      console.log('Selected image:', bestImage || 'No image found')
      
      return {
        title: result.title,
        link: result.link,
        snippet: result.snippet,
        source: result.source,
        published: result.date,
        image: bestImage
      }
    })

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

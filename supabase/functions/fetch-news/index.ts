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
      num: '10',
      hl: 'en',
      gl: 'us',
      tbs: 'qdr:d,simg:2'  // High quality images from the past day
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
      
      // Check for HD or high-res images first
      if (result.original_image && result.original_image.includes('=s0')) {
        console.log('Using HD original_image')
        bestImage = result.original_image;
      }
      // Then try original_image with size parameter for better quality
      else if (result.original_image) {
        console.log('Using original_image with size parameter')
        bestImage = result.original_image.includes('=') 
          ? result.original_image.replace(/=.*$/, '=s1200') 
          : `${result.original_image}=s1200`;
      }
      // Then try source_image with size parameter
      else if (result.source_image) {
        console.log('Using source_image with size parameter')
        bestImage = result.source_image.includes('=') 
          ? result.source_image.replace(/=.*$/, '=s1200')
          : `${result.source_image}=s1200`;
      }
      // Then try large_image
      else if (result.large_image) {
        console.log('Using large_image')
        bestImage = result.large_image;
      }
      // Finally fall back to thumbnail only if no better options exist
      else if (result.thumbnail) {
        console.log('Using thumbnail as fallback')
        bestImage = result.thumbnail;
      }
      
      // If the image URL is from Google's servers, ensure we request the highest quality
      if (bestImage && bestImage.includes('googleusercontent.com')) {
        bestImage = bestImage.replace(/=.*$/, '=s1200');
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

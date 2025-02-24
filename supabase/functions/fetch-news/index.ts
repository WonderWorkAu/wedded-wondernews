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
      num: '20',  // Increased to 20 since we'll filter some out
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
    
    const articles = data.news_results
      .map((result: any) => {
        console.log('-------------------')
        console.log(`Processing article: ${result.title}`)
        
        // Try to find the best quality image from multiple possible fields
        let bestImage = null;
        let imageQuality = 'low';  // Track image quality
        
        // Check for HD or high-res images first
        if (result.original_image && result.original_image.includes('=s0')) {
          console.log('Using HD original_image')
          bestImage = result.original_image;
          imageQuality = 'high';
        }
        // Then try original_image with size parameter for better quality
        else if (result.original_image) {
          console.log('Using original_image with size parameter')
          bestImage = result.original_image.includes('=') 
            ? result.original_image.replace(/=.*$/, '=s1200') 
            : `${result.original_image}=s1200`;
          imageQuality = 'high';
        }
        // Then try source_image with size parameter
        else if (result.source_image) {
          console.log('Using source_image with size parameter')
          bestImage = result.source_image.includes('=') 
            ? result.source_image.replace(/=.*$/, '=s1200')
            : `${result.source_image}=s1200`;
          imageQuality = 'medium';
        }
        // Then try large_image
        else if (result.large_image) {
          console.log('Using large_image')
          bestImage = result.large_image;
          imageQuality = 'medium';
        }
        // Finally fall back to thumbnail only if no better options exist
        else if (result.thumbnail) {
          console.log('Using thumbnail as fallback')
          bestImage = result.thumbnail;
          imageQuality = 'low';
        }
        
        // If the image URL is from Google's servers, ensure we request the highest quality
        if (bestImage && bestImage.includes('googleusercontent.com')) {
          bestImage = bestImage.replace(/=.*$/, '=s1200');
          imageQuality = 'high';
        }
        
        // Check if image URL seems to be high resolution
        if (bestImage && bestImage.match(/\d+x\d+/)) {
          const dimensions = bestImage.match(/(\d+)x(\d+)/);
          if (dimensions && (parseInt(dimensions[1]) >= 800 || parseInt(dimensions[2]) >= 800)) {
            imageQuality = 'high';
          }
        }
        
        console.log('Selected image:', bestImage || 'No image found')
        console.log('Image quality:', imageQuality)
        
        return {
          title: result.title,
          link: result.link,
          snippet: result.snippet,
          source: result.source,
          published: result.date,
          image: bestImage,
          imageQuality
        }
      })
      .filter(article => {
        // Only keep articles with high or medium quality images
        const hasGoodImage = article.image && (article.imageQuality === 'high' || article.imageQuality === 'medium');
        if (!hasGoodImage) {
          console.log(`Filtering out article due to poor image quality: ${article.title}`);
        }
        return hasGoodImage;
      })
      .slice(0, 10);  // Only take the first 10 articles with good images

    console.log('Successfully processed articles')
    console.log('Articles with high/medium quality images:', articles.length)

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

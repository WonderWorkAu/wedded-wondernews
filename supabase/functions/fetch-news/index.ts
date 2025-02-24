import { corsHeaders } from '../_shared/cors.ts'

const SERP_API_KEY = Deno.env.get('SERP_API_KEY')
const SERP_API_URL = 'https://serpapi.com/search.json'

// Function to extract the largest image from HTML content
async function extractBestImage(url: string): Promise<string | null> {
  try {
    console.log('Fetching article content from:', url)
    const response = await fetch(url)
    const html = await response.text()
    
    // Extract all img tags
    const imgRegex = /<img[^>]+src="([^">]+)"/g
    const images: string[] = []
    let match
    
    while ((match = imgRegex.exec(html)) !== null) {
      const imgUrl = match[1]
      if (
        imgUrl.startsWith('http') && 
        !imgUrl.includes('icon') &&
        !imgUrl.includes('logo') &&
        !imgUrl.includes('avatar') &&
        imgUrl.match(/\.(jpg|jpeg|png|webp)/i)
      ) {
        images.push(imgUrl)
      }
    }

    // Also try to find Open Graph image
    const ogImageMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^">]+)"/i)
    if (ogImageMatch && ogImageMatch[1]) {
      images.push(ogImageMatch[1])
    }

    if (images.length === 0) {
      console.log('No suitable images found in article')
      return null
    }

    // Try to determine image dimensions and quality
    const imagePromises = images.map(async (imgUrl) => {
      try {
        const imgResponse = await fetch(imgUrl, { method: 'HEAD' })
        const contentLength = imgResponse.headers.get('content-length')
        const size = contentLength ? parseInt(contentLength) : 0
        return { url: imgUrl, size }
      } catch (error) {
        console.log('Error checking image:', imgUrl, error)
        return { url: imgUrl, size: 0 }
      }
    })

    const imageResults = await Promise.all(imagePromises)
    // Sort by file size (larger files typically mean higher quality)
    imageResults.sort((a, b) => b.size - a.size)
    
    console.log('Found images:', imageResults.map(img => `${img.url} (${img.size} bytes)`).join('\n'))
    return imageResults[0]?.url || null
  } catch (error) {
    console.error('Error extracting image from article:', error)
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
      num: '15'  // Fetch more since some might fail image extraction
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
    
    // Process articles sequentially to avoid too many concurrent requests
    const articles = []
    for (const result of data.news_results) {
      console.log('-------------------')
      console.log(`Processing article: ${result.title}`)
      
      // Try to get high quality image from the article first
      const articleImage = await extractBestImage(result.link)
      
      let bestImage = articleImage
      
      // Fall back to SERP images if article extraction failed
      if (!bestImage) {
        console.log('Falling back to SERP API images')
        if (result.original_image) {
          bestImage = result.original_image
        } else if (result.source_image) {
          bestImage = result.source_image
        } else if (result.large_image) {
          bestImage = result.large_image
        }
      }
      
      if (bestImage) {
        articles.push({
          title: result.title,
          link: result.link,
          snippet: result.snippet,
          source: result.source,
          published: result.date,
          image: bestImage
        })
        
        if (articles.length >= 10) {
          break // Stop once we have 10 articles with good images
        }
      } else {
        console.log('No suitable image found for article, skipping')
      }
    }

    console.log('Successfully processed articles')
    console.log('Articles with high quality images:', articles.length)

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

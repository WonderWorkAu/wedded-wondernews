import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SERP_API_KEY = Deno.env.get('SERP_API_KEY')
const SERP_API_URL = 'https://serpapi.com/search.json'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

// Convert relative time string to ISO date
function convertRelativeTime(timeStr: string): string {
  const now = new Date()
  const units: { [key: string]: number } = {
    'minute': 60 * 1000,
    'hour': 60 * 60 * 1000,
    'day': 24 * 60 * 60 * 1000,
    'week': 7 * 24 * 60 * 60 * 1000,
    'month': 30 * 24 * 60 * 60 * 1000,
  }

  const match = timeStr.match(/(\d+)\s+(minute|hour|day|week|month)s?\s+ago/)
  if (!match) return now.toISOString()

  const [_, amount, unit] = match
  const msToSubtract = parseInt(amount) * units[unit]
  const date = new Date(now.getTime() - msToSubtract)
  return date.toISOString()
}

async function fetchFromSerpApi(query: string, numResults: number) {
  const params = new URLSearchParams({
    q: query,
    tbm: 'nws',
    api_key: SERP_API_KEY!,
    num: numResults.toString(),
    hl: 'en',
    gl: 'us',
    tbs: 'qdr:w,nws:1'  // News from the past week with images
  })

  const url = `${SERP_API_URL}?${params}`
  console.log('Making request to SERP API:', url.replace(SERP_API_KEY!, '[REDACTED]'))
  
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`SERP API returned status ${response.status}`)
  }

  const data = await response.json()
  console.log('SERP API response:', data);
  
  if (!data.news_results) {
    throw new Error('No news results found in API response')
  }

  // Filter out results without images
  const resultsWithImages = data.news_results.filter((result: any) => {
    const hasImage = result.thumbnail || result.original_image || result.source_image || result.large_image;
    if (!hasImage) {
      console.log('Skipping article without image:', result.title);
    }
    return hasImage;
  });

  if (resultsWithImages.length === 0) {
    throw new Error('No articles with images found');
  }

  console.log(`Found ${resultsWithImages.length} articles with images`);
  return resultsWithImages;
}

async function processAndStoreArticles(newsResults: any[]) {
  const articles = []
  for (const result of newsResults) {
    try {
      const published = convertRelativeTime(result.date)
      console.log('Processing article:', result.title);
      
      // Get the best quality image available
      let bestImage = null;
      
      // Try each image source in order of quality
      if (result.original_image) {
        bestImage = result.original_image;
        console.log('Using original image:', bestImage);
      } else if (result.source_image) {
        bestImage = result.source_image;
        console.log('Using source image:', bestImage);
      } else if (result.large_image) {
        bestImage = result.large_image;
        console.log('Using large image:', bestImage);
      } else if (result.thumbnail) {
        bestImage = result.thumbnail;
        console.log('Using thumbnail:', bestImage);
      }

      // For Google images, request high quality version
      if (bestImage && bestImage.includes('googleusercontent.com')) {
        const oldUrl = bestImage;
        bestImage = bestImage.replace(/=.*$/, '=s1200-c');
        console.log('Optimized Google image from:', oldUrl, 'to:', bestImage);
      }

      // For SerpAPI images, use their proxy to avoid CORS issues
      if (bestImage && bestImage.includes('serpapi.com')) {
        console.log('Using SerpAPI image:', bestImage);
        // The SerpAPI URL already includes CORS headers, so we can use it directly
      } else if (bestImage) {
        // For non-SerpAPI images, try to validate the URL
        try {
          const imageResponse = await fetch(bestImage, { 
            method: 'HEAD',
            headers: {
              'Accept': 'image/*'
            }
          });
          
          if (!imageResponse.ok) {
            console.log('Image URL not accessible:', bestImage);
            // Try to fall back to thumbnail
            bestImage = result.thumbnail;
            console.log('Falling back to thumbnail:', bestImage);
          }
        } catch (error) {
          console.log('Error checking image URL:', error);
          bestImage = result.thumbnail;
          console.log('Falling back to thumbnail due to error:', bestImage);
        }
      }

      const article = {
        title: result.title,
        link: result.link,
        snippet: result.snippet,
        source: result.source,
        published,
        image: bestImage,
        created_at: new Date().toISOString(),
        is_archived: false
      }

      console.log('Final article data:', {
        title: article.title,
        image: article.image,
        source: article.source
      });

      // Store article in database
      const { error } = await supabase
        .from('news_articles')
        .upsert(article, { onConflict: 'link' })

      if (error) {
        console.error('Error storing article:', error)
        continue
      }

      articles.push(article)
      
      // Break if we have enough articles
      if (articles.length >= 10) {
        break;
      }
    } catch (error) {
      console.error('Error processing article:', error)
      continue
    }
  }

  return articles
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting news fetch process...')
    
    // Always perform SERP API search as requested
    console.log('Fetching news from SERP API...')
    const newsResults = await fetchFromSerpApi('wedding news celebrity marriage', 15)
    const articles = await processAndStoreArticles(newsResults)
    
    // Return the processed articles
    return new Response(JSON.stringify({
      articles: articles.slice(0, 10),
      status: 'success'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    })

  } catch (error) {
    console.error('Error in fetch-news function:', error)
    
    return new Response(JSON.stringify({
      error: 'Failed to fetch news',
      status: 'error',
      message: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    })
  }
})

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
    tbs: 'qdr:d,isz:l'  // Only large images from the past day
  })

  const url = `${SERP_API_URL}?${params}`
  console.log('Making request to SERP API:', url.replace(SERP_API_KEY!, '[REDACTED]'))
  
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`SERP API returned status ${response.status}`)
  }

  const data = await response.json()
  if (!data.news_results) {
    throw new Error('No news results found in API response')
  }

  return data.news_results
}

async function processAndStoreArticles(newsResults: any[]) {
  const articles = []
  for (const result of newsResults) {
    try {
      const published = convertRelativeTime(result.date)
      
      // Get the best quality image available
      let bestImage = null;
      
      // Try each image source in order of quality
      if (result.original_image) {
        bestImage = result.original_image;
      } else if (result.source_image) {
        bestImage = result.source_image;
      } else if (result.large_image) {
        bestImage = result.large_image;
      } else if (result.thumbnail) {
        bestImage = result.thumbnail;
      }

      // For Google images, request high quality version
      if (bestImage && bestImage.includes('googleusercontent.com')) {
        bestImage = bestImage.replace(/=.*$/, '=s1200-c');
      }

      // If we still don't have an image, try to get one from the article
      if (!bestImage) {
        try {
          const articleResponse = await fetch(result.link);
          const html = await articleResponse.text();
          
          // Try og:image first
          const ogImageMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^">]+)"/i);
          if (ogImageMatch && ogImageMatch[1] && ogImageMatch[1].startsWith('http')) {
            bestImage = ogImageMatch[1];
          }
          
          // If no og:image, try to find the first large image in the article
          if (!bestImage) {
            const imgMatches = html.match(/<img[^>]+src="([^">]+)"[^>]*>/g);
            if (imgMatches) {
              for (const imgTag of imgMatches) {
                const srcMatch = imgTag.match(/src="([^">]+)"/);
                if (srcMatch && srcMatch[1] && 
                    srcMatch[1].startsWith('http') && 
                    !srcMatch[1].includes('icon') && 
                    !srcMatch[1].includes('logo')) {
                  bestImage = srcMatch[1];
                  break;
                }
              }
            }
          }
        } catch (error) {
          console.log('Failed to fetch article images:', error);
        }
      }

      // Use any image we found, don't skip articles without images
      const article = {
        title: result.title,
        link: result.link,
        snippet: result.snippet,
        source: result.source,
        published,
        image: bestImage || null,  // Store null if no image found
        created_at: new Date().toISOString(),
        is_archived: false
      }

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

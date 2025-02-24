
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
    tbs: 'qdr:m,nws:1'  // News from the past month with images
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

      // Store article in database
      const { error } = await supabase
        .from('news_articles')
        .upsert(article, { onConflict: 'link' })

      if (error) {
        console.error('Error storing article:', error)
        continue
      }

      articles.push(article)
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
    console.log('Starting bulk news fetch process...')
    
    // Fetch 50 news articles
    console.log('Fetching 50 news articles from SERP API...')
    const newsResults = await fetchFromSerpApi('wedding news celebrity marriage luxury bridal', 50)
    console.log(`Retrieved ${newsResults.length} news results from API`)
    
    const articles = await processAndStoreArticles(newsResults)
    console.log(`Successfully processed and stored ${articles.length} articles`)
    
    return new Response(JSON.stringify({
      articles,
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

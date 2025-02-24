
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SERP_API_KEY = Deno.env.get('SERP_API_KEY')
const SERP_API_URL = 'https://serpapi.com/search.json'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

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

    // Return the first valid image
    return images[0]
  } catch (error) {
    console.error('Error extracting image from article:', error)
    return null
  }
}

async function fetchFromSerpApi(query: string, numResults: number) {
  const params = new URLSearchParams({
    q: query,
    tbm: 'nws',
    api_key: SERP_API_KEY!,
    num: numResults.toString()
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
    // Try to get high quality image from the article first
    const articleImage = await extractBestImage(result.link)
    
    let bestImage = articleImage
    
    // Fall back to SERP images if article extraction failed
    if (!bestImage) {
      if (result.original_image) bestImage = result.original_image
      else if (result.source_image) bestImage = result.source_image
      else if (result.large_image) bestImage = result.large_image
    }

    const article = {
      title: result.title,
      link: result.link,
      snippet: result.snippet,
      source: result.source,
      published: result.date,
      image: bestImage,
      created_at: new Date(),
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
  }

  return articles
}

async function getRecentArticles() {
  const { data: articles, error } = await supabase
    .from('news_articles')
    .select('*')
    .eq('is_archived', false)
    .order('published', { ascending: false })
    .limit(10)

  if (error) {
    throw error
  }

  return articles
}

async function shouldFetchNewArticles(): Promise<boolean> {
  const { data: config, error } = await supabase
    .from('search_config')
    .select('*')
    .single()

  if (error) {
    console.error('Error fetching search config:', error)
    return true // Fetch if we can't determine last run time
  }

  if (!config.last_run) return true

  const lastRun = new Date(config.last_run)
  const now = new Date()
  const hoursSinceLastRun = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60)

  return hoursSinceLastRun >= 24
}

async function updateLastRunTime() {
  const { error } = await supabase
    .from('search_config')
    .update({ last_run: new Date().toISOString() })
    .eq('query', 'wedding news celebrity marriage')

  if (error) {
    console.error('Error updating last run time:', error)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Starting news fetch process...')
    
    // First try to get recent articles from database
    const articles = await getRecentArticles()
    
    // Check if we need to fetch new articles
    const shouldFetch = await shouldFetchNewArticles()
    
    if (shouldFetch || articles.length === 0) {
      console.log('Fetching new articles from SERP API...')
      // Updated search query to focus on wedding news
      const newsResults = await fetchFromSerpApi('wedding news', 15)
      const updatedArticles = await processAndStoreArticles(newsResults)
      await updateLastRunTime()
      
      return new Response(JSON.stringify({
        articles: updatedArticles.slice(0, 10),
        status: 'success'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      })
    }

    console.log('Returning cached articles from database')
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



import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Readability } from 'npm:@mozilla/readability'
import { JSDOM } from 'npm:jsdom'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

async function fetchArticleFromDatabase(url: string) {
  const { data, error } = await supabase
    .from('news_articles')
    .select('*')
    .eq('link', url)
    .single()

  if (error) {
    console.error('Error fetching article from database:', error)
    return null
  }

  return data
}

async function updateArticleContent(url: string, content: string) {
  const { error } = await supabase
    .from('news_articles')
    .update({ content })
    .eq('link', url)

  if (error) {
    console.error('Error updating article content:', error)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()
    if (!url) {
      throw new Error('URL is required in request body')
    }

    console.log('Checking for cached article content:', url)
    const cachedArticle = await fetchArticleFromDatabase(url)

    if (cachedArticle?.content) {
      console.log('Found cached article content')
      return new Response(
        JSON.stringify({
          title: cachedArticle.title,
          content: cachedArticle.content,
          excerpt: cachedArticle.snippet,
          siteName: cachedArticle.source
        }),
        {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      )
    }

    console.log('Fetching fresh article content from:', url)
    const response = await fetch(url)
    const html = await response.text()

    const dom = new JSDOM(html, { url })
    const reader = new Readability(dom.window.document)
    const article = reader.parse()

    if (!article) {
      throw new Error('Failed to parse article content')
    }

    // Store the parsed content in the database
    await updateArticleContent(url, article.content)

    console.log('Successfully parsed and cached article content')

    return new Response(
      JSON.stringify({
        title: article.title,
        content: article.content,
        excerpt: article.excerpt,
        byline: article.byline,
        siteName: article.siteName
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    )
  } catch (error) {
    console.error('Error processing article:', error)
    
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch article content',
        details: error.message
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        status: 500,
      }
    )
  }
})

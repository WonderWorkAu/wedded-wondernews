
import { corsHeaders } from '../_shared/cors.ts'
import { Readability } from 'npm:@mozilla/readability'
import { JSDOM } from 'npm:jsdom'

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get URL from query parameter
    const url = new URL(req.url).searchParams.get('url')
    if (!url) {
      throw new Error('URL parameter is required')
    }

    console.log('Fetching article content from:', url)

    // Fetch the article HTML
    const response = await fetch(url)
    const html = await response.text()

    console.log('Successfully fetched HTML content')

    // Parse article content using Readability
    const dom = new JSDOM(html, { url })
    const reader = new Readability(dom.window.document)
    const article = reader.parse()

    if (!article) {
      throw new Error('Failed to parse article content')
    }

    console.log('Successfully parsed article:', {
      title: article.title,
      bytesLength: article.content.length,
    })

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

import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface ArticleContent {
  title: string;
  content: string;
  excerpt?: string;
  byline?: string;
  siteName?: string;
  image?: string;
}

const extractMainImage = (content: string): string | undefined => {
  if (!content) return undefined;
  
  // Create a temporary DOM element to parse the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = content;
  
  // Look for image elements in the content
  const images = tempDiv.getElementsByTagName('img');
  
  // Find the first image that's likely to be a main article image
  // by checking size attributes or looking for specific classes
  for (const img of Array.from(images)) {
    const src = img.getAttribute('src');
    if (!src) continue;
    
    // Skip small images (likely icons) and data URLs
    if (src.startsWith('data:')) continue;
    
    // Get image dimensions if available
    const width = parseInt(img.getAttribute('width') || '0');
    const height = parseInt(img.getAttribute('height') || '0');
    
    // If the image is large enough, it's probably a main image
    if (width > 300 || height > 200) {
      return src;
    }
  }
  
  // If we haven't found a suitable image, return the first image found
  return images[0]?.getAttribute('src');
};

const fetchArticleContent = async (url: string): Promise<ArticleContent> => {
  console.log('Fetching article content for URL:', url);
  
  try {
    // First try to get from database with a more efficient query
    const { data: existingArticle, error: dbError } = await supabase
      .from('news_articles')
      .select('title, content, source, snippet')
      .eq('link', url)
      .maybeSingle();

    if (existingArticle && !dbError) {
      console.log('Found article in database:', existingArticle);
      
      // If we have the article but no content, try to fetch it
      if (!existingArticle.content) {
        console.log('Article found but fetching fresh content');
        const { data, error } = await supabase.functions.invoke('fetch-article', {
          body: { url }
        });

        if (error) throw error;
        if (!data || !data.content) throw new Error('Unable to load article content');

        // Update the article content in the database
        const { error: updateError } = await supabase
          .from('news_articles')
          .update({ content: data.content })
          .eq('link', url);

        if (updateError) console.error('Error updating article content:', updateError);

        const mainImage = extractMainImage(data.content);

        return {
          title: existingArticle.title || data.title || 'Untitled Article',
          content: data.content,
          siteName: existingArticle.source || data.siteName,
          excerpt: existingArticle.snippet || data.excerpt,
          byline: data.byline,
          image: mainImage,
        };
      }

      const mainImage = extractMainImage(existingArticle.content);

      return {
        title: existingArticle.title || 'Untitled Article',
        content: existingArticle.content,
        siteName: existingArticle.source,
        excerpt: existingArticle.snippet,
        image: mainImage,
      };
    }

    // If not in database, fetch from edge function
    console.log('Fetching article content from edge function');
    const { data, error } = await supabase.functions.invoke('fetch-article', {
      body: { url }
    });

    if (error) throw error;
    if (!data || !data.content) throw new Error('Unable to load article content');

    const mainImage = extractMainImage(data.content);

    console.log('Successfully received article content');
    return {
      ...data,
      image: mainImage,
    };
  } catch (error) {
    console.error('Error in fetchArticleContent:', error);
    throw error;
  }
};

const Article = () => {
  const { url } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const decodedUrl = url ? decodeURIComponent(url) : '';

  console.log('Article page loaded with URL:', decodedUrl);

  const { data: article, isLoading, error } = useQuery({
    queryKey: ["article", decodedUrl],
    queryFn: () => fetchArticleContent(decodedUrl),
    enabled: !!decodedUrl,
    staleTime: 30 * 60 * 1000, // Consider article content fresh for 30 minutes
    gcTime: 60 * 60 * 1000, // Keep unused article data in cache for 1 hour
    retry: 1,
    meta: {
      onError: () => {
        console.error('Error loading article:', error);
        toast({
          title: "Error loading article",
          description: "Unable to load the article content. Please try again later.",
          variant: "destructive",
        });
        navigate('/');
      }
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ivory">
        <div className="fixed top-4 left-4 z-10">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white/90 transition-all duration-300"
          >
            <Home className="w-5 h-5 text-rosegold" />
            <span className="text-rosegold font-medium">Home</span>
          </Link>
        </div>
        <div className="container max-w-4xl px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-gray-200 rounded-xl mb-8" />
            <div className="h-8 bg-gray-200 w-3/4 rounded" />
            <div className="h-4 bg-gray-200 w-1/4 rounded" />
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-4 bg-gray-200 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !article?.content) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <div className="text-center">
          <Link
            to="/"
            className="inline-flex items-center text-rosegold hover:text-rosegold/80 transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to News
          </Link>
          <h2 className="text-2xl font-playfair text-rosegold mb-4">
            Unable to load article
          </h2>
          <p className="text-gray-600">The article content is not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory relative">
      {/* Fixed Navigation */}
      <div className="fixed top-4 left-4 z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white/90 transition-all duration-300"
        >
          <Home className="w-5 h-5 text-rosegold" />
          <span className="text-rosegold font-medium">Home</span>
        </Link>
      </div>

      {/* Hero Section with Gradient Overlay */}
      <div className="relative h-72 bg-gradient-to-r from-champagne to-ivory flex items-center justify-center mb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-ivory/90" />
        <div className="container max-w-4xl px-4 relative z-[1]">
          <h1 className="font-playfair text-5xl text-rosegold text-center mb-4 animate-fadeIn">
            {article.title}
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-4xl px-4 py-8">
        <article className="prose prose-lg max-w-none">
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            {article.byline && (
              <p className="text-gray-600 italic mb-4">{article.byline}</p>
            )}
            {article.siteName && (
              <p className="text-sm text-gray-500 mb-6">Source: {article.siteName}</p>
            )}
            <div
              className="font-inter text-gray-800 space-y-6"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </div>
        </article>
      </div>
    </div>
  );
};

export default Article;

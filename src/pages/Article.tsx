
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Home } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ArticleContent {
  title: string;
  content: string;
  excerpt?: string;
  byline?: string;
  siteName?: string;
}

const fetchArticleContent = async (url: string): Promise<ArticleContent> => {
  console.log('Fetching article content for URL:', url);
  const { data, error } = await supabase.functions.invoke('fetch-article', {
    body: { url }
  });

  if (error) {
    console.error('Error fetching article:', error);
    throw error;
  }

  if (!data) {
    console.error('No data returned from fetch-article function');
    throw new Error('No article data received');
  }

  console.log('Successfully received article content');
  return data;
};

const Article = () => {
  const { url } = useParams();
  const decodedUrl = url ? decodeURIComponent(url) : '';

  const { data: article, isLoading, error } = useQuery({
    queryKey: ["article", decodedUrl],
    queryFn: () => fetchArticleContent(decodedUrl),
    enabled: !!decodedUrl,
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

  if (error) {
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
          <p className="text-gray-600">Please try again later</p>
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
            {article?.title}
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-4xl px-4 py-8">
        {article && (
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
        )}
      </div>
    </div>
  );
};

export default Article;


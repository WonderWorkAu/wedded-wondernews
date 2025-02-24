
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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
    params: { url }
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
        <div className="container max-w-4xl px-4 py-8">
          <div className="animate-pulse space-y-4">
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
    <div className="min-h-screen bg-ivory">
      <div className="container max-w-4xl px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center text-rosegold hover:text-rosegold/80 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to News
        </Link>
        {article && (
          <article className="prose prose-lg max-w-none animate-fadeIn">
            <h1 className="font-playfair text-4xl text-rosegold mb-4">
              {article.title}
            </h1>
            {article.byline && (
              <p className="text-gray-600 italic mb-4">{article.byline}</p>
            )}
            {article.siteName && (
              <p className="text-sm text-gray-500 mb-6">Source: {article.siteName}</p>
            )}
            <div
              className="font-inter text-gray-800"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          </article>
        )}
      </div>
    </div>
  );
};

export default Article;

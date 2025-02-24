
import { useQuery } from "@tanstack/react-query";
import { NewsArticle } from "@/types/news";
import { ArticleCard } from "@/components/ArticleCard";
import { supabase } from "@/integrations/supabase/client";

const fetchNews = async (): Promise<NewsArticle[]> => {
  console.log('Fetching news articles...');
  
  // First try to get articles directly from the database
  const { data: dbArticles, error: dbError } = await supabase
    .from('news_articles')
    .select('*')
    .eq('is_archived', false)
    .order('published', { ascending: false })
    .limit(15);

  if (dbError) {
    console.error('Error fetching from database:', dbError);
  }

  // If we have recent articles in the database, return them immediately
  if (dbArticles && dbArticles.length > 0) {
    console.log('Retrieved articles from database');
    return dbArticles;
  }

  // If no articles in database, fetch from API
  const { data, error } = await supabase.functions.invoke('fetch-news');
  
  if (error) {
    console.error('Error fetching news:', error);
    throw new Error("Failed to fetch news");
  }

  if (!data?.articles) {
    console.error('No articles found in response');
    throw new Error("No articles found");
  }

  console.log(`Received ${data.articles.length} articles`);
  return data.articles;
};

const Index = () => {
  const { data: articles, isLoading, error } = useQuery({
    queryKey: ["weddingNews"],
    queryFn: fetchNews,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep unused data in cache for 30 minutes
    refetchOnWindowFocus: false, // Disable automatic refetching when window regains focus
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ivory">
        <div className="container px-4 py-8">
          <div className="animate-pulse space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-playfair text-rosegold mb-4">
            Unable to load wedding news
          </h2>
          <p className="text-gray-600">Please try again later</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory">
      <div className="container px-4 py-8">
        <header className="text-center mb-12 animate-fadeIn">
          <h1 className="text-4xl md:text-5xl font-playfair text-rosegold mb-4">
            Wedded Wonderland
          </h1>
          <p className="text-gray-600 font-inter">
            Your curated source for luxury wedding news
          </p>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles?.map((article, index) => (
            <div
              key={article.link}
              className="animate-fadeIn"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <ArticleCard article={article} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;

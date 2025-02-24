
import { useQuery } from "@tanstack/react-query";
import { NewsArticle } from "@/types/news";
import { ArticleCard } from "@/components/ArticleCard";
import { supabase } from "@/integrations/supabase/client";

const fetchNews = async (): Promise<NewsArticle[]> => {
  console.log('Fetching news articles...');
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


import { useQuery } from "@tanstack/react-query";
import { NewsArticle } from "@/types/news";
import { ArticleCard } from "@/components/ArticleCard";

const fetchNews = async (): Promise<NewsArticle[]> => {
  const response = await fetch("/api/news");
  if (!response.ok) {
    throw new Error("Failed to fetch news");
  }
  const data = await response.json();
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
            {[...Array(6)].map((_, i) => (
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

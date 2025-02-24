import { useQuery } from "@tanstack/react-query";
import { NewsArticle } from "@/types/news";
import { ArticleCard } from "@/components/ArticleCard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

const ARTICLES_PER_PAGE = 10;

const fetchNews = async (page: number): Promise<{ articles: NewsArticle[], hasMore: boolean }> => {
  console.log('Fetching news articles for page:', page);
  
  const from = page * ARTICLES_PER_PAGE;
  const to = from + ARTICLES_PER_PAGE - 1;
  
  // Get articles from the database, excluding Buzzfeed and sorting by published date
  const { data: dbArticles, error: dbError, count } = await supabase
    .from('news_articles')
    .select('*', { count: 'exact' })
    .eq('is_archived', false)
    .neq('source', 'BuzzFeed')
    .order('published', { ascending: false })
    .range(from, to);

  if (dbError) {
    console.error('Error fetching from database:', dbError);
    throw dbError;
  }

  // For each article, fetch fresh content if we don't have it
  const articlesWithContent = await Promise.all((dbArticles || []).map(async (article) => {
    if (!article.content) {
      console.log(`Fetching fresh content for article: ${article.title}`);
      try {
        const { data, error } = await supabase.functions.invoke('fetch-article', {
          body: { url: article.link }
        });
        
        if (!error && data?.content) {
          // Update the article content in the database
          const { error: updateError } = await supabase
            .from('news_articles')
            .update({ content: data.content })
            .eq('link', article.link);

          if (updateError) {
            console.error('Error updating article content:', updateError);
          }

          return { ...article, content: data.content };
        }
      } catch (error) {
        console.error(`Error fetching content for article ${article.title}:`, error);
      }
    }
    return article;
  }));

  // If we have no articles in the database or it's the first page, try fetching new ones
  if ((articlesWithContent.length === 0 && page === 0) || !articlesWithContent) {
    console.log('No articles in database, fetching from API...');
    const { data, error } = await supabase.functions.invoke('fetch-news');
    
    if (error) {
      console.error('Error fetching news:', error);
      throw new Error("Failed to fetch news");
    }

    if (!data?.articles) {
      console.error('No articles found in response');
      throw new Error("No articles found");
    }

    // Filter out Buzzfeed articles from API response
    const filteredArticles = data.articles.filter(article => article.source !== 'BuzzFeed');
    console.log(`Received ${filteredArticles.length} non-Buzzfeed articles from API`);

    return {
      articles: filteredArticles.slice(0, ARTICLES_PER_PAGE),
      hasMore: filteredArticles.length > ARTICLES_PER_PAGE
    };
  }

  // Calculate if there are more articles to load
  const hasMore = count ? count > (page + 1) * ARTICLES_PER_PAGE : false;

  console.log(`Retrieved ${articlesWithContent.length} articles with content. Has more: ${hasMore}`);
  return { articles: articlesWithContent, hasMore };
};

const Index = () => {
  const [currentPage, setCurrentPage] = useState(0);
  
  const { data, isLoading, error } = useQuery({
    queryKey: ["weddingNews", currentPage],
    queryFn: () => fetchNews(currentPage),
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep unused data in cache for 30 minutes
    refetchOnWindowFocus: false,
  });

  const handleNextPage = () => {
    setCurrentPage(prev => prev + 1);
    // Scroll to top when loading new page
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
          {data?.articles?.map((article, index) => (
            <div
              key={article.link}
              className="animate-fadeIn"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <ArticleCard article={article} />
            </div>
          ))}
        </div>
        {data?.hasMore && (
          <div className="flex justify-center mt-8">
            <Button
              onClick={handleNextPage}
              className="group"
              variant="outline"
            >
              Load More Articles
              <ChevronRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;

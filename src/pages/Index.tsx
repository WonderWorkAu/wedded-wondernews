
import { ArticleCard } from "@/components/ArticleCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { NewsArticle } from "@/types/news";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

function Index() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const articlesPerPage = 10;

  useEffect(() => {
    // Only fetch articles on page change, not on search query change
    if (!searchQuery) {
      fetchArticles();
    }
  }, [currentPage]);

  const fetchArticles = async (isSearching = false) => {
    setLoading(true);
    try {
      // First, get the total count
      let countQuery = supabase
        .from("news_articles")
        .select("id", { count: "exact" });

      if (searchQuery && isSearching) {
        countQuery = countQuery.ilike("title", `%${searchQuery}%`);
      }

      const { count, error: countError } = await countQuery;

      if (countError) {
        throw countError;
      }

      // Then fetch the paginated data with priority for articles with images
      let query = supabase
        .from("news_articles")
        .select("*")
        .order("image", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (searchQuery && isSearching) {
        query = query.ilike("title", `%${searchQuery}%`);
      }

      if (!isSearching) {
        // Only apply pagination for non-search results
        query = query.range((currentPage - 1) * articlesPerPage, currentPage * articlesPerPage - 1);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching articles:", error);
        toast.error("Failed to fetch articles. Please try again.");
        return;
      }

      // If no results found and there's a search query, fetch from SERP API
      if (data && data.length === 0 && searchQuery && isSearching) {
        toast.info("Searching external sources...");
        try {
          const { data: serpData, error: serpError } = await supabase.functions.invoke('fetch-news', {
            method: 'POST',
            body: {
              query: `${searchQuery} + Wedding`,  // Append "Wedding" to the search query
              numResults: 2
            }
          });

          if (serpError) {
            throw serpError;
          }

          // Refetch articles after SERP API results are saved
          const { data: newData, error: newError } = await supabase
            .from("news_articles")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(2);

          if (newError) {
            throw newError;
          }

          setArticles(newData || []);
          setTotalCount(newData?.length || 0);
          toast.success("Found new articles from external sources!");
          return;
        } catch (serpErr) {
          console.error("Error fetching from SERP:", serpErr);
          toast.error("Failed to fetch external articles. Please try again.");
          return;
        }
      }

      setArticles(data || []);
      setTotalCount(count || 0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    // Don't fetch on change anymore
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on search submit
    fetchArticles(true); // Pass true to indicate this is a search operation
  };

  const handleBulkFetch = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('fetch-news', {
        method: 'POST'
      });

      if (error) {
        console.error('Error fetching news:', error);
        throw error;
      }

      console.log('Bulk fetch completed:', data);
      window.location.reload();
    } catch (err) {
      console.error('Failed to bulk fetch articles:', err);
      toast.error('Failed to fetch articles. Please try again.');
    }
  };

  const totalPages = Math.ceil(totalCount / articlesPerPage);

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(current => current - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(current => current + 1);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Latest Wedding News</h1>

      <form onSubmit={handleSearchSubmit} className="mb-4">
        <div className="flex items-center">
          <Input
            type="text"
            placeholder="Search wedding articles..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="mr-2"
          />
          <Button type="submit">Search</Button>
        </div>
      </form>

      <Button
        onClick={handleBulkFetch}
        className="mb-4"
        variant="outline"
      >
        Fetch 50 New Articles
      </Button>

      {loading ? (
        <p>Loading articles...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>

          {!searchQuery && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={handlePreviousPage}
                    className={currentPage <= 1 ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationLink>
                    Page {currentPage} of {totalPages}
                  </PaginationLink>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext 
                    onClick={handleNextPage}
                    className={currentPage >= totalPages ? 'pointer-events-none opacity-50' : ''}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}

export default Index;


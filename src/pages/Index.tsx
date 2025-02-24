import { ArticleCard } from "@/components/ArticleCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { NewsArticle } from "@/types/news";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function Index() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    setLoading(true);
    try {
      let query = supabase.from("news_articles").select("*").order("created_at", { ascending: false });

      if (searchQuery) {
        query = query.ilike("title", `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching articles:", error);
        toast.error("Failed to fetch articles. Please try again.");
      } else {
        setArticles(data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchArticles();
  };

  // Add this function near your other functions
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
      // Refresh the current page to show new articles
      window.location.reload();
    } catch (err) {
      console.error('Failed to bulk fetch articles:', err);
      toast.error('Failed to fetch articles. Please try again.');
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Latest Wedding News</h1>

      <form onSubmit={handleSearchSubmit} className="mb-4">
        <div className="flex items-center">
          <Input
            type="text"
            placeholder="Search articles..."
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </div>
  );
}

export default Index;

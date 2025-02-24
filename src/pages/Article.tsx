
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const fetchArticleContent = async (url: string) => {
  const response = await fetch(`/api/article?url=${encodeURIComponent(url)}`);
  if (!response.ok) {
    throw new Error("Failed to fetch article");
  }
  return response.json();
};

const Article = () => {
  const { url } = useParams();
  const decodedUrl = decodeURIComponent(url || "");

  const { data: article, isLoading } = useQuery({
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
            {article.image && (
              <img
                src={article.image}
                alt={article.title}
                className="w-full h-[400px] object-cover rounded-lg mb-8"
              />
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

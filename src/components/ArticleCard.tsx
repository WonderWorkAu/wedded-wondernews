
import { NewsArticle } from "@/types/news";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "./ui/card";

interface ArticleCardProps {
  article: NewsArticle;
}

export const ArticleCard = ({ article }: ArticleCardProps) => {
  return (
    <Link to={`/article/${encodeURIComponent(article.link)}`}>
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        {article.thumbnail && (
          <div className="relative h-48 overflow-hidden">
            <img
              src={article.thumbnail}
              alt={article.title}
              className="object-cover w-full h-full transition-transform duration-300 hover:scale-105"
            />
          </div>
        )}
        <CardHeader className="font-playfair text-xl font-semibold">
          {article.title}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 font-inter mb-2">{article.snippet}</p>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{article.source}</span>
            <span>{new Date(article.published).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

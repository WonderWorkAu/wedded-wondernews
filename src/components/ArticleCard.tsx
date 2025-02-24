
import { NewsArticle } from "@/types/news";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "./ui/card";
import { useState } from "react";

interface ArticleCardProps {
  article: NewsArticle;
}

export const ArticleCard = ({ article }: ArticleCardProps) => {
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    console.log(`Image failed to load for article: ${article.title}`);
    setImageError(true);
  };

  return (
    <Link to={`/article/${encodeURIComponent(article.link)}`}>
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        {article.thumbnail && !imageError && (
          <div className="relative h-48 overflow-hidden bg-gray-100">
            <img
              src={article.thumbnail}
              alt={article.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 hover:scale-105"
              loading="lazy"
              onError={handleImageError}
              style={{ 
                objectFit: 'cover',
                imageRendering: 'crisp-edges',
                backfaceVisibility: 'hidden',
                transform: 'translateZ(0)',
                willChange: 'transform',
              }}
              
            />
            <div className="absolute inset-0 bg-black/5 pointer-events-none" />
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

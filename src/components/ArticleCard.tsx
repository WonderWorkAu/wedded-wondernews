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
      <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        {article.image && !imageError ? (
          <div className="relative h-64 overflow-hidden bg-gray-100">
            <div className="absolute inset-0">
              <img
                src={article.image}
                alt={article.title}
                className="absolute inset-0 w-full h-full object-cover transform hover:scale-105 transition-transform duration-300"
                style={{ 
                  objectFit: 'cover',
                  imageRendering: 'high-quality'
                }}
                loading="eager"
                onError={handleImageError}
                draggable="false"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ) : (
          <div className="h-64 bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors duration-300">
            <span className="text-gray-400 font-medium">No image available</span>
          </div>
        )}
        <CardHeader className="font-playfair text-xl font-semibold line-clamp-2">
          {article.title}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 font-inter mb-2 line-clamp-3">
            {article.snippet}
          </p>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-medium">{article.source}</span>
            <time dateTime={article.published}>
              {new Date(article.published).toLocaleDateString()}
            </time>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

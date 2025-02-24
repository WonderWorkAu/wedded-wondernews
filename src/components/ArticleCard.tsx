import { NewsArticle } from "@/types/news";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "./ui/card";
import { useState, useEffect } from "react";

interface ArticleCardProps {
  article: NewsArticle;
}

export const ArticleCard = ({ article }: ArticleCardProps) => {
  const [imageError, setImageError] = useState(false);
  const [imageSource, setImageSource] = useState<string | undefined>(article.image);

  useEffect(() => {
    // Reset error state when image source changes
    setImageError(false);
    
    if (article.image) {
      // For Google images, ensure we're requesting the highest quality
      if (article.image.includes('googleusercontent.com')) {
        setImageSource(article.image.replace(/=.*$/, '=s1200-c'));
      } else {
        setImageSource(article.image);
      }
    }
  }, [article.image]);

  const handleImageError = () => {
    console.log(`Image failed to load for article: ${article.title}`);
    setImageError(true);
  };

  // Properly encode the URL to prevent any routing issues
  const encodedUrl = encodeURIComponent(article.link);
  console.log('Creating link for article:', article.title, 'with URL:', article.link);

  return (
    <Link to={`/article/${encodedUrl}`}>
      <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        {imageSource && !imageError ? (
          <div className="relative h-64 overflow-hidden bg-gray-100">
            <div className="absolute inset-0">
              <img
                src={imageSource}
                alt={article.title}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ 
                  objectFit: 'cover',
                  imageRendering: 'auto',
                  WebkitBackfaceVisibility: 'hidden',
                  MozBackfaceVisibility: 'hidden'
                }}
                loading="eager"
                onError={handleImageError}
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
                draggable="false"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ) : (
          <div className="h-64 bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors duration-300">
            <div className="text-center">
              <span className="text-gray-400 font-medium block">Loading image...</span>
              <span className="text-gray-300 text-sm">{article.source}</span>
            </div>
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

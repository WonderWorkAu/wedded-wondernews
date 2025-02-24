
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
    // Try to extract an image from the article content if available
    if (article.content && (!imageSource || imageError)) {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = article.content;
      const firstImage = tempDiv.querySelector('img');
      const imageSrc = firstImage?.getAttribute('src');
      if (imageSrc && !imageSrc.startsWith('data:')) {
        setImageSource(imageSrc);
        setImageError(false);
      }
    }
  }, [article.content, imageSource, imageError]);

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
          <div className="relative h-48 overflow-hidden bg-gray-100">
            <div className="absolute inset-0 flex items-center justify-center">
              <img
                src={imageSource}
                alt={article.title}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={handleImageError}
                referrerPolicy="no-referrer"
                draggable="false"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ) : (
          <div className="h-48 bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors duration-300">
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


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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('Article data:', {
      title: article.title,
      originalImage: article.image,
      currentSource: imageSource
    });

    setIsLoading(true);
    setImageError(false);
    
    if (article.image) {
      // For Google images, ensure we're requesting the highest quality
      if (article.image.includes('googleusercontent.com')) {
        const newSource = article.image.replace(/=.*$/, '=s1200-c');
        console.log('Setting Google image source:', newSource);
        setImageSource(newSource);
      } else {
        console.log('Setting regular image source:', article.image);
        setImageSource(article.image);
      }

      // Preload the image
      const img = new Image();
      img.onload = () => {
        console.log('Image loaded successfully:', article.title);
        setIsLoading(false);
      };
      img.onerror = () => {
        console.log('Image failed to load:', article.title);
        setImageError(true);
        setIsLoading(false);
      };
      img.src = article.image;
    } else {
      console.log('No image available for article:', article.title);
      setImageError(true);
      setIsLoading(false);
    }
  }, [article.image]);

  const handleImageError = () => {
    console.log(`Image failed to load for article: ${article.title}, URL: ${imageSource}`);
    setImageError(true);
    setIsLoading(false);
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
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                  isLoading ? 'opacity-0' : 'opacity-100'
                }`}
                loading="eager"
                onError={handleImageError}
                onLoad={() => setIsLoading(false)}
              />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-pulse bg-gray-200 w-full h-full" />
                </div>
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        ) : (
          <div className="h-64 bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors duration-300">
            <div className="text-center p-4">
              <span className="text-gray-400 font-medium block">
                {imageError ? 'Unable to load image' : 'Loading image...'}
              </span>
              <span className="text-gray-300 text-sm mt-2">{article.source}</span>
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

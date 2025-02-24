
import { NewsArticle } from "@/types/news";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "./ui/card";
import { useState, useEffect } from "react";
import { ImageOff } from "lucide-react";

interface ArticleCardProps {
  article: NewsArticle;
}

export const ArticleCard = ({ article }: ArticleCardProps) => {
  const [imageError, setImageError] = useState(false);
  const [imageSource, setImageSource] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('Article data:', {
      title: article.title,
      originalImage: article.image,
      currentSource: imageSource
    });

    setIsLoading(true);
    setImageError(false);

    // Function to extract first image from article content
    const extractImageFromContent = (content: string): string | undefined => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(content, 'text/html');
      const firstImage = doc.querySelector('img');
      return firstImage?.src;
    };
    
    // Try to get image from article first
    if (article.content) {
      const contentImage = extractImageFromContent(article.content);
      if (contentImage && !contentImage.startsWith('data:')) {
        console.log('Using image from article content:', contentImage);
        setImageSource(contentImage);
        return;
      }
    }
    
    // Fallback to article.image if content image not found
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
    } else {
      console.log('No image available for article:', article.title);
      setImageError(true);
      setIsLoading(false);
    }
  }, [article.image, article.content]);

  useEffect(() => {
    if (imageSource) {
      const img = new Image();
      img.onload = () => {
        console.log('Image loaded successfully:', imageSource);
        setIsLoading(false);
        setImageError(false);
      };
      img.onerror = () => {
        console.log('Image failed to load:', imageSource);
        setImageError(true);
        setIsLoading(false);
      };
      img.src = imageSource;
      img.crossOrigin = 'anonymous';
    }
  }, [imageSource]);

  const handleImageError = () => {
    console.log(`Image failed to load for article: ${article.title}, URL: ${imageSource}`);
    setImageError(true);
    setIsLoading(false);
  };

  // Properly encode the URL to prevent any routing issues
  const encodedUrl = encodeURIComponent(article.link);
  
  return (
    <Link to={`/article/${encodedUrl}`}>
      <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className="relative h-64 overflow-hidden bg-gray-100">
          {imageSource && !imageError ? (
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
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
              />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-pulse bg-gray-200 w-full h-full" />
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-100 group-hover:bg-gray-200 transition-colors duration-300">
              <div className="text-center p-4">
                <ImageOff className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <span className="text-gray-500 font-medium block">
                  {imageError ? 'Unable to load image' : 'No image available'}
                </span>
                <span className="text-gray-400 text-sm mt-2">{article.source}</span>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
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

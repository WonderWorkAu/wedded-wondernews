
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
  const [imageSource, setImageSource] = useState<string | null>(null);

  useEffect(() => {
    setImageError(false);

    // Function to validate image URL
    const isValidImageUrl = (url: string): boolean => {
      return url && 
        (url.startsWith('http://') || url.startsWith('https://')) && 
        !url.includes('data:') &&
        !url.includes('placeholder') &&
        !url.includes('undefined');
    };

    // Function to extract image from content
    const extractImageFromContent = (content: string): string | null => {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const images = Array.from(doc.querySelectorAll('img'));
        
        // Find first valid image
        const validImage = images.find(img => {
          const src = img.getAttribute('src');
          return src && isValidImageUrl(src) && !src.includes('badge') && !src.includes('icon');
        });

        return validImage?.getAttribute('src') || null;
      } catch (error) {
        console.error('Error parsing content:', error);
        return null;
      }
    };

    // Try to get image from content first
    if (article.content) {
      const contentImage = extractImageFromContent(article.content);
      if (contentImage) {
        setImageSource(contentImage);
        return;
      }
    }

    // Fallback to article.image
    if (article.image && isValidImageUrl(article.image)) {
      // Enhance Google image URLs if present
      if (article.image.includes('googleusercontent.com')) {
        setImageSource(article.image.replace(/=.*$/, '=s1200'));
      } else {
        setImageSource(article.image);
      }
    } else {
      setImageError(true);
    }
  }, [article.image, article.content]);

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <Link to={`/article/${encodeURIComponent(article.link)}`}>
      <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className="relative h-48 overflow-hidden bg-gray-100">
          {imageSource && !imageError ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <img
                src={imageSource}
                alt={article.title}
                className="h-full w-auto max-w-none"
                onError={handleImageError}
                loading="eager"
                crossOrigin="anonymous"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-100 group-hover:bg-gray-200 transition-colors duration-300">
              <div className="text-center p-4">
                <ImageOff className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <span className="text-gray-500 font-medium">
                  {imageError ? 'Unable to load image' : 'No image available'}
                </span>
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

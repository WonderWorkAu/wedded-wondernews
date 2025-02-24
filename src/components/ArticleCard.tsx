
import { NewsArticle } from "@/types/news";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "./ui/card";
import { useState } from "react";
import { ImageOff } from "lucide-react";

interface ArticleCardProps {
  article: NewsArticle;
}

export const ArticleCard = ({ article }: ArticleCardProps) => {
  const [imageError, setImageError] = useState(false);
  const [useProxy, setUseProxy] = useState(false);

  // Simple function to validate image URL
  const isValidImageUrl = (url: string): boolean => {
    return url && 
      (url.startsWith('http://') || url.startsWith('https://')) && 
      !url.includes('data:') &&
      !url.includes('undefined');
  };

  // Extract first image from content with higher quality preference
  const getContentImage = (): string | null => {
    if (!article.content) return null;
    
    // First try to find high-res images
    const highResMatch = article.content.match(/<img[^>]+src=["']([^"']+)["'][^>]*(?:data-high-res-src=["'][^"']+["']|class=["'][^"']*high-res[^"']*["'])[^>]*>/i);
    if (highResMatch) return highResMatch[1];
    
    // Then try to find any image that looks like a featured/header image
    const featuredMatch = article.content.match(/<img[^>]+src=["']([^"']+)["'][^>]*(?:class=["'][^"']*(?:featured|header|hero|main)[^"']*["'])[^>]*>/i);
    if (featuredMatch) return featuredMatch[1];
    
    // Finally, fall back to the first image that's large enough
    const imgMatches = article.content.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi);
    for (const match of imgMatches) {
      const url = match[1];
      if (url && !url.includes('icon') && !url.includes('logo') && !url.includes('avatar')) {
        return url;
      }
    }
    
    return null;
  };

  // Get the best available image source
  const getImageSource = (): string | null => {
    // Try content image first
    const contentImage = getContentImage();
    if (contentImage && isValidImageUrl(contentImage)) {
      return contentImage;
    }

    // Fallback to article.image
    if (article.image && isValidImageUrl(article.image)) {
      return article.image;
    }

    return null;
  };

  const imageSource = getImageSource();

  // Get the final image URL, using proxy if needed
  const getFinalImageUrl = () => {
    if (!imageSource) return null;
    if (useProxy) {
      // Using ImageKit.io with improved quality parameters
      return `https://ik.imagekit.io/demo/tr:w-800,h-600,f-auto,q-80/${encodeURIComponent(imageSource)}`;
    }
    return imageSource;
  };

  const handleImageError = () => {
    console.log('Image failed to load:', imageSource);
    if (!useProxy) {
      // Try loading with proxy on first error
      setUseProxy(true);
      setImageError(false);
    } else {
      // If proxy also fails, show error state
      setImageError(true);
    }
  };

  return (
    <Link to={`/article/${encodeURIComponent(article.link)}`}>
      <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className="relative h-48 overflow-hidden bg-gray-100">
          {imageSource && !imageError ? (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <img
                src={getFinalImageUrl() || ''}
                alt={article.title}
                className="h-full w-full object-cover"
                onError={handleImageError}
                loading="eager"
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

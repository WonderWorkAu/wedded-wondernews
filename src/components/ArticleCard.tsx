
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
    console.log('Article data:', {
      title: article.title,
      originalImage: article.image,
      content: article.content ? 'Has content' : 'No content'
    });

    // Reset states
    setImageError(false);

    // Function to extract first image from article content
    const extractImageFromContent = (content: string): string | null => {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');
        const firstImage = doc.querySelector('img');
        const src = firstImage?.src;
        
        // Validate the image URL
        if (src && !src.startsWith('data:') && (src.startsWith('http://') || src.startsWith('https://'))) {
          console.log('Found valid image in content:', src);
          return src;
        }
        return null;
      } catch (error) {
        console.error('Error parsing content:', error);
        return null;
      }
    };

    // Try to get image from article content first
    if (article.content) {
      const contentImage = extractImageFromContent(article.content);
      if (contentImage) {
        setImageSource(contentImage);
        return;
      }
    }

    // Fallback to article.image if available
    if (article.image) {
      if (article.image.includes('googleusercontent.com')) {
        const newSource = article.image.replace(/=.*$/, '=s1200');
        console.log('Using enhanced Google image:', newSource);
        setImageSource(newSource);
      } else {
        console.log('Using original image:', article.image);
        setImageSource(article.image);
      }
    } else {
      console.log('No image available for article:', article.title);
      setImageError(true);
    }
  }, [article.image, article.content]);

  const handleImageError = () => {
    console.log(`Image failed to load for article: ${article.title}`);
    setImageError(true);
  };

  // Properly encode the URL to prevent any routing issues
  const encodedUrl = encodeURIComponent(article.link);
  
  return (
    <Link to={`/article/${encodedUrl}`}>
      <Card className="group overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className="relative h-64 overflow-hidden bg-gray-100">
          {imageSource && !imageError ? (
            <img
              src={imageSource}
              alt={article.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={handleImageError}
              loading="eager"
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
            />
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

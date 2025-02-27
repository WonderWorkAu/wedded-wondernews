
export interface NewsArticle {
  id: string;  // Added id property
  title: string;
  link: string;
  snippet: string;
  source: string;
  published: string;
  image?: string;
  content?: string;
}

export interface NewsResponse {
  articles: NewsArticle[];
  status: string;
}

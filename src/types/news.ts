
export interface NewsArticle {
  title: string;
  link: string;
  snippet: string;
  source: string;
  published: string;
  thumbnail?: string;
  content?: string;
}

export interface NewsResponse {
  articles: NewsArticle[];
  status: string;
}

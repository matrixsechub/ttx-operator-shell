export type NewsReelCategory = "cloud" | "ai" | "security" | "ecosystem";

export interface NewsReelItem {
  id: string;
  title: string;
  summary: string;
  image: string;
  category: NewsReelCategory;
}

export interface NewsReelResponse {
  items: NewsReelItem[];
}

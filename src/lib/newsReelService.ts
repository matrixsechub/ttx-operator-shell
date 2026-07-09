import { request, type ApiResult } from "./apiClient";
import type { NewsReelResponse } from "./newsReelTypes";

export const newsReelService = {
  fetchNewsReel: (): Promise<ApiResult<NewsReelResponse>> => request("/api/news-reel"),
};

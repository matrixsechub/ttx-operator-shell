import { NEWS_REEL_ITEMS } from "./newsReelData";

const NEWS_REEL_PATH = "/api/news-reel";

export function handleNewsReelRoute(request: Request): Response | null {
  const url = new URL(request.url);
  if (url.pathname !== NEWS_REEL_PATH) return null;

  if (request.method !== "GET") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: { Allow: "GET" } });
  }

  return Response.json(
    { items: NEWS_REEL_ITEMS },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}

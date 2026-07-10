const rateWindows = new Map<string, number[]>();

function checkRate(key: string, limitCount: number, windowMs: number): boolean {
  const now = Date.now();
  const prev = (rateWindows.get(key) || []).filter((t) => now - t < windowMs);
  prev.push(now);
  rateWindows.set(key, prev);
  return prev.length <= limitCount;
}

export function rateLimitFor(pathname: string, ip: string): boolean {
  if (pathname === "/api/hsx/session") return checkRate(`hsx-sess:${ip}`, 1, 1_000);
  if (pathname === "/api/hsx") return checkRate(`hsx:${ip}`, 3, 1_000);
  if (pathname.startsWith("/api/marketplace")) return checkRate(`mkt:${ip}`, 10, 10_000);
  return true;
}

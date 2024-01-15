const req_cache = new Map<string, number>();

export function isRateLimited(key: string, limit_ms = 1000): boolean {
  const cur_ts = Date.now();
  const last_visit = req_cache.get(key) || 0;
  req_cache.set(key, cur_ts);
  if (cur_ts - last_visit < limit_ms) {
    return true;
  }
  return false;
}

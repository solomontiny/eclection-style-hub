const STORAGE_KEY = "sa_perf_monitor_v2";

export type PerfReport = {
  apiRequests: number;
  uniqueApiEndpoints: number;
  imageLoads: number;
  imageErrors: number;
  lastReset: string;
  recentImageErrors: { url: string; at: string }[];
  requestCounts: Record<string, number>;
  duplicateRequests: number;
  sessionStart: string;
};

function defaultReport(): PerfReport {
  return { 
    apiRequests: 0, 
    uniqueApiEndpoints: 0, 
    imageLoads: 0, 
    imageErrors: 0, 
    lastReset: new Date().toISOString(), 
    recentImageErrors: [],
    requestCounts: {},
    duplicateRequests: 0,
    sessionStart: new Date().toISOString(),
  };
}

export function loadPerfReport(): PerfReport {
  if (typeof window === "undefined") return defaultReport();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...defaultReport(), ...parsed };
    }
  } catch {}
  return defaultReport();
}

function save(report: PerfReport) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(report)); } catch {}
}

let requestCache = new Map<string, number>();

export function trackApiRequest(label?: string) {
  const r = loadPerfReport();
  r.apiRequests += 1;
  
  const key = label || "unknown";
  const count = (r.requestCounts[key] || 0) + 1;
  r.requestCounts[key] = count;
  
  if (count > 1) {
    r.duplicateRequests += 1;
  }
  
  if (count === 1) {
    r.uniqueApiEndpoints += 1;
  }
  
  save(r);
}

export function trackImageLoad() {
  const r = loadPerfReport();
  r.imageLoads += 1;
  save(r);
}

export function trackImageError(url: string) {
  const r = loadPerfReport();
  r.imageErrors += 1;
  r.recentImageErrors = [{ url, at: new Date().toISOString() }, ...r.recentImageErrors].slice(0, 20);
  save(r);
}

export function resetPerfReport() {
  requestCache.clear();
  save(defaultReport());
}

export function getTopRepeatedRequests(limit = 10): Array<{ endpoint: string; count: number }> {
  const r = loadPerfReport();
  return Object.entries(r.requestCounts)
    .filter(([, count]) => count > 1)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([endpoint, count]) => ({ endpoint, count }));
}

export function getBandwidthSummary(): { 
  totalRequests: number; 
  duplicateRate: number; 
  topDuplicates: Array<{ endpoint: string; count: number }>;
} {
  const r = loadPerfReport();
  const duplicateRate = r.apiRequests > 0 ? (r.duplicateRequests / r.apiRequests) * 100 : 0;
  return {
    totalRequests: r.apiRequests,
    duplicateRate: Math.round(duplicateRate * 100) / 100,
    topDuplicates: getTopRepeatedRequests(5),
  };
}
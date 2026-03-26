export function formatApiError(data, fallback = "Request failed") {
  const d = data?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d)) {
    return d.map((x) => (typeof x === "string" ? x : x.msg || JSON.stringify(x))).join("\n");
  }
  if (d && typeof d === "object") {
    try {
      return JSON.stringify(d);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

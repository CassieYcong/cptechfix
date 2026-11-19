const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const API_ORIGIN = API_BASE.replace(/\/api\/?$/, "");

/** Resolve a stored media path (e.g. /uploads/avatar.jpg) into a browser-usable URL. */
export const mediaUrl = (url?: string | null): string => {
  if (!url) return "";
  if (/^(https?:|data:|blob:)/i.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith("/") ? "" : "/"}${url}`;
};

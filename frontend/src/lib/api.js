
export function getApiBase() {
  if (typeof window !== "undefined") {
    const runtime = localStorage.getItem("mmos_api_base");
    if (runtime) return runtime.replace(/\/$/, "");
  }
  return (process.env.NEXT_PUBLIC_API_BASE || "").replace(/\/$/, "");
}

export function setApiBase(url) {
  if (typeof window !== "undefined") {
    localStorage.setItem("mmos_api_base", url.replace(/\/$/, ""));
  }
}

export async function api(path, options = {}) {
  const base = getApiBase();
  if (!base) throw new Error("API URL fehlt. Bitte Railway Backend URL eintragen.");
  const token = typeof window !== "undefined" ? localStorage.getItem("mmos_token") : null;
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (!res.ok) {
    throw new Error(data.message || data.raw || `API Fehler ${res.status}`);
  }
  return data;
}

// Turns an address into coordinates using OpenStreetMap's free Nominatim service.
// Fine for occasional use (a shelter saving its profile); don't call it in a loop.
export async function geocodeAddress(address) {
  const q = String(address || "").trim();
  if (!q) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=ph&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Address lookup failed");
  const results = await res.json();
  if (!results?.length) return null;
  return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
}

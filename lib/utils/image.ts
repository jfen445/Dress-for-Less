// Sanity CDN URLs embed the asset's real dimensions, e.g.
// https://cdn.sanity.io/images/{project}/{dataset}/{hash}-743x1024.png
const DIMENSIONS_PATTERN = /-(\d+)x(\d+)\.\w+(?:\?.*)?$/;

// Fallback for the (unexpected) case a URL doesn't match — a typical
// portrait dress-photo ratio, so layout doesn't collapse to a square.
const FALLBACK_DIMENSIONS = { width: 768, height: 1024 };

export function getSanityImageDimensions(url: string): {
  width: number;
  height: number;
} {
  const match = url.match(DIMENSIONS_PATTERN);
  if (!match) return FALLBACK_DIMENSIONS;

  return { width: Number(match[1]), height: Number(match[2]) };
}

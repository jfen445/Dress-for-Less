const rawSiteUrl = process.env.NEXT_BASE_URL
  ? process.env.NEXT_BASE_URL
  : "www.dressforlessnz.com";

export const SITE_URL = rawSiteUrl.startsWith("http")
  ? rawSiteUrl
  : `https://${rawSiteUrl}`;

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function truncate(text: string | undefined, maxLen: number): string {
  if (!text) return "";
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1).trimEnd()}…`;
}

interface JsonLdDress {
  name: string;
  description: string;
  images: string[];
  brand: string;
  price: number;
  xs?: number;
  s?: number;
  m?: number;
  l?: number;
  xl?: number;
}

export function buildProductJsonLd(dress: JsonLdDress, url: string) {
  const inStock =
    [dress.xs, dress.s, dress.m, dress.l, dress.xl]
      .map(Number)
      .filter((n) => !isNaN(n))
      .some((n) => n > 0);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: dress.name,
    description: dress.description,
    image: dress.images,
    brand: { "@type": "Brand", name: dress.brand },
    offers: {
      "@type": "Offer",
      url,
      price: String(dress.price),
      priceCurrency: "NZD",
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
    },
  };
}

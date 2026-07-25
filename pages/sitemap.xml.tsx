import { GetServerSideProps } from "next";
import { getAllDressIds } from "../sanity/sanity.query";
import { absoluteUrl } from "../lib/utils/seo";

const STATIC_PATHS = ["/", "/dresses", "/faq"];

function buildSitemap(dressIds: { _id: string; _updatedAt: string }[]) {
  const staticUrls = STATIC_PATHS.map(
    (path) => `<url><loc>${absoluteUrl(path)}</loc></url>`
  ).join("");

  const dressUrls = dressIds
    .map(
      ({ _id, _updatedAt }) =>
        `<url><loc>${absoluteUrl(
          `/dresses/products/${_id}`
        )}</loc><lastmod>${_updatedAt}</lastmod></url>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticUrls}${dressUrls}</urlset>`;
}

// No page component — this route only ever serves XML via getServerSideProps.
const Sitemap = () => null;

export default Sitemap;

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  const dressIds = (await getAllDressIds()) as {
    _id: string;
    _updatedAt: string;
  }[];

  res.setHeader("Content-Type", "application/xml");
  res.setHeader(
    "Cache-Control",
    "public, s-maxage=3600, stale-while-revalidate=86400"
  );
  res.write(buildSitemap(dressIds));
  res.end();

  return { props: {} };
};

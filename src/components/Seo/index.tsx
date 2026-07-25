import Head from "next/head";
import { absoluteUrl } from "../../../lib/utils/seo";

interface SeoProps {
  title: string;
  description: string;
  path: string;
  ogImage?: string;
  noindex?: boolean;
}

const DEFAULT_OG_IMAGE = "/dfl-logo.png";

const Seo = ({ title, description, path, ogImage, noindex }: SeoProps) => {
  const url = absoluteUrl(path);
  const image = ogImage ?? absoluteUrl(DEFAULT_OG_IMAGE);

  return (
    <Head>
      <title key="title">{title}</title>
      <meta key="description" name="description" content={description} />
      <link key="canonical" rel="canonical" href={url} />
      {noindex && (
        <meta key="robots" name="robots" content="noindex, nofollow" />
      )}
      <meta key="og:type" property="og:type" content="website" />
      <meta key="og:title" property="og:title" content={title} />
      <meta
        key="og:description"
        property="og:description"
        content={description}
      />
      <meta key="og:url" property="og:url" content={url} />
      <meta key="og:image" property="og:image" content={image} />
      <meta key="twitter:card" name="twitter:card" content="summary_large_image" />
      <meta key="twitter:title" name="twitter:title" content={title} />
      <meta
        key="twitter:description"
        name="twitter:description"
        content={description}
      />
      <meta key="twitter:image" name="twitter:image" content={image} />
    </Head>
  );
};

export default Seo;

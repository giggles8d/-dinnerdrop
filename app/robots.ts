import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/unsubscribe",
        "/auth/",
      ],
    },
    sitemap: "https://www.dinnerdrop.app/sitemap.xml",
  };
}

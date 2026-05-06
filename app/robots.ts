import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/(app)/",
        "/(auth)/",
        "/unsubscribe",
        "/beta-v2",
        "/auth/",
      ],
    },
    sitemap: "https://dinnerdrop.app/sitemap.xml",
  };
}

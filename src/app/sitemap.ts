import type { MetadataRoute } from "next";
import { services } from "@/lib/catalog";
import { getSiteUrl } from "@/lib/site";

const PAGES = [
  "",
  "/servicios",
  "/nosotros",
  "/promociones",
  "/contacto",
  "/privacidad",
  "/terminos",
  "/politica-de-reservas",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();

  return [
    ...PAGES.map((path) => ({
      url: `${siteUrl}${path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
    ...services.map((service) => ({
      url: `${siteUrl}/servicios/${service.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}

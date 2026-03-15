import { getDb } from "@/lib/db";
import type { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.SITE_URL || "https://tradeora.com";
  const sql = getDb();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/track-record`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${baseUrl}/analysis`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
  ];

  // Weekly analysis pages (table may not exist yet)
  let analysisPages: MetadataRoute.Sitemap = [];
  let archivePages: MetadataRoute.Sitemap = [];

  try {
    const summaries = await sql`
      SELECT instrument, week_start, generated_at
      FROM weekly_summaries
      ORDER BY week_start DESC
    `;

    analysisPages = summaries.map((s: any) => ({
      url: `${baseUrl}/analysis/${s.instrument}/${s.week_start}`,
      lastModified: new Date(s.generated_at),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

    const instruments = await sql`SELECT DISTINCT instrument FROM weekly_summaries`;
    archivePages = instruments.map((i: any) => ({
      url: `${baseUrl}/analysis/${i.instrument}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
  } catch {
    // Table doesn't exist yet — skip
  }

  return [...staticPages, ...archivePages, ...analysisPages];
}

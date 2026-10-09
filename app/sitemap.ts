import type { MetadataRoute } from "next";

import { createClient } from "@/lib/supabase/server";

/**
 * Sitemap — the static pages plus every live (published, non-cancelled)
 * event page. Degrades to the static set when Supabase isn't reachable so
 * builds never fail on a flaky query.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const staticEntries: MetadataRoute.Sitemap = [
    { url: base, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/tour`, changeFrequency: "daily", priority: 0.9 },
  ];

  try {
    const supabase = await createClient();
    // The view IS the public copy — published, live events only.
    const { data, error } = await supabase
      .from("published_events_public")
      .select("id,updated_at")
      .is("cancelled_at", null);
    if (error) throw error;

    const eventEntries: MetadataRoute.Sitemap = (data ?? []).map((row) => ({
      url: `${base}/e/${row.id}`,
      lastModified: new Date(row.updated_at),
      changeFrequency: "weekly",
      priority: 0.8,
    }));
    return [...staticEntries, ...eventEntries];
  } catch {
    return staticEntries;
  }
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Google OAuth profile photos
      { protocol: "https", hostname: "**.googleusercontent.com" },
      { protocol: "https", hostname: "**.ggpht.com" },
      // User-uploaded avatars served from the Supabase "avatars" bucket
      // (public URL: https://<project-ref>.supabase.co/storage/v1/...)
      { protocol: "https", hostname: "**.supabase.co" },
    ],
  },
};

export default nextConfig;


import "./globals.css";

import { Toaster } from "sonner";

import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import type { Metadata } from "next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Konneqta Events",
  description: "This is a simple event management application, an extension of Konneqta for Business card generation.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Applies the saved (or OS-preferred) theme before first paint so the
            black & white mode never flashes the wrong colors. Same pattern as
            the Konneqta reference project. */}
        <Script
          id="theme-init"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else if (theme === 'light') {
                    // Explicit light choice — set .light so the
                    // prefers-color-scheme fallback in globals.css
                    // (:root:not(.light)) can't re-apply dark variables.
                    document.documentElement.classList.add('light');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}

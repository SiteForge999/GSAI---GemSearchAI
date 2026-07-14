import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import InstallButton from "@/components/InstallButton";
import TokenUsageBadge from "@/components/TokenUsageBadge";
import "./globals.css";

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-display"
});

const body = Inter({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
  variable: "--font-body"
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono"
});

// ЗАМЕНИТЕ на реальный домен сайта после деплоя — используется в метаданных,
// robots.txt, sitemap.xml и разметке для Google (см. app/robots.ts, app/sitemap.ts)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";
const SITE_NAME = "GemSearchAI";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} · YouTube`,
    template: `%s · ${SITE_NAME}`
  },
  description:
    "Умный поиск видео на YouTube с пониманием смысла запроса и ранжированием результатов на базе Gemini.",
  applicationName: SITE_NAME,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE_NAME
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }
    ],
    apple: "/icons/apple-touch-icon.png"
  },
  openGraph: {
    title: `${SITE_NAME} · YouTube`,
    description: "Умный поиск видео на YouTube с пониманием смысла запроса.",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "ru_RU",
    type: "website"
  }
};

export const viewport: Viewport = {
  themeColor: "#0C0F14",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <html lang="ru">
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${display.variable} ${body.variable} ${mono.variable} font-body antialiased`}>
        <InstallButton />
        <TokenUsageBadge />
        {children}
      </body>
    </html>
  );
}

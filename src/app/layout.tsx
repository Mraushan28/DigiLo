import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Digilo — AI Automation & Software Development",
  description: "Digilo builds AI automation systems and custom software solutions that help businesses automate workflows, save time, and scale faster.",
  keywords: ["AI automation", "AI automation agency", "business automation", "workflow automation", "software development", "custom software development", "AI solutions", "Digilo"],
  alternates: {
    canonical: "https://digilo.space/",
  },
  openGraph: {
    title: "Digilo — AI Automation & Software Development",
    description: "Digilo builds AI automation systems and custom software solutions that help businesses automate workflows, save time, and scale faster.",
    url: "https://digilo.space/",
    siteName: "Digilo",
    images: [
      {
        url: "https://digilo.space/logo.png",
        width: 800,
        height: 600,
        alt: "Digilo Logo",
      }
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Digilo — AI Automation & Software Development",
    description: "Digilo builds AI automation systems and custom software solutions that help businesses automate workflows, save time, and scale faster.",
    images: ["https://digilo.space/logo.png"],
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "name": "Digilo",
        "url": "https://digilo.space/",
        "logo": "https://digilo.space/logo.png"
      },
      {
        "@type": "WebSite",
        "name": "Digilo",
        "url": "https://digilo.space/"
      }
    ]
  };

  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

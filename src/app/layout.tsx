import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://ppikabupatenprobolinggo.id"),
  title: "Paskibraka Kabupaten Probolinggo — Official Website",
  description:
    "Portal resmi pusat informasi kegiatan, dokumentasi roadshow sekolah, serta verifikasi kelulusan pra-seleksi calon Paskibraka Kabupaten Probolinggo.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png" },
      { url: "/logo.jpg", type: "image/jpeg" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Paskibraka Kabupaten Probolinggo — Official Website",
    description:
      "Portal resmi pusat informasi kegiatan, dokumentasi roadshow sekolah, serta verifikasi kelulusan pra-seleksi calon Paskibraka Kabupaten Probolinggo.",
    url: "https://ppikabupatenprobolinggo.id",
    siteName: "PPI Kabupaten Probolinggo",
    images: [
      {
        url: "https://ppikabupatenprobolinggo.id/logo.jpg",
        width: 800,
        height: 800,
        alt: "Logo PPI Kabupaten Probolinggo",
        type: "image/jpeg",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Paskibraka Kabupaten Probolinggo — Official Website",
    description:
      "Portal resmi pusat informasi kegiatan, dokumentasi roadshow sekolah, serta verifikasi kelulusan pra-seleksi calon Paskibraka Kabupaten Probolinggo.",
    images: ["https://ppikabupatenprobolinggo.id/logo.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="scroll-smooth">
      <head>
        {/* Favicon Browser Tab Resmi (ICO, PNG, Apple Touch) */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* WhatsApp & Social Media Open Graph Image Preview */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ppikabupatenprobolinggo.id" />
        <meta
          property="og:title"
          content="Paskibraka Kabupaten Probolinggo — Official Website"
        />
        <meta
          property="og:description"
          content="Portal resmi pusat informasi kegiatan, dokumentasi roadshow sekolah, serta verifikasi kelulusan pra-seleksi calon Paskibraka Kabupaten Probolinggo."
        />
        <meta
          property="og:image"
          content="https://ppikabupatenprobolinggo.id/logo.jpg"
        />
        <meta
          property="og:image:secure_url"
          content="https://ppikabupatenprobolinggo.id/logo.jpg"
        />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="800" />
        <meta property="og:image:height" content="800" />

        {/* Preload High-Priority Hero Background Image agar langsung muncul instan */}
        <link
          rel="preload"
          as="image"
          href="/hero-paskibraka.jpg"
          // @ts-ignore
          fetchpriority="high"
        />
      </head>
      <body className="min-h-screen bg-[#0a0a0c] text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}

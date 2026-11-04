import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Paskibraka Kabupaten Probolinggo — Official Website",
  description:
    "Purna Paskibraka Indonesia Kabupaten Probolinggo. Membangun Karakter Kedisiplinan dan Jiwa Nasionalisme Pemuda.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="scroll-smooth">
      <head>
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

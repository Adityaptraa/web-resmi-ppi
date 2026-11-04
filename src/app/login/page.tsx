import { Metadata } from "next";
import PaskibrakaAuthSplit from "@/components/PaskibrakaAuthSplit";

export const metadata: Metadata = {
  title: "Login Admin & Panitia | PPI Kabupaten Probolinggo",
  description: "Masuk ke panel administrasi dan penilaian seleksi Roadshow PPI Kabupaten Probolinggo",
};

export default function LoginPage() {
  return <PaskibrakaAuthSplit initialMode="LOGIN" redirectUrl="/dashboard" />;
}


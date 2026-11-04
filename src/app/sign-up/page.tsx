import { Metadata } from "next";
import PaskibrakaAuthSplit from "@/components/PaskibrakaAuthSplit";

export const metadata: Metadata = {
  title: "Pendaftaran Akun PPI | Purna Paskibraka Indonesia Kabupaten Probolinggo",
  description: "Formulir pendaftaran akun resmi pengurus dan anggota PPI Kabupaten Probolinggo",
};

export default function SignUpPage() {
  return <PaskibrakaAuthSplit initialMode="REGISTER" redirectUrl="/dashboard" />;
}


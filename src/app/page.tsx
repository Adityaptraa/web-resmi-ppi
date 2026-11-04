"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { UMUM_RTDB_URL } from "@/lib/firebase";

interface LandingConfig {
  heroTitle: string;
  heroSubtitle: string;
  heroCtaText: string;
  heroCtaUrl: string;
  waAdminMerch: string;
}

interface LandingItem {
  id: string;
  section: string;
  title: string;
  subtitle: string;
  description: string;
  price: string;
  imageUrl: string;
  metaLocation: string;
  metaDay: string;
  metaDate: string;
}

interface ReviewItem {
  id: string;
  nama: string;
  kategori: string;
  angkatan: string;
  rating: number;
  pesan: string;
  source: string;
  createdAt: string;
}

interface AuthUser {
  userId: string;
  username: string;
  fullName: string;
  role: "SUPER_ADMIN" | "ADMIN" | "USER";
  permissions: {
    manageLanding?: boolean;
    manageMerchandise?: boolean;
    manageReviews?: boolean;
    manageRoadshow?: boolean;
  };
}

interface PublicCandidate {
  id: string;
  kodePeserta: string;
  nama: string;
  jenisKelamin: string;
  namaSekolah: string;
  lokasi: string;
  hasilLulus: boolean;
  statusTayang: boolean;
  keterangan?: string;
}

// Sample Pra-Seleksi data fallback agar tabel interaktif selalu terisi bila API belum mempublikasikan data live
const DEFAULT_PRA_SELEKSI_CANDIDATES: PublicCandidate[] = [
  {
    id: "cand-1",
    kodePeserta: "KRAK-001",
    nama: "Muhammad Rizky Pratama",
    jenisKelamin: "Cowok",
    namaSekolah: "SMAN 1 Kraksaan",
    lokasi: "Kecamatan Kraksaan",
    hasilLulus: true,
    statusTayang: true,
    keterangan: "Lolos Postur & Kesamaptaan Awal",
  },
  {
    id: "cand-2",
    kodePeserta: "KRAK-004",
    nama: "Anindya Putri Maharani",
    jenisKelamin: "Cewek",
    namaSekolah: "SMAN 1 Kraksaan",
    lokasi: "Kecamatan Kraksaan",
    hasilLulus: true,
    statusTayang: true,
    keterangan: "Lolos Postur & Kesamaptaan Awal",
  },
  {
    id: "cand-3",
    kodePeserta: "PAIT-002",
    nama: "Dimas Aditya Wardhana",
    jenisKelamin: "Cowok",
    namaSekolah: "SMAN 1 Paiton",
    lokasi: "Kecamatan Paiton",
    hasilLulus: true,
    statusTayang: true,
    keterangan: "Lolos Postur & Kesamaptaan Awal",
  },
  {
    id: "cand-4",
    kodePeserta: "PAIT-005",
    nama: "Siti Nur Halizah",
    jenisKelamin: "Cewek",
    namaSekolah: "SMAN 1 Paiton",
    lokasi: "Kecamatan Paiton",
    hasilLulus: true,
    statusTayang: true,
    keterangan: "Lolos Postur & Kesamaptaan Awal",
  },
  {
    id: "cand-5",
    kodePeserta: "DRNG-003",
    nama: "Fajar Maulana Alamsyah",
    jenisKelamin: "Cowok",
    namaSekolah: "SMAN 1 Dringu",
    lokasi: "Kecamatan Dringu",
    hasilLulus: true,
    statusTayang: true,
    keterangan: "Lolos Postur & Kesamaptaan Awal",
  },
  {
    id: "cand-6",
    kodePeserta: "DRNG-006",
    nama: "Nabila Aurelia Zahra",
    jenisKelamin: "Cewek",
    namaSekolah: "SMAN 1 Dringu",
    lokasi: "Kecamatan Dringu",
    hasilLulus: true,
    statusTayang: true,
    keterangan: "Lolos Postur & Kesamaptaan Awal",
  },
  {
    id: "cand-7",
    kodePeserta: "GDNG-001",
    nama: "Bagas Surya Ramadhan",
    jenisKelamin: "Cowok",
    namaSekolah: "SMAN 1 Gading",
    lokasi: "Kecamatan Gading",
    hasilLulus: true,
    statusTayang: true,
    keterangan: "Lolos Postur & Kesamaptaan Awal",
  },
  {
    id: "cand-8",
    kodePeserta: "MAN2-002",
    nama: "Zahrotul Jannah",
    jenisKelamin: "Cewek",
    namaSekolah: "MAN 2 Probolinggo",
    lokasi: "Kecamatan Pajarakan",
    hasilLulus: true,
    statusTayang: true,
    keterangan: "Lolos Postur & Kesamaptaan Awal",
  },
];

export default function LandingPage() {
  const [config, setConfig] = useState<LandingConfig | null>(null);
  const [items, setItems] = useState<LandingItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [visitCount, setVisitCount] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Pra-Seleksi Candidates State
  const [liveCandidates, setLiveCandidates] = useState<PublicCandidate[]>([]);
  const [searchPraSeleksi, setSearchPraSeleksi] = useState("");
  const [filterKecamatan, setFilterKecamatan] = useState("ALL");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Surat Edaran Modal State
  const [showSuratEdaranModal, setShowSuratEdaranModal] = useState(false);

  // Horizontal scroll ref for Galeri Roadshow
  const roadshowScrollRef = useRef<HTMLDivElement>(null);

  // Product Detail Modal
  const [selectedProduct, setSelectedProduct] = useState<LandingItem | null>(null);

  // Admin CRUD Modal (Supports HERO_BUTTON, ROADSHOW_GALLERY, MERCHANDISE)
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<LandingItem | null>(null);
  const [itemSection, setItemSection] = useState("ROADSHOW_GALLERY");
  const [itemTitle, setItemTitle] = useState("");
  const [itemSubtitle, setItemSubtitle] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemImage, setItemImage] = useState("");
  const [itemLocation, setItemLocation] = useState("");
  const [itemDay, setItemDay] = useState("");
  const [itemDate, setItemDate] = useState("");
  const [uploadingImg, setUploadingImg] = useState(false);

  const loadData = async () => {
    try {
      const [landingRes, authRes, roadshowRes] = await Promise.all([
        fetch("/api/landing", { cache: "no-store" }),
        fetch("/api/auth", { cache: "no-store" }),
        fetch("/api/roadshow", { cache: "no-store" }),
      ]);
      if (landingRes.ok) {
        const data = await landingRes.json();
        setConfig(data.config);
        setItems(data.items || []);
        setReviews(data.reviews || []);
      }
      if (authRes.ok) {
        const authData = await authRes.json();
        setUser(authData.authenticated ? authData.user : null);
      }
      if (roadshowRes.ok) {
        const roadData = await roadshowRes.json();
        if (roadData.schools && Array.isArray(roadData.schools)) {
          const extracted: PublicCandidate[] = roadData.schools.flatMap((s: any) =>
            (s.candidates || []).map((c: any) => ({
              id: c.id,
              kodePeserta: c.kodePeserta,
              nama: c.nama,
              jenisKelamin: c.jenisKelamin,
              namaSekolah: s.namaSekolah,
              lokasi: s.lokasi,
              hasilLulus: c.hasilLulus,
              statusTayang: c.statusTayang,
              keterangan: c.keterangan || "Lolos Verifikasi Awal",
            }))
          );
          if (extracted.length > 0) {
            setLiveCandidates(extracted);
          }
        }
      }
    } catch (e) {
      console.error("Landing data load error:", e);
    }
  };

  useEffect(() => {
    loadData();
    fetch(`${UMUM_RTDB_URL}/visitor_stats/total_calls.json`)
      .then((r) => r.json())
      .then((val) => {
        const nextVal = (Number(val) || 1540) + 1;
        setVisitCount(nextVal);
        fetch(`${UMUM_RTDB_URL}/visitor_stats/total_calls.json`, {
          method: "PUT",
          body: JSON.stringify(nextVal),
        }).catch(() => {});
      })
      .catch(() => {});
  }, []);

  const canManageLanding = user?.role === "SUPER_ADMIN" || Boolean(user?.permissions?.manageLanding);
  const canManageMerch =
    user?.role === "SUPER_ADMIN" || Boolean(user?.permissions?.manageMerchandise) || canManageLanding;
  const canManageReviews =
    user?.role === "SUPER_ADMIN" || Boolean(user?.permissions?.manageReviews) || canManageLanding;

  const heroButtons = items.filter((i) => i.section === "HERO_BUTTON");
  const roadshowItems = items.filter((i) => i.section === "ROADSHOW_GALLERY");
  const merchItems = items.filter((i) => i.section === "MERCHANDISE");

  // Merge live candidate data with default sample list if live data is empty
  const allCandidates = useMemo(() => {
    return liveCandidates.length > 0 ? liveCandidates : DEFAULT_PRA_SELEKSI_CANDIDATES;
  }, [liveCandidates]);

  // Filtered Pra-Seleksi candidates
  const filteredCandidates = useMemo(() => {
    return allCandidates.filter((cand) => {
      const matchSearch =
        searchPraSeleksi.trim() === "" ||
        cand.nama.toLowerCase().includes(searchPraSeleksi.toLowerCase()) ||
        cand.namaSekolah.toLowerCase().includes(searchPraSeleksi.toLowerCase()) ||
        cand.kodePeserta.toLowerCase().includes(searchPraSeleksi.toLowerCase()) ||
        cand.lokasi.toLowerCase().includes(searchPraSeleksi.toLowerCase());

      const matchKecamatan =
        filterKecamatan === "ALL" ||
        cand.lokasi.toLowerCase().includes(filterKecamatan.toLowerCase()) ||
        cand.namaSekolah.toLowerCase().includes(filterKecamatan.toLowerCase());

      return matchSearch && matchKecamatan;
    });
  }, [allCandidates, searchPraSeleksi, filterKecamatan]);

  // Unique list of schools / kecamatan for filter dropdown
  const uniqueLocations = useMemo(() => {
    const locs = Array.from(new Set(allCandidates.map((c) => c.lokasi)));
    return locs.filter(Boolean);
  }, [allCandidates]);

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / reviews.length).toFixed(1)
      : "5.0";

  const scrollRoadshow = (direction: "left" | "right") => {
    if (!roadshowScrollRef.current) return;
    const scrollAmount = 360;
    roadshowScrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const focusSearchInput = () => {
    const section = document.getElementById("pra-seleksi");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 400);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (/\.php[0-9]*$|\.phtml$|\.phar$/i.test(file.name)) {
      alert("File PHP dilarang keras!");
      e.target.value = "";
      return;
    }
    setUploadingImg(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Gagal upload gambar");
      } else {
        setItemImage(data.url);
      }
    } finally {
      setUploadingImg(false);
    }
  };

  const openAddItemModal = (section: string) => {
    setEditingItem(null);
    setItemSection(section);
    setItemTitle("");
    setItemSubtitle(section === "HERO_BUTTON" ? "https://" : "");
    setItemPrice("");
    setItemDesc(section === "HERO_BUTTON" ? "PRIMARY" : "");
    setItemImage("");
    setItemLocation("");
    setItemDay("");
    setItemDate("");
    setItemModalOpen(true);
  };

  const openEditItemModal = (item: LandingItem) => {
    setEditingItem(item);
    setItemSection(item.section);
    setItemTitle(item.title);
    setItemSubtitle(item.subtitle || "");
    setItemPrice(item.price || "");
    setItemDesc(item.description || "");
    setItemImage(item.imageUrl || "");
    setItemLocation(item.metaLocation || "");
    setItemDay(item.metaDay || "");
    setItemDate(item.metaDate || "");
    setItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (/\.php/i.test(itemTitle) || /\.php/i.test(itemSubtitle) || /\.php/i.test(itemDesc)) {
      alert("Input tidak boleh mengandung file atau script .php!");
      return;
    }
    const method = editingItem ? "PUT" : "POST";
    const res = await fetch("/api/landing", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "item",
        id: editingItem?.id,
        section: itemSection,
        title: itemTitle,
        subtitle: itemSubtitle,
        price: itemPrice,
        description: itemDesc,
        imageUrl: itemImage,
        metaLocation: itemLocation,
        metaDay: itemDay,
        metaDate: itemDate,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Gagal menyimpan item");
      return;
    }
    setItemModalOpen(false);
    loadData();
  };

  const handleDeleteItem = async (id: string, title: string) => {
    if (!confirm(`Hapus "${title}"?`)) return;
    const res = await fetch(`/api/landing?type=item&id=${id}`, { method: "DELETE" });
    if (res.ok) loadData();
  };

  const handleDeleteReview = async (id: string, nama: string) => {
    if (!confirm(`Hapus ulasan dari "${nama}"?`)) return;
    const res = await fetch(`/api/landing?type=review&id=${id}`, { method: "DELETE" });
    if (res.ok) loadData();
  };

  const directOrderWA = (name: string, price: string) => {
    const wa = config?.waAdminMerch || "6282228368042";
    const message = `Halo Admin PPI Store Kab. Probolinggo, saya ingin memesan atribut: *${name}* seharga Rp ${price}. Mohon informasi ketersediaan stok & ukuran. Terima kasih.`;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0c] text-zinc-100 selection:bg-red-600 selection:text-white">
      {/* ===================================================================== */}
      {/* NAVBAR: FIXED TRANSPARENT TO DARK GLASSMORPHISM                       */}
      {/* ===================================================================== */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#0a0a0c]/80 backdrop-blur-md border-b border-white/10 px-5 lg:px-12 py-3.5 transition">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo & Identity */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img
                src="/logo.jpg"
                alt="Logo PPI Kabupaten Probolinggo"
                className="w-10 h-10 rounded-full object-cover border border-amber-400/40 shadow-md group-hover:scale-105 transition"
              />
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-red-600 border-2 border-zinc-950 rounded-full" />
            </div>
            <div>
              <span className="font-extrabold tracking-wide text-xs sm:text-sm text-white block leading-tight">
                PASKIBRAKA KAB. PROBOLINGGO
              </span>
              <span className="text-[11px] text-amber-300/80 font-medium block">
                PPI &amp; Bakesbangpol Kab. Probolinggo
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-6 text-xs font-semibold text-zinc-300">
            <a href="#about" className="hover:text-white transition">Profil</a>
            <a href="#visi-misi" className="hover:text-white transition">Visi &amp; Misi</a>
            <a href="#program" className="hover:text-white transition">Program Kerja</a>
            <a href="#prestasi" className="hover:text-white transition">Prestasi &amp; Ulasan</a>
            <a href="#galeri" className="hover:text-white transition">Galeri</a>
            <a href="#produk" className="hover:text-white transition">Merchandise</a>
            <a
              href="#pra-seleksi"
              className="px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-500/40 text-red-300 hover:bg-red-600 hover:text-white transition"
            >
              Pengumuman Pra-Seleksi
            </a>
            <Link
              href={user ? "/dashboard" : "/login"}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs shadow-md shadow-red-900/30 transition"
            >
              {user ? `Panel (${user.username})` : "Login Petugas"}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-semibold"
          >
            {mobileMenuOpen ? "Tutup" : "Menu"}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-zinc-800 flex flex-col gap-2.5 text-xs font-semibold text-zinc-300 pb-2">
            <a href="#about" onClick={() => setMobileMenuOpen(false)}>Profil Organisasi</a>
            <a href="#visi-misi" onClick={() => setMobileMenuOpen(false)}>Visi &amp; Misi</a>
            <a href="#program" onClick={() => setMobileMenuOpen(false)}>Program Kerja</a>
            <a href="#prestasi" onClick={() => setMobileMenuOpen(false)}>Prestasi &amp; Ulasan</a>
            <a href="#galeri" onClick={() => setMobileMenuOpen(false)}>Galeri Kegiatan</a>
            <a href="#produk" onClick={() => setMobileMenuOpen(false)}>Merchandise</a>
            <a
              href="#pra-seleksi"
              onClick={() => setMobileMenuOpen(false)}
              className="text-red-400 font-bold"
            >
              Pengumuman Kelulusan Pra-Seleksi
            </a>
            <Link
              href={user ? "/dashboard" : "/login"}
              onClick={() => setMobileMenuOpen(false)}
              className="mt-1 py-2 text-center rounded-xl bg-red-600 text-white font-bold"
            >
              {user ? `Buka Panel (${user.username})` : "Login Admin & Panitia"}
            </Link>
          </div>
        )}
      </nav>

      {/* ===================================================================== */}
      {/* 1. HERO SECTION (HEADER UTAMA)                                        */}
      {/* ===================================================================== */}
      <header
        id="hero"
        className="relative w-full min-h-screen min-h-[100dvh] flex flex-col items-center justify-center px-5 pt-24 pb-14 text-center border-b border-zinc-900 overflow-hidden"
      >
        {/* Full Viewport Background Photo: Foto formasi Paskibraka PDU Alun-Alun Kraksaan */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-100"
          style={{ backgroundImage: `url('/background.jpg')` }}
        />
        {/* Balanced Dark Crimson Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-[#1a0205]/65 to-[#0a0a0c]" />

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center justify-center space-y-6">
          {/* Badge Resmi */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-amber-400/30 text-[11px] font-bold uppercase tracking-wider text-amber-300 shadow-xl">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            Bakesbangpol &amp; PPI Kabupaten Probolinggo
          </div>

          {/* Headline Sesuai Request */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight drop-shadow-2xl">
            Paskibraka Kabupaten Probolinggo: <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-red-400 via-amber-300 to-white bg-clip-text text-transparent">
              Duta Pancasila &amp; Generasi Tangguh Pengawal Merah Putih
            </span>
          </h1>

          {/* Sub-headline Sesuai Request */}
          <p className="text-sm sm:text-base lg:text-lg text-zinc-200 leading-relaxed max-w-3xl mx-auto drop-shadow font-normal">
            Portal resmi pusat informasi kegiatan, dokumentasi roadshow sekolah, serta verifikasi
            kelulusan pra-seleksi calon Paskibraka tingkat Kabupaten Probolinggo di bawah naungan
            Bakesbangpol &amp; PPI Kabupaten Probolinggo.
          </p>

          {/* Call-to-Action (CTA): Tombol 1 & Tombol 2 Sesuai Request */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-3.5">
            {/* Tombol 1: Cek Hasil Pra-Seleksi */}
            <a
              href="#pra-seleksi"
              className="px-7 py-3.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white transition shadow-lg shadow-red-700/40 flex items-center gap-2 active:scale-95"
            >
              <span>📋</span>
              <span>Cek Hasil Pra-Seleksi</span>
            </a>

            {/* Tombol 2: Unduh Surat Edaran Resmi (Segera Hadir) */}
            <button
              type="button"
              onClick={() => setShowSuratEdaranModal(true)}
              className="px-6 py-3.5 rounded-xl font-bold text-xs sm:text-sm bg-zinc-900/90 hover:bg-zinc-800 border border-amber-400/30 text-amber-300 hover:text-white backdrop-blur-md transition shadow-lg flex items-center gap-2 active:scale-95"
            >
              <span>📄</span>
              <span>Unduh Surat Edaran Resmi</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Segera Hadir
              </span>
            </button>

            {/* Dynamic Buttons from Admin if any */}
            {heroButtons.map((btn) => {
              const isPrimary = btn.description !== "SECONDARY";
              const isInternal = (btn.subtitle || "").startsWith("/");
              return (
                <div key={btn.id} className="relative group flex items-center gap-1.5">
                  {isInternal ? (
                    <Link
                      href={btn.subtitle || "/roadshow"}
                      className={`px-6 py-3.5 rounded-xl font-bold text-xs sm:text-sm transition shadow-lg ${
                        isPrimary
                          ? "bg-red-600 hover:bg-red-500 text-white"
                          : "bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 backdrop-blur-md"
                      }`}
                    >
                      {btn.title}
                    </Link>
                  ) : (
                    <a
                      href={btn.subtitle || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className={`px-6 py-3.5 rounded-xl font-bold text-xs sm:text-sm transition shadow-lg ${
                        isPrimary
                          ? "bg-red-600 hover:bg-red-500 text-white"
                          : "bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 backdrop-blur-md"
                      }`}
                    >
                      {btn.title}
                    </a>
                  )}

                  {canManageLanding && (
                    <div className="flex items-center gap-1 bg-zinc-950/90 border border-zinc-700 rounded-lg px-2 py-1">
                      <button
                        type="button"
                        onClick={() => openEditItemModal(btn)}
                        className="text-[11px] text-sky-400 hover:underline font-semibold"
                        title="Edit Tombol"
                      >
                        Edit
                      </button>
                      <span className="text-zinc-600">|</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(btn.id, btn.title)}
                        className="text-[11px] text-red-400 hover:underline font-semibold"
                        title="Hapus Tombol"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {canManageLanding && (
              <button
                type="button"
                onClick={() => openAddItemModal("HERO_BUTTON")}
                className="px-4 py-3 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-semibold text-xs transition border border-emerald-400/30"
              >
                + Tambah Tombol Hero
              </button>
            )}
          </div>
        </div>

        {/* Scroll Indicator */}
        <a
          href="#about"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 text-xs text-zinc-400 hover:text-white transition"
        >
          <span className="text-[10px] uppercase tracking-widest font-semibold">Jelajahi Profil</span>
          <span className="text-base animate-bounce">↓</span>
        </a>
      </header>

      {/* ===================================================================== */}
      {/* 2. SEKILAS PROFIL / TENTANG KAMI                                     */}
      {/* ===================================================================== */}
      <section id="about" className="py-24 px-5 bg-[#0a0a0c] border-b border-zinc-900">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <span className="px-3.5 py-1 rounded-full bg-red-600/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider inline-block">
              Sekilas Profil
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Kawah Candradimuka Pemuda Kabupaten Probolinggo
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-red-600 to-amber-400 mx-auto rounded-full mt-3" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Kolom Kiri: Visual Emblem & Piagam PPI */}
            <div className="lg:col-span-5 relative">
              <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-7 relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center gap-4 mb-6">
                  <img
                    src="/logo.jpg"
                    alt="Logo PPI"
                    className="w-16 h-16 rounded-2xl object-cover border-2 border-amber-400/50 shadow-lg"
                  />
                  <div>
                    <h3 className="text-lg font-bold text-white leading-snug">
                      Purna Paskibraka Indonesia
                    </h3>
                    <p className="text-xs text-amber-300 font-medium">
                      Pengurus Kabupaten Probolinggo
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-zinc-300 border-t border-zinc-800 pt-4">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>Landasan Kerja: <strong>Panca Purna Paskibraka</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>Sinergi Pembinaan: <strong>Bakesbangpol Kab. Probolinggo</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400">✓</span>
                    <span>Jangkauan Sekolah: <strong>SMA / SMK / MA Se-Kabupaten</strong></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Kolom Kanan: Narasi Resmi */}
            <div className="lg:col-span-7 space-y-5 text-sm sm:text-base text-zinc-300 leading-relaxed">
              <p className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6">
                <strong>Paskibraka Kabupaten Probolinggo</strong> bersama{" "}
                <strong>Purna Paskibraka Indonesia (PPI) Kabupaten Probolinggo</strong> berperan aktif
                dalam membina putra-putri terbaik daerah dari berbagai pelosok SMA/SMK/MA
                se-Kabupaten Probolinggo.
              </p>
              <p className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6">
                Bukan sekadar baris-berbaris, pembinaan ini berlandaskan{" "}
                <em className="text-amber-300 font-semibold">Panca Purna Paskibraka</em> untuk
                menanamkan kedisiplinan militer non-kombatan, wawasan kebangsaan, kepemimpinan publik,
                serta ideologi Pancasila demi mencetak calon pemimpin masa depan Probolinggo yang
                berintegritas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 3. VISI & MISI                                                        */}
      {/* ===================================================================== */}
      <section id="visi-misi" className="py-24 px-5 bg-zinc-950 border-b border-zinc-900">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="px-3.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider inline-block">
              Komitmen Pengabdian
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Visi &amp; Misi Organisasi
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-red-600 to-amber-400 mx-auto rounded-full mt-3" />
          </div>

          {/* Visi Banner Card */}
          <div className="bg-gradient-to-r from-red-950/50 via-zinc-900 to-red-950/50 border border-red-800/40 rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden shadow-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-red-600 text-white text-[11px] font-extrabold uppercase tracking-widest mb-4">
              Visi Utama
            </div>
            <p className="text-lg sm:text-2xl font-bold text-white max-w-4xl mx-auto leading-relaxed italic">
              &ldquo;Terwujudnya kader muda Kabupaten Probolinggo yang berkarakter kuat, berwawasan
              nusantara, berjiwa Pancasila, dan berdisiplin tinggi demi kemajuan bangsa.&rdquo;
            </p>
          </div>

          {/* Misi 4 Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                num: "01",
                title: "Pembinaan Karakter & Fisik",
                desc: "Melaksanakan pembinaan karakter, ideologi Pancasila, dan kesamaptaan fisik bagi pelajar Probolinggo.",
                icon: "🛡️",
              },
              {
                num: "02",
                title: "Pengawalan Penugasan Tingkat Lanjut",
                desc: "Mempersiapkan duta terbaik daerah untuk penugasan pengibaran bendera tingkat Kabupaten, Provinsi Jawa Timur, hingga Nasional.",
                icon: "🇮🇩",
              },
              {
                num: "03",
                title: "Persaudaraan & Solidaritas",
                desc: "Mempererat jejaring persaudaraan dan solidaritas antar-pemuda di seluruh penjuru Kabupaten Probolinggo.",
                icon: "🤝",
              },
              {
                num: "04",
                title: "Pengabdian Sosial Purna",
                desc: "Mendorong peran aktif purna dalam pengabdian sosial dan pembangunan kepemudaan daerah.",
                icon: "🌟",
              },
            ].map((m) => (
              <div
                key={m.num}
                className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 sm:p-7 flex gap-5 hover:border-zinc-700 transition"
              >
                <div className="text-3xl shrink-0 p-3 bg-zinc-950 rounded-2xl border border-zinc-800 h-fit">
                  {m.icon}
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-mono font-bold text-amber-400">MISI #{m.num}</div>
                  <h3 className="text-base font-bold text-white">{m.title}</h3>
                  <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 4. PROGRAM KERJA & AGENDA LAPANGAN                                   */}
      {/* ===================================================================== */}
      <section id="program" className="py-24 px-5 bg-[#0a0a0c] border-b border-zinc-900">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="px-3.5 py-1 rounded-full bg-red-600/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider inline-block">
              Aksi Nyata Pemuda
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Program Kerja &amp; Agenda Lapangan
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400">
              Rangkaian kegiatan berkala PPI Kabupaten Probolinggo dalam penjaringan talenta dan pengabdian masyarakat.
            </p>
            <div className="w-20 h-1 bg-gradient-to-r from-red-600 to-amber-400 mx-auto rounded-full mt-3" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: "Roadshow & Sosialisasi Sekolah",
                desc: "Kunjungan berkala tim PPI Kabupaten Probolinggo ke SMA/SMK/MA di berbagai kecamatan (Kraksaan, Dringu, Paiton, Tongas, Sukapura, dll.) untuk sosialisasi tahapan seleksi dan motivasi pelajar.",
                tag: "Tahunan",
                color: "border-red-500/40 bg-red-950/20",
              },
              {
                title: "Latihan Gabungan & Pra-Diklat",
                desc: "Pembinaan dasar kesamaptaan, postur tubuh, serta kesiapan mental bagi calon peserta sebelum memasuki tahapan seleksi resmi.",
                tag: "Intensif",
                color: "border-amber-500/40 bg-amber-950/20",
              },
              {
                title: "Penugasan Upacara Resmi",
                desc: "Pelaksanaan tugas kenegaraan upacara detik-detik Proklamasi 17 Agustus dan Hari Pahlawan di tingkat Pemkab Probolinggo.",
                tag: "Kenegaraan",
                color: "border-emerald-500/40 bg-emerald-950/20",
              },
              {
                title: "Bakti Sosial & Aksi Komunitas PPI",
                desc: "Kegiatan kemasyarakatan, aksi lingkungan hidup, dan program pengabdian pemuda di wilayah Probolinggo.",
                tag: "Sosial",
                color: "border-sky-500/40 bg-sky-950/20",
              },
            ].map((prog, idx) => (
              <div
                key={idx}
                className="bg-zinc-900 border border-zinc-800 rounded-3xl p-7 space-y-4 hover:border-zinc-700 transition"
              >
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-extrabold uppercase px-3 py-1 rounded-full border ${prog.color}`}>
                    {prog.tag}
                  </span>
                  <span className="text-zinc-600 font-mono text-xs">PPI-PROB #{idx + 1}</span>
                </div>
                <h3 className="text-lg font-bold text-white">{prog.title}</h3>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">{prog.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 5. REKAM JEJAK, PRESTASI & ULASAN                                    */}
      {/* ===================================================================== */}
      <section id="prestasi" className="py-24 px-5 bg-zinc-950 border-b border-zinc-900">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="px-3.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider inline-block">
              Bukti &amp; Dedikasi
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Rekam Jejak, Prestasi &amp; Ulasan
            </h2>
            <div className="w-20 h-1 bg-gradient-to-r from-red-600 to-amber-400 mx-auto rounded-full mt-3" />
          </div>

          {/* Statistik & Capaian (4 Metrics) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Angkatan Alumni", value: "30+", sub: "Pengabdian Berkelanjutan" },
              { label: "Alumni Kedinasan", value: "Akmil/Akpol", sub: "IPDN & PTN Unggulan" },
              { label: "Jawa Timur", value: "Konsisten", sub: "Duta Provinsi Terpilih" },
              { label: "Jangkauan Daerah", value: "24", sub: "Kecamatan Se-Kabupaten" },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 text-center space-y-1.5"
              >
                <div className="text-2xl sm:text-3xl font-black text-amber-300 tracking-tight">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm font-bold text-white">{stat.label}</div>
                <div className="text-[11px] text-zinc-500">{stat.sub}</div>
              </div>
            ))}
          </div>

          {/* Testimoni Unggulan Sesuai Request */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-7 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="text-amber-400 text-base">★★★★★</div>
                <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed italic">
                  &ldquo;Mengikuti Paskibraka Probolinggo bukan cuma soal baris-berbaris, tapi tempat di
                  mana mental saya ditempa dari nol hingga paham arti loyalitas dan kepemimpinan.&rdquo;
                </p>
              </div>
              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-white">Purna Paskibraka Kab. Probolinggo</span>
                <span className="text-[10px] text-zinc-500">Alumni Purna</span>
              </div>
            </div>

            <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-7 flex flex-col justify-between gap-4">
              <div className="space-y-3">
                <div className="text-amber-400 text-base">★★★★★</div>
                <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed italic">
                  &ldquo;Kehadiran tim Roadshow PPI di sekolah membuka wawasan para siswa tentang standar
                  fisik, kedisiplinan, dan persiapan masuk perguruan tinggi/kedinasan.&rdquo;
                </p>
              </div>
              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-white">Guru Pembina OSIS / Kesiswaan</span>
                <span className="text-[10px] text-zinc-500">SMA Mitra Roadshow</span>
              </div>
            </div>
          </div>

          {/* Live Reviews Bar & Submission */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-left">
              <div className="text-4xl font-extrabold text-white">{avgRating}</div>
              <div>
                <div className="text-amber-400 text-sm">★★★★★</div>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Dari <strong>{reviews.length}</strong> ulasan masyarakat &amp; anggota
                </div>
              </div>
            </div>

            <Link
              href="/penilaian"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider text-center transition shadow-md shadow-red-700/30"
            >
              + Beri Penilaian / Ulasan
            </Link>
          </div>

          {/* Dynamic Reviews from DB */}
          {reviews.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-1">
              {reviews.map((item) => (
                <div
                  key={item.id}
                  className="bg-zinc-900/90 p-5 rounded-2xl border border-zinc-800/90 flex flex-col justify-between gap-3 text-left"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <strong className="text-white text-xs font-semibold">{item.nama}</strong>
                      <span className="text-amber-400 text-xs font-bold">★ {item.rating}.0</span>
                    </div>
                    <p className="text-zinc-300 text-xs leading-relaxed">&ldquo;{item.pesan}&rdquo;</p>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-zinc-800">
                    <span>{item.kategori === "ppi" ? `PPI Akt ${item.angkatan}` : "Umum"}</span>
                    {canManageReviews && (
                      <button
                        onClick={() => handleDeleteReview(item.id, item.nama)}
                        className="text-red-400 hover:underline"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 6. GALERI DOKUMENTASI KEGIATAN                                       */}
      {/* ===================================================================== */}
      <section id="galeri" className="py-24 px-5 bg-[#0a0a0c] border-b border-zinc-900">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="px-3.5 py-1 rounded-full bg-red-600/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider inline-block mb-3">
                Dokumentasi Lapangan
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Galeri Dokumentasi Kegiatan
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl">
                Dokumentasi Roadshow Sekolah, Penugasan Upacara Resmi, serta Tradisi &amp; Kebersamaan PPI Kabupaten Probolinggo.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollRoadshow("left")}
                className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center font-bold transition"
                title="Geser Kiri"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => scrollRoadshow("right")}
                className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center font-bold transition"
                title="Geser Kanan"
              >
                →
              </button>
              {canManageLanding && (
                <button
                  onClick={() => openAddItemModal("ROADSHOW_GALLERY")}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition"
                >
                  + Tambah Foto
                </button>
              )}
            </div>
          </div>

          {/* 3 Pillar Curated Showcase Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group">
              <div className="h-48 overflow-hidden bg-zinc-950 relative">
                <img
                  src="/sman1paiton.jpeg"
                  alt="Dokumentasi Roadshow"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <span className="absolute bottom-3 left-4 text-xs font-bold text-amber-300">
                  Dokumentasi Roadshow
                </span>
              </div>
              <div className="p-4 text-xs text-zinc-400">
                Pemaparan materi seleksi &amp; pengukuran fisik langsung di depan siswa-siswi aula sekolah se-kabupaten.
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group">
              <div className="h-48 overflow-hidden bg-zinc-950 relative">
                <img
                  src="/background.jpg"
                  alt="Dokumentasi Penugasan"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <span className="absolute bottom-3 left-4 text-xs font-bold text-amber-300">
                  Dokumentasi Penugasan
                </span>
              </div>
              <div className="p-4 text-xs text-zinc-400">
                Momen sakral pengibaran bendera merah putih di hadapan Bupati dan jajaran Forkopimda Kabupaten Probolinggo.
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden group">
              <div className="h-48 overflow-hidden bg-zinc-950 relative">
                <img
                  src="/bbshati.jpeg"
                  alt="Tradisi & Kebersamaan"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                <span className="absolute bottom-3 left-4 text-xs font-bold text-amber-300">
                  Tradisi &amp; Kebersamaan
                </span>
              </div>
              <div className="p-4 text-xs text-zinc-400">
                Momen pengukuhan, renungan suci malam pengibaran, serta bakti sosial temu kangen lintas angkatan.
              </div>
            </div>
          </div>

          {/* Horizontal Carousel Container for Additional Photos */}
          {roadshowItems.length > 0 && (
            <div
              ref={roadshowScrollRef}
              className="flex gap-5 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-4 pt-1"
              style={{ scrollbarWidth: "thin" }}
            >
              {roadshowItems.map((item) => (
                <div
                  key={item.id}
                  className="snap-start shrink-0 w-[290px] sm:w-[340px] group rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 flex flex-col"
                >
                  <div className="relative h-56 overflow-hidden bg-zinc-950">
                    <img
                      src={item.imageUrl || "/sman1paiton.jpeg"}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-base font-bold text-white">{item.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-300 mt-1">
                        {item.metaLocation && <span>{item.metaLocation}</span>}
                        {item.metaDay && <span>• {item.metaDay}</span>}
                        {item.metaDate && <span>• {item.metaDate}</span>}
                      </div>
                    </div>
                  </div>

                  {canManageLanding && (
                    <div className="p-3 bg-zinc-900 border-t border-zinc-800 flex justify-end gap-2">
                      <button
                        onClick={() => openEditItemModal(item)}
                        className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id, item.title)}
                        className="px-3 py-1 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-xs text-red-400 font-medium"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 7. OFFICIAL MERCHANDISE PPI KABUPATEN PROBOLINGGO                     */}
      {/* ===================================================================== */}
      <section id="produk" className="py-24 px-5 bg-zinc-950 border-b border-zinc-900">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <span className="px-3.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-wider inline-block mb-3">
                PPI Store Resmi
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Official Merchandise PPI Kabupaten Probolinggo
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                Dapatkan atribut resmi organisasi untuk mendukung identitas, kekompakan, dan pembiayaan mandiri kegiatan operasional kepemudaan PPI Kabupaten Probolinggo.
              </p>
            </div>

            {canManageMerch && (
              <button
                onClick={() => openAddItemModal("MERCHANDISE")}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition"
              >
                + Tambah Atribut / Produk
              </button>
            )}
          </div>

          {/* Curated Official Merchandise Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 1. Kaos Polo Resmi PPI */}
            <div className="rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 flex flex-col justify-between group">
              <div
                onClick={() =>
                  setSelectedProduct({
                    id: "polo",
                    title: "Kaos Polo Resmi PPI Probolinggo",
                    description: "Bahan lacoste cotton premium bordir lambang garuda & PPI Kabupaten Probolinggo.",
                    price: "125.000",
                    imageUrl: "/polo.png",
                    section: "MERCHANDISE",
                    subtitle: "",
                    metaLocation: "",
                    metaDay: "",
                    metaDate: "",
                  })
                }
                className="cursor-pointer relative h-64 bg-zinc-950 p-6 flex items-center justify-center overflow-hidden"
              >
                <span className="absolute top-4 left-4 px-3 py-1 rounded-lg bg-red-600 text-white font-bold text-xs">
                  Rp 125.000
                </span>
                <img
                  src="/polo.png"
                  alt="Kaos Polo Resmi PPI"
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition"
                />
              </div>
              <div className="p-5 space-y-3">
                <h3 className="text-base font-bold text-white">Kaos Polo Resmi PPI Probolinggo</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Bahan lacoste cotton premium dengan bordir lencana resmi. Nyaman untuk apel dan kegiatan lapangan.
                </p>
                <button
                  onClick={() => directOrderWA("Kaos Polo Resmi PPI Probolinggo", "125.000")}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                >
                  Pesan via WhatsApp PPI Store
                </button>
              </div>
            </div>

            {/* 2. PSH / Rompi Lapangan */}
            <div className="rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 flex flex-col justify-between group">
              <div
                onClick={() =>
                  setSelectedProduct({
                    id: "psh",
                    title: "Jaket / Rompi Lapangan PPI",
                    description: "Pakaian Dinas Harian & Rompi lapangan resmi pengurus PPI Kab. Probolinggo.",
                    price: "220.000",
                    imageUrl: "/psh.png",
                    section: "MERCHANDISE",
                    subtitle: "",
                    metaLocation: "",
                    metaDay: "",
                    metaDate: "",
                  })
                }
                className="cursor-pointer relative h-64 bg-zinc-950 p-6 flex items-center justify-center overflow-hidden"
              >
                <span className="absolute top-4 left-4 px-3 py-1 rounded-lg bg-red-600 text-white font-bold text-xs">
                  Rp 220.000
                </span>
                <img
                  src="/psh.png"
                  alt="Jaket Rompi PPI"
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition"
                />
              </div>
              <div className="p-5 space-y-3">
                <h3 className="text-base font-bold text-white">Jaket / Rompi Lapangan PPI</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Jaket &amp; rompi lapangan resmi anti-angin untuk panitia seleksi roadshow sekolah.
                </p>
                <button
                  onClick={() => directOrderWA("Jaket / Rompi Lapangan PPI", "220.000")}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                >
                  Pesan via WhatsApp PPI Store
                </button>
              </div>
            </div>

            {/* 3. Kaos Latihan Roadshow */}
            <div className="rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 flex flex-col justify-between group">
              <div
                onClick={() =>
                  setSelectedProduct({
                    id: "kaos",
                    title: "Kaos Latihan Roadshow PPI",
                    description: "Kaos cotton combed 24s sablon plastisol tema Roadshow 2026/2027.",
                    price: "95.000",
                    imageUrl: "/kaos.png",
                    section: "MERCHANDISE",
                    subtitle: "",
                    metaLocation: "",
                    metaDay: "",
                    metaDate: "",
                  })
                }
                className="cursor-pointer relative h-64 bg-zinc-950 p-6 flex items-center justify-center overflow-hidden"
              >
                <span className="absolute top-4 left-4 px-3 py-1 rounded-lg bg-red-600 text-white font-bold text-xs">
                  Rp 95.000
                </span>
                <img
                  src="/kaos.png"
                  alt="Kaos Latihan Roadshow"
                  className="max-h-full max-w-full object-contain group-hover:scale-105 transition"
                />
              </div>
              <div className="p-5 space-y-3">
                <h3 className="text-base font-bold text-white">Kaos Latihan Roadshow PPI</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Kaos latihan combed 24s tema Roadshow Seleksi Paskibraka Kabupaten Probolinggo.
                </p>
                <button
                  onClick={() => directOrderWA("Kaos Latihan Roadshow PPI", "95.000")}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                >
                  Pesan via WhatsApp PPI Store
                </button>
              </div>
            </div>

            {/* Dynamic Items from DB if any */}
            {merchItems.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 flex flex-col justify-between"
              >
                <div
                  onClick={() => setSelectedProduct(item)}
                  className="cursor-pointer relative h-64 bg-zinc-950 p-6 flex items-center justify-center"
                >
                  <span className="absolute top-4 left-4 px-3 py-1 rounded-lg bg-red-600 text-white font-bold text-xs">
                    Rp {item.price}
                  </span>
                  <img
                    src={item.imageUrl || "/polo.png"}
                    alt={item.title}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="p-5 space-y-3">
                  <h3 className="text-base font-bold text-white">{item.title}</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>
                  <button
                    onClick={() => directOrderWA(item.title, item.price)}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                  >
                    Pesan via WhatsApp
                  </button>
                  {canManageMerch && (
                    <div className="flex gap-2 pt-2 border-t border-zinc-800">
                      <button
                        onClick={() => openEditItemModal(item)}
                        className="flex-1 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id, item.title)}
                        className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-xs text-red-400"
                      >
                        Hapus
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 8. PENGUMUMAN & ALUR PRA-SELEKSI KABUPATEN                           */}
      {/* ===================================================================== */}
      <section id="pra-seleksi" className="py-24 px-5 bg-[#0a0a0c] border-b border-zinc-900">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Header & Official Notice */}
          <div className="text-center space-y-4 max-w-3xl mx-auto">
            <span className="px-4 py-1.5 rounded-full bg-red-600/20 border border-red-500/40 text-red-300 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              Pengumuman Resmi
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
              Pengumuman &amp; Alur Pra-Seleksi Kabupaten
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-red-600 to-amber-400 mx-auto rounded-full" />

            {/* Kotak Pemberitahuan Sesuai Request */}
            <div className="p-4 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-200 text-xs sm:text-sm leading-relaxed text-left sm:text-center mt-4">
              <strong>Pemberitahuan:</strong> Seluruh data hasil pra-seleksi ditentukan langsung oleh{" "}
              <strong>Tim Penilai Panitia PPI Kabupaten Probolinggo</strong> berdasarkan hasil roadshow
              dan verifikasi lapangan.
            </div>
          </div>

          {/* Alur Seleksi Tahap Kabupaten Menuju Pusat (4 Langkah) */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white text-center sm:text-left flex items-center gap-2">
              <span>Alur Seleksi Tahap Kabupaten Menuju Pusat:</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  step: "1",
                  title: "Roadshow & Penjaringan",
                  desc: "Tim panitia turun langsung menyeleksi fisik dan postur di sekolah-sekolah se-kabupaten.",
                },
                {
                  step: "2",
                  title: "Sidang Kelulusan",
                  desc: "Panitia menetapkan nama-nama siswa yang memenuhi kriteria awal kabupaten.",
                },
                {
                  step: "3",
                  title: "Pengumuman Hasil",
                  desc: "Peserta yang lolos dapat mengecek nama dan asal sekolah langsung pada daftar di bawah.",
                },
                {
                  step: "4",
                  title: "Surat Edaran & BPIP",
                  desc: "Peserta lolos mengunduh surat edaran resmi dinas untuk melanjutkan pendaftaran akun seleksi pusat BPIP.",
                },
              ].map((s) => (
                <div
                  key={s.step}
                  className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-2 relative"
                >
                  <div className="w-8 h-8 rounded-xl bg-red-600 text-white font-extrabold text-sm flex items-center justify-center shadow-md">
                    {s.step}
                  </div>
                  <h4 className="text-sm font-bold text-white">{s.title}</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action Toolbar: Search + Buttons */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              {/* Search Bar Input */}
              <div className="flex-1 relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">
                  🔍
                </span>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchPraSeleksi}
                  onChange={(e) => setSearchPraSeleksi(e.target.value)}
                  placeholder="Ketik Nama Peserta atau Asal Sekolah..."
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition"
                />
              </div>

              {/* Kecamatan Dropdown Filter */}
              <div className="shrink-0 w-full lg:w-48">
                <select
                  value={filterKecamatan}
                  onChange={(e) => setFilterKecamatan(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs sm:text-sm text-zinc-200 focus:outline-none focus:border-red-500"
                >
                  <option value="ALL">Semua Kecamatan</option>
                  {uniqueLocations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Buttons Sesuai Request */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={focusSearchInput}
                  className="flex-1 sm:flex-none px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition"
                >
                  Cari Nama Peserta Lolos
                </button>

                <button
                  type="button"
                  onClick={() => setShowSuratEdaranModal(true)}
                  className="flex-1 sm:flex-none px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20"
                >
                  <span>Unduh Surat Edaran</span>
                  <span className="text-[10px] bg-black/20 px-1.5 py-0.5 rounded">Segera Hadir</span>
                </button>
              </div>
            </div>

            {/* Tabel Data Kelulusan Pra-Seleksi */}
            <div className="overflow-x-auto rounded-2xl border border-zinc-800">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-zinc-950 text-zinc-400 border-b border-zinc-800 text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Nama Peserta</th>
                    <th className="py-3 px-4">Asal Sekolah / Kecamatan</th>
                    <th className="py-3 px-4">Nomor Registrasi</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 bg-zinc-900/60">
                  {filteredCandidates.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-zinc-500 text-xs">
                        Tidak ditemukan peserta lolos dengan kata kunci &ldquo;{searchPraSeleksi}&rdquo;.
                      </td>
                    </tr>
                  ) : (
                    filteredCandidates.map((cand, idx) => (
                      <tr key={cand.id} className="hover:bg-zinc-800/40 transition">
                        <td className="py-3.5 px-4 text-center font-mono text-zinc-500">{idx + 1}</td>
                        <td className="py-3.5 px-4 font-bold text-white">
                          <div className="flex items-center gap-2">
                            <span>{cand.nama}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                              {cand.jenisKelamin}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-zinc-300">
                          <div>{cand.namaSekolah}</div>
                          <div className="text-[11px] text-zinc-500">{cand.lokasi}</div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-300">
                          {cand.kodePeserta}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-extrabold text-[11px] tracking-wide">
                            <span>✓</span>
                            <span>LOLOS PRA-SELEKSI</span>
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Table Information */}
            <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 gap-3 pt-2">
              <span>
                Menampilkan <strong>{filteredCandidates.length}</strong> peserta lolos pra-seleksi tingkat kabupaten.
              </span>
              <a
                href="https://paskibraka.bpip.go.id"
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Akses Portal Pendaftaran BPIP Pusat</span>
                <span>↗</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 9. FOOTER (KAKI HALAMAN)                                              */}
      {/* ===================================================================== */}
      <footer className="mt-auto border-t border-zinc-900 bg-[#070709] py-14 px-5 text-zinc-400">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Kolom 1: Identitas Lembaga */}
            <div className="md:col-span-5 space-y-4">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.jpg"
                  alt="Logo PPI"
                  className="w-12 h-12 rounded-full object-cover border border-amber-400/50"
                />
                <div>
                  <h4 className="text-white font-bold text-sm leading-tight">
                    Purna Paskibraka Indonesia (PPI)
                  </h4>
                  <p className="text-xs text-amber-300">Kabupaten Probolinggo</p>
                </div>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Pengurus Kabupaten Purna Paskibraka Indonesia (PPI) Kabupaten Probolinggo bekerja sama
                dengan Badan Kesatuan Bangsa dan Politik (Bakesbangpol) Kabupaten Probolinggo.
              </p>
            </div>

            {/* Kolom 2: Sekretariat & Kontak Helpdesk */}
            <div className="md:col-span-4 space-y-3 text-xs">
              <h4 className="text-white font-bold text-sm">Sekretariat &amp; Helpdesk</h4>
              <p className="text-zinc-400 leading-relaxed">
                📍 <strong>Alamat:</strong> Jl. Raya Dringu / Kompleks Perkantoran Pemkab Probolinggo, Jawa Timur.
              </p>
              <p className="text-zinc-400">
                📞 <strong>WhatsApp Center:</strong>{" "}
                <a
                  href="https://wa.me/6282228368042"
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-400 hover:underline"
                >
                  +62 822-2836-8042 (Panitia PPI)
                </a>
              </p>
              <p className="text-zinc-400">
                ✉️ <strong>Email:</strong>{" "}
                <a
                  href="mailto:sekretariat@ppiprobolinggokab.org"
                  className="text-sky-400 hover:underline"
                >
                  sekretariat@ppiprobolinggokab.org
                </a>
              </p>
            </div>

            {/* Kolom 3: Media Sosial Resmi */}
            <div className="md:col-span-3 space-y-3 text-xs">
              <h4 className="text-white font-bold text-sm">Media Sosial Resmi</h4>
              <div className="space-y-2">
                <a
                  href="https://instagram.com/ppi_kabprobolinggo"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 hover:text-white transition"
                >
                  <span className="text-pink-400">📸</span>
                  <span>@ppi_kabprobolinggo</span>
                </a>
                <a
                  href="https://tiktok.com/@ppikabprobolinggo"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 hover:text-white transition"
                >
                  <span className="text-zinc-300">🎵</span>
                  <span>@ppikabprobolinggo</span>
                </a>
                <a
                  href="https://youtube.com/@ppikabupatenprobolinggo"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 hover:text-white transition"
                >
                  <span className="text-red-500">▶️</span>
                  <span>PPI Kabupaten Probolinggo Official</span>
                </a>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
            <div>
              &copy; 2026 Purna Paskibraka Indonesia Kabupaten Probolinggo. Seluruh Hak Cipta Dilindungi.
            </div>
            <div className="flex items-center gap-6">
              <Link href="/roadshow" className="hover:text-zinc-300 transition">
                Rekap Roadshow
              </Link>
              <Link href="/penilaian" className="hover:text-zinc-300 transition">
                Form Penilaian
              </Link>
              <Link href="/biodata" className="hover:text-zinc-300 transition">
                Developer
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* ===================================================================== */}
      {/* MODAL: UNDUH SURAT EDARAN RESMI (SEGERA HADIR / STATUS PENERBITAN)    */}
      {/* ===================================================================== */}
      {showSuratEdaranModal && (
        <div
          onClick={() => setShowSuratEdaranModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-amber-300 flex items-center justify-center text-2xl mx-auto shadow-inner">
              📄
            </div>

            <div className="text-center space-y-2">
              <div className="inline-block px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
                Status: Segera Hadir
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white">
                Surat Edaran Resmi Pra-Seleksi
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Surat Edaran resmi kelulusan pra-seleksi saat ini sedang dalam proses finalisasi penandatanganan
                dan penomoran surat resmi oleh Bakesbangpol Kabupaten Probolinggo.
              </p>
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-2.5 text-xs">
              <div className="font-semibold text-white flex items-center gap-2">
                <span>📌</span>
                <span>Berkas Pendukung yang Sudah Tersedia:</span>
              </div>
              <div className="space-y-1.5 pl-6">
                <a
                  href="/PENGUMUMAN PENDAFTARAN PASKIBRAKA TH 2026 KAB PROBOLINGGO.pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 hover:underline block truncate"
                >
                  • Pengumuman Pendaftaran Paskibraka 2026 (PDF) ↗
                </a>
                <a
                  href="/Surat Sosialisasi Cabang Dinas dan Kemenag.pdf"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 hover:underline block truncate"
                >
                  • Surat Sosialisasi Cabang Dinas &amp; Kemenag (PDF) ↗
                </a>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSuratEdaranModal(false)}
                className="w-full py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition"
              >
                Tutup Pemberitahuan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: PRODUCT DETAIL MERCHANDISE                                     */}
      {/* ===================================================================== */}
      {selectedProduct && (
        <div
          onClick={() => setSelectedProduct(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <img
              src={selectedProduct.imageUrl}
              alt={selectedProduct.title}
              className="w-full h-56 object-contain bg-zinc-950 rounded-xl p-4"
            />
            <div>
              <h3 className="text-xl font-bold text-white">{selectedProduct.title}</h3>
              <p className="text-amber-400 font-bold text-base mt-1">Rp {selectedProduct.price}</p>
              <p className="text-xs text-zinc-400 mt-2">{selectedProduct.description}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedProduct(null)}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold"
              >
                Tutup
              </button>
              <button
                onClick={() => directOrderWA(selectedProduct.title, selectedProduct.price)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
              >
                Pesan via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* ADMIN CRUD MODAL (HERO_BUTTON, ROADSHOW_GALLERY, MERCHANDISE)         */}
      {/* ===================================================================== */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-lg font-bold text-white">
              {itemSection === "HERO_BUTTON"
                ? editingItem
                  ? "Edit Tombol Utama Hero"
                  : "Tambah Tombol Utama Hero"
                : editingItem
                ? "Edit Item & Gambar"
                : "Tambah Item Baru"}
            </h3>

            <form onSubmit={handleSaveItem} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  {itemSection === "HERO_BUTTON" ? "Teks Tombol" : "Judul / Nama"}
                </label>
                <input
                  type="text"
                  required
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder={itemSection === "HERO_BUTTON" ? "Contoh: Visit Profile BPIP" : ""}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                />
              </div>

              {itemSection === "HERO_BUTTON" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Link / URL Tujuan
                    </label>
                    <input
                      type="text"
                      required
                      value={itemSubtitle}
                      onChange={(e) => setItemSubtitle(e.target.value)}
                      placeholder="Contoh: https://paskibraka.bpip.go.id atau #pra-seleksi"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Warna / Gaya Tombol
                    </label>
                    <select
                      value={itemDesc || "PRIMARY"}
                      onChange={(e) => setItemDesc(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                    >
                      <option value="PRIMARY">Merah Utama (Primary)</option>
                      <option value="SECONDARY">Gelap / Outline (Secondary)</option>
                    </select>
                  </div>
                </>
              )}

              {itemSection === "MERCHANDISE" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Harga (Contoh: 100.000)
                    </label>
                    <input
                      type="text"
                      required
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Deskripsi</label>
                    <textarea
                      rows={2}
                      value={itemDesc}
                      onChange={(e) => setItemDesc(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                    />
                  </div>
                </>
              )}

              {itemSection !== "HERO_BUTTON" && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Upload Gambar dari Perangkat (File .php Diblokir)
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleFileUpload}
                    className="w-full text-xs text-zinc-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-500"
                  />
                  {uploadingImg && (
                    <span className="text-xs text-amber-400 block mt-1">Mengunggah gambar...</span>
                  )}
                  {itemImage && (
                    <div className="mt-2 flex items-center gap-3">
                      <img
                        src={itemImage}
                        alt="Preview"
                        className="w-16 h-16 object-cover rounded-lg border border-zinc-700"
                      />
                      <button
                        type="button"
                        onClick={() => setItemImage("")}
                        className="text-xs text-red-400 hover:underline"
                      >
                        Hapus Gambar Ini
                      </button>
                    </div>
                  )}
                </div>
              )}

              {itemSection === "ROADSHOW_GALLERY" && (
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Kecamatan"
                    value={itemLocation}
                    onChange={(e) => setItemLocation(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Hari"
                    value={itemDay}
                    onChange={(e) => setItemDay(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Tanggal"
                    value={itemDate}
                    onChange={(e) => setItemDate(e.target.value)}
                    className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={uploadingImg}
                  className="px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

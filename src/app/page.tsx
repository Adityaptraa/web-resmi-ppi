"use client";

import React, { useEffect, useRef, useState } from "react";
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

export default function LandingPage() {
  const [config, setConfig] = useState<LandingConfig | null>(null);
  const [items, setItems] = useState<LandingItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [visitCount, setVisitCount] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Horizontal scroll ref for PPI Roadshow Gallery
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
      const [landingRes, authRes] = await Promise.all([
        fetch("/api/landing", { cache: "no-store" }),
        fetch("/api/auth", { cache: "no-store" }),
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
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    fetch(`${UMUM_RTDB_URL}/visitor_stats/total_calls.json`)
      .then((r) => r.json())
      .then((val) => {
        const nextVal = (Number(val) || 1420) + 1;
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

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0) / reviews.length).toFixed(1)
      : "0.0";

  const scrollRoadshow = (direction: "left" | "right") => {
    if (!roadshowScrollRef.current) return;
    const scrollAmount = 360;
    roadshowScrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
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
    const message = `Hai kak, saya mau pesen: *${name}* seharga Rp ${price}. Apakah stoknya masih tersedia?`;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0c] text-zinc-100">
      {/* FIXED TRANSPARENT-TO-DARK NAVBAR SO HERO IMAGE OPENS 100% FULL SCREEN */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#0a0a0c]/75 backdrop-blur-md border-b border-white/10 px-5 lg:px-12 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo.jpg"
              alt="Logo PPI"
              className="w-10 h-10 rounded-full object-cover border border-zinc-700"
            />
            <div>
              <span className="font-bold tracking-wide text-sm sm:text-base text-white block leading-tight">
                PPI KAB. PROBOLINGGO
              </span>
              <span className="text-xs text-zinc-400">
                {visitCount > 0 ? `${visitCount.toLocaleString("id-ID")} kunjungan` : "..."}
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-200">
            <a href="#about" className="hover:text-white transition">Tentang</a>
            <a href="#penilaian-preview" className="hover:text-white transition">Penilaian</a>
            <a href="#roadshow" className="hover:text-white transition">Roadshow</a>
            <Link href="/roadshow" className="hover:text-white transition">Hasil Seleksi</Link>
            <a href="#produk" className="hover:text-white transition">Merchandise</a>
            <Link
              href={user ? "/dashboard" : "/login"}
              className="px-4 py-2 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-100 transition"
            >
              {user ? `Panel (${user.username})` : "Login"}
            </Link>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-700 text-zinc-200 text-xs font-semibold"
          >
            {mobileMenuOpen ? "Tutup" : "Menu"}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden mt-3 pt-3 border-t border-zinc-800 flex flex-col gap-3 text-sm font-medium text-zinc-200 pb-2">
            <a href="#about" onClick={() => setMobileMenuOpen(false)}>Tentang</a>
            <a href="#penilaian-preview" onClick={() => setMobileMenuOpen(false)}>Penilaian</a>
            <a href="#roadshow" onClick={() => setMobileMenuOpen(false)}>Roadshow</a>
            <Link href="/roadshow" onClick={() => setMobileMenuOpen(false)}>Hasil Seleksi</Link>
            <a href="#produk" onClick={() => setMobileMenuOpen(false)}>Merchandise</a>
            <Link href={user ? "/dashboard" : "/login"} onClick={() => setMobileMenuOpen(false)} className="text-red-400 font-semibold">
              {user ? `Buka Panel (${user.username})` : "Login Admin / Panitia"}
            </Link>
          </div>
        )}
      </nav>

      {/* FULL-SCREEN HERO SECTION (100% VIEWPORT HEIGHT ON BOTH LAPTOP & HP BEFORE SCROLLING) */}
      <header
        id="about"
        className="relative w-full min-h-screen min-h-[100dvh] flex flex-col items-center justify-center px-5 pt-20 pb-12 text-center border-b border-zinc-900 overflow-hidden"
      >
        {/* Full Viewport Background Photo */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-100"
          style={{
            backgroundImage: `url('/background.jpg')`,
          }}
        />
        {/* Balanced gradient overlay so the photo is clearly visible while keeping text crisp */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-[#0a0a0c]" />

        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center justify-center">
          <span className="px-3.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/15 text-[11px] font-semibold uppercase tracking-widest text-zinc-200 mb-5">
            Purna Paskibraka Indonesia • Kab. Probolinggo
          </span>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight drop-shadow-lg">
            {config?.heroTitle || "GENERASI EMAS INDONESIA"}
          </h1>
          <p className="mt-5 text-base sm:text-lg text-zinc-200 leading-relaxed max-w-2xl mx-auto drop-shadow">
            {config?.heroSubtitle ||
              "Paskibraka Kabupaten Probolinggo. Membangun Karakter Kedisiplinan dan jiwa nasionalisme pemuda."}
          </p>

          {/* DYNAMIC CRUD HERO BUTTONS ("Visit Profile BPIP", "Cek Kandidat Lolos Roadshow", etc.) */}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3.5">
            {heroButtons.map((btn) => {
              const isPrimary = btn.description !== "SECONDARY";
              const isInternal = (btn.subtitle || "").startsWith("/");
              return (
                <div key={btn.id} className="relative group flex items-center gap-1.5">
                  {isInternal ? (
                    <Link
                      href={btn.subtitle || "/roadshow"}
                      className={`px-7 py-3.5 rounded-xl font-semibold text-sm transition shadow-lg ${
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
                      className={`px-7 py-3.5 rounded-xl font-semibold text-sm transition shadow-lg ${
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
                className="px-4 py-3.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-semibold text-xs transition border border-emerald-400/30"
              >
                + Tambah Tombol Utama
              </button>
            )}
          </div>
        </div>

        {/* Subtle Scroll Indicator at bottom of full-screen hero */}
        <a
          href="#penilaian-preview"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1 text-xs text-zinc-400 hover:text-white transition"
        >
          <span className="text-[11px] uppercase tracking-widest">Scroll ke bawah</span>
          <span className="text-base animate-bounce">↓</span>
        </a>
      </header>

      {/* REDESIGNED PENILAIAN & ULASAN SECTION (SLEEK HORIZONTAL BAR + MODERN CARDS) */}
      <section id="penilaian-preview" className="py-20 px-5 bg-zinc-950 border-b border-zinc-900">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Sleek Horizontal Summary Header (No longer a lonely boxy card in the center) */}
          <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/95 to-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Suara & Apresiasi Publik
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Penilaian & Ulasan Kegiatan
              </h2>
              <p className="text-sm text-zinc-400 max-w-xl">
                Ulasan nyata dari Purna Paskibraka Indonesia dan masyarakat umum terhadap kegiatan PPI Kabupaten Probolinggo.
              </p>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap items-center gap-5 bg-zinc-950/90 border border-zinc-800/90 rounded-2xl px-6 py-4">
              <div className="flex items-center gap-3.5">
                <div className="text-4xl font-extrabold text-white tracking-tight">
                  {avgRating}
                </div>
                <div>
                  <div className="text-amber-400 text-sm tracking-widest leading-none">
                    {"★".repeat(Math.round(Number(avgRating) || 0))}
                    <span className="text-zinc-700">
                      {"★".repeat(5 - Math.round(Number(avgRating) || 0))}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-1 font-medium">
                    Dari <strong className="text-zinc-200">{reviews.length}</strong> ulasan masuk
                  </div>
                </div>
              </div>

              <div className="hidden sm:block w-px h-10 bg-zinc-800" />

              <Link
                href="/penilaian"
                className="w-full sm:w-auto text-center bg-red-600 hover:bg-red-500 text-white font-semibold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl transition whitespace-nowrap shadow-md"
              >
                + Beri Penilaian
              </Link>
            </div>
          </div>

          {/* Clean Responsive Review Grid */}
          {reviews.length === 0 ? (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-10 text-center text-zinc-500 text-sm">
              Belum ada penilaian. Jadilah yang pertama memberikan ulasan!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[520px] overflow-y-auto pr-1">
              {reviews.map((item) => (
                <div
                  key={item.id}
                  className="bg-zinc-900/90 hover:bg-zinc-900 p-5 rounded-2xl border border-zinc-800/90 flex flex-col justify-between gap-4 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-red-600/20 border border-red-500/30 text-red-400 font-bold text-xs flex items-center justify-center uppercase shrink-0">
                          {item.nama.slice(0, 2)}
                        </div>
                        <div>
                          <strong className="text-white text-sm font-semibold block leading-snug">
                            {item.nama}
                          </strong>
                          <span className="text-zinc-400 text-[11px] font-medium">
                            {item.kategori === "ppi" ? `PPI Angkatan ${item.angkatan}` : "Masyarakat Umum"}
                          </span>
                        </div>
                      </div>

                      <div className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-amber-400 text-xs font-bold shrink-0">
                        ★ {item.rating}.0
                      </div>
                    </div>

                    <p className="text-zinc-300 text-sm leading-relaxed break-words">
                      &ldquo;{item.pesan}&rdquo;
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-500">
                    <span>{new Date(item.createdAt).toLocaleDateString("id-ID")}</span>
                    {canManageReviews && (
                      <button
                        onClick={() => handleDeleteReview(item.id, item.nama)}
                        className="text-xs text-red-400 hover:text-red-300 font-semibold px-2 py-0.5 rounded bg-red-500/10"
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

      {/* ROADSHOW GALLERY SECTION (HORIZONTAL SCROLL LEFT-RIGHT CAROUSEL) */}
      <section id="roadshow" className="py-20 px-5 max-w-6xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              PPI Roadshow
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Dokumentasi sosialisasi ke sekolah-sekolah Kabupaten Probolinggo (Geser kanan / kiri).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Horizontal Scroll Navigation Buttons */}
            <div className="flex items-center gap-1.5 mr-1">
              <button
                type="button"
                onClick={() => scrollRoadshow("left")}
                className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center text-sm font-bold transition"
                title="Geser Kiri"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => scrollRoadshow("right")}
                className="w-9 h-9 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white flex items-center justify-center text-sm font-bold transition"
                title="Geser Kanan"
              >
                →
              </button>
            </div>

            <Link
              href="/roadshow"
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-white transition"
            >
              Cek Hasil Seleksi →
            </Link>
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

        {/* Horizontal Carousel Container */}
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
                    Edit / Gambar
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
      </section>

      {/* MERCHANDISE SECTION */}
      <section id="produk" className="py-20 px-5 bg-zinc-950 border-t border-zinc-900">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Merchandise PPI
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Atribut dan pakaian resmi Purna Paskibraka Indonesia Kabupaten Probolinggo.
              </p>
            </div>

            {canManageMerch && (
              <button
                onClick={() => openAddItemModal("MERCHANDISE")}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition"
              >
                + Tambah Produk / Gambar
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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

                <div className="p-5 space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{item.title}</h3>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <button
                    onClick={() => directOrderWA(item.title, item.price)}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs uppercase tracking-wider transition"
                  >
                    Pesan via WhatsApp
                  </button>

                  {canManageMerch && (
                    <div className="flex gap-2 pt-2 border-t border-zinc-800">
                      <button
                        onClick={() => openEditItemModal(item)}
                        className="flex-1 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 font-medium"
                      >
                        Edit Harga / Gambar
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id, item.title)}
                        className="px-3 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-xs text-red-400 font-medium"
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

      {/* CLEAN FOOTER (NO /ppi-roadshow-27 LINK) */}
      <footer className="mt-auto border-t border-zinc-900 bg-[#070709] py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div>
            &copy; 2026 Purna Paskibraka Indonesia Kabupaten Probolinggo. Seluruh Hak Cipta Dilindungi.
          </div>
          <div className="flex items-center gap-6">
            <Link href="/roadshow" className="hover:text-zinc-300 transition">Hasil Seleksi</Link>
            <Link href="/penilaian" className="hover:text-zinc-300 transition">Isi Penilaian</Link>
            <Link href="/biodata" className="hover:text-zinc-300 transition">Developer</Link>
          </div>
        </div>
      </footer>

      {/* PRODUCT PREVIEW MODAL */}
      {selectedProduct && (
        <div
          onClick={() => setSelectedProduct(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4"
          >
            <img
              src={selectedProduct.imageUrl}
              alt={selectedProduct.title}
              className="w-full h-56 object-contain bg-zinc-950 rounded-xl p-4"
            />
            <div>
              <h3 className="text-xl font-bold text-white">{selectedProduct.title}</h3>
              <p className="text-red-400 font-bold text-base mt-1">Rp {selectedProduct.price}</p>
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
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold"
              >
                Pesan via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADMIN MODAL ADD / EDIT ITEM (HERO_BUTTON, ROADSHOW_GALLERY, MERCHANDISE) */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
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
                      placeholder="Contoh: https://paskibraka.bpip.go.id atau /roadshow"
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

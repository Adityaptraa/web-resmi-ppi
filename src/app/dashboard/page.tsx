"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";
import PaskibrakaAuthSplit from "@/components/PaskibrakaAuthSplit";

interface RolePermissions {
  inputBB?: boolean;
  inputTB?: boolean;
  inputRegistrasi?: boolean;
  manageLanding?: boolean;
  manageMerchandise?: boolean;
  manageReviews?: boolean;
  manageRoadshow?: boolean;
}

interface AuthUser {
  userId: string;
  username: string;
  email?: string;
  phone?: string;
  fullName: string;
  angkatan: string;
  role: "SUPER_ADMIN" | "ADMIN" | "USER";
  permissions: RolePermissions;
}

interface ManagedAccount {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  fullName: string;
  angkatan: string;
  role: "SUPER_ADMIN" | "ADMIN" | "USER";
  permissions: RolePermissions;
}

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Mode: LOGIN vs REGISTER (Daftar Panitia)
  const authMode = "LOGIN";

  // Active Tab
  const [tab, setTab] = useState<"MERCH" | "GALLERY" | "REVIEWS" | "USERS">("MERCH");

  // Data
  const [config, setConfig] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<ManagedAccount[]>([]);
  const [roadshowSchools, setRoadshowSchools] = useState<any[]>([]);
  const [todaySchoolId, setTodaySchoolId] = useState<string>("");
  const [qrModalSchool, setQrModalSchool] = useState<any | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Form Add Item + Upload Image
  const [itemTitle, setItemTitle] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemDesc, setItemDesc] = useState("");
  const [itemImage, setItemImage] = useState("");
  const [itemLocation, setItemLocation] = useState("");
  const [itemDay, setItemDay] = useState("");
  const [itemDate, setItemDate] = useState("");
  const [uploadingImg, setUploadingImg] = useState(false);

  // Form Add Hero Button
  const [heroBtnText, setHeroBtnText] = useState("");
  const [heroBtnUrl, setHeroBtnUrl] = useState("");
  const [heroBtnStyle, setHeroBtnStyle] = useState("PRIMARY");

  // Form Create Account (Super Admin)
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAngkatan, setNewAngkatan] = useState("");
  const [newRole, setNewRole] = useState<"ADMIN" | "USER" | "SUPER_ADMIN">("USER");
  const [newPerms, setNewPerms] = useState<RolePermissions>({
    inputBB: true,
    inputTB: false,
    inputRegistrasi: false,
    manageMerchandise: false,
    manageRoadshow: false,
    manageLanding: false,
    manageReviews: false,
  });

  const loadAll = async () => {
    try {
      const authRes = await fetch("/api/auth", { cache: "no-store" });
      const authData = await authRes.json();
      if (!authData.authenticated || !authData.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      const currentUser: AuthUser = authData.user;
      setUser(currentUser);

      // All accounts stay on Dashboard with dedicated "Scan QR Jadi Panitia" button

      const landingRes = await fetch("/api/landing", { cache: "no-store" });
      if (landingRes.ok) {
        const lData = await landingRes.json();
        setConfig(lData.config);
        setItems(lData.items || []);
        setReviews(lData.reviews || []);
      }

      if (currentUser.role === "SUPER_ADMIN") {
        const [uRes, rsRes] = await Promise.all([
          fetch("/api/users", { cache: "no-store" }),
          fetch("/api/roadshow?mode=internal", { cache: "no-store" }),
        ]);
        if (uRes.ok) {
          const uData = await uRes.json();
          setAccounts(uData.users || []);
        }
        if (rsRes.ok) {
          const rsData = await rsRes.json();
          setRoadshowSchools(rsData.schools || []);
          setTodaySchoolId(rsData.todaySchoolId || "");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!qrModalSchool?.qrPayload) {
      setQrDataUrl("");
      return;
    }
    QRCode.toDataURL(qrModalSchool.qrPayload, {
      width: 340,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(""));
  }, [qrModalSchool]);

  const handleLogout = async () => {
    await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout", rating: 5, pesan: "Selesai bertugas." }),
    });
    setUser(null);
  };

  const isSuper = user?.role === "SUPER_ADMIN";
  const canLanding = isSuper || Boolean(user?.permissions?.manageLanding);
  const canMerch = isSuper || Boolean(user?.permissions?.manageMerchandise) || canLanding;
  const canReviews = isSuper || Boolean(user?.permissions?.manageReviews) || canLanding;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, targetItem?: any) => {
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
        return;
      }
      if (targetItem) {
        await fetch("/api/landing", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "item",
            id: targetItem.id,
            imageUrl: data.url,
          }),
        });
        loadAll();
      } else {
        setItemImage(data.url);
      }
    } finally {
      setUploadingImg(false);
    }
  };

  const handleAddItem = async (e: React.FormEvent, section: string) => {
    e.preventDefault();
    const res = await fetch("/api/landing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "item",
        section,
        title: itemTitle,
        price: itemPrice,
        description: itemDesc,
        imageUrl: itemImage,
        metaLocation: itemLocation,
        metaDay: itemDay,
        metaDate: itemDate,
      }),
    });
    if (res.ok) {
      setItemTitle("");
      setItemPrice("");
      setItemDesc("");
      setItemImage("");
      setItemLocation("");
      setItemDay("");
      setItemDate("");
      loadAll();
    } else {
      const d = await res.json();
      alert(d.error || "Gagal menyimpan");
    }
  };

  const handleQuickUpdateItem = async (item: any, field: string, value: string) => {
    await fetch("/api/landing", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "item",
        id: item.id,
        [field]: value,
      }),
    });
    loadAll();
  };

  const handleDeleteItem = async (id: string, title: string) => {
    if (!confirm(`Hapus "${title}"?`)) return;
    await fetch(`/api/landing?type=item&id=${id}`, { method: "DELETE" });
    loadAll();
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: newUsername,
        password: newPassword,
        fullName: newFullName,
        email: newEmail,
        phone: newPhone,
        angkatan: newAngkatan,
        role: newRole,
        permissions: newPerms,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Gagal membuat akun");
      return;
    }
    setNewUsername("");
    setNewPassword("");
    setNewFullName("");
    setNewEmail("");
    setNewPhone("");
    setNewAngkatan("");
    loadAll();
  };

  const handleToggleAccountPermission = async (acc: ManagedAccount, permKey: keyof RolePermissions) => {
    const updatedPerms = {
      ...acc.permissions,
      [permKey]: !acc.permissions?.[permKey],
    };
    await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: acc.id,
        permissions: updatedPerms,
      }),
    });
    loadAll();
  };

  const handleChangeAccountRole = async (acc: ManagedAccount, nextRole: "USER" | "ADMIN" | "SUPER_ADMIN") => {
    await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: acc.id,
        role: nextRole,
      }),
    });
    loadAll();
  };

  const handleDeleteAccount = async (acc: ManagedAccount) => {
    if (!confirm(`Hapus akun "${acc.fullName}"?`)) return;
    await fetch(`/api/users?id=${acc.id}`, { method: "DELETE" });
    loadAll();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-zinc-400 text-sm">
        Memuat...
      </div>
    );
  }

  // LOGIN & DAFTAR PANITIA SCREEN (ALA DISHUB DENGAN TEMA RESMI PASKIBRAKA)
  if (!user) {
    return (
      <PaskibrakaAuthSplit
        initialMode={authMode}
        onSuccess={() => loadAll()}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-zinc-100">
      <header className="sticky top-0 z-30 bg-[#0a0a0c]/95 backdrop-blur-md border-b border-zinc-800 px-5 lg:px-10 py-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold uppercase">
                {user.role}
              </span>
              <h1 className="font-bold text-base sm:text-lg text-white">
                Dashboard — {user.fullName}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {(isSuper || user.permissions?.manageRoadshow) && (
              <Link
                href="/ppi-roadshow-27"
                className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-semibold text-sky-400 hover:text-white"
              >
                Buka Sistem Roadshow
              </Link>
            )}
            <Link
              href="/"
              className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white"
            >
              Lihat Website
            </Link>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8 space-y-6">
        {/* BANNER SCAN QR UNTUK JADI PANITIA LAPANGAN HARI INI */}
        <div className="bg-gradient-to-r from-red-950/80 via-zinc-900 to-zinc-900 border border-red-600/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-red-400">
                Penugasan Lapangan Roadshow
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Menu Scan Barcode — Jadi Panitia Roadshow Hari Ini
            </h3>
            <p className="text-xs text-zinc-300 max-w-xl">
              Sedang bertugas di sekolah hari ini? Buka scanner kamera untuk memindai barcode QR Super Admin sekolah hari ini dan langsung masuk ke pos input data Berat Badan (BB) &amp; Tinggi Badan (TB).
            </p>
          </div>
          <Link
            href="/ppi-roadshow-27"
            className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition active:scale-95"
          >
            <span>📷 Buka Scanner QR Panitia</span>
            <span>→</span>
          </Link>
        </div>

        {/* TABS */}
        <div className="flex flex-wrap gap-2">
          {canMerch && (
            <button
              onClick={() => setTab("MERCH")}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition ${tab === "MERCH"
                ? "bg-red-600 text-white border-red-600"
                : "bg-zinc-900 text-zinc-300 border-zinc-800"
                }`}
            >
              Merchandise & Harga (CRUD Gambar)
            </button>
          )}
          {canLanding && (
            <button
              onClick={() => setTab("GALLERY")}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition ${tab === "GALLERY"
                ? "bg-red-600 text-white border-red-600"
                : "bg-zinc-900 text-zinc-300 border-zinc-800"
                }`}
            >
              Galeri Foto Roadshow & Teks Utama
            </button>
          )}
          {canReviews && (
            <button
              onClick={() => setTab("REVIEWS")}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition ${tab === "REVIEWS"
                ? "bg-red-600 text-white border-red-600"
                : "bg-zinc-900 text-zinc-300 border-zinc-800"
                }`}
            >
              Kelola Ulasan ({reviews.length})
            </button>
          )}
          {isSuper && (
            <button
              onClick={() => setTab("USERS")}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition ${tab === "USERS"
                ? "bg-red-600 text-white border-red-600"
                : "bg-zinc-900 text-zinc-300 border-zinc-800"
                }`}
            >
              Kelola Panitia & Penugasan ({accounts.length})
            </button>
          )}
        </div>

        {/* TAB 1: MERCHANDISE & HARGA + UPLOAD/HAPUS GAMBAR */}
        {tab === "MERCH" && canMerch && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 h-fit">
              <h3 className="text-base font-bold text-white">Tambah Produk & Upload Gambar</h3>
              <form onSubmit={(e) => handleAddItem(e, "MERCHANDISE")} className="space-y-3 text-sm">
                <input
                  type="text"
                  required
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="Nama Produk"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                />
                <input
                  type="text"
                  required
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                  placeholder="Harga (Contoh: 100.000)"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                />
                <textarea
                  rows={2}
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  placeholder="Deskripsi bahan / produk"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                />
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Upload Gambar Produk</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e)}
                    className="w-full text-xs text-zinc-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-white"
                  />
                  {itemImage && (
                    <img
                      src={itemImage}
                      alt="Preview"
                      className="w-20 h-20 object-contain mt-2 bg-zinc-950 rounded-lg p-1 border border-zinc-800"
                    />
                  )}
                </div>
                <button
                  type="submit"
                  disabled={uploadingImg}
                  className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs uppercase"
                >
                  {uploadingImg ? "Mengunggah..." : "Tambah Produk"}
                </button>
              </form>
            </div>

            <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white">Daftar Produk Merchandise</h3>
              <div className="space-y-3">
                {items
                  .filter((i) => i.section === "MERCHANDISE")
                  .map((m) => (
                    <div
                      key={m.id}
                      className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <img
                          src={m.imageUrl || "/polo.png"}
                          alt={m.title}
                          className="w-16 h-16 object-contain bg-zinc-900 rounded-lg p-1 border border-zinc-800"
                        />
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            defaultValue={m.title}
                            onBlur={(e) => handleQuickUpdateItem(m, "title", e.target.value)}
                            className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-sm font-bold text-white"
                          />
                          <div className="flex items-center gap-2">
                            <label className="cursor-pointer text-[11px] text-sky-400 hover:underline">
                              Ganti Gambar
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, m)}
                              />
                            </label>
                            {m.imageUrl && (
                              <button
                                onClick={() => handleQuickUpdateItem(m, "imageUrl", "")}
                                className="text-[11px] text-amber-400 hover:underline"
                              >
                                Hapus Gambar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
                          <span className="text-xs text-zinc-400">Rp</span>
                          <input
                            type="text"
                            defaultValue={m.price}
                            onBlur={(e) => handleQuickUpdateItem(m, "price", e.target.value)}
                            className="w-24 bg-transparent text-white font-bold text-sm focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={() => handleDeleteItem(m.id, m.title)}
                          className="px-3 py-2 rounded-lg bg-red-500/15 text-red-400 text-xs font-semibold hover:bg-red-500/25"
                        >
                          Hapus Item
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GALERI FOTO ROADSHOW & TEKS LANDING PAGE */}
        {tab === "GALLERY" && canLanding && (
          <div className="space-y-6">
            {config && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                <h3 className="text-base font-bold text-white">Teks Utama Landing Page</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Judul Hero</label>
                    <input
                      type="text"
                      value={config.heroTitle}
                      onChange={(e) => setConfig({ ...config, heroTitle: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Nomor WA Order Merchandise</label>
                    <input
                      type="text"
                      value={config.waAdminMerch}
                      onChange={(e) => setConfig({ ...config, waAdminMerch: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-zinc-400 mb-1">Deskripsi Hero</label>
                    <textarea
                      rows={2}
                      value={config.heroSubtitle}
                      onChange={(e) => setConfig({ ...config, heroSubtitle: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                    />
                  </div>
                </div>
                <button
                  onClick={async () => {
                    await fetch("/api/landing", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ type: "config", ...config }),
                    });
                    alert("Teks utama berhasil disimpan.");
                    loadAll();
                  }}
                  className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-xs font-semibold"
                >
                  Simpan Teks Utama
                </button>
              </div>
            )}

            {/* CRUD TOMBOL UTAMA HERO */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  Kelola Tombol Utama Hero (CRUD Tombol Tampilan Utama)
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Tambah, ubah teks/link, atau hapus tombol seperti &ldquo;Visit Profile BPIP&rdquo; dan &ldquo;Cek Kandidat Lolos Roadshow&rdquo;.
                </p>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (/\.php/i.test(heroBtnText) || /\.php/i.test(heroBtnUrl)) {
                    alert("Tidak boleh menggunakan link atau file .php!");
                    return;
                  }
                  const res = await fetch("/api/landing", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      type: "item",
                      section: "HERO_BUTTON",
                      title: heroBtnText,
                      subtitle: heroBtnUrl,
                      description: heroBtnStyle,
                    }),
                  });
                  if (res.ok) {
                    setHeroBtnText("");
                    setHeroBtnUrl("");
                    loadAll();
                  }
                }}
                className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs"
              >
                <input
                  type="text"
                  required
                  value={heroBtnText}
                  onChange={(e) => setHeroBtnText(e.target.value)}
                  placeholder="Teks Tombol (Misal: Visit Profile BPIP)"
                  className="px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                />
                <input
                  type="text"
                  required
                  value={heroBtnUrl}
                  onChange={(e) => setHeroBtnUrl(e.target.value)}
                  placeholder="Link URL (Misal: /roadshow atau https://...)"
                  className="px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                />
                <select
                  value={heroBtnStyle}
                  onChange={(e) => setHeroBtnStyle(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                >
                  <option value="PRIMARY">Warna Merah (Primary)</option>
                  <option value="SECONDARY">Warna Gelap (Secondary)</option>
                </select>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                >
                  + Tambah Tombol
                </button>
              </form>

              <div className="space-y-2.5 pt-2">
                {items
                  .filter((i) => i.section === "HERO_BUTTON")
                  .map((btn) => (
                    <div
                      key={btn.id}
                      className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                        <input
                          type="text"
                          defaultValue={btn.title}
                          onBlur={(e) => handleQuickUpdateItem(btn, "title", e.target.value)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-bold text-white"
                          title="Teks Tombol"
                        />
                        <input
                          type="text"
                          defaultValue={btn.subtitle}
                          onBlur={(e) => handleQuickUpdateItem(btn, "subtitle", e.target.value)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300"
                          title="URL Tujuan"
                        />
                        <select
                          defaultValue={btn.description || "PRIMARY"}
                          onChange={(e) => handleQuickUpdateItem(btn, "description", e.target.value)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300"
                        >
                          <option value="PRIMARY">Merah (Primary)</option>
                          <option value="SECONDARY">Gelap (Secondary)</option>
                        </select>
                      </div>
                      <button
                        onClick={() => handleDeleteItem(btn.id, btn.title)}
                        className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-semibold hover:bg-red-500/25 shrink-0"
                      >
                        Hapus Tombol
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 h-fit">
                <h3 className="text-base font-bold text-white">Upload Foto Roadshow Baru</h3>
                <form onSubmit={(e) => handleAddItem(e, "ROADSHOW_GALLERY")} className="space-y-3 text-sm">
                  <input
                    type="text"
                    required
                    value={itemTitle}
                    onChange={(e) => setItemTitle(e.target.value)}
                    placeholder="Nama Sekolah (Contoh: SMAN 1 PAITON)"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                  />
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
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Pilih File Gambar</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e)}
                      className="w-full text-xs text-zinc-400 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-white"
                    />
                    {itemImage && (
                      <img
                        src={itemImage}
                        alt="Preview"
                        className="w-24 h-16 object-cover mt-2 rounded-lg border border-zinc-800"
                      />
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={uploadingImg}
                    className="w-full py-3 rounded-xl bg-red-600 text-white font-semibold text-xs uppercase"
                  >
                    Simpan Foto Roadshow
                  </button>
                </form>
              </div>

              <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3">
                <h3 className="text-base font-bold text-white">Galeri Foto Roadshow</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {items
                    .filter((i) => i.section === "ROADSHOW_GALLERY")
                    .map((g) => (
                      <div key={g.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-3 flex gap-3 items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={g.imageUrl || "/sman1paiton.jpeg"}
                            alt={g.title}
                            className="w-16 h-14 object-cover rounded-lg border border-zinc-800"
                          />
                          <div>
                            <div className="font-bold text-xs text-white">{g.title}</div>
                            <div className="text-[11px] text-zinc-500">{g.metaDate}</div>
                            <label className="cursor-pointer text-[11px] text-sky-400 hover:underline">
                              Ganti Foto
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, g)}
                              />
                            </label>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteItem(g.id, g.title)}
                          className="px-2.5 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-semibold"
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: KELOLA ULASAN */}
        {tab === "REVIEWS" && canReviews && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3">
            <h3 className="text-base font-bold text-white">Daftar Penilaian & Ulasan</h3>
            {reviews.map((r) => (
              <div
                key={r.id}
                className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-sm text-white">{r.nama}</strong>
                    <span className="text-xs text-amber-400">★ {r.rating}/5</span>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1">&ldquo;{r.pesan}&rdquo;</p>
                </div>
                <button
                  onClick={async () => {
                    await fetch(`/api/landing?type=review&id=${r.id}`, { method: "DELETE" });
                    loadAll();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-semibold"
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>
        )}

        {/* TAB 4: KELOLA PANITIA, ADMIN & PENUGASAN (KHUSUS SUPER ADMIN) */}
        {tab === "USERS" && isSuper && (
          <div className="space-y-6">
            {/* PENGATURAN SEKOLAH KUNJUNGAN HARI INI UNTUK PETUGAS BB & TB */}
            <div className="bg-zinc-900 border border-emerald-500/40 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="text-base font-bold text-white">
                    Atur Sekolah yang Dikunjungi Hari Ini (Kunci Data Sekolah Kemarin)
                  </h3>
                </div>
                <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
                  Petugas bagian Input BB &amp; Input TB hanya akan melihat <strong>1 sekolah yang dipilih di bawah ini</strong>. Sekolah lainnya otomatis disembunyikan dan dikunci agar data hari kemarin tidak bisa diubah-ubah oleh petugas hari ini.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <select
                  value={todaySchoolId}
                  onChange={async (e) => {
                    const nextId = e.target.value;
                    if (!nextId) return;
                    setTodaySchoolId(nextId);
                    await fetch("/api/roadshow", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "set_active_school_today",
                        schoolId: nextId,
                      }),
                    });
                    loadAll();
                  }}
                  className="px-4 py-3 rounded-xl bg-zinc-950 border border-emerald-500/50 text-sm font-bold text-emerald-300 focus:outline-none"
                >
                  {roadshowSchools.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.namaSekolah} {s.statusPenilaian === "Hari Ini" ? "(★ Aktif Hari Ini)" : "(🔒 Terkunci)"}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const current = roadshowSchools.find((s) => s.id === todaySchoolId) || roadshowSchools[0];
                    if (current) setQrModalSchool(current);
                  }}
                  className="px-4 py-3 rounded-xl bg-white hover:bg-zinc-200 text-black font-bold text-xs transition"
                >
                  📱 Tampilkan QR Panitia
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4 h-fit">
                <h3 className="text-base font-bold text-white">Tambah Akun Panitia / Admin</h3>
                <form onSubmit={handleCreateAccount} className="space-y-3 text-xs">
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Nama Lengkap"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-zinc-400">Username</span>
                        <span className="text-[10px] text-zinc-500">{newUsername.length}/20</span>
                      </div>
                      <input
                        type="text"
                        required
                        maxLength={20}
                        value={newUsername}
                        onChange={(e) =>
                          setNewUsername(e.target.value.toLowerCase().replace(/\s+/g, "_").slice(0, 20))
                        }
                        placeholder="Maks. 20 karakter"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                      />
                    </div>
                    <div>
                      <span className="block text-zinc-400 mb-1">PPI Angkatan</span>
                      <input
                        type="text"
                        required
                        value={newAngkatan}
                        onChange={(e) => setNewAngkatan(e.target.value)}
                        placeholder="Contoh: 2025"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="tel"
                      required
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value.replace(/[^0-9+]/g, ""))}
                      placeholder="No. Telp (0812...)"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                    />
                    <input
                      type="email"
                      required
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="Email Aktif"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white"
                    />
                  </div>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm"
                  />
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm"
                  >
                    <option value="USER">PANITIA LAPANGAN (USER)</option>
                    <option value="ADMIN">ADMIN DIVISI (ADMIN)</option>
                    <option value="SUPER_ADMIN">SUPER ADMIN</option>
                  </select>

                  {newRole !== "SUPER_ADMIN" && (
                    <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                      <div className="font-bold text-zinc-300">Pilih Tugas Khusus Panitia/Admin:</div>
                      {[
                        { key: "inputBB", label: "Panitia Lapangan: Isi Berat Badan (BB) Saja" },
                        { key: "inputTB", label: "Panitia Lapangan: Isi Tinggi Badan (TB) Saja" },
                        { key: "inputRegistrasi", label: "Panitia Lapangan: Registrasi Peserta Saja" },
                        { key: "manageRoadshow", label: "Admin Roadshow (Kelola Sekolah, Lulus & Tayang)" },
                        { key: "manageMerchandise", label: "Admin Merchandise (Atur Harga & Gambar)" },
                        { key: "manageLanding", label: "Admin Landing Page (Tombol Hero & Galeri)" },
                        { key: "manageReviews", label: "Admin Ulasan / Penilaian" },
                      ].map((p) => (
                        <label key={p.key} className="flex items-center gap-2 text-zinc-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean((newPerms as any)[p.key])}
                            onChange={(e) =>
                              setNewPerms((prev) => ({ ...prev, [p.key]: e.target.checked }))
                            }
                          />
                          <span>{p.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-red-600 text-white font-semibold text-xs uppercase"
                  >
                    Simpan Akun & Tugas
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-3">
                <div>
                  <h3 className="text-base font-bold text-white">Daftar Panitia Terdaftar & Penugasan</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Klik tombol tugas di bawah nama panitia untuk mengaktifkan/menonaktifkan bagian tugasnya (contoh: hanya Isi BB saja, atau hanya Isi TB saja).
                  </p>
                </div>

                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {accounts.map((acc) => (
                    <div key={acc.id} className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-red-600/20 border border-red-500/30 text-red-300 text-[10px] font-bold uppercase">
                              {acc.role}
                            </span>
                            <strong className="text-sm text-white">{acc.fullName}</strong>
                            <span className="text-xs text-zinc-400">(@{acc.username})</span>
                            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 font-semibold">
                              PPI Akt. {acc.angkatan || "-"}
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-400 mt-1 flex flex-wrap gap-3">
                            {acc.phone && <span>Telp/WA: <strong className="text-zinc-200">{acc.phone}</strong></span>}
                            {acc.email && <span>Email: <strong className="text-zinc-200">{acc.email}</strong></span>}
                          </div>
                        </div>

                        {acc.id !== user.userId && (
                          <div className="flex items-center gap-2">
                            <select
                              value={acc.role}
                              onChange={(e) =>
                                handleChangeAccountRole(acc, e.target.value as "USER" | "ADMIN" | "SUPER_ADMIN")
                              }
                              className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300"
                            >
                              <option value="USER">Role: USER (Panitia)</option>
                              <option value="ADMIN">Role: ADMIN</option>
                              <option value="SUPER_ADMIN">Role: SUPER ADMIN</option>
                            </select>
                            <button
                              onClick={() => handleDeleteAccount(acc)}
                              className="text-xs text-red-400 hover:underline font-semibold"
                            >
                              Hapus
                            </button>
                          </div>
                        )}
                      </div>

                      {acc.role !== "SUPER_ADMIN" && (
                        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-zinc-900">
                          {(
                            [
                              { key: "inputBB", label: "Isi BB Saja" },
                              { key: "inputTB", label: "Isi TB Saja" },
                              { key: "inputRegistrasi", label: "Registrasi Peserta" },
                              { key: "manageRoadshow", label: "Admin Roadshow" },
                              { key: "manageMerchandise", label: "Harga & Merchandise" },
                              { key: "manageLanding", label: "Galeri & Landing" },
                              { key: "manageReviews", label: "Ulasan" },
                            ] as const
                          ).map((perm) => {
                            const active = Boolean(acc.permissions?.[perm.key]);
                            return (
                              <button
                                key={perm.key}
                                onClick={() => handleToggleAccountPermission(acc, perm.key)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition ${active
                                  ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                                  : "bg-zinc-900 border-zinc-800 text-zinc-500"
                                  }`}
                              >
                                {active ? "✓ " : "+ "} {perm.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* MODAL QR CODE RESMI SUPER ADMIN */}
      {qrModalSchool && (
        <div
          onClick={() => setQrModalSchool(null)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-zinc-900 border border-zinc-700 rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl"
          >
            <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold uppercase">
              QR Resmi Super Admin PPI
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white">
                {qrModalSchool.namaSekolah}
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Minta seluruh panitia login dan arahkan kamera mereka ke QR Code ini.
              </p>
            </div>

            <div className="bg-white p-4 rounded-2xl inline-block mx-auto shadow-lg">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR ${qrModalSchool.namaSekolah}`}
                  className="w-64 h-64 object-contain mx-auto"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-zinc-500 text-xs">
                  Membuat QR...
                </div>
              )}
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              🔒 Terenkripsi HMAC-SHA256. Kamera panitia otomatis memblokir QR lain selain QR ini.
            </p>

            <button
              type="button"
              onClick={() => setQrModalSchool(null)}
              className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider"
            >
              Tutup QR
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

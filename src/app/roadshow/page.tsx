"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface PassedCandidate {
  id: string;
  kodePeserta: string;
  nama: string;
  jenisKelamin: string;
  schoolId: string;
  namaSekolah?: string;
  hasilLulus: boolean;
  statusTayang: boolean;
  keterangan: string;
}

interface SchoolWithPassed {
  id: string;
  namaSekolah: string;
  lokasi: string;
  tanggal: string;
  statusPenilaian: string;
  passedCount: number;
  candidates: PassedCandidate[];
}

export default function PublicRoadshowPage() {
  const [schools, setSchools] = useState<SchoolWithPassed[]>([]);
  // Default to "ALL" (Semua Sekolah) so user can immediately see all schools or pick a specific school
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("ALL");
  const [genderFilter, setGenderFilter] = useState<"ALL" | "Cowok" | "Cewek">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Custom Scrollable Dropdown State
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadPassedData = async () => {
    try {
      const res = await fetch("/api/roadshow?mode=public", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSchools(data.schools || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPassedData();
    const interval = setInterval(loadPassedData, 4000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedSchool =
    selectedSchoolId === "ALL"
      ? null
      : schools.find((s) => s.id === selectedSchoolId) || null;

  const filteredDropdownSchools = schools.filter((s) =>
    s.namaSekolah.toLowerCase().includes(schoolSearch.toLowerCase().trim())
  );

  // Build candidate list either from All Schools ("ALL") or the selected school
  const rawCandidates: PassedCandidate[] =
    selectedSchoolId === "ALL"
      ? schools.flatMap((s) =>
          s.candidates.map((c) => ({
            ...c,
            namaSekolah: s.namaSekolah,
          }))
        )
      : selectedSchool
      ? selectedSchool.candidates.map((c) => ({
          ...c,
          namaSekolah: selectedSchool.namaSekolah,
        }))
      : [];

  const totalPassedAllSchools = schools.reduce((acc, s) => acc + (s.passedCount || 0), 0);

  const filteredCandidates = rawCandidates.filter((c) => {
    const matchGender = genderFilter === "ALL" || c.jenisKelamin === genderFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      c.nama.toLowerCase().includes(q) ||
      c.kodePeserta.toLowerCase().includes(q) ||
      (c.namaSekolah || "").toLowerCase().includes(q);
    return matchGender && matchSearch;
  });

  const selectedLabel =
    selectedSchoolId === "ALL"
      ? "Semua Sekolah"
      : selectedSchool
      ? selectedSchool.namaSekolah
      : "-- Pilih Sekolah --";

  return (
    <div className="h-screen h-[100dvh] overflow-hidden flex flex-col bg-[#0a0a0c] text-zinc-100">
      {/* FIXED TOP HEADER */}
      <header className="shrink-0 z-30 bg-[#0a0a0c] border-b border-zinc-800 px-5 lg:px-12 py-3.5">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="font-bold text-base sm:text-lg text-white tracking-tight">
              Hasil Seleksi Roadshow PPI
            </h1>
            <p className="text-xs text-zinc-400">
              Pilih sekolah pada menu dropdown untuk melihat daftar nama kandidat yang lolos.
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-200 transition shrink-0"
          >
            Kembali ke Beranda
          </Link>
        </div>
      </header>

      {/* MAIN CONTAINER: FIXED FILTER CARD ON TOP + INDEPENDENTLY SCROLLABLE CANDIDATE LIST BELOW */}
      <main className="flex-1 min-h-0 max-w-4xl w-full mx-auto px-5 py-4 flex flex-col gap-4">
        {/* FIXED / NON-SCROLLING SCHOOL SELECTION & FILTER CARD */}
        <div className="shrink-0 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
            {/* Custom Compact Scrollable Dropdown Pilih Sekolah */}
            <div className="sm:col-span-7 relative" ref={dropdownRef}>
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Pilih Asal Sekolah
              </label>

              <button
                type="button"
                onClick={() => setDropdownOpen((prev) => !prev)}
                className={`w-full px-4 py-2.5 rounded-xl bg-zinc-950 border text-left text-sm font-semibold text-white flex items-center justify-between transition ${
                  dropdownOpen
                    ? "border-red-500 ring-1 ring-red-500/30"
                    : "border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <span className="truncate">{selectedLabel}</span>
                <span className="text-xs text-zinc-400 ml-2">
                  {dropdownOpen ? "▲" : "▼"}
                </span>
              </button>

              {/* Compact Scrollable Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute left-0 right-0 mt-2 z-50 bg-zinc-950 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
                  {/* Search inside dropdown */}
                  <div className="p-2 border-b border-zinc-800 bg-zinc-900/80">
                    <input
                      type="text"
                      value={schoolSearch}
                      onChange={(e) => setSchoolSearch(e.target.value)}
                      placeholder="Cari nama sekolah..."
                      className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-white focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  {/* Fixed-height scrollable list inside dropdown */}
                  <div className="max-h-48 overflow-y-auto divide-y divide-zinc-900/60">
                    {/* Option: Semua Sekolah */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSchoolId("ALL");
                        setDropdownOpen(false);
                        setSchoolSearch("");
                      }}
                      className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition ${
                        selectedSchoolId === "ALL"
                          ? "bg-red-600 text-white font-bold"
                          : "text-zinc-200 hover:bg-zinc-900 font-semibold"
                      }`}
                    >
                      <span>Semua Sekolah</span>
                      <span
                        className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          selectedSchoolId === "ALL"
                            ? "bg-black/30 text-white"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {totalPassedAllSchools} Lolos
                      </span>
                    </button>

                    {filteredDropdownSchools.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-zinc-500 text-center">
                        Sekolah tidak ditemukan.
                      </div>
                    ) : (
                      filteredDropdownSchools.map((s) => {
                        const isSelected = s.id === selectedSchoolId;
                        return (
                          <button
                            type="button"
                            key={s.id}
                            onClick={() => {
                              setSelectedSchoolId(s.id);
                              setDropdownOpen(false);
                              setSchoolSearch("");
                            }}
                            className={`w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition ${
                              isSelected
                                ? "bg-red-600 text-white font-bold"
                                : "text-zinc-200 hover:bg-zinc-900"
                            }`}
                          >
                            <span className="truncate">{s.namaSekolah}</span>
                            {s.passedCount > 0 && (
                              <span
                                className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                  isSelected
                                    ? "bg-black/30 text-white"
                                    : "bg-zinc-800 text-zinc-400"
                                }`}
                              >
                                {s.passedCount} Lolos
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Filter Gender Cewe / Cowo */}
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Filter Kategori Gender
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setGenderFilter("ALL")}
                  className={`py-2.5 rounded-xl text-xs font-semibold border transition ${
                    genderFilter === "ALL"
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setGenderFilter("Cowok")}
                  className={`py-2.5 rounded-xl text-xs font-semibold border transition ${
                    genderFilter === "Cowok"
                      ? "bg-sky-600 text-white border-sky-500"
                      : "bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  Cowok
                </button>
                <button
                  type="button"
                  onClick={() => setGenderFilter("Cewek")}
                  className={`py-2.5 rounded-xl text-xs font-semibold border transition ${
                    genderFilter === "Cewek"
                      ? "bg-pink-600 text-white border-pink-500"
                      : "bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700"
                  }`}
                >
                  Cewek
                </button>
              </div>
            </div>
          </div>

          {/* Search Candidate Input */}
          <div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                selectedSchoolId === "ALL"
                  ? "Cari nama kandidat, kode peserta, atau nama sekolah..."
                  : `Cari nama kandidat atau kode di ${selectedSchool?.namaSekolah || ""}...`
              }
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-white focus:border-red-500 focus:outline-none"
            />
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between pt-1 text-xs text-zinc-400">
            <span>
              Sekolah:{" "}
              <strong className="text-white uppercase">{selectedLabel}</strong>
            </span>
            <span>
              Ditampilkan:{" "}
              <strong className="text-emerald-400">
                {filteredCandidates.length} Kandidat Lolos
              </strong>
            </span>
          </div>
        </div>

        {/* ONLY THIS CANDIDATE NAMES AREA SCROLLS WHEN USER SCROLLS */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3 pb-6">
          {loading ? (
            <div className="text-center py-16 text-zinc-500 text-sm">
              Memuat data...
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center space-y-1">
              <p className="text-sm font-semibold text-zinc-300">
                Tidak ada data kandidat lolos yang ditemukan di {selectedLabel}
                {genderFilter !== "ALL" ? ` untuk kategori ${genderFilter}` : ""}.
              </p>
              <p className="text-xs text-zinc-500">
                Pastikan filter sekolah, gender, atau kata kunci pencarian sudah sesuai.
              </p>
            </div>
          ) : (
            filteredCandidates.map((c, index) => (
              <div
                key={c.id}
                className="bg-zinc-900 border border-zinc-800 border-l-4 border-l-emerald-500 rounded-2xl p-4 sm:p-5 flex flex-col gap-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500 font-mono">#{index + 1}</span>
                      <span className="text-base font-bold text-white">{c.nama}</span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          c.jenisKelamin === "Cowok"
                            ? "bg-sky-500/15 text-sky-300"
                            : "bg-pink-500/15 text-pink-300"
                        }`}
                      >
                        {c.jenisKelamin}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-1">
                      Kode Peserta:{" "}
                      <strong className="text-sky-400 font-mono">{c.kodePeserta}</strong> •{" "}
                      <span className="text-zinc-300">{c.namaSekolah}</span>
                    </div>
                  </div>

                  <span className="self-start sm:self-center px-4 py-1.5 rounded-lg bg-emerald-500 text-black font-bold text-xs uppercase tracking-wider shrink-0">
                    LOLOS
                  </span>
                </div>

                {c.keterangan && (
                  <div className="bg-zinc-950 border-l-2 border-amber-500 px-3.5 py-2.5 rounded-lg text-xs text-zinc-300">
                    <span className="font-bold text-amber-400 block text-[10px] uppercase mb-0.5">
                      Catatan Admin:
                    </span>
                    {c.keterangan}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getServerSession } from "@/lib/security";
import { prisma } from "@/lib/prisma";

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const ALLOWED_MIMES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Helper: verify magic numbers of image buffer
function verifyImageMagicBytes(buffer: Buffer, ext: string): boolean {
  if (buffer.length < 12) return false;

  // JPEG: FF D8 FF
  if (ext === ".jpg" || ext === ".jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (ext === ".png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  // WEBP: 'RIFF' at 0..3 and 'WEBP' at 8..11
  if (ext === ".webp") {
    const riff = buffer.toString("ascii", 0, 4);
    const webp = buffer.toString("ascii", 8, 12);
    return riff === "RIFF" && webp === "WEBP";
  }

  return false;
}

export async function POST(req: NextRequest) {
  const session = getServerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.userAccount.findUnique({ where: { id: session.userId } });
  if (!dbUser || !dbUser.isActive) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let perms: Record<string, boolean> = {};
  try {
    perms = JSON.parse(dbUser.permissions || "{}");
  } catch {
    perms = {};
  }

  const isAllowed =
    dbUser.role === "SUPER_ADMIN" ||
    Boolean(perms.manageLanding) ||
    Boolean(perms.manageMerchandise) ||
    Boolean(perms.manageRoadshow);

  if (!isAllowed) {
    return NextResponse.json({ error: "Tidak memiliki izin upload gambar." }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "File gambar tidak ditemukan." }, { status: 400 });
    }

    // 1. Strict File Size Clamp (BUG-HUNTER-02: DoS & Disk Flood Prevention)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Ukuran file terlalu besar! Maksimal ukuran gambar adalah 5 MB (File Anda: ${(file.size / (1024 * 1024)).toFixed(2)} MB).` },
        { status: 400 }
      );
    }

    const lowerName = file.name.toLowerCase();
    // 2. Strict Extension & Double Extension Inspection
    if (
      lowerName.includes(".php") ||
      lowerName.includes(".phtml") ||
      lowerName.includes(".phar") ||
      lowerName.includes(".asp") ||
      lowerName.includes(".jsp") ||
      lowerName.includes(".exe") ||
      lowerName.includes(".sh")
    ) {
      return NextResponse.json(
        { error: "SECURITY BLOCK: File script / executable dilarang keras diunggah ke server!" },
        { status: 403 }
      );
    }

    const ext = path.extname(lowerName);
    if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIMES.includes(file.type)) {
      return NextResponse.json(
        { error: "Hanya file gambar murni (JPG, JPEG, PNG, WEBP) yang diizinkan." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 3. Verify Genuine Magic Bytes
    if (!verifyImageMagicBytes(buffer, ext)) {
      return NextResponse.json(
        { error: "SECURITY BLOCK: Header biner file tidak sesuai dengan format gambar valid (File corrupt atau spoofed extension)!" },
        { status: 400 }
      );
    }

    // 4. Deep Buffer Inspection for Webshell Payloads (Scans Entire File, not just 512 bytes)
    const rawContent = buffer.toString("binary").toLowerCase();
    const dangerousPatterns = [
      "<?php",
      "<?=",
      "<script",
      "<svg",
      "eval(",
      "base64_decode(",
      "passthru(",
      "shell_exec(",
      "system(",
      "onload=",
      "onerror=",
    ];

    for (const pattern of dangerousPatterns) {
      if (rawContent.includes(pattern)) {
        await prisma.securityAuditLog.create({
          data: {
            actorName: session.fullName,
            actorRole: session.role,
            action: "UPLOAD_PAYLOAD_BLOCKED",
            details: `Pola berbahaya "${pattern}" ditemukan di dalam payload upload file "${file.name}"`,
          },
        });
        return NextResponse.json(
          { error: `SECURITY BLOCK: Terdeteksi script atau payload berbahaya (${pattern}) di dalam gambar!` },
          { status: 403 }
        );
      }
    }

    // 5. Generate collision-resistant sanitized filename
    const safeExt = ext === ".jpeg" ? ".jpg" : ext;
    const safeName = `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}${safeExt}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");

    await mkdir(uploadDir, { recursive: true });
    const filePath = path.join(uploadDir, safeName);
    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      url: `/uploads/${safeName}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Gagal mengunggah gambar: " + (err?.message || "Unknown error") },
      { status: 500 }
    );
  }
}

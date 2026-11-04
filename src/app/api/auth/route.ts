import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureSeeded } from "@/lib/seed";
import {
  generateSignedCaptcha,
  getServerSession,
  hashPassword,
  inspectPayloadForAttacks,
  normalizePhone,
  sanitizeString,
  SESSION_COOKIE_NAME,
  signSessionToken,
  validateCommitteeRegistrationInput,
  verifyPassword,
  verifySignedCaptcha,
} from "@/lib/security";
import { firebasePush, UMUM_RTDB_URL } from "@/lib/firebase";

export async function GET(req: NextRequest) {
  // Fast path: Endpoint to obtain cryptographically signed Captcha for client form
  // Evaluated BEFORE database seeding or locks so it returns instantaneously (<1ms)
  const { searchParams } = new URL(req.url);
  if (searchParams.get("action") === "captcha") {
    const captcha = generateSignedCaptcha();
    return NextResponse.json(
      {
        success: true,
        code: captcha.code,
        token: captcha.token,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  }

  await ensureSeeded();

  const session = getServerSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  // Refresh permissions from DB in case Super Admin updated them live
  const dbUser = await prisma.userAccount.findUnique({
    where: { id: session.userId },
  });

  if (!dbUser || !dbUser.isActive) {
    const res = NextResponse.json({ authenticated: false, user: null });
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  }

  let parsedPerms = {};
  try {
    parsedPerms = JSON.parse(dbUser.permissions || "{}");
  } catch {
    parsedPerms = {};
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      userId: dbUser.id,
      username: dbUser.username,
      email: dbUser.email,
      phone: dbUser.phone,
      fullName: dbUser.fullName,
      angkatan: dbUser.angkatan,
      role: dbUser.role,
      permissions: parsedPerms,
      assignedSchoolId: dbUser.assignedSchoolId,
    },
  });
}

export async function POST(req: NextRequest) {
  await ensureSeeded();
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local-client";

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
  }

  // 1. Cracker / Pentester WAF Inspection (SQLi, XSS, PHP, Prototype Pollution)
  const wafCheck = inspectPayloadForAttacks(body);
  if (!wafCheck.safe) {
    await prisma.securityAuditLog.create({
      data: {
        actorName: String(body?.username || body?.email || "Unknown"),
        actorRole: "UNAUTHENTICATED",
        action: "WAF_BLOCKED_ATTACK",
        details: wafCheck.reason || "Malicious payload blocked",
        ipAddress: ip,
      },
    });
    return NextResponse.json(
      {
        error: "SECURITY ALERT: Permintaan ditolak oleh sistem proteksi anti-injeksi (WAF). Percobaan ini telah dicatat.",
      },
      { status: 403 }
    );
  }

  const action = body?.action;

  // =========================================================================
  // ACTION: GET SIGNED CAPTCHA TOKEN (BUG-HUNTER-01)
  // =========================================================================
  if (action === "captcha" || action === "get_captcha") {
    const captcha = generateSignedCaptcha();
    return NextResponse.json(
      {
        success: true,
        code: captcha.code,
        token: captcha.token,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
          Pragma: "no-cache",
        },
      }
    );
  }

  // =========================================================================
  // ACTION: LIVE CHECK DUPLICATE EMAIL / PHONE / USERNAME ("ANTISIPASI BOHONG")
  // Fast indexed queries to prevent table-scan DOS (BUG-HUNTER-08)
  // =========================================================================
  if (action === "check_duplicate") {
    const rawEmail = String(body.email || "").trim().toLowerCase();
    const rawPhone = normalizePhone(String(body.phone || ""));
    const rawUsername = String(body.username || "").trim().toLowerCase().replace(/\s+/g, "_");

    const [emailOwner, phoneOwner, usernameOwner] = await Promise.all([
      rawEmail
        ? prisma.userAccount.findFirst({
            where: { email: rawEmail },
            select: { id: true },
          })
        : null,
      rawPhone
        ? prisma.userAccount.findFirst({
            where: {
              OR: [{ phone: rawPhone }, { phone: rawPhone.replace(/^0/, "62") }],
            },
            select: { id: true },
          })
        : null,
      rawUsername
        ? prisma.userAccount.findFirst({
            where: { username: rawUsername },
            select: { id: true },
          })
        : null,
    ]);

    // Also check anti-fake rules for phone & email if provided
    let phoneError: string | null = null;
    if (rawPhone) {
      if (!/^08[1-9][0-9]{7,10}$/.test(rawPhone)) {
        phoneError = "Nomor telepon harus diawali 08 / 628 dan terdiri dari 10-13 digit angka aktif.";
      } else {
        const tail = rawPhone.slice(3);
        if (
          /^(\d)\1{5,}$/.test(tail) ||
          "0123456789012345".includes(tail) ||
          "9876543210987654".includes(tail)
        ) {
          phoneError = "Terdeteksi pola nomor palsu/berulang! Gunakan nomor aktif asli.";
        }
      }
    }

    let emailError: string | null = null;
    if (rawEmail) {
      const emailRegex = /^[a-zA-Z0-9._%+-]{3,}@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(rawEmail)) {
        emailError = "Format email belum valid (contoh: nama@gmail.com).";
      } else {
        const [localPart, domainPart] = rawEmail.split("@");
        const blockedLocal = ["test", "testing", "admin", "user", "panitia", "asdf", "qwerty", "12345", "bohong", "palsu", "abcde"];
        const blockedDomains = ["test.com", "example.com", "mailinator.com", "tempmail.com", "fake.com", "a.com"];
        if (blockedLocal.includes(localPart) || blockedDomains.includes(domainPart) || /^(\w)\1{3,}$/.test(localPart)) {
          emailError = "Email terdeteksi palsu/dummy! Gunakan email asli Anda.";
        }
      }
    }

    return NextResponse.json({
      emailTaken: Boolean(emailOwner),
      phoneTaken: Boolean(phoneOwner),
      usernameTaken: Boolean(usernameOwner),
      phoneError,
      emailError,
    });
  }

  // =========================================================================
  // ACTION: REGISTER COMMITTEE MEMBER (PANITIA DAFTAR DULU)
  // =========================================================================
  if (action === "register") {
    // 1. Enforce Server-Side Captcha Verification (BUG-HUNTER-01)
    const captchaCheck = verifySignedCaptcha(body.captchaInput, body.captchaToken);
    if (!captchaCheck.valid) {
      return NextResponse.json(
        { error: captchaCheck.reason || "Kode verifikasi (Captcha) salah atau kedaluwarsa!" },
        { status: 400 }
      );
    }

    const fullName = sanitizeString(String(body.fullName || ""));
    const rawUsername = sanitizeString(String(body.username || "")).toLowerCase().replace(/\s+/g, "_");
    const rawPhone = String(body.phone || "").trim();
    const angkatan = sanitizeString(String(body.angkatan || ""));
    const rawEmail = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const requestedTask = String(body.requestedTask || "INPUT_BB"); // INPUT_BB | INPUT_TB | INPUT_REGISTRASI

    if (!fullName || !rawUsername || !rawPhone || !angkatan || !rawEmail || !password) {
      return NextResponse.json(
        { error: "Semua kolom (Nama Lengkap, Username, No. Telp, PPI Angkatan, Email, dan Password) wajib diisi!" },
        { status: 400 }
      );
    }

    if (rawUsername.length > 20 || rawUsername.length < 3) {
      return NextResponse.json(
        { error: "Username harus 3 - 20 karakter." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password minimal 6 karakter demi keamanan akun." },
        { status: 400 }
      );
    }

    // Anti-Fake / Antisipasi Bohong Validation
    const validation = validateCommitteeRegistrationInput({
      fullName,
      phone: rawPhone,
      email: rawEmail,
      angkatan,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const normalizedPhone = validation.normalizedPhone;
    const normalizedEmail = validation.normalizedEmail;

    // Fast indexed duplicate checks (BUG-HUNTER-08)
    const [existingUser, existingEmail, existingPhone] = await Promise.all([
      prisma.userAccount.findFirst({
        where: { username: rawUsername },
        select: { id: true },
      }),
      prisma.userAccount.findFirst({
        where: { email: normalizedEmail },
        select: { id: true },
      }),
      prisma.userAccount.findFirst({
        where: {
          OR: [
            { phone: normalizedPhone },
            { phone: normalizedPhone.replace(/^0/, "62") },
          ],
        },
        select: { id: true },
      }),
    ]);

    if (existingUser) {
      return NextResponse.json(
        { error: `Username "${rawUsername}" sudah digunakan oleh panitia lain! Silakan pilih username lain.` },
        { status: 409 }
      );
    }

    if (existingEmail) {
      return NextResponse.json(
        { error: `Email "${normalizedEmail}" sudah terdaftar! Satu email hanya berlaku untuk 1 akun panitia.` },
        { status: 409 }
      );
    }

    if (existingPhone) {
      return NextResponse.json(
        { error: `Nomor Telepon "${normalizedPhone}" sudah terdaftar! Tidak boleh menggunakan nomor telepon yang sama.` },
        { status: 409 }
      );
    }

    // Every registered panitia gets full access to Registrasi, Tabel BB, and Tabel TB (after scanning Super Admin QR)
    const permissions = {
      inputBB: true,
      inputTB: true,
      inputRegistrasi: true,
      manageRoadshow: false,
      manageMerchandise: false,
      manageLanding: false,
      manageReviews: false,
    };

    const createdUser = await prisma.userAccount.create({
      data: {
        username: rawUsername,
        email: normalizedEmail,
        phone: normalizedPhone,
        passwordHash: hashPassword(password),
        fullName,
        angkatan,
        role: "USER",
        permissions: JSON.stringify(permissions),
        assignedSchoolId: null, // Must scan Super Admin QR first!
        isActive: true,
      },
    });

    await prisma.securityAuditLog.create({
      data: {
        actorName: fullName,
        actorRole: "USER",
        action: "REGISTER_COMMITTEE",
        details: `Pendaftaran panitia baru: ${fullName} (Akt ${angkatan}, Telp: ${normalizedPhone}, Email: ${normalizedEmail}, Tugas: ${requestedTask})`,
        ipAddress: ip,
      },
    });

    const token = signSessionToken({
      userId: createdUser.id,
      username: createdUser.username,
      email: createdUser.email,
      phone: createdUser.phone,
      fullName: createdUser.fullName,
      angkatan: createdUser.angkatan,
      role: "USER",
      permissions,
      assignedSchoolId: createdUser.assignedSchoolId,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        userId: createdUser.id,
        username: createdUser.username,
        email: createdUser.email,
        phone: createdUser.phone,
        fullName: createdUser.fullName,
        angkatan: createdUser.angkatan,
        role: createdUser.role,
        permissions,
        assignedSchoolId: createdUser.assignedSchoolId,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 12 * 60 * 60,
    });

    return response;
  }

  // =========================================================================
  // ACTION: LOGIN (Supports Username, Email, or Phone + Password)
  // =========================================================================
  if (action === "login") {
    // 1. Enforce Server-Side Captcha Verification (BUG-HUNTER-01)
    const captchaCheck = verifySignedCaptcha(body.captchaInput, body.captchaToken);
    if (!captchaCheck.valid) {
      return NextResponse.json(
        { error: captchaCheck.reason || "Kode verifikasi (Captcha) salah atau kedaluwarsa!" },
        { status: 400 }
      );
    }

    const identifier = String(body.username || "").trim();
    const password = String(body.password || "");

    if (!identifier || !password) {
      return NextResponse.json({ error: "Username/Email dan password wajib diisi." }, { status: 400 });
    }
    if (!identifier.includes("@") && identifier.length > 20) {
      return NextResponse.json({ error: "Username maksimal 20 karakter." }, { status: 400 });
    }

    // Dual-Key Anti-Brute-Force Lockout (BUG-HUNTER-03)
    // Tracks attempts both by IP (against rapid bot attacks) AND by Target Username (against distributed proxy attacks)
    const cleanId = identifier.toLowerCase().replace(/\s+/g, "_");
    const ipKey = `ip_${ip.replace(/[^a-zA-Z0-9_.-]/g, "_")}`;
    const userKey = `user_${cleanId}`;

    const [ipRecord, userRecord] = await Promise.all([
      prisma.loginAttempt.findUnique({ where: { ipOrFingerprint: ipKey } }),
      prisma.loginAttempt.findUnique({ where: { ipOrFingerprint: userKey } }),
    ]);

    const activeLock =
      ipRecord?.lockedUntil && ipRecord.lockedUntil > new Date()
        ? ipRecord
        : userRecord?.lockedUntil && userRecord.lockedUntil > new Date()
        ? userRecord
        : null;

    if (activeLock?.lockedUntil) {
      const remainingSec = Math.ceil((activeLock.lockedUntil.getTime() - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: `Terlalu banyak percobaan gagal (Anti Brute-Force). Akun/IP dikunci sementara selama ${remainingSec} detik demi keamanan.`,
        },
        { status: 429 }
      );
    }

    // Direct indexed query for user (BUG-HUNTER-08)
    const normalizedIdPhone = normalizePhone(identifier);
    const user = await prisma.userAccount.findFirst({
      where: {
        OR: [
          { username: cleanId },
          { username: identifier },
          { email: identifier.toLowerCase() },
          ...(normalizedIdPhone.length >= 10
            ? [
                { phone: normalizedIdPhone },
                { phone: normalizedIdPhone.replace(/^0/, "62") },
              ]
            : []),
        ],
      },
    });

    if (!user || !user.isActive || !verifyPassword(password, user.passwordHash)) {
      const newAttempts = Math.max(ipRecord?.attempts || 0, userRecord?.attempts || 0) + 1;
      const shouldLock = newAttempts >= 5;
      const lockedUntil = shouldLock ? new Date(Date.now() + 5 * 60 * 1000) : null; // 5 minutes lockout

      await Promise.all([
        prisma.loginAttempt.upsert({
          where: { ipOrFingerprint: ipKey },
          update: {
            attempts: shouldLock ? 0 : newAttempts,
            lockedUntil,
            lastAttemptAt: new Date(),
          },
          create: {
            ipOrFingerprint: ipKey,
            attempts: newAttempts,
            lockedUntil,
          },
        }),
        prisma.loginAttempt.upsert({
          where: { ipOrFingerprint: userKey },
          update: {
            attempts: shouldLock ? 0 : newAttempts,
            lockedUntil,
            lastAttemptAt: new Date(),
          },
          create: {
            ipOrFingerprint: userKey,
            attempts: newAttempts,
            lockedUntil,
          },
        }),
      ]);

      await prisma.securityAuditLog.create({
        data: {
          actorName: identifier,
          actorRole: "GUEST",
          action: "LOGIN_FAILED",
          details: shouldLock
            ? "5x gagal login berturut-turut -> Auto Lockout aktif (Dual IP + User Key)"
            : `Gagal login (percobaan ke-${newAttempts}/5)`,
          ipAddress: ip,
        },
      });

      return NextResponse.json(
        {
          error: shouldLock
            ? "Akses dikunci selama 5 menit karena 5x kesalahan kredensial."
            : `Username/Email atau Password salah! (Sisa kesempatan: ${5 - newAttempts}x)`,
        },
        { status: 401 }
      );
    }

    // Reset attempts on successful login cleanly using deleteMany to avoid not-found errors
    await prisma.loginAttempt
      .deleteMany({
        where: {
          ipOrFingerprint: { in: [ipKey, userKey] },
        },
      })
      .catch(() => {});

    // For USER (Panitia), require fresh QR scan from Super Admin on each login session
    let effectiveAssignedSchoolId = user.assignedSchoolId;
    if (user.role === "USER") {
      await prisma.userAccount.update({
        where: { id: user.id },
        data: { assignedSchoolId: null },
      });
      effectiveAssignedSchoolId = null;
    }

    let permissions = {};
    try {
      permissions = JSON.parse(user.permissions || "{}");
    } catch {
      permissions = {};
    }

    const token = signSessionToken({
      userId: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone,
      fullName: user.fullName,
      angkatan: user.angkatan,
      role: user.role as "SUPER_ADMIN" | "ADMIN" | "USER",
      permissions,
      assignedSchoolId: effectiveAssignedSchoolId,
    });

    await prisma.securityAuditLog.create({
      data: {
        actorName: user.fullName,
        actorRole: user.role,
        action: "LOGIN_SUCCESS",
        details: `Login berhasil sebagai ${user.role}`,
        ipAddress: ip,
      },
    });

    const response = NextResponse.json({
      success: true,
      user: {
        userId: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        fullName: user.fullName,
        angkatan: user.angkatan,
        role: user.role,
        permissions,
        assignedSchoolId: effectiveAssignedSchoolId,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 12 * 60 * 60,
    });

    return response;
  }

  // =========================================================================
  // ACTION: LOGOUT (Optional review OR 5-second skip countdown!)
  // =========================================================================
  if (action === "logout") {
    const session = getServerSession();
    if (session) {
      if (session.role === "USER") {
        // Clear scanned school session on logout so next login requires scanning Super Admin QR again
        await prisma.userAccount
          .update({
            where: { id: session.userId },
            data: { assignedSchoolId: null },
          })
          .catch(() => {});

        const rating = Number(body.rating);
        const pesan = sanitizeString(String(body.pesan || "")).slice(0, 50);

        // Save review only if panitia chose to write one (not mandatory after 5s countdown)
        if (pesan && pesan.length >= 2 && !isNaN(rating) && rating >= 1 && rating <= 5) {
          const createdReview = await prisma.review.create({
            data: {
              nama: session.fullName,
              kategori: "ppi",
              angkatan: session.angkatan !== "-" ? session.angkatan : "Panitia",
              rating: Math.min(5, Math.max(1, Math.round(rating))),
              pesan,
              source: "LOGOUT_ROADSHOW",
              isVisible: true,
            },
          });

          await firebasePush(UMUM_RTDB_URL, "penilaian", {
            nama: createdReview.nama,
            rating: createdReview.rating,
            pesan: createdReview.pesan,
            kategori: "ppi",
            angkatan: createdReview.angkatan,
            waktu: new Date().toLocaleString("id-ID"),
          });
        }
      }

      await prisma.securityAuditLog.create({
        data: {
          actorName: session.fullName,
          actorRole: session.role,
          action: "LOGOUT",
          details: "Logout dari sistem",
          ipAddress: ip,
        },
      });
    }

    const res = NextResponse.json({ success: true });
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

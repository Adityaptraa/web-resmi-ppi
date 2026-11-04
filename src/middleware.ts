import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const fullUrl = `${pathname}${search}`.toLowerCase();

  // Strictly block any request attempting to access or inject .php files
  if (fullUrl.includes(".php")) {
    return new NextResponse(
      JSON.stringify({
        error: "ACCESS DENIED: Semua akses dan eksekusi file .php diblokir oleh sistem keamanan.",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};


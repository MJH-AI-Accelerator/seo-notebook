import { NextResponse, type NextRequest } from "next/server";

// MJH VPN / approved office egress IPs. Override via the ALLOWED_IPS env var
// (comma-separated). Fails CLOSED: if unset, falls back to the known VPN/office
// IPs rather than allowing all traffic.
//   50.174.5.234  — MJH HQ
//   50.172.84.70  — Boca Raton, FL
//   76.213.153.25 — Boca Raton, FL
//   12.169.148.18 — Nashville, TN
//   173.46.66.227 — Nashville, TN
const ALLOWED_IPS = (
  process.env.ALLOWED_IPS ||
  "50.174.5.234,50.172.84.70,76.213.153.25,12.169.148.18,173.46.66.227"
)
  .split(",")
  .map((ip) => ip.trim())
  .filter(Boolean);

const PUBLIC_PATHS = ["/blocked"];

function captureReturnTo(url: URL): string | null {
  if (url.pathname === "/" || url.pathname.startsWith("/blocked")) return null;
  return `${url.pathname}${url.search}`;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Skip the gate only in local development.
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  const ip =
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  if (!ALLOWED_IPS.includes(ip)) {
    // API routes get JSON (fetch following an HTML redirect throws); pages redirect.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Access denied — connect to corporate VPN", code: "IP_NOT_ALLOWED" },
        { status: 403 }
      );
    }
    const blockedUrl = request.nextUrl.clone();
    blockedUrl.pathname = "/blocked";
    const returnTo = captureReturnTo(request.nextUrl);
    blockedUrl.search = returnTo ? `?next=${encodeURIComponent(returnTo)}` : "";
    return NextResponse.redirect(blockedUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|blocked).*)",
  ],
};

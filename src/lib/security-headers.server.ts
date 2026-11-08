/**
 * Security headers applied to every Worker response. Import in app/src/server.ts
 * and wrap the final response: `return applySecurityHeaders(response)`.
 */
export function applySecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  // A route can set its own policy (site preview, pay page) via x-volgo-csp.
  const eigen = headers.get("x-volgo-csp");
  headers.delete("x-volgo-csp");
  // Eigen Cloudflare: wij bepalen zelf dat Volgo niet in andermans iframe mag (clickjacking).
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; " +
      // Meta Pixel and Google tag: only loaded after the visitor accepts (see components/volgo/tracking.tsx).
      "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com https://connect.facebook.net https://www.googletagmanager.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' data: https://fonts.gstatic.com; " +
      "img-src 'self' data: https:; media-src 'self' blob: https:; " +
      "connect-src 'self' https:; " +
      "frame-src 'self'; frame-ancestors 'self'; " +
      "base-uri 'self'; form-action 'self'",
  );
  if (eigen) headers.set("Content-Security-Policy", eigen);
  headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("X-XSS-Protection", "0");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

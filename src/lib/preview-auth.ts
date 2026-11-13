/**
 * Sign-in on Hasanat previews.
 *
 * Managed-hosting previews run on pages.dev, outside hasanat.dev, so the shared Hasanat session cookie never reaches
 * them. Cloudflare Access protects every preview instead: it checks the visitor's email before the request reaches the
 * app, then passes a signed token in the Cf-Access-Jwt-Assertion header. On previews only, the hosting runner sets
 * HASANAT_ACCESS_TEAM and HASANAT_ACCESS_AUD, and this helper turns that verified email into the signed-in user.
 *
 * Production never has these values. A token also counts only with a valid signature from that Access team and for
 * that application, so the header cannot be forged on a preview or anywhere else.
 */

type AccessKey = JsonWebKey & { kid?: string };

let cached: { team: string; keys: AccessKey[]; fetched: number } | null = null;

function bytes(part: string) {
  const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")), (char) =>
    char.charCodeAt(0),
  );
}

// Access rotates its signing keys, so a token may name a key newer than the cached list: fetch again, at most every 5 minutes.
async function signingKey(team: string, kid: string): Promise<AccessKey | undefined> {
  const age = cached?.team === team ? Date.now() - cached.fetched : Number.POSITIVE_INFINITY;
  const known = age < 60 * 60 * 1000 ? cached?.keys.find((item) => item.kid === kid) : undefined;
  if (known || age < 5 * 60 * 1000) return known;
  const response = await fetch(`${team}/cdn-cgi/access/certs`);
  if (!response.ok) return undefined;
  const { keys } = (await response.json()) as { keys?: AccessKey[] };
  cached = { team, keys: Array.isArray(keys) ? keys : [], fetched: Date.now() };
  return cached.keys.find((item) => item.kid === kid);
}

/** The visitor that Cloudflare Access verified on a preview, or null everywhere else. `env` is the app's runtime env. */
export async function previewUser(request: Request, env: object): Promise<App.Locals["user"]> {
  const { HASANAT_ACCESS_TEAM: team, HASANAT_ACCESS_AUD: audience } = env as {
    HASANAT_ACCESS_TEAM?: unknown;
    HASANAT_ACCESS_AUD?: unknown;
  };
  if (
    typeof team !== "string" ||
    typeof audience !== "string" ||
    !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(team) ||
    !/^[a-f0-9]{64}$/.test(audience)
  )
    return null;
  const [head, body, signature, extra] = (
    request.headers.get("cf-access-jwt-assertion") ?? ""
  ).split(".");
  if (!head || !body || !signature || extra !== undefined) return null;
  try {
    const header = JSON.parse(new TextDecoder().decode(bytes(head)));
    const claims = JSON.parse(new TextDecoder().decode(bytes(body)));
    if (header.alg !== "RS256" || typeof header.kid !== "string") return null;
    const key = await signingKey(team, header.kid);
    if (!key) return null;
    const verifier = await crypto.subtle.importKey(
      "jwk",
      key,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const signed = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      verifier,
      bytes(signature),
      new TextEncoder().encode(`${head}.${body}`),
    );
    const now = Math.floor(Date.now() / 1000);
    const audiences: unknown[] = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (
      !signed ||
      claims.iss !== team ||
      !audiences.includes(audience) ||
      typeof claims.exp !== "number" ||
      claims.exp <= now ||
      (typeof claims.nbf === "number" && claims.nbf > now + 60) ||
      typeof claims.email !== "string" ||
      !claims.email.includes("@")
    )
      return null;
    const email = claims.email.toLowerCase();
    return { id: `preview:${email}`, name: email.split("@")[0], email };
  } catch {
    return null;
  }
}

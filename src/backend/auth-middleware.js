// Sanitized excerpt from the Lore Studios Express backend.
// Validates Supabase access tokens before protected operations.

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

async function getUserFromToken(accessToken) {
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function requireAuth(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication required",
    });
  }

  const accessToken = authorization.slice("Bearer ".length);

  try {
    const authUser = await getUserFromToken(accessToken);

    if (!authUser) {
      return res.status(401).json({
        error: "Invalid or expired session",
      });
    }

    req.user = authUser;
    return next();
  } catch (error) {
    console.error("Authentication failed:", error);

    return res.status(500).json({
      error: "Unable to verify session",
    });
  }
}

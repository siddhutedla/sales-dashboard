import axios from "axios";
import { prisma } from "../prisma";

const accountsUrl = process.env.ZOHO_ACCOUNTS_URL || "https://accounts.zoho.com";

// Self Client flow - no browser redirect/consent screen. An admin generates
// a one-time Grant Token directly in Zoho's API Console (Self Client tab)
// and pastes it in; this exchanges it once for a long-lived refresh token.
// Self Client tokens aren't tied to a redirect_uri, so it's omitted here.
export async function exchangeGrantToken(grantToken: string): Promise<void> {
  let response;
  try {
    response = await axios.post(`${accountsUrl}/oauth/v2/token`, null, {
      params: {
        grant_type: "authorization_code",
        client_id: process.env.ZOHO_CLIENT_ID,
        client_secret: process.env.ZOHO_CLIENT_SECRET,
        code: grantToken,
      },
    });
  } catch (err) {
    // Surface Zoho's actual error body (e.g. "invalid_client") instead of
    // axios's generic "Request failed with status code 400".
    const detail =
      axios.isAxiosError(err) && err.response?.data
        ? JSON.stringify(err.response.data)
        : String(err);
    throw new Error(detail);
  }

  // Zoho's token endpoint also returns HTTP 200 with an {error: "..."} body
  // for things like an expired/already-used grant token, rather than a
  // non-2xx status - axios won't treat that as a failure on its own.
  if (response.data.error || !response.data.refresh_token) {
    throw new Error(response.data.error || "Zoho did not return a refresh token");
  }

  const expiresAt = new Date(Date.now() + response.data.expires_in * 1000);
  await prisma.zohoToken.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt,
    },
    update: {
      accessToken: response.data.access_token,
      refreshToken: response.data.refresh_token,
      expiresAt,
    },
  });
}

export async function getValidAccessToken(): Promise<string> {
  const token = await prisma.zohoToken.findUnique({ where: { id: 1 } });
  if (!token) throw new Error("Zoho not connected");

  if (token.expiresAt > new Date()) {
    return token.accessToken;
  }

  // Refresh token
  const response = await axios.post(`${accountsUrl}/oauth/v2/token`, null, {
    params: {
      grant_type: "refresh_token",
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      refresh_token: token.refreshToken,
    },
  });

  const newExpiry = new Date(Date.now() + response.data.expires_in * 1000);
  await prisma.zohoToken.update({
    where: { id: 1 },
    data: {
      accessToken: response.data.access_token,
      expiresAt: newExpiry,
    },
  });

  return response.data.access_token;
}

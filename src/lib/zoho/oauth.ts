import axios from "axios";
import { prisma } from "../prisma";

export async function exchangeCodeForToken(code: string): Promise<void> {
  const response = await axios.post("https://accounts.zoho.com/oauth/v2/token", null, {
    params: {
      grant_type: "authorization_code",
      client_id: process.env.ZOHO_CLIENT_ID,
      client_secret: process.env.ZOHO_CLIENT_SECRET,
      redirect_uri: process.env.ZOHO_REDIRECT_URI,
      code,
    },
  });

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
  const response = await axios.post("https://accounts.zoho.com/oauth/v2/token", null, {
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

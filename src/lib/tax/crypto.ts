import "server-only";
import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.TIN_ENCRYPTION_KEY;
  if (!raw) throw new Error("TIN_ENCRYPTION_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("TIN_ENCRYPTION_KEY must decode to 32 bytes");
  return key;
}

// Stored as iv:authTag:ciphertext, each base64. The key never leaves this
// process - Postgres only ever sees ciphertext.
export function encryptTin(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv, authTag, ciphertext].map((b) => b.toString("base64")).join(":");
}

export function decryptTin(encrypted: string): string {
  const [ivB64, authTagB64, ciphertextB64] = encrypted.split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) throw new Error("Malformed encrypted TIN");

  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

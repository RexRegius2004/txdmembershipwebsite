import crypto from "node:crypto";

const COOKIE_NAME = "member_onboarding_credentials";
const COOKIE_MAX_AGE = 60 * 5; // 5 minutes

type TemporaryCredentials = {
  memberId: string;
  memberNumber: string;
  fullName: string;
  email: string;
  temporaryPassword: string;
};

function getEncryptionKey() {
  const secret = process.env.TEMP_PASSWORD_SECRET;

  if (!secret) {
    throw new Error("Missing TEMP_PASSWORD_SECRET");
  }

  return crypto
    .createHash("sha256")
    .update(secret)
    .digest();
}

export function encryptTemporaryCredentials(
  credentials: TemporaryCredentials
) {
  const key = getEncryptionKey();

  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const plaintext = JSON.stringify(credentials);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("base64url"),
    authTag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptTemporaryCredentials(
  encryptedValue: string
): TemporaryCredentials | null {
  try {
    const parts = encryptedValue.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const [ivEncoded, authTagEncoded, encryptedEncoded] = parts;

    const iv = Buffer.from(ivEncoded, "base64url");
    const authTag = Buffer.from(authTagEncoded, "base64url");
    const encrypted = Buffer.from(encryptedEncoded, "base64url");

    const key = getEncryptionKey();

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key,
      iv
    );

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return JSON.parse(
      decrypted.toString("utf8")
    ) as TemporaryCredentials;
  } catch {
    return null;
  }
}

export { COOKIE_NAME, COOKIE_MAX_AGE };
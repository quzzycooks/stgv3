/**
 * Local-only "Quick Unlock" using the platform authenticator (Face ID /
 * Fingerprint / Windows Hello). There is no server-side WebAuthn relying
 * party in stignit-api — this never touches the network. It exists purely
 * as a device-level gate in front of an already-issued session, exactly
 * like a banking app's "unlock with biometrics" screen. The OS prompt
 * succeeding or failing is the entire signal; nothing is verified remotely.
 */

const STORAGE_KEY = "stignit.quickunlock.credentialId";

function toBase64Url(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64Url(value: string): BufferSource {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export function hasQuickUnlockCredential(): boolean {
  return Boolean(localStorage.getItem(STORAGE_KEY));
}

export function clearQuickUnlockCredential(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export async function registerQuickUnlock(userId: string, label: string): Promise<boolean> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userIdBytes = new TextEncoder().encode(userId);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Stignit", id: window.location.hostname },
        user: { id: userIdBytes, name: label, displayName: label },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: 60_000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;

    if (!credential) return false;
    localStorage.setItem(STORAGE_KEY, toBase64Url(credential.rawId));
    return true;
  } catch {
    return false;
  }
}

export async function verifyQuickUnlock(): Promise<boolean> {
  const storedId = localStorage.getItem(STORAGE_KEY);
  if (!storedId) return false;

  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: fromBase64Url(storedId), type: "public-key" }],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    return Boolean(assertion);
  } catch {
    return false;
  }
}

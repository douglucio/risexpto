import { EncryptJWT, jwtDecrypt } from 'jose';

const encoder = new TextEncoder();
function key(secret: string): Uint8Array {
  return encoder.encode(secret).slice(0, 32);
}

export async function seal<T extends object>(
  value: T,
  secret: string,
  ttlSeconds: number,
  audience: string,
): Promise<string> {
  return new EncryptJWT({ value })
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setAudience(audience)
    .setExpirationTime(`${ttlSeconds}s`)
    .encrypt(key(secret));
}

export async function unseal<T>(token: string, secret: string, audience: string): Promise<T> {
  const { payload } = await jwtDecrypt(token, key(secret), { audience });
  return payload.value as T;
}

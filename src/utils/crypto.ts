/**
 * Módulo de Cifrado y Compartición Segura (Web Crypto API - AES-GCM)
 * Permite empaquetar mediciones en URLs sin que pasen por ningún servidor.
 */

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Deriva una clave AES-GCM a partir de un PIN y un salt usando PBKDF2
 */
async function deriveKey(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations: 100_000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Cifra cualquier objeto con AES-GCM usando el PIN como contraseña
 */
export async function encryptPayload(payload: unknown, pin: string): Promise<string> {
  const json = JSON.stringify(payload);
  const enc = new TextEncoder();
  const plaintext = enc.encode(json);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    plaintext
  );

  // Empaquetar: salt (16 bytes) + iv (12 bytes) + ciphertext
  const combined = new Uint8Array(salt.byteLength + iv.byteLength + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.byteLength);
  combined.set(new Uint8Array(ciphertext), salt.byteLength + iv.byteLength);

  return arrayBufferToBase64Url(combined.buffer);
}

/**
 * Descifra el payload en base64url usando el PIN
 */
export async function decryptPayload<T = unknown>(
  cipherBase64Url: string,
  pin: string
): Promise<T> {
  const combinedBuffer = base64UrlToArrayBuffer(cipherBase64Url);
  const combined = new Uint8Array(combinedBuffer);

  if (combined.length < 28) {
    throw new Error('Carga cifrada corrupta o incompleta.');
  }

  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);

  const key = await deriveKey(pin, salt);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    ciphertext
  );

  const dec = new TextDecoder();
  const json = dec.decode(decrypted);
  return JSON.parse(json) as T;
}

/**
 * Genera el enlace de compartición con el payload en el hash '#'
 */
export async function createShareableLink(
  payload: unknown,
  pin: string,
  customOrigin?: string
): Promise<string> {
  const encrypted = await encryptPayload(payload, pin);
  const origin =
    customOrigin ||
    (typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : '');
  return `${origin}#import=${encrypted}`;
}

/**
 * Extrae el token cifrado del hash de la URL si existe
 */
export function extractImportTokenFromHash(hashStr: string = ''): string | null {
  const hash = hashStr.startsWith('#') ? hashStr.slice(1) : hashStr;
  const params = new URLSearchParams(hash);
  return params.get('import');
}

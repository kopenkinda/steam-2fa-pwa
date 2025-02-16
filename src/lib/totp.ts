/**
 * This file is a direct typescript, browser compatible, port of the node-steam-totp library.
 * @see https://github.com/DoctorMcKay/node-steam-totp/blob/master/index.js
 */

/* Returns the current local Unix time.
 * @param {number} [timeOffset=0] - Seconds to add to the returned time.
 * @returns {number}
 */
export function time(timeOffset: number = 0): number {
  return Math.floor(Date.now() / 1000) + timeOffset;
}

/**
 * Generates an HMAC using the SHA‑1 algorithm.
 * @param {ArrayBuffer} secret - The shared secret as an ArrayBuffer.
 * @param {ArrayBuffer} buffer - The data to sign.
 * @returns {Promise<ArrayBuffer>}
 */
async function generateHmac(
  secret: ArrayBuffer,
  buffer: ArrayBuffer
): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  return await crypto.subtle.sign("HMAC", key, buffer);
}

/**
 * Converts a Uint8Array into a base64 encoded string.
 * @param {Uint8Array} buffer - The buffer to convert.
 * @returns {string}
 */
function arrayBufferToBase64(buffer: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

/**
 * Converts a hex string to an ArrayBuffer.
 * @param {string} hex - The hex string.
 * @returns {ArrayBuffer}
 */
function hexToArrayBuffer(hex: string): ArrayBuffer {
  const typedArray = new Uint8Array(hex.length / 2);
  for (let i = 0; i < typedArray.length; i++) {
    typedArray[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return typedArray.buffer;
}

/**
 * Converts a base64 string to an ArrayBuffer.
 * @param {string} base64 - The base64‑encoded string.
 * @returns {ArrayBuffer}
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryStr = atob(base64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Converts a secret (hex string, base64 string, ArrayBuffer, or TypedArray) into an ArrayBuffer.
 * @param {ArrayBuffer | string} secret - The secret to "bufferize."
 * @returns {ArrayBuffer}
 */
function bufferizeSecret(secret: ArrayBuffer | string): ArrayBuffer {
  if (typeof secret === "string") {
    // Check if it's a hex string (40 hex characters)
    if (/^[0-9a-f]{40}$/i.test(secret)) {
      return hexToArrayBuffer(secret);
    } else {
      // Assume it's base64
      return base64ToArrayBuffer(secret);
    }
  }
  if (secret instanceof ArrayBuffer) return secret;
  if (ArrayBuffer.isView(secret)) {
    const s = secret as ArrayBufferView;
    return s.buffer;
  }
  throw new Error("Invalid secret type");
}

/**
 * Generate a Steam-style TOTP authentication code.
 * @param {ArrayBuffer | string} secret - Your TOTP shared secret as an ArrayBuffer, hex, or base64.
 * @param {number} [timeOffset=0] - Seconds to offset the current time.
 * @returns {Promise<string>}
 */
export async function generateAuthCode(
  secret: ArrayBuffer | string,
  timeOffset: number = 0
): Promise<string> {
  secret = bufferizeSecret(secret);

  const t = time(timeOffset);

  // Create an 8‑byte buffer and write:
  //   - 0 as the first 4 bytes,
  //   - floor(t/30) as the last 4 bytes.
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(0, 0);
  view.setUint32(4, Math.floor(t / 30));

  // Compute HMAC‑SHA1 of the buffer.
  const hmacBuffer = await generateHmac(secret, buffer);
  const hmac = new Uint8Array(hmacBuffer);

  // Use dynamic truncation as in TOTP.
  const start = hmac[19] & 0x0f;
  const codeSlice = hmac.slice(start, start + 4);
  const view2 = new DataView(codeSlice.buffer);
  let fullcode = view2.getUint32(0) & 0x7fffffff;

  const chars = "23456789BCDFGHJKMNPQRTVWXY";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(fullcode % chars.length);
    fullcode = Math.floor(fullcode / chars.length);
  }
  return code;
}
// Alias for generateAuthCode
export const getAuthCode = generateAuthCode;

/**
 * Generate a base64 confirmation key for use with mobile trade confirmations.
 * @param {ArrayBuffer | string} identitySecret - The identity secret as an ArrayBuffer, hex, or base64.
 * @param {number} time - Unix time (typically the current time).
 * @param {string} [tag] - An identifier tag (e.g. "conf", "details", "allow", "cancel").
 * @returns {Promise<string>}
 */
export async function generateConfirmationKey(
  identitySecret: ArrayBuffer | string,
  time: number,
  tag?: string
): Promise<string> {
  identitySecret = bufferizeSecret(identitySecret);

  const tagLength = tag ? Math.min(tag.length, 32) : 0;
  const dataLen = 8 + tagLength;
  const buffer = new ArrayBuffer(dataLen);
  const view = new DataView(buffer);

  // Write time as a 64-bit integer if supported; otherwise, use two 32-bit integers.
  if (typeof view.setBigUint64 === "function") {
    view.setBigUint64(0, BigInt(time));
  } else {
    view.setUint32(0, 0);
    view.setUint32(4, time);
  }

  if (tag) {
    const tagBytes = new TextEncoder().encode(tag);
    new Uint8Array(buffer, 8, tagBytes.length).set(tagBytes);
  }

  const hmacBuffer = await generateHmac(identitySecret, buffer);
  const hmacArray = new Uint8Array(hmacBuffer);
  return arrayBufferToBase64(hmacArray);
}
// Alias for generateConfirmationKey
export const getConfirmationKey = generateConfirmationKey;

/**
 * Get the current time offset and latency from the Steam servers.
 * @returns {Promise<{offset: number, latency: number}>}
 */
export async function getTimeOffset(): Promise<{
  offset: number;
  latency: number;
}> {
  const start = Date.now();

  const res = await fetch(
    "https://api.steampowered.com/ITwoFactorService/QueryTime/v1/",
    {
      method: "POST",
      headers: { "Content-Length": "0" },
    }
  );

  if (!res.ok) {
    throw new Error("HTTP error " + res.status);
  }

  let responseData: { server_time?: number };
  try {
    responseData = (await res.json()).response;
  } catch (_e) {
    console.error(_e);
    throw new Error("Malformed response");
  }
  if (!responseData || !responseData.server_time) {
    throw new Error("Malformed response");
  }

  const end = Date.now();
  const offset = responseData.server_time - time();
  return { offset, latency: end - start };
}

// /**
//  * Get a standardized device ID based on your SteamID.
//  * @param {string | { toString(): string }} steamID - Your SteamID.
//  * @returns {Promise<string>}
//  */
// export async function getDeviceID(steamID: string | { toString(): string }): Promise<string> {
//   const salt = "";
//   const input = steamID.toString() + salt;
//   const data = new TextEncoder().encode(input);
//   const hashBuffer = await crypto.subtle.digest("SHA-1", data);
//   const hashArray = Array.from(new Uint8Array(hashBuffer))
//     .map((b) => b.toString(16).padStart(2, "0"))
//     .join("");
//   // Format the hash as: 8-4-4-4-12
//   const formatted = hashArray.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12}).*$/, "$1-$2-$3-$4-$5");
//   return "android:" + formatted;
// }

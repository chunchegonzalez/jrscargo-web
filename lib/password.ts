// Password hashing using Web Crypto API (no external dependencies)
// Uses PBKDF2 with SHA-256, 100k iterations, 32-byte salt

const ITERATIONS = 100000;
const KEY_LENGTH = 64; // bytes
const SALT_LENGTH = 32; // bytes

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuffer(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: ITERATIONS,
      hash: 'SHA-256'
    },
    keyMaterial,
    KEY_LENGTH * 8
  );

  const saltHex = bufferToHex(salt.buffer as ArrayBuffer);
  const hashHex = bufferToHex(derivedBits);
  
  // Format: iterations:salt:hash
  return ITERATIONS + ':' + saltHex + ':' + hashHex;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const parts = storedHash.split(':');
    if (parts.length !== 3) return false;
    
    const iterations = parseInt(parts[0], 10);
    const salt = hexToBuffer(parts[1]);
    const originalHash = parts[2];
    
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const derivedBits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt.buffer as ArrayBuffer,
        iterations: iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      KEY_LENGTH * 8
    );

    const newHash = bufferToHex(derivedBits);
    
    // Constant-time comparison to prevent timing attacks
    if (newHash.length !== originalHash.length) return false;
    let result = 0;
    for (let i = 0; i < newHash.length; i++) {
      result |= newHash.charCodeAt(i) ^ originalHash.charCodeAt(i);
    }
    return result === 0;
  } catch {
    return false;
  }
}

// Check if a stored password is already hashed (PBKDF2 format)
export function isHashed(password: string): boolean {
  const parts = password.split(':');
  return parts.length === 3 && !isNaN(parseInt(parts[0], 10)) && parts[1].length === 64;
}

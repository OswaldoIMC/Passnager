// ----- SERVICIO PARA LA CRIPTOGRAFÍA DE LA CONTRASEÑA -----

import Sodium from "react-native-sodium";

// ----- Constantes -----

/**
 * Longitud en bytes de la clave derivada.
 * 32 bytes = 256 bits -> requerido por crypto_secretbox
 */
const KEY_BYTES = 32;

/**
 * Texto cifrado con la clave derivada para poder verificar
 * que la contraseña es correcta en el login, sin guardar la clave
 */
const VERIFICATION_PLAINTEXT = "boveda-verificacion-ok";

// ----- Tipos internos -----

export interface DatosHash {
  /** Salt en Base64 necesario para re-derivar la clave al login */
  salt: string;
  /**
   * Nonce + cifrado del texto de verificación en Base64, separados por "."
   * Se guarda en storage para poder verificar contraseñas en el login.
   */
  verificationTag: string;
}

// ----- Helpers internos de codificacion Base64 y UTF-8 -----

const B64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const B64_LOOKUP = new Uint8Array(256);
for (let i = 0; i < B64_CHARS.length; i++) {
  B64_LOOKUP[B64_CHARS.charCodeAt(i)] = i;
}

/**
 * Convierte un Uint8Array (bytes crudos) a string Base64.
 * Implementacion pura en JS sin dependencia de btoa / Buffer.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  let result = "";
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;

    result += B64_CHARS[b0 >> 2];
    result += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    result += i + 1 < len ? B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] : "=";
    result += i + 2 < len ? B64_CHARS[b2 & 63] : "=";
  }
  return result;
}

/**
 * Convierte un string Base64 a Uint8Array (bytes crudos).
 */
export function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[\s=]/g, "");
  const len = clean.length;
  const byteLen = Math.floor((len * 3) / 4);
  const bytes = new Uint8Array(byteLen);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const c0 = B64_LOOKUP[clean.charCodeAt(i)];
    const c1 = i + 1 < len ? B64_LOOKUP[clean.charCodeAt(i + 1)] : 0;
    const c2 = i + 2 < len ? B64_LOOKUP[clean.charCodeAt(i + 2)] : 0;
    const c3 = i + 3 < len ? B64_LOOKUP[clean.charCodeAt(i + 3)] : 0;

    if (p < byteLen) bytes[p++] = (c0 << 2) | (c1 >> 4);
    if (p < byteLen && i + 2 < len) bytes[p++] = ((c1 & 15) << 4) | (c2 >> 2);
    if (p < byteLen && i + 3 < len) bytes[p++] = ((c2 & 3) << 6) | c3;
  }
  return bytes;
}

/**
 * Convierte un string de texto plano (UTF-8) a Uint8Array.
 */
export function utf8ToBytes(str: string): Uint8Array {
  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(str);
  }
  const utf8 = unescape(encodeURIComponent(str));
  const bytes = new Uint8Array(utf8.length);
  for (let i = 0; i < utf8.length; i++) {
    bytes[i] = utf8.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convierte un Uint8Array a string de texto plano (UTF-8).
 */
export function bytesToUtf8(bytes: Uint8Array): string {
  if (typeof TextDecoder !== "undefined") {
    return new TextDecoder().decode(bytes);
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return decodeURIComponent(escape(binary));
}

/**
 * Convierte un string UTF-8 a string Base64
 * react-native-sodium espera que los strings de contraseña y mensajes
 * pasen codificados en Base64 al módulo nativo (Java/Obj-C)
 */
export function utf8ToBase64(str: string): string {
  return bytesToBase64(utf8ToBytes(str));
}

/**
 * Decodifica un string Base64 a texto plano (UTF-8)
 */
export function base64ToUtf8(b64: string): string {
  return bytesToUtf8(base64ToBytes(b64));
}

// ----- CryptoService -----

export class CryptoService {
  // --------------------------------------------------------------------------
  // MÉTODO 1: Derivar la clave maestra desde la contraseña del usuario
  //
  // Argon2id para "estirar" la contraseña en una clave de 32 bytes fuerte.
  // IMPORTANTE: react-native-sodium decodifica tanto la contraseña como
  // el salt con Base64.decode() en Java/iOS. Por eso la contraseña
  // debe enviarse en Base64
  // --------------------------------------------------------------------------

  async derivarClave(
    contrasena: string,
    saltB64?: string,
  ): Promise<{ clave: Uint8Array; saltB64: string }> {
    let saltB64Final: string;

    if (saltB64) {
      // Login: reutilizar el salt guardado
      saltB64Final = saltB64;
    } else {
      // Setup: generar un salt aleatorio de 16 bytes (viene ya en Base64)
      saltB64Final = await Sodium.randombytes_buf(
        Sodium.crypto_pwhash_SALTBYTES,
      );
    }

    // Convertir la contraseña a Base64 porque el native bridge de sodium
    // ejecuta Base64.decode(password) internamente
    const contrasenaB64 = utf8ToBase64(contrasena);

    const claveB64 = await Sodium.crypto_pwhash(
      KEY_BYTES,
      contrasenaB64,
      saltB64Final,
      Sodium.crypto_pwhash_OPSLIMIT_MIN,
      Sodium.crypto_pwhash_MEMLIMIT_MIN,
      Sodium.crypto_pwhash_ALG_ARGON2ID13,
    );

    return {
      clave: base64ToBytes(claveB64),
      saltB64: saltB64Final,
    };
  }

  // --------------------------------------------------------------------------
  // MÉTODO 2: Crear los datos de hash para guardar en storage (setup)
  //
  // 1. Deriva la clave maestra con Argon2id
  // 2. Cifra el texto de verificación con esa clave
  // 3. Retorna { salt, verificationTag }
  // --------------------------------------------------------------------------

  async crearHashMaestro(contrasena: string): Promise<DatosHash> {
    // 1. Derivar clave (con salt nuevo)
    const { clave, saltB64 } = await this.derivarClave(contrasena);

    // 2. Generar nonce aleatorio (en Base64)
    const nonceB64 = await Sodium.randombytes_buf(
      Sodium.crypto_secretbox_NONCEBYTES,
    );

    // 3. Cifrar el texto de verificación codificado en Base64
    const claveB64 = bytesToBase64(clave);
    const mensajeB64 = utf8ToBase64(VERIFICATION_PLAINTEXT);

    const cipherB64 = await Sodium.crypto_secretbox_easy(
      mensajeB64,
      nonceB64,
      claveB64,
    );

    // 4. Guardar nonce + cifrado juntos (separados por ".")
    const verificationTag = `${nonceB64}.${cipherB64}`;

    return { salt: saltB64, verificationTag };
  }

  // --------------------------------------------------------------------------
  // MÉTODO 3: Verificar la contraseña en el login
  //
  // Re-deriva la clave usando la contraseña ingresada + el salt guardado,
  // luego intenta descifrar el verificationTag guardado.
  // crypto_secretbox_open_easy retorna el resultado en Base64.
  // --------------------------------------------------------------------------

  async verificarContrasena(
    contrasena: string,
    saltGuardado: string,
    verificationTagGuardado: string,
  ): Promise<{ ok: true; clave: Uint8Array } | { ok: false }> {
    try {
      // 1. Re-derivar la clave con el salt guardado
      const { clave } = await this.derivarClave(contrasena, saltGuardado);
      const claveB64 = bytesToBase64(clave);

      // 2. Separar nonce y cifrado
      const [nonceB64, cipherB64] = verificationTagGuardado.split(".");
      if (!nonceB64 || !cipherB64) return { ok: false };

      // 3. Descifrar (retorna el mensaje descifrado en Base64)
      const descifradoB64 = await Sodium.crypto_secretbox_open_easy(
        cipherB64,
        nonceB64,
        claveB64,
      );

      // 4. Convertir Base64 descifrado a UTF-8 y validar
      const descifradoTexto = base64ToUtf8(descifradoB64);
      if (descifradoTexto !== VERIFICATION_PLAINTEXT) return { ok: false };

      return { ok: true, clave };
    } catch {
      // Si la contraseña fue incorrecta o falló el descifrado autenticado
      return { ok: false };
    }
  }

  // --------------------------------------------------------------------------
  // MÉTODO 4: Encriptar una contraseña individual
  // --------------------------------------------------------------------------

  async encriptarContrasena(
    contrasenaTexto: string,
    claveMaestra: Uint8Array,
  ): Promise<string> {
    const nonceB64 = await Sodium.randombytes_buf(
      Sodium.crypto_secretbox_NONCEBYTES,
    );
    const claveB64 = bytesToBase64(claveMaestra);
    const mensajeB64 = utf8ToBase64(contrasenaTexto);

    const cipherB64 = await Sodium.crypto_secretbox_easy(
      mensajeB64,
      nonceB64,
      claveB64,
    );

    return `${nonceB64}.${cipherB64}`;
  }

  // --------------------------------------------------------------------------
  // MÉTODO 5: Desencriptar una contraseña individual
  // --------------------------------------------------------------------------

  async desencriptarContrasena(
    encriptada: string,
    claveMaestra: Uint8Array,
  ): Promise<string> {
    const [nonceB64, cipherB64] = encriptada.split(".");
    if (!nonceB64 || !cipherB64) {
      throw new Error("Formato de cifrado inválido");
    }

    const claveB64 = bytesToBase64(claveMaestra);
    const descifradoB64 = await Sodium.crypto_secretbox_open_easy(
      cipherB64,
      nonceB64,
      claveB64,
    );

    return base64ToUtf8(descifradoB64);
  }

  // --------------------------------------------------------------------------
  // MÉTODO 6: Generar una contraseña aleatoria segura
  //
  // Usa randombytes_buf para generar bytes aleatorios de calidad
  // criptográfica, luego los convierte a un string legible mezclando
  // letras, números y símbolos.
  //
  // @param longitud  Número de caracteres deseados (default: 20)
  // --------------------------------------------------------------------------

  async generarContrasenaAleatoria(longitud: number = 20): Promise<string> {
    const CHARSET =
      "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";

    // Generar mas bytes de los necesarios para cubrir cualquier longitud
    const bytesB64 = await Sodium.randombytes_buf(longitud * 2);
    const bytes = base64ToBytes(bytesB64);

    let resultado = "";
    for (let i = 0; i < longitud; i++) {
      // Usar modulo para mapear cada byte a un caracter del charset
      resultado += CHARSET[bytes[i] % CHARSET.length];
    }

    return resultado;
  }
}

// Exportar una instancia única (singleton) para usar en toda la app
export const cryptoService = new CryptoService();

/* eslint-env jest */

// Mock AsyncStorage
jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

// Mock react-native-sodium con implementacion criptografica compatible para Node
jest.mock("react-native-sodium", () => {
  const nodeCrypto = require("crypto");

  return {
    crypto_pwhash_SALTBYTES: 16,
    crypto_secretbox_NONCEBYTES: 24,
    crypto_pwhash_OPSLIMIT_MIN: 1,
    crypto_pwhash_MEMLIMIT_MIN: 8192,
    crypto_pwhash_ALG_ARGON2ID13: 2,

    randombytes_buf: jest.fn(async (len) => {
      return nodeCrypto.randomBytes(len).toString("base64");
    }),

    crypto_pwhash: jest.fn(async (keyLen, passB64, saltB64) => {
      const pass = Buffer.from(passB64, "base64");
      const salt = Buffer.from(saltB64, "base64");
      const derived = nodeCrypto.pbkdf2Sync(pass, salt, 1000, keyLen, "sha256");
      return derived.toString("base64");
    }),

    crypto_secretbox_easy: jest.fn(async (messageB64, nonceB64, keyB64) => {
      const key = Buffer.from(keyB64, "base64");
      const nonce = Buffer.from(nonceB64, "base64").subarray(0, 12);
      const cipher = nodeCrypto.createCipheriv("aes-256-gcm", key, nonce);
      const enc = Buffer.concat([
        cipher.update(Buffer.from(messageB64, "base64")),
        cipher.final(),
      ]);
      const tag = cipher.getAuthTag();
      return Buffer.concat([enc, tag]).toString("base64");
    }),

    crypto_secretbox_open_easy: jest.fn(async (cipherB64, nonceB64, keyB64) => {
      const key = Buffer.from(keyB64, "base64");
      const nonce = Buffer.from(nonceB64, "base64").subarray(0, 12);
      const data = Buffer.from(cipherB64, "base64");
      if (data.length < 16) throw new Error("Ciphertext too short");
      const tag = data.subarray(data.length - 16);
      const text = data.subarray(0, data.length - 16);
      const decipher = nodeCrypto.createDecipheriv("aes-256-gcm", key, nonce);
      decipher.setAuthTag(tag);
      const dec = Buffer.concat([decipher.update(text), decipher.final()]);
      return dec.toString("base64");
    }),
  };
});

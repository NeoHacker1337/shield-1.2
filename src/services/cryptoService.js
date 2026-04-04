// services/cryptoService.js
import CryptoJS from 'crypto-js';
import RNFS from 'react-native-fs';

const SALT = 'shield_static_salt_v1';

// 🔑 deterministic key
const deriveKey = (password) =>
  CryptoJS.SHA256(password + SALT).toString();

// 🔐 hash password
export const hashPassword = (password) =>
  CryptoJS.SHA256(password).toString();

// 🔒 encrypt file (RN safe)
export const encryptFile = async (inputPath, outputPath, password) => {
  const base64 = await RNFS.readFile(inputPath, 'base64');

  const key = deriveKey(password);

  const encrypted = CryptoJS.AES.encrypt(
    base64,
    CryptoJS.enc.Hex.parse(key),
    {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
      iv: CryptoJS.enc.Hex.parse(key.substring(0, 32)), // deterministic IV
    }
  ).toString();

  await RNFS.writeFile(outputPath, encrypted, 'utf8');
};

// 🔓 decrypt file
export const decryptFile = async (encryptedPath, outputPath, password) => {
  const encrypted = await RNFS.readFile(encryptedPath, 'utf8');

  const key = deriveKey(password);

  const decrypted = CryptoJS.AES.decrypt(
    encrypted,
    CryptoJS.enc.Hex.parse(key),
    {
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
      iv: CryptoJS.enc.Hex.parse(key.substring(0, 32)),
    }
  );

  const base64 = decrypted.toString(CryptoJS.enc.Utf8);

  if (!base64) throw new Error('Incorrect password');

  await RNFS.writeFile(outputPath, base64, 'base64');
};
/**
 * 🔐 Système de clés API cryptées — Success Polaris
 * 
 * Les clés sont stockées cryptées (AES) dans Google Sheets.
 * L'APK les récupère et les déchiffre avec la clé maîtreuse.
 */

import CryptoJS from 'crypto-js';

const MASTER_KEY = '#@{\\successpolaris^[Astarté]\\}@#';

const API_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwvKIdck_vTma2WoKty3lVLSym4aFA3uebCXhbFZU_q_yKzbY30srxVK6c1ob-JM1HJ5g/exec';

/**
 * Déchiffre une clé AES cryptée
 */
export function decrypt(encryptedBase64) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedBase64, MASTER_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error('[API_KEYS] ❌ Erreur déchiffrement:', error.message);
    return null;
  }
}

/**
 * Récupère et déchiffre une clé API spécifique depuis Google Sheets
 */
export const getApiKey = async (service) => {
  try {
    console.log(`[API_KEYS] 🔑 Récupération clé pour: ${service}`);

    const response = await fetch(`${API_SCRIPT_URL}?action=get_keys`);
    const result = await response.json();

    if (!result.success || !result.keys) {
      console.warn('[API_KEYS] ⚠️ Aucune clé disponible');
      return null;
    }

    const keyEntry = result.keys.find(k => k.service === service);
    if (!keyEntry) {
      console.warn(`[API_KEYS] ⚠️ Service "${service}" non trouvé`);
      return null;
    }

    const decryptedKey = decrypt(keyEntry.encryptedKey);
    if (decryptedKey) {
      console.log(`[API_KEYS] ✅ Clé "${service}" déchiffrée avec succès`);
      return decryptedKey;
    }

    console.error(`[API_KEYS] ❌ Échec déchiffrement "${service}"`);
    return null;
  } catch (error) {
    console.error(`[API_KEYS] ❌ Erreur récupération "${service}":`, error.message);
    return null;
  }
};

/**
 * Récupère toutes les clés API (déjà déchiffrées)
 */
export const getAllApiKeys = async () => {
  try {
    const response = await fetch(`${API_SCRIPT_URL}?action=get_keys`);
    const result = await response.json();

    if (!result.success || !result.keys) {
      return {};
    }

    const keys = {};
    for (const keyEntry of result.keys) {
      keys[keyEntry.service] = decrypt(keyEntry.encryptedKey);
    }

    console.log('[API_KEYS] ✅ Toutes les clés récupérées:', Object.keys(keys).join(', '));
    return keys;
  } catch (error) {
    console.error('[API_KEYS] ❌ Erreur récupération globale:', error.message);
    return {};
  }
};

import { safeStorage } from 'electron';
import type { TokenEncryption } from './tokenStore';

export const electronEncryption: TokenEncryption = {
  available: async () => {
    if (!(await safeStorage.isAsyncEncryptionAvailable())) return false;
    return (
      process.platform !== 'linux' ||
      !['basic_text', 'unknown'].includes(safeStorage.getSelectedStorageBackend())
    );
  },
  encrypt: (token) => safeStorage.encryptStringAsync(token),
  decrypt: (encrypted) => safeStorage.decryptStringAsync(encrypted),
};

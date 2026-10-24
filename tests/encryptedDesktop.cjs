const { safeStorage, app } = require('electron');
const { pathToFileURL } = require('node:url');
const { resolve } = require('node:path');
const { createHash, createCipheriv, createDecipheriv, randomBytes } = require('node:crypto');

const key = createHash('sha256').update('auto-digger synthetic credential fixture').digest();
safeStorage.isAsyncEncryptionAvailable = () => Promise.resolve(true);
safeStorage.getSelectedStorageBackend = () => 'gnome_libsecret';
safeStorage.encryptStringAsync = (value) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return Promise.resolve(Buffer.concat([iv, cipher.getAuthTag(), ciphertext]));
};
safeStorage.decryptStringAsync = (encrypted) => {
  const cipher = createDecipheriv('aes-256-gcm', key, encrypted.subarray(0, 12));
  cipher.setAuthTag(encrypted.subarray(12, 28));
  const result = Buffer.concat([cipher.update(encrypted.subarray(28)), cipher.final()]).toString(
    'utf8',
  );
  return Promise.resolve({ result, shouldReEncrypt: false });
};
if (process.env.AUTO_DIGGER_TEST_IDENTITY === '1') {
  globalThis.fetch = () =>
    Promise.resolve(new Response(JSON.stringify({ id: 42, username: 'quiet-digger' })));
}
import(pathToFileURL(resolve(__dirname, '../out/main/index.js')).href).catch(() => {
  process.stderr.write('Could not start the credential test fixture.\n');
  app.exit(1);
});

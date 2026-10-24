const { safeStorage, app, net } = require('electron');
const { pathToFileURL } = require('node:url');
const { resolve, delimiter } = require('node:path');
const { mkdirSync, readFileSync } = require('node:fs');
const { createHash, createCipheriv, createDecipheriv, randomBytes } = require('node:crypto');

const key = createHash('sha256').update('auto-digger synthetic credential fixture').digest();
process.env.PATH = `${resolve(__dirname, 'fixtures')}${delimiter}${process.env.PATH || ''}`;
const music = resolve(app.getPath('userData'), 'Music');
mkdirSync(music, { recursive: true });
app.setPath('music', music);
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
const fetchNetwork = net.fetch.bind(net);
net.fetch = (input, options) => {
  const url = input instanceof Request ? input.url : input.toString();
  if (url !== 'https://fixture.googlevideo.com/audio') return fetchNetwork(input, options);
  const audio = readFileSync(resolve(__dirname, 'fixtures/preview.mp3'));
  const range = new Headers(options?.headers).get('range');
  const match = range && /^bytes=(\d+)-(\d*)$/.exec(range);
  const start = match ? Number(match[1]) : 0;
  const end = match && match[2] ? Number(match[2]) : audio.length - 1;
  const bytes = audio.subarray(start, end + 1);
  globalThis.autoDiggerPreviewFinished = false;
  let cancelled = false;
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes.subarray(0, 131072));
      setTimeout(() => {
        if (!cancelled) {
          if (start === 0 && end === audio.length - 1) globalThis.autoDiggerPreviewFinished = true;
          controller.enqueue(bytes.subarray(131072));
          controller.close();
        }
      }, 3000);
    },
    cancel() {
      cancelled = true;
    },
  });
  return Promise.resolve(
    new Response(body, {
      status: range ? 206 : 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': bytes.length.toString(),
        'Accept-Ranges': 'bytes',
        ...(range ? { 'Content-Range': `bytes ${start}-${end}/${audio.length}` } : {}),
      },
    }),
  );
};
if (process.env.AUTO_DIGGER_TEST_IDENTITY === '1') {
  globalThis.fetch = () =>
    Promise.resolve(new Response(JSON.stringify({ id: 42, username: 'quiet-digger' })));
}
import(pathToFileURL(resolve(__dirname, '../out/main/index.js')).href).catch(() => {
  process.stderr.write('Could not start the credential test fixture.\n');
  app.exit(1);
});

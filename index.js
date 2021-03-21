import child_process from 'child_process';
import fs from 'fs';
import https from 'https';
import util from 'util';

/** @type {{[key: string]: string;}} */
const platforms = { win32: 'windows' };

/** @type {{[key: string]: string;}} */
const archs = { x64: 'amd64' };

export default async function* () {
  yield 'read';

  // Serve the certificates directly if they are already downloaded
  try {
    const key = await fs.promises.readFile('localhost-key.pem');
    const cert = await fs.promises.readFile('localhost.pem');
    yield { key, cert };
    return;
  }
  catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  yield 'touch';
  try {
    await fs.promises.access('mkcert');
  }

  // Swallow error as we proceed to download mkcert
  catch (error) {
    yield 'version';

    // Fetch the information of the latest `mkcert` version
    const data = await new Promise((resolve, reject) => {
      const request = https.get('https://api.github.com/repos/FiloSottile/mkcert/releases/latest', { headers: { 'User-Agent': '@tomashubelbauer' } }, async response => {
        request.on('error', reject);

        /** @type {Buffer[]} */
        const buffers = [];
        for await (const chunk of response) {
          buffers.push(chunk);
        }

        const buffer = Buffer.concat(buffers);
        resolve(JSON.parse(buffer.toString()));
      });
    });

    const platform = platforms[process.platform] || process.platform;
    const arch = archs[process.arch] || process.arch;
    const name = platform + '-' + arch;

    // Find the release asset for this platform and architecture using the `mkcert` naming convention
    const asset = data.assets.find((/** @type {{name: string;}} */ asset) => asset.name.endsWith(name));

    // Fetch the download URL from the redirect page
    yield 'redirect';
    const text = await new Promise((resolve, reject) => {
      const request = https.get(asset.browser_download_url, async response => {
        request.on('error', reject);

        /** @type {Buffer[]} */
        const buffers = [];
        for await (const chunk of response) {
          buffers.push(chunk);
        }

        const buffer = Buffer.concat(buffers);
        resolve(buffer.toString());
      });
    });

    const regex = /^<html><body>You are being <a href="(?<url>.*)">redirected<\/a>.<\/body><\/html>$/g;
    const match = regex.exec(text);
    if (!match?.groups?.url) {
      throw new Error('The redirect URL was not found in the response!');
    }

    const url = match.groups.url.replace(/&amp;/g, '&');

    // Download the executable binary
    yield 'download';
    const buffer = await new Promise((resolve, reject) => {
      const request = https.get(url, async response => {
        request.on('error', reject);

        /** @type {Buffer[]} */
        const buffers = [];
        for await (const chunk of response) {
          buffers.push(chunk);
        }

        const buffer = Buffer.concat(buffers);
        resolve(buffer);
      });
    });

    yield 'write';
    await fs.promises.writeFile('mkcert', buffer);
  }

  // Make mkcert executable if it is not already (e.g. right after download)
  if (process.platform !== 'win32') {
    yield 'mod';
    const mod = await util.promisify(child_process.exec)('chmod +x mkcert', { cwd: '.' });

    if (mod.stderr) {
      throw new Error(mod.stderr);
    }

    if (mod.stdout) {
      throw new Error(mod.stdout);
    }
  }

  // Run mkcert executable to obtain localhost certificates
  yield 'run';
  const run = await util.promisify(child_process.exec)('./mkcert localhost', { cwd: '.' });

  if (!run.stderr.match(/The certificate is at ".\/localhost.pem" and the key at ".\/localhost-key.pem"/)) {
    throw new Error(run.stderr);
  }

  if (run.stdout) {
    throw new Error(run.stdout);
  }

  const key = await fs.promises.readFile('localhost-key.pem');
  const cert = await fs.promises.readFile('localhost.pem');
  yield { key, cert };
}

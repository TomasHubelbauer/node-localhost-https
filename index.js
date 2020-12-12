import fs from 'fs';
import util from 'util';
import child_process from 'child_process';
import https from 'https';

const platforms = { win32: 'windows' };
const archs = { x64: 'amd64' };

export default async function(/** @type {(stage: 'read' | 'return' | 'touch' | 'version' | 'redirect' | 'download' | 'write' | 'mod' | 'run') => Promise<void>} */ progress) {
  await progress('read');
  
  // Serve the certificates directly if they are already downloaded
  try {
    const key = await fs.promises.readFile('localhost-key.pem');
    const cert = await fs.promises.readFile('localhost.pem');
    await progress('return');
    return { key, cert };
  }
  catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  await progress('touch');
  try {
    await fs.promises.access('mkcert');
  }

  // Swallow error as we proceed to download mkcert
  catch (error) {
    progress('version');
    
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
        resolve(JSON.parse(buffer));
      });
    });

    const platform = platforms[process.platform] || process.platform;
    const arch = archs[process.arch] || process.arch;
    const name = platform + '-' + arch;
    
    // Find the release asset for this platform and architecture using the `mkcert` naming convention
    const asset = data.assets.find(asset => asset.name.endsWith(name));

    // Fetch the download URL from the redirect page
    await progress('redirect');
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
    const url = match.groups.url.replace(/&amp;/g, '&');

    // Download the executable binary
    await progress('download');
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
    
    await progress('write');
    await fs.promises.writeFile('mkcert', buffer);
  }

  // Make mkcert executable if it is not already (e.g. right after download)
  if (process.platform !== 'win32') {
    await progress('mod');
    const mod = await util.promisify(child_process.exec)('chmod +x mkcert', { cwd: '.' });

    if (mod.stderr) {
      throw new Error(mod.stderr);
    }

    if (mod.stdout) {
      throw new Error(mod.stdout);
    }
  }

  // Run mkcert executable to obtain localhost certificates
  await progress('run');
  const run = await util.promisify(child_process.exec)('./mkcert localhost', { cwd: '.' });

  if (!run.stderr.match(/The certificate is at ".\/localhost.pem" and the key at ".\/localhost-key.pem"/)) {
    throw new Error(run.stderr);
  }

  if (run.stdout) {
    throw new Error(run.stdout);
  }

  const key = await fs.promises.readFile('localhost-key.pem');
  const cert = await fs.promises.readFile('localhost.pem');
  await progress('return');
  return { key, cert };
}

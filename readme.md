# Node `localhost` HTTPS

This script automatically issues localhost HTTPS certificates using mkcert.

## Installation & Usage

Use `--experimental-network-imports` with Node for HTTP(S) ESM URL support:

https://nodejs.org/api/esm.html#https-and-http-imports

```js
import http from 'https';
import https from 'https';
import certify from 'https://tomashubelbauer.github.io/node-localhost-https/index.js';

/** @type {string | http.ServerOptions} */
let options;

const stateMessages = {
  read: 'Reading certificate files off the storage if any…',
  touch: 'Checking if mkcert is already available in storage…',
  version: 'Fetching the latest version of mkcert available…',
  redirect: 'Obtaining the direct mkcert download address…',
  download: 'Downloading the latest mkcert version available…',
  write: 'Storing the downloaded mkcert binary in the storage…',
  mod: 'Making mkcert executable in order to invoke it…',
  run: 'Generating localhost certificates using mkcert…',
};

http
  .createServer((request, response) => {
    if (request.method !== 'GET') {
      response.statusCode = 500;
      response.statusMessage = 'Cannot upgrade non-GET requests to HTTPS!';
      response.end();
      return;
    }

    const message = stateMessages[options];
    if (message) {
      response.writeHead(302, { Location: 'https://localhost' + request.url });
    }

    response.end(message);
  })
  .listen(80, () => console.log('http://localhost'))
  ;

for await (const state of certify()) {
  options = state;
}

if (typeof options === 'string') {
  throw new Error(options);
}

https
  .createServer(options, async (request, response) => { })
  .lister(443, () => console.log('https://localhost'))
  ;
```

This will create `localhost.pem` and `localhost-key.pem` in the working directory.
It is recommended that you ignore these certificates in version control.

`mkcert` executable will be placed to the working directory.
You can safely delete it and it will get downloaded again if needed.

You should run `mkcert -install` to place the certificate in all trust stores.
To make Firefox trust it, you need to run `brew install nss` first (macOS).

To make other devices trust it, read on at
https://github.com/FiloSottile/mkcert#installing-the-ca-on-other-systems

You might want to implement logic which in the HTTP to HTTPS redirect offers the
option to download the certificate for manual installation to the trust store or
automatically places it there using `mkcert -install` before doing the redirect.

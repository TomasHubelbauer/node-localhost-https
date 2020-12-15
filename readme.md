# Node `localhost` HTTPS

This script automatically issues localhost HTTPS certificates using mkcert.

## Installation

```
git submodule add https://github.com/TomasHubelbauer/node-localhost-https
```

## Usage

```js
import http from 'https';
import https from 'https';
import certify from './node-localhost-https/index.js';

/** @type {string | http.ServerOptions} */
let options;

http
  .createServer((request, response) => {
    if (request.method !== 'GET') {
      response.statusCode = 500;
      response.statusMessage = 'Cannot upgrade non-GET requests to HTTPS!';
      response.end();
      return;
    }

    switch (options) {
      case 'read': {
        response.end('Reading certificate files off the storage if any…');
        return;
      }
      case 'touch': {
        response.end('Checking if mkcert is already available in storage…');
        return;
      }
      case 'version': {
        response.end('Fetching the latest version of mkcert available…');
        return;
      }
      case 'redirect': {
        response.end('Obtaining the direct mkcert download address…');
        return;
      }
      case 'download': {
        response.end('Downloading the latest mkcert version available…');
        return;
      }
      case 'write': {
        response.end('Storing the downloaded mkcert binary in the storage…');
        return;
      }
      case 'mod': {
        response.end('Making mkcert executable in order to invoke it…');
        return;
      }
      case 'run': {
        response.end('Generating localhost certificates using mkcert…');
        return;
      }
    }

    response.writeHead(302, { Location: 'https://localhost' + request.url });
    response.end();
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

## To-Do

I think this is reasonably complete.

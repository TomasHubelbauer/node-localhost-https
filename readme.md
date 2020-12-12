# Node `localhost` HTTPS

This script automatically issues localhost HTTPS certificates using mkcert.

## Installation

```
git submodule add https://github.com/TomasHubelbauer/node-localhost-https
```

## Usage

```js
import https from 'https';
import options from './node-localhost-https/index.js';

https.createServer(await options(console.log), async (request, response) => {});
```

This will create `localhost.pem` and `localhost-key.pem` in the working directory.
It is recommended that you ignore these certificates in version control.
`mkcert` executable will be placed to the working directory, too.
You can safely delete it if you don't like that.
It will get downloaded again if need be.

You should run `mkcert -install` to place the certificate in the trust store.
To make Firefox trust it, you also need `brew install nss`.

To make other devices trust it, read on at
https://github.com/FiloSottile/mkcert#installing-the-ca-on-other-systems

You might want to implement logic which does HTTP to HTTPS redirect and offers
to download the certificate for manual installation to the trust store or
automatically places it there using `mkcert -install` before doing the redirect.

## To-Do

I think this is reasonably complete.

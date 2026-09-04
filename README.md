# Aluminium

## Introduction

Aluminium is a server that sits as a proxy between the user and the website that requires the user to complete a proof of work puzzle. It also blocks known AI bots and requests that unknown AI bots do not use the website in any way, based on our own tagging system, which we will also release in the future.

## Benefits

- Complete customization

- Completely free

- Just JavaScript

- Branding can be disabled for free

- Doesn't let you bypass the challenge by using a non-browser user agent

## Prerequisites

- Node.js

- NPM

## How to use it

### 1. Build the source code

```sh
npm run build
```

### 2. Copy the .env file

```sh
cp .example.env .env
```

### 3. Change the settings as you wish

Change `TARGET` to your backend website.

### 4. Run it

```sh
npm start # Doesn't update

npm run watch # Updates when .env or the code changes
```

## When to use

- When you don't use Cloudflare (it is discouraged to use this if you do use Cloudflare or something like that).

- When your website isn't meant to get a lot of requests by an SPA or script.

- When you don't want to use an alternative that forces you to show a cartoon every time someone visits your website, and don't want users to bypass it by modifying the user agent.

## License

Please see [LICENSE](LICENSE) for more information.
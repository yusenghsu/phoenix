# Phoenix Personal Deploy Guide

## Platform

Vercel

## Repository

GitHub repo: phoenix

## Framework

Next.js 16 (App Router)

## Build command

```bash
npm run build
```

## Development command

```bash
npm run dev
```

## Environment variables

None required for V1 prototype. All data is static mock data.

## Deploy steps

1. Push repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import the `phoenix` repository
4. Framework: Next.js (auto-detected)
5. Build command: `npm run build` (default)
6. Output directory: `.next` (default)
7. Click Deploy

No environment variables needed for V1.

## Prototype notes

This V1 prototype uses mock data only.
No Instagram API is connected.
No OpenAI API is connected.
No database is connected.
No real publishing happens.

All pages render as static output — fast, no server required.

## Demo URL

https://phoenix-five-beta.vercel.app

# SEO Notebook

A standalone Next.js demo of the SEO Copilot tool. It pairs a Word-like rich-text editor with the SEO Copilot analysis panel so editors can draft content and see real-time SEO recommendations side by side.

## Running locally

```bash
npm install
npm run dev        # starts on http://localhost:3001
```

For local API calls the ecaruso-repo backend must be running on port 3000 (`npm run dev` in that repo). If the backend is not running locally, the app automatically targets the production API at https://ecaruso.vercel.app - no env vars required.

## Deployment

Deployed to Vercel. Next.js is auto-detected; no environment variables are needed. The production build points at https://ecaruso.vercel.app for all API calls.

## App entry points

`src/App.tsx` and `src/index.css` are the intentional app entry points. They are imported by `src/app/page.tsx` and `src/app/layout.tsx` - they are not Vite leftovers.

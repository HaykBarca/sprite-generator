# Sprite Generator

A Next.js web app for turning video clips into game-ready sprite sheets and GIFs. Upload a video, extract frames, clean them up, and export animation-ready assets.

## Features

- **Video upload & frame extraction** — pull individual frames out of an uploaded video.
- **Chroma key removal** — strip green/blue screen backgrounds from frames.
- **Halo remover** — clean up edge fringing left behind after chroma keying.
- **Auto-crop** — automatically trim frames to their content bounds.
- **Frame selection grid** — preview and pick which extracted frames to include.
- **Animation preview** — play back the selected frames before exporting.
- **Export** — package frames into sprite sheets and/or animated GIFs for use in games.

## Tech Stack

- [Next.js 14](https://nextjs.org/) (App Router) + React 18 + TypeScript
- Tailwind CSS for styling
- `jszip` / `file-saver` for packaging and downloading exports
- `puppeteer-core` for headless rendering/testing utilities

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the app.

## Project Structure

```
src/
  app/                    # Next.js app router pages
  components/             # UI components (upload, panels, previews, export)
  lib/sprite-processor/   # Core processing pipeline (chroma key, crop, halo removal,
                           # sheet/GIF building, video frame extraction)
```

## Scripts

- `npm run dev` — start the development server
- `npm run build` — build for production
- `npm run start` — run the production build
- `npm run lint` — lint the project

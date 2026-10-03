# abdulrahim.io

## Contents

- [Overview](#overview)
- [Run locally](#run-locally)
- [Where the content lives](#where-the-content-lives)
- [Live data](#live-data)
- [Deploying and refreshing](#deploying-and-refreshing)
- [Domain and short links](#domain-and-short-links)

## Overview

Personal portfolio of Abdul Rahim, live at <https://www.abdulrahim.io>. It is a static [Astro](https://astro.build) site with hand-written CSS, hosted on Vercel.

## Run locally

Requires Node.js 22.12 or newer.

```sh
npm install
npm run dev       # http://localhost:4321
npm run build     # static output in dist/
npm run preview   # serve the built site
```

## Where the content lives

| What | File |
|---|---|
| Name, title, email, profile links, the delivery pipeline | `src/site.ts` |
| Projects (home cards and `/projects/<slug>` pages) | `src/data/projects.ts` |
| Home page copy | `src/pages/index.astro` |
| Colours and typography tokens | `src/styles/global.css` |
| Photo, link-preview image, font | `public/` |

## Live data

The YouTube, Medium and LeetCode data is fetched **once, at build time** (`src/lib/feeds.ts`):

| Source | How | If it fails |
|---|---|---|
| YouTube | Channel RSS feed (latest 15 videos); total video count from the channel page | The card falls back to a plain link |
| Medium | Profile RSS feed | The card falls back to a plain link |
| LeetCode | LeetCode's unofficial GraphQL endpoint | The last known numbers, kept in `src/lib/feeds.ts` |

A failing source never fails the build.

## Deploying and refreshing

**There is no scheduled rebuild. This is deliberate: the site is refreshed manually.** New videos, posts and LeetCode numbers appear only after a new production deploy.

The Vercel project is not connected to GitHub, so pushing to `main` does not deploy. To publish changes or refresh the live data, run this from the repo root with the Vercel CLI logged in:

```sh
vercel --prod
```

## Domain and short links

- `www.abdulrahim.io` serves the site, and `abdulrahim.io` redirects to it with a 308. DNS is managed at Namecheap and points to Vercel.
- Short links, defined in `vercel.json`:

  | Link | Goes to |
  |---|---|
  | `/yt` | YouTube channel |
  | `/in` | LinkedIn profile |
  | `/lc` | LeetCode profile |
  | `/medium` | Medium profile |

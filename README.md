# Studio Flow

A studio assistant for artists and creatives.

## Vercel Deployment

To deploy this project to Vercel, follow these steps:

1.  **Push to GitHub:** Push the current codebase to a GitHub repository.
2.  **Connect to Vercel:** Create a new project on Vercel and connect it to your GitHub repository.
3.  **Configure Environment Variables:** In the Vercel project settings, add the following environment variable:
    -   `GEMINI_API_KEY`: Your Google Gemini API key.
4.  **Deploy:** Trigger a new deployment.

## Local Development

1.  `npm install`
2.  `cp .env.example .env` (and add your `GEMINI_API_KEY`)
3.  `npm run dev`

## Build

`npm run build`

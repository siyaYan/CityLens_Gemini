<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1osRi0qT1_YagePQetxLVDlBdsG-G96W9

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Add your secrets to [.env.local](.env.local):
   ```
   FREE_GEMINI_API_KEY=...
   HF_API_TOKEN=...
   HF_IMAGE_MODEL_ID=black-forest-labs/FLUX.1-Krea-dev
   # Optional, only if you want to use the paid tier locally
   PAID_GEMINI_API_KEY=...
   # Optional override if your API lives on another domain
   NEXT_PUBLIC_API_URL=https://your-custom-domain.com
   ```
   > All keys are consumed by Next.js API routes, so nothing sensitive ships to the client bundle. On Vercel, add these under **Project Settings → Environment Variables**.
3. Start the dev server (Next.js serves both the React UI and the API routes):
   `npm run dev`
4. Visit http://localhost:3000. API requests hit `/api/*` (or `/api/paid/*`) automatically, matching the same routes you’ll have in production on Vercel.

## Free vs Paid Gemini modes

- **Free (default)** – Import helpers from `services/geminiService_free.ts`. They call `/api/*` routes implemented inside Next.js API handlers and rely on `FREE_GEMINI_API_KEY` + Hugging Face for postcard generation.
- **Paid** – Populate `PAID_GEMINI_API_KEY` and swap your imports to `services/geminiService_paid.ts`. Those helpers use `/api/paid/*`, which tap `gemini-3-pro-preview` for recognition and `gemini-2.5-flash-image` for postcards.
- Both route sets live side-by-side, so you can toggle between them simply by changing the import—no config tweaks or separate servers are required.

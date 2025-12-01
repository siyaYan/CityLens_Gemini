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
   ```
   > These values are now only read by the backend server, so they will not be exposed to the browser bundle.
3. Start the backend API (runs on port 4000 by default):
   `npm run server`
4. In a second terminal start the Vite dev server:
   `npm run dev`
5. Visit http://localhost:3000. Requests to `/api/*` are automatically proxied to the backend, so no additional configuration is required. For deployments, serve the built frontend behind the same origin as the backend or set `VITE_API_URL` to the hosted API base.

## Free vs Paid Gemini modes

- **Free (default)** – The frontend imports helpers from `services/geminiService_free.ts`, which talk to `/api/*` routes. These rely on the `FREE_GEMINI_API_KEY` plus Hugging Face for postcard generation.
- **Paid** – Add `PAID_GEMINI_API_KEY=<your key>` to `.env.local`. The backend automatically exposes `/api/paid/*` routes that use `gemini-3-pro-preview` for identification and `gemini-2.5-flash-image` for postcard art. Swap your UI imports to `services/geminiService_paid.ts` whenever you want the higher-tier experience (e.g. in `App.tsx` or `LandmarkHUD.tsx`).
- Both sets of routes run simultaneously, so developers can switch between them without restarting the server—just ensure the corresponding environment variables exist before launching `npm run server`.

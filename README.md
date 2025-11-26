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
2. Set the `FREE_GEMINI_API_KEY` or `PAID_GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. free_api version need huggingface token, set `HF_API_TOKEN`, and `HF_IMAGE_MODEL_ID`=`black-forest-labs/FLUX.1-Krea-dev` , and replace all `geminiService` or `geminiService_paid` to `geminiService_free`
4. Run the app:
   `npm run dev`

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/044074a1-16b1-4814-9b52-6f782aa14dd9

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Document Storage Note

Uploaded trip documents are stored on local disk in `server/uploads/` and are served through authenticated API routes.

This storage mode is suitable for local development only. Most PaaS deployments use ephemeral file systems, so uploaded files will not persist across redeploys or instance restarts. For production deployment, migrate document storage to an object store such as S3-compatible storage.

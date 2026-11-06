// Lets the browser upload media straight to Vercel Blob so Instagram can fetch it by public URL.
// Needs a Blob store connected to the project (Vercel → Storage → Blob), which sets BLOB_READ_WRITE_TOKEN.
import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(501).json({ error: 'Media upload not set up: connect a Vercel Blob store.' });
  try {
    const json = await handleUpload({
      body: req.body, request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/jpeg', 'image/png', 'video/mp4', 'video/quicktime'],
        maximumSizeInBytes: 300 * 1024 * 1024, addRandomSuffix: true,
      }),
      onUploadCompleted: async () => {},
    });
    res.json(json);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
}

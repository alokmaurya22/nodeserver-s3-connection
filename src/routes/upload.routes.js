import express from "express";
import { validateFile, buildFileKey } from "../utils/file.util.js";
import {
  generatePresignedUrl,
  getPublicUrl
} from "../services/s3.service.js";

const router = express.Router();

/**
 * POST /api/s3/presign
 */
router.post("/s3/presign", async (req, res) => {
  try {
    const { context, contentType } = req.body;

    const error = validateFile({ context, contentType });
    if (error) {
      return res.status(400).json({ ok: false, message: error });
    }

    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const region = process.env.AWS_REGION;

    if (!bucket || !region) {
      return res.status(500).json({
        ok: false,
        message: "AWS not configured"
      });
    }

    const key = buildFileKey({ context, contentType });

    const uploadUrl = await generatePresignedUrl({
      bucket,
      key,
      contentType
    });

    const publicUrl = getPublicUrl(bucket, region, key);

    res.json({
      ok: true,
      key,
      uploadUrl,
      publicUrl // ⬅️ THIS is what you store in DB
    });
  } catch (err) {
    console.error("Presign error:", err.message);
    res.status(500).json({ ok: false, message: "Presign failed" });
  }
});

export default router;

import multer from "multer";
import { AppError } from "../utils/appError";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Multer middleware with memory storage.
 * Accepts images only (jpeg, png, webp) up to 5 MB.
 * Upload to cloud storage (Cloudinary) from the controller.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(new AppError("Only image files (jpeg, png, webp) are allowed.", 400) as any, false);
    }
    cb(null, true);
  },
});

export default upload;

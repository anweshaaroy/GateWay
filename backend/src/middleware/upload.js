import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { fileURLToPath } from "node:url";
import { httpError } from "../utils/httpError.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(currentDir, "../..");
export const uploadDir = path.resolve(backendRoot, process.env.UPLOAD_DIR || "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const allowedExtensions = new Set([".jpg", ".jpeg", ".pdf"]);
const allowedMimes = new Set(["image/jpeg", "application/pdf"]);

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDir),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeBase = path.basename(file.originalname, extension).replace(/[^a-z0-9_-]/gi, "_").slice(0, 50) || "document";
    callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeBase}${extension}`);
  },
});

function fileFilter(_req, file, callback) {
  const extension = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.has(extension) || !allowedMimes.has(file.mimetype)) return callback(httpError(400, "Only JPG, JPEG, and PDF identity documents are accepted."));
  callback(null, true);
}

const maxMb = Number(process.env.MAX_UPLOAD_MB || 5);
export const visitorUpload = multer({ storage, fileFilter, limits: { fileSize: maxMb * 1024 * 1024, files: 2 } }).fields([
  { name: "visitorFile", maxCount: 1 },
  { name: "hostFile", maxCount: 1 },
]);

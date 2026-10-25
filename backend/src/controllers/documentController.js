import path from "node:path";
import fs from "node:fs/promises";
import { uploadDir } from "../middleware/upload.js";
import { httpError } from "../utils/httpError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { canAccessDocument } from "./visitorController.js";

export const getDocument = asyncHandler(async (req, res) => {
  const filename = path.basename(String(req.params.filename || ""));
  if (!filename || filename !== req.params.filename) throw httpError(400, "Invalid document filename.");
  if (!(await canAccessDocument(req, filename))) throw httpError(403, "You do not have permission to view this identity document.");
  const fullPath = path.resolve(uploadDir, filename);
  if (!fullPath.startsWith(`${path.resolve(uploadDir)}${path.sep}`)) throw httpError(400, "Invalid document path.");
  try { await fs.access(fullPath); } catch { throw httpError(404, "Document not found."); }
  res.setHeader("Cache-Control", "private, no-store");
  res.sendFile(fullPath);
});

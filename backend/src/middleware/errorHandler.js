export function notFound(req, res, _next) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

export function errorHandler(error, _req, res, _next) {
  if (res.headersSent) return _next(error);
  if (error?.name === "MulterError") {
    const message = error.code === "LIMIT_FILE_SIZE" ? "Each document must be within the upload size limit." : error.message;
    return res.status(400).json({ success: false, message });
  }
  if (error?.name === "ValidationError") return res.status(400).json({ success: false, message: error.message });
  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || "value";
    return res.status(409).json({ success: false, message: `A record with this ${field} already exists.` });
  }
  const status = Number(error.statusCode || error.status) || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ success: false, message: status >= 500 && process.env.NODE_ENV === "production" ? "Internal server error." : error.message || "Internal server error." });
}

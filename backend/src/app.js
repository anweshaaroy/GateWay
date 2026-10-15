import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import { fileURLToPath } from "node:url";
import authRoutes from "./routes/authRoutes.js";
import visitorRoutes from "./routes/visitorRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import guardRoutes from "./routes/guardRoutes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";

const app = express();
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "..");
const allowedOrigins = String(process.env.CLIENT_URL || "http://localhost:5173").split(",").map((value) => value.trim()).filter(Boolean);

app.disable("x-powered-by");
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(Object.assign(new Error("Origin is not permitted by CORS."), { statusCode: 403 }));
  },
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
if (process.env.NODE_ENV !== "test") app.use(morgan("dev"));
app.use("/uploads", express.static(path.resolve(projectRoot, process.env.UPLOAD_DIR || "uploads"), { fallthrough: false, maxAge: "1h" }));

app.get("/", (_req, res) => res.json({ success: true, name: "GateWay API", status: "running", version: "1.0.0" }));
app.get("/api/health", (_req, res) => res.json({ success: true, status: "ok", timestamp: new Date().toISOString() }));
app.use("/api/auth", authRoutes);
app.use("/api/visitors", visitorRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/guard", guardRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;

import { Router } from "express";
import rateLimit from "express-rate-limit";
import { googleLogin, getMe } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: "draft-7", legacyHeaders: false, message: { success: false, message: "Too many sign-in attempts. Try again later." } });
router.post("/google-login", authLimiter, googleLogin);
router.get("/me", protect, getMe);
export default router;

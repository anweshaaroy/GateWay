import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, login, googleLogin, getMe } from "../controllers/authController.js";
import { protect } from "../middleware/auth.js";

const router = Router();
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-7", legacyHeaders: false, message: { success: false, message: "Too many authentication attempts. Try again later." } });
router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/google", authLimiter, googleLogin);
router.get("/me", protect, getMe);
export default router;

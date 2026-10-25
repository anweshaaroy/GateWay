import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { getDocument } from "../controllers/documentController.js";

const router = Router();
router.get("/:filename", protect, authorize("student", "faculty", "official", "admin", "guard"), getDocument);
export default router;

import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { visitorUpload } from "../middleware/upload.js";
import { createVisitorRequest } from "../controllers/visitorController.js";
import { sendPassEmail } from "../controllers/passController.js";

const router = Router();
router.use(protect);
router.post("/create-request", authorize("student", "faculty", "official"), visitorUpload, createVisitorRequest);
router.post("/send-email/:id", authorize("student", "faculty", "official", "admin"), sendPassEmail);
export default router;

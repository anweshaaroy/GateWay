import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { visitorUpload } from "../middleware/upload.js";
import { createVisitorRequest, getMyVisitorRequests, getVisitorRequest, getVisitorDocument } from "../controllers/visitorController.js";

const router = Router();
router.use(protect);
router.post("/", authorize("student", "faculty"), visitorUpload, createVisitorRequest);
router.get("/mine", authorize("student", "faculty"), getMyVisitorRequests);
router.get("/:id/documents/:kind", getVisitorDocument);
router.get("/:id", getVisitorRequest);
export default router;

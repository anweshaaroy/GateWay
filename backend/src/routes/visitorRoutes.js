import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { visitorUpload } from "../middleware/upload.js";
import { createVisitorRequest, getMyVisitorRequests, getVisitorRequest } from "../controllers/visitorController.js";

const router = Router();
router.use(protect);
router.post("/", authorize("student", "faculty"), visitorUpload, createVisitorRequest);
router.get("/mine", authorize("student", "faculty"), getMyVisitorRequests);
router.get("/:id", getVisitorRequest);
export default router;

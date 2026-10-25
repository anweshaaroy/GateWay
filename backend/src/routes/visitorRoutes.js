import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { listVisitorsForCurrentUser, getVisitorRequest } from "../controllers/visitorController.js";

const router = Router();
router.use(protect);
router.get("/", authorize("student", "faculty", "official", "admin", "guard"), listVisitorsForCurrentUser);
router.get("/:id", authorize("student", "faculty", "official", "admin", "guard"), getVisitorRequest);
export default router;

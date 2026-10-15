import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { listVisitorRequests, approveVisitorRequest, rejectVisitorRequest, toggleBlacklist, dashboardStats, listAuditLogs } from "../controllers/adminController.js";

const router = Router();
router.use(protect, authorize("admin"));
router.get("/stats", dashboardStats);
router.get("/audit-logs", listAuditLogs);
router.get("/visitors", listVisitorRequests);
router.patch("/visitors/:id/approve", approveVisitorRequest);
router.patch("/visitors/:id/reject", rejectVisitorRequest);
router.patch("/visitors/:id/blacklist", toggleBlacklist);
export default router;

import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { listVisitorRequests, approveVisitorRequest, rejectVisitorRequest, toggleBlacklist, dashboardStats, listAuditLogs } from "../controllers/adminController.js";

const router = Router();
router.use(protect, authorize("admin"));
router.get("/stats", dashboardStats);
router.get("/audit-logs", listAuditLogs);
router.get("/visitors", listVisitorRequests);
// These paths match the current React components.
router.patch("/approve/:id", approveVisitorRequest);
router.patch("/reject/:id", rejectVisitorRequest);
router.patch("/blacklist/:id", toggleBlacklist);
// REST-style aliases for clients that prefer a nested resource route.
router.patch("/visitors/:id/approve", approveVisitorRequest);
router.patch("/visitors/:id/reject", rejectVisitorRequest);
router.patch("/visitors/:id/blacklist", toggleBlacklist);
export default router;

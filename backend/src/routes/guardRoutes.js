import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { verifyPass, changeGateStatus, createSpotPass, searchVisitors, exportAuditCsv } from "../controllers/guardController.js";

const router = Router();
router.use(protect, authorize("guard", "admin"));
router.get("/search", searchVisitors);
router.get("/audit.csv", exportAuditCsv);
router.get("/verify/:value", verifyPass);
router.post("/spot-pass", createSpotPass);
router.patch("/gate-status/:visitorId", changeGateStatus);
router.post("/check-in/:id", (req, res, next) => { req.body = { ...(req.body || {}), status: "Inside Campus" }; req.params.visitorId = req.params.id; next(); }, changeGateStatus);
router.post("/check-out/:id", (req, res, next) => { req.body = { ...(req.body || {}), status: "Completed" }; req.params.visitorId = req.params.id; next(); }, changeGateStatus);
export default router;

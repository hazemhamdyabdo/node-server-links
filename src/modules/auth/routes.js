import { Router } from "express";

const router = Router();

router.post("/register");
router.post("/login");
router.post("/refresh");
router.post("/logout");

export default router;

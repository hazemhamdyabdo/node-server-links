import { Router } from "express";
import * as authController from "./controller.js";
import { validate } from "../../middleware/validate.js";
import { loginSchema, registerSchema } from "./schema.js";

const router = Router();

router.post(
  "/register",
  validate(registerSchema),
  authController.registerController,
);
router.post("/login", validate(loginSchema), authController.loginController);
router.post("/refresh", authController.refreshController);
router.post("/logout", authController.logoutController);

export default router;

import { Router } from "express";
import * as linksController from "./links.controller.js";
import { createLink } from "./schema.js";
import { validate } from "../../middleware/validate.js";

const router = Router();

router.get("/links", linksController.indexLinksController);

router.post(
  "/links",
  validate(createLink),
  linksController.createLinkController,
);

export default router;

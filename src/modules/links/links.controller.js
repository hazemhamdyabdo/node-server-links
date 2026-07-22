import * as linksService from "./links.service.js";

export async function indexLinksController(req, res, next) {
  try {
  } catch (error) {
    next(error);
  }
}
export async function createLinkController(req, res, next) {
  try {
    const newLink = await linksService.create(req);
    res.status(202).json({
      message: "success",
      data: newLink,
    });
  } catch (error) {
    next(error);
  }
}

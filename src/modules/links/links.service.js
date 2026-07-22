import { pool } from "../../db/pool.js";
import * as linksRepo from "./links.repository.js";
import { linkFetchQueue } from "../../queues/linkFetch.queue.js";

const normalizeUrl = (url) => {
  let parsed;
  try {
    parsed = new URL(url.trim());
    parsed.hostname = parsed.hostname.toLocaleLowerCase();
  } catch {
    const error = new Error("Invalid URL");
    error.statusCode = 400;
    throw error;
  }
  return parsed.toString();
};

export async function create(req) {
  const userId = req.user.id;
  const url = req.body.url;
  const normalizedUrl = normalizeUrl(url);

  try {
    const newLink = await linksRepo.create(pool, {
      user_id: userId,
      normalized_url: normalizedUrl,
      url,
    });
    const link = newLink[0];

    await linkFetchQueue.add("link-fetch", {
      id: link.id,
      url: link.url,
    });

    return {
      id: link.id,
      status: link.status,
      streamUrl: `/api/links/${link.id}/stream`,
    };
  } catch (error) {
    if (error.code === "23505") {
      const _error = new Error("The Link  already taken");
      _error.statusCode = 409;
      throw _error;
    }
    throw error;
  }
}

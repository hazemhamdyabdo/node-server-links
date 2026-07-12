import dns from "node:dns";
import ipaddr from "ipaddr.js";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const BLOCK_IPS = ["private", "reserved", "loopback", "linkLocal"];

const REDIRECT_MANUAL_STATUS = [301, 302, 303, 307, 308];

export async function fetchSafe(url, maxRedirects = 5) {
  if (maxRedirects === 0) {
    const error = new Error("Too many redirects");
    error.statusCode = 400;
    throw error;
  }

  let parsed;
  try {
    parsed = new URL(url.trim());
  } catch {
    const error = new Error("Invalid URL");
    error.statusCode = 400;
    throw error;
  }

  parsed.hostname = parsed.hostname.toLocaleLowerCase();

  const normalizedUrl = parsed.toString();

  const isSafeUrl = ["https:", "http:"].includes(parsed.protocol);

  if (!isSafeUrl) {
    const error = new Error("Invalid URL");
    error.statusCode = 400;
    throw error;
  }

  const hostname = parsed.hostname;
  const ipAddress = (await dns.promises.lookup(hostname)).address.toLowerCase();

  const parseIp = ipaddr.parse(ipAddress);

  const ipRange = parseIp.range();

  if (BLOCK_IPS.includes(ipRange)) {
    const error = new Error("Invalid ip");
    error.statusCode = 400;
    throw error;
  }

  const response = await fetch(normalizedUrl, {
    headers: {
      Accept: "text/html",
    },
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });

  if (REDIRECT_MANUAL_STATUS.includes(response.status)) {
    const location = response.headers.get("location");
    if (!location) throw new Error("Redirect with no location");

    return fetchSafe(location, maxRedirects - 1);
  }

  if (!response.ok) {
    const error = new Error(`Request failed: ${response.status}`);
    error.statusCode = response.status;
    throw error;
  }

  const responseContentType = response.headers.get("content-type");
  if (!responseContentType.includes("text/html")) {
    const error = new Error(`Request failed: ${response.status}`);
    error.statusCode = response.status;
    throw error;
  }

  const contentLength = Number(response.headers.get("content-length"));
  if (contentLength && contentLength > MAX_SIZE_BYTES) {
    throw new Error("Response is larger than 5 MB");
  }

  let totalBytes = 0;
  const chunks = [];

  for await (const chunk of response.body) {
    totalBytes += chunk.length;
    if (totalBytes > MAX_SIZE_BYTES) throw new Error("Response too large");
    chunks.push(chunk);
  }
  const html = Buffer.concat(chunks).toString("utf-8");

  return html;
}

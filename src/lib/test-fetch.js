import { fetchSafe } from "./fetchSafe.js";

await fetchSafe("http://localhost").catch((e) =>
  console.log("✓ blocked localhost:", e.message),
);
await fetchSafe("http://169.254.169.254").catch((e) =>
  console.log("✓ blocked metadata:", e.message),
);
await fetchSafe("file:///etc/passwd").catch((e) =>
  console.log("✓ blocked file://", e.message),
);

// should succeed
const result = await fetchSafe("https://example.com");
console.log("✓ allowed example.com");

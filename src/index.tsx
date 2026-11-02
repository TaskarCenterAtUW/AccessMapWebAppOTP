// Polyfills and shims
import "polyfills";

import { loadConfig } from "constants/config";

// Much of the app reads the config as it is imported, so it is imported once that is loaded
loadConfig()
  .then(() => import("./app"))
  .catch((error) => {
    document.getElementById(
      "root"
    ).textContent = `AccessMap could not start: ${error.message}`;
  });

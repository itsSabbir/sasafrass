import { describe, expect, it } from "vitest";

import packageJson from "../package.json";
import config from "../vercel.json";

describe("Vercel build contract", () => {
  it("installs the exact lockfile before validating", () => {
    expect(config.installCommand).toBe("npm ci");
  });

  it("runs the full repository CI command before publishing", () => {
    expect(config.buildCommand).toBe("npm run ci");
    expect(packageJson.scripts.ci).toBe(
      "npm run typecheck && npm test && npm run build",
    );
  });
});

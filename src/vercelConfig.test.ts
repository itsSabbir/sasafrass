import { describe, expect, it } from "vitest";

import config from "../vercel.json";

describe("Vercel build contract", () => {
  it("runs the full repository CI command before publishing", () => {
    expect(config.buildCommand).toBe("npm run ci");
  });
});

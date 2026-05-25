import { describe, expect, it } from "vitest";
import { readLaunchOptions } from "../src/glue/readLaunchOptions";

describe("readLaunchOptions", () => {
  it("reads debug as an integer URL option", () => {
    const location = new URL("https://example.test/?world=cube&debug=75") as unknown as Location;

    expect(readLaunchOptions(location)).toMatchObject({
      selectedWorldId: "cube",
      debugLevel: 75,
    });
  });
});

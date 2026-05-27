import { describe, expect, it } from "vitest";
import { readLaunchOptions } from "../src/glue/readLaunchOptions";

describe("readLaunchOptions", () => {
  it("reads debug launcher visibility and named debug options from URL params", () => {
    const location = new URL(
      "https://example.test/?world=cube&debug=true&debugOptions=portal-panels,runtime-diagnostics",
    ) as unknown as Location;

    expect(readLaunchOptions(location)).toMatchObject({
      selectedWorldId: "cube",
      debugEnabled: true,
      debugOptions: ["portal-panels", "runtime-diagnostics"],
    });
  });

  it("ignores unknown debug options", () => {
    const location = new URL("https://example.test/?world=cube&debug=true&debugOptions=portal-panels,unknown-option") as unknown as Location;

    expect(readLaunchOptions(location).debugOptions).toEqual(["portal-panels"]);
  });
});

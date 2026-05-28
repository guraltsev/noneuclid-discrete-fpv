import { describe, expect, it } from "vitest";
import { readLaunchOptions } from "../src/glue/readLaunchOptions";

describe("readLaunchOptions", () => {
  it("disables render quality by default", () => {
    expect(readLaunchOptions(locationWithSearch("")).renderQualityEnabled).toBe(false);
  });

  it("can enable render quality with a URL argument", () => {
    expect(readLaunchOptions(locationWithSearch("?renderQuality=on")).renderQualityEnabled).toBe(true);
    expect(readLaunchOptions(locationWithSearch("?renderQuality=1")).renderQualityEnabled).toBe(true);
    expect(readLaunchOptions(locationWithSearch("?renderQuality=true")).renderQualityEnabled).toBe(true);
  });

  it("keeps render quality disabled for explicit off values", () => {
    expect(readLaunchOptions(locationWithSearch("?renderQuality=off")).renderQualityEnabled).toBe(false);
    expect(readLaunchOptions(locationWithSearch("?renderQuality=0")).renderQualityEnabled).toBe(false);
    expect(readLaunchOptions(locationWithSearch("?renderQuality=false")).renderQualityEnabled).toBe(false);
  });
});

function locationWithSearch(search: string): Location {
  return { search } as Location;
}

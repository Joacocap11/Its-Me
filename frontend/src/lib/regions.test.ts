import { describe, expect, it } from "vitest";
import type { Attribute, Entry, Region } from "../api/types";
import { attributesInRegion, matchesQuery, regionLabel, regionsWithData, REGIONS } from "./regions";

const attr = (id: number, region: Region, withEntry: boolean): Attribute => ({
  id, key: `k${id}`, name: `A${id}`, data_type: "number", region, unit: null, options: null,
  size_kind: null, history_enabled: true, builtin: false, sort_order: 10 - id, created_at: "",
  latest_entry: withEntry ? ({ id } as Entry) : null, entry_count: withEntry ? 1 : 0,
});

describe("regions", () => {
  it("has a Spanish label for every region", () => {
    expect(REGIONS).toHaveLength(12);
    expect(regionLabel("full_body")).toBe("Cuerpo completo");
  });
  it("filters and orders attributes by region", () => {
    const list = [attr(1, "head", false), attr(2, "legs", false), attr(3, "head", false)];
    expect(attributesInRegion(list, "head").map((a) => a.id)).toEqual([3, 1]);
  });
  it("lists regions that have values", () => {
    const set = regionsWithData([attr(1, "head", true), attr(2, "legs", false)]);
    expect([...set]).toEqual(["head"]);
  });
  it("matches names ignoring case and accents", () => {
    expect(matchesQuery("Circunferencia de cabeza", "CABEZA")).toBe(true);
    expect(matchesQuery("Camisas", "cámi")).toBe(true);
    expect(matchesQuery("Peso", "alt")).toBe(false);
  });
});

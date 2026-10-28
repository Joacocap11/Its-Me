import { describe, expect, it } from "vitest";
import { buildEye, emptyEyeForm, eyeMeasures, eyeToForm, formatDiopter, isEyeFormEmpty, validateEye } from "./prescription";

const form = (f: Partial<ReturnType<typeof emptyEyeForm>>) => ({ ...emptyEyeForm(), ...f });

describe("formatDiopter", () => {
  it("signs non-zero values and keeps two decimals", () => {
    expect(formatDiopter(-2.25)).toBe("-2,25");
    expect(formatDiopter(1.5)).toBe("+1,50");
    expect(formatDiopter(0)).toBe("0,00");
  });
});

describe("validateEye", () => {
  it("accepts negative, positive and zero with comma or dot", () => {
    expect(validateEye(form({ sph: "-2,25", cyl: "+0.75", axis: "180", add: "1,5" }))).toEqual({});
    expect(validateEye(form({ sph: "0", axis: "0" }))).toEqual({});
  });

  it("allows every field to be empty", () => {
    expect(validateEye(emptyEyeForm())).toEqual({});
  });

  it.each(["181", "-1", "90,5", "abc"])("rejects axis %s", (axis) => {
    expect(validateEye(form({ axis })).axis).toBeDefined();
  });

  it("rejects non numeric and out of range diopters", () => {
    expect(validateEye(form({ sph: "dos" })).sph).toBeDefined();
    expect(validateEye(form({ sph: "31" })).sph).toBeDefined();
    expect(validateEye(form({ cyl: "-16" })).cyl).toBeDefined();
    expect(validateEye(form({ add: "-1" })).add).toBeDefined();
  });
});

describe("buildEye", () => {
  it("omits empty fields but keeps zero", () => {
    expect(buildEye(form({ condition: "myopia", sph: "0" }))).toEqual({ condition: "myopia", sph: 0 });
    expect(buildEye(form({ sph: "-1,5", cyl: "-0,5", axis: "90" }))).toEqual({ sph: -1.5, cyl: -0.5, axis: 90 });
  });

  it("returns null for an empty eye", () => {
    expect(isEyeFormEmpty(emptyEyeForm())).toBe(true);
    expect(buildEye(emptyEyeForm())).toBeNull();
  });
});

describe("eye form round trip", () => {
  it("shows only the measures that exist, with units for axis", () => {
    const eye = { sph: -2.25, axis: 90 };
    expect(eyeMeasures(eye)).toEqual([
      { label: "SPH", value: "-2,25" },
      { label: "AXIS", value: "90°" },
    ]);
    expect(buildEye(eyeToForm({ ...eye, cyl: -0.75, condition: "both", notes: "x" }))).toEqual({ ...eye, cyl: -0.75, condition: "both", notes: "x" });
  });
});

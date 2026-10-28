import { describe, expect, it } from "vitest";
import type { Entry } from "../api/types";
import { formatDate, formatSize, formatValue, parseDecimal, sizeSubtitle, todayISO } from "./format";

const entry = (p: Partial<Entry>): Entry => ({
  id: 1, attribute_id: 1, value_number: null, value_text: null, value_bool: null, unit: null,
  details: null, measured_on: "2024-01-01", notes: null, created_at: "", updated_at: "", ...p,
});

describe("formatDate", () => {
  it("formats ISO dates as DD/MM/YYYY", () => {
    expect(formatDate("2024-03-05")).toBe("05/03/2024");
    expect(formatDate("2024-12-31T10:00:00Z")).toBe("31/12/2024");
  });
});

describe("todayISO", () => {
  it("returns a YYYY-MM-DD string", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("parseDecimal", () => {
  it("accepts dot and comma decimals", () => {
    expect(parseDecimal("72,5")).toBe(72.5);
    expect(parseDecimal(" 180 ")).toBe(180);
  });
  it("rejects invalid input", () => {
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal("")).toBeNull();
  });
});

describe("formatSize", () => {
  it("prefixes numeric systems that need it", () => {
    expect(formatSize(entry({ value_text: "42", unit: "EU" }))).toBe("EU 42");
    expect(formatSize(entry({ value_text: "9.5", unit: "US" }))).toBe("US 9.5");
  });
  it("leaves alpha, numeric and W/L untouched", () => {
    expect(formatSize(entry({ value_text: "M", unit: "ALPHA" }))).toBe("M");
    expect(formatSize(entry({ value_text: "W32/L30", unit: "WL" }))).toBe("W32/L30");
  });
  it("joins subtitle parts", () => {
    expect(sizeSubtitle(entry({ details: { brand: "A", fit: "Regular" } }))).toBe("A · Regular");
    expect(sizeSubtitle(entry({}))).toBe("");
  });
});

describe("formatValue", () => {
  it("formats numbers with unit and es-AR decimals", () => {
    expect(formatValue({ data_type: "number", unit: "kg" }, entry({ value_number: 72.5, unit: "kg" }))).toBe("72,5 kg");
  });
  it("formats booleans and text", () => {
    expect(formatValue({ data_type: "boolean", unit: null }, entry({ value_bool: true }))).toBe("Sí");
    expect(formatValue({ data_type: "text", unit: null }, entry({ value_text: "Azul" }))).toBe("Azul");
  });
});

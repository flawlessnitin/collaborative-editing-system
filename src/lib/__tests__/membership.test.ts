import { describe, it, expect } from "vitest";
import { meetsMinRole } from "../membership";

describe("meetsMinRole", () => {
  it("a viewer does not meet an editor-or-higher requirement", () => {
    // Regression test: an earlier version of this check compared roles with
    // `<` directly (string comparison), which sorts alphabetically —
    // "editor" < "owner" < "viewer" — and would make this assertion fail.
    expect(meetsMinRole("viewer", "editor")).toBe(false);
  });

  it("an editor meets an editor-or-higher requirement", () => {
    expect(meetsMinRole("editor", "editor")).toBe(true);
  });

  it("an owner meets every requirement", () => {
    expect(meetsMinRole("owner", "viewer")).toBe(true);
    expect(meetsMinRole("owner", "editor")).toBe(true);
    expect(meetsMinRole("owner", "owner")).toBe(true);
  });

  it("a viewer only meets the viewer requirement", () => {
    expect(meetsMinRole("viewer", "viewer")).toBe(true);
    expect(meetsMinRole("viewer", "owner")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import {
  canCreateFirstAdmin,
  isValidEmail,
  isValidPassword,
} from "./first-access";

describe("first-access admin (spec §2 + §6)", () => {
  it("allows signup only when the instance has no users", () => {
    expect(canCreateFirstAdmin(0)).toBe(true);
    expect(canCreateFirstAdmin(1)).toBe(false);
    expect(canCreateFirstAdmin(12)).toBe(false);
  });

  it("accepts a plain email identifier — no verification channel", () => {
    expect(isValidEmail("admin@local")).toBe(true);
    expect(isValidEmail("dev@example.com")).toBe(true);
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });

  it("requires a password of at least 8 characters and nothing else", () => {
    expect(isValidPassword("abcdefgh")).toBe(true);
    expect(isValidPassword("short")).toBe(false);
    expect(isValidPassword("")).toBe(false);
  });
});

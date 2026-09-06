import { describe, expect, it } from "vitest";
import {
  PAIRING_CODE_PLACEHOLDER,
  formatPairingCountdown,
  isPairingCode,
  pairingSecondsLeft,
  pluginInstallCommand,
  pluginInstallPreview,
} from "./plugin-install";

describe("the install command", () => {
  it("carries the instance and the code, with the URL quoted", () => {
    expect(pluginInstallCommand("https://board.example", "123456")).toBe(
      'curl -fsSL "https://board.example/install.sh?code=123456" | sh',
    );
  });

  it("does not double the slash when the origin carries one", () => {
    expect(pluginInstallCommand("https://board.example/", "123456")).toContain(
      "https://board.example/install.sh",
    );
  });

  it("shows the same shape before a code exists, with no code in it", () => {
    const preview = pluginInstallPreview("https://board.example");
    expect(preview).toContain(PAIRING_CODE_PLACEHOLDER);
    expect(preview).not.toMatch(/code=\d/);
  });
});

describe("what counts as a pairing code", () => {
  it("takes exactly six digits", () => {
    expect(isPairingCode("000000")).toBe(true);
    expect(isPairingCode("987654")).toBe(true);
  });

  it("refuses anything else, which is what keeps it out of a shell", () => {
    for (const value of [
      "12345",
      "1234567",
      "12345a",
      "",
      " 123456",
      "123456\nrm -rf /",
      '123456"; curl evil',
      null,
      undefined,
      123456,
    ]) {
      expect(isPairingCode(value)).toBe(false);
    }
  });
});

describe("how long a code has left", () => {
  const now = Date.parse("2026-08-20T12:00:00.000Z");

  it("counts whole seconds forward", () => {
    expect(pairingSecondsLeft("2026-08-20T12:09:58.000Z", now)).toBe(598);
  });

  it("floors at zero instead of counting down past the expiry", () => {
    expect(pairingSecondsLeft("2026-08-20T11:59:00.000Z", now)).toBe(0);
  });

  it("treats an unreadable expiry as already gone", () => {
    expect(pairingSecondsLeft("not a date", now)).toBe(0);
  });

  it("reads as a timer", () => {
    expect(formatPairingCountdown(598)).toBe("9:58");
    expect(formatPairingCountdown(60)).toBe("1:00");
    expect(formatPairingCountdown(9)).toBe("0:09");
    expect(formatPairingCountdown(-5)).toBe("0:00");
  });
});

import { describe, expect, it } from "vitest";
import { pickRowNumber, typeInitial } from "./board-row";

describe("pickRowNumber", () => {
  it("prefers the cost when the pricing layer priced the run", () => {
    expect(
      pickRowNumber(
        [
          { kind: "duration", text: "~7m" },
          { kind: "tokens", text: "~342k" },
          { kind: "cost", text: "~$1.47" },
        ],
        null,
      ),
    ).toEqual({ kind: "cost", text: "~$1.47" });
  });

  it("falls back to the tokens with pricing off", () => {
    expect(
      pickRowNumber(
        [
          { kind: "duration", text: "~7m" },
          { kind: "tokens", text: "~342k" },
        ],
        null,
      ),
    ).toEqual({ kind: "tokens", text: "~342k" });
  });

  it("falls back to the duration when the run reported no tokens", () => {
    expect(
      pickRowNumber(
        [
          { kind: "duration", text: "~7m" },
          { kind: "note", text: "usage not reported" },
        ],
        null,
      ),
    ).toEqual({ kind: "duration", text: "~7m" });
  });

  it("never shows a note: a word is not the number the row is for", () => {
    expect(pickRowNumber([{ kind: "note", text: "usage not reported" }], null)).toBeNull();
  });

  it("reads the running clock when the card has no telemetry yet", () => {
    expect(pickRowNumber([], "3 min")).toEqual({ kind: "duration", text: "3 min" });
  });

  it("leaves the edge empty when the card has no number at all", () => {
    expect(pickRowNumber([], null)).toBeNull();
  });
});

describe("typeInitial", () => {
  it("gives one distinct letter to each of the three types", () => {
    expect(["feature", "bug", "rfc"].map(typeInitial)).toEqual(["F", "B", "R"]);
  });
});

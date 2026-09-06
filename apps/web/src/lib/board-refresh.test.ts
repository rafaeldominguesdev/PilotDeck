import { describe, expect, it, vi } from "vitest";
import {
  BOARD_REFRESH_INTERVAL_MS,
  subscribeToBoardRefresh,
} from "./board-refresh";

function harness(initialVisibility: DocumentVisibilityState = "visible") {
  let visibilityState = initialVisibility;
  let visibilityListener: (() => void) | null = null;
  let intervalCallback: (() => void) | null = null;

  const doc = {
    get visibilityState() {
      return visibilityState;
    },
    addEventListener: vi.fn((_event: string, listener: () => void) => {
      visibilityListener = listener;
    }),
    removeEventListener: vi.fn((_event: string, listener: () => void) => {
      if (visibilityListener === listener) visibilityListener = null;
    }),
  } as unknown as Document;

  const clock = {
    setInterval: vi.fn((callback: () => void) => {
      intervalCallback = callback;
      return 17;
    }),
    clearInterval: vi.fn(),
  };

  return {
    doc,
    clock,
    tick: () => intervalCallback?.(),
    setVisibility(next: DocumentVisibilityState) {
      visibilityState = next;
      visibilityListener?.();
    },
  };
}

describe("board refresh subscription", () => {
  it("refreshes a visible board on the regular cadence", () => {
    const refresh = vi.fn();
    const host = harness();

    const unsubscribe = subscribeToBoardRefresh(refresh, host.doc, host.clock);

    expect(host.clock.setInterval).toHaveBeenCalledWith(
      refresh,
      BOARD_REFRESH_INTERVAL_MS,
    );
    host.tick();
    expect(refresh).toHaveBeenCalledOnce();

    unsubscribe();
    expect(host.clock.clearInterval).toHaveBeenCalledWith(17);
  });

  it("pauses while hidden and refreshes immediately when visible again", () => {
    const refresh = vi.fn();
    const host = harness("hidden");

    subscribeToBoardRefresh(refresh, host.doc, host.clock);
    expect(host.clock.setInterval).not.toHaveBeenCalled();

    host.setVisibility("visible");
    expect(refresh).toHaveBeenCalledOnce();
    expect(host.clock.setInterval).toHaveBeenCalledOnce();

    host.setVisibility("hidden");
    expect(host.clock.clearInterval).toHaveBeenCalledWith(17);
  });
});

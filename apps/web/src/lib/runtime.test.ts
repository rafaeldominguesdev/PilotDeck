import { describe, expect, it } from "vitest";
import { detectRuntimeFrom, type RuntimeSignals } from "./runtime";

const nothing: RuntimeSignals = {
  override: null,
  dockerEnvFile: false,
  containerEnvFile: false,
  cgroup: null,
};

describe("detecting how the instance runs", () => {
  it("calls it a container when docker left its marker file", () => {
    expect(detectRuntimeFrom({ ...nothing, dockerEnvFile: true })).toBe("container");
  });

  it("calls it a container when podman left its marker file", () => {
    expect(detectRuntimeFrom({ ...nothing, containerEnvFile: true })).toBe("container");
  });

  it("reads the container runtime off the init cgroup", () => {
    for (const line of [
      "12:pids:/docker/3f2a9c",
      "0::/kubepods/besteffort/pod123",
      "1:name=systemd:/podman/abc",
      "9:memory:/lxc/board",
    ]) {
      expect(detectRuntimeFrom({ ...nothing, cgroup: line })).toBe("container");
    }
  });

  it("calls a plain checkout source, with no marker anywhere", () => {
    expect(detectRuntimeFrom(nothing)).toBe("source");
    expect(detectRuntimeFrom({ ...nothing, cgroup: "0::/\n" })).toBe("source");
    expect(detectRuntimeFrom({ ...nothing, cgroup: "0::/user.slice/session-2.scope" })).toBe(
      "source",
    );
  });

  it("lets the override name a runtime detection cannot see", () => {
    expect(detectRuntimeFrom({ ...nothing, override: "container" })).toBe("container");
    expect(detectRuntimeFrom({ ...nothing, override: " Docker " })).toBe("container");
    expect(detectRuntimeFrom({ ...nothing, override: "source", dockerEnvFile: true })).toBe(
      "source",
    );
    expect(detectRuntimeFrom({ ...nothing, override: "HOST", cgroup: "12:pids:/docker/x" })).toBe(
      "source",
    );
  });

  it("ignores an override nobody can read instead of guessing from it", () => {
    expect(detectRuntimeFrom({ ...nothing, override: "yes", dockerEnvFile: true })).toBe(
      "container",
    );
    expect(detectRuntimeFrom({ ...nothing, override: "", dockerEnvFile: true })).toBe("container");
    expect(detectRuntimeFrom({ ...nothing, override: "whatever" })).toBe("source");
  });
});

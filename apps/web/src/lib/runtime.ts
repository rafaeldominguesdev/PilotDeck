import { existsSync, readFileSync } from "node:fs";

/**
 * How this instance is running. The updates panel branches on it: only a
 * container can be replaced by the updater sidecar, and only a checkout can be
 * updated with a pull and a restart.
 */
export type Runtime = "container" | "source";

/**
 * Escape hatch for the cases detection cannot see: a container built without
 * `/.dockerenv` and with a hidden cgroup, or a checkout running inside a dev
 * container where the process is still updated by hand.
 */
export const RUNTIME_ENV = "PILOTDECK_RUNTIME";

/** Raw signals, gathered separately so the rule itself stays testable. */
export type RuntimeSignals = {
  /** Value of PILOTDECK_RUNTIME, if the owner set one. */
  override: string | null;
  /** Docker writes this file into every container it starts. */
  dockerEnvFile: boolean;
  /** Podman's equivalent marker. */
  containerEnvFile: boolean;
  /** Contents of /proc/1/cgroup, or null when the file is unreadable. */
  cgroup: string | null;
};

/**
 * Container runtimes leave their name in the init process's cgroup path. On
 * cgroup v2 the path is often just `0::/`, which proves nothing either way:
 * that is why the marker files are read as well.
 */
const CGROUP_MARKERS = /\b(docker|containerd|kubepods|podman|lxc|crio)\b/i;

const CONTAINER_WORDS = new Set(["container", "docker", "compose", "podman"]);
const SOURCE_WORDS = new Set(["source", "host", "bare", "baremetal", "node", "dev"]);

/**
 * The rule the panel depends on. An explicit override wins; otherwise a
 * container marker has to be found, and anything else is a plain checkout,
 * because telling a source install to run docker is the failure this avoids.
 */
export function detectRuntimeFrom(signals: RuntimeSignals): Runtime {
  const override = signals.override?.trim().toLowerCase();
  if (override) {
    if (CONTAINER_WORDS.has(override)) return "container";
    if (SOURCE_WORDS.has(override)) return "source";
    // An unreadable override is not a reason to lie: fall through to the
    // signals instead of picking a branch from a typo.
  }
  if (signals.dockerEnvFile || signals.containerEnvFile) return "container";
  if (signals.cgroup && CGROUP_MARKERS.test(signals.cgroup)) return "container";
  return "source";
}

/** Reads the signals off this machine. */
export function readRuntimeSignals(): RuntimeSignals {
  let cgroup: string | null = null;
  try {
    cgroup = readFileSync("/proc/1/cgroup", "utf8");
  } catch {
    // Not Linux, or a kernel that does not expose it: the marker files answer.
    cgroup = null;
  }
  return {
    override: process.env[RUNTIME_ENV] ?? null,
    dockerEnvFile: existsSync("/.dockerenv"),
    containerEnvFile: existsSync("/run/.containerenv"),
    cgroup,
  };
}

/** How this instance is running, read from the machine it runs on. */
export function detectRuntime(): Runtime {
  return detectRuntimeFrom(readRuntimeSignals());
}

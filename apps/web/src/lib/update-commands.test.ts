import { describe, expect, it } from "vitest";
import { updateCommand, updaterEnableCommand } from "./update-commands";

describe("the manual update command per deploy mode", () => {
  it("never offers the quickstart's raw compose command on a hosted instance", () => {
    // This is the exact command the OCL-43 incident traced back to: run
    // against the hosted project it collides with the pinned compose files
    // and the deploy lock. A hosted instance must only ever be told to run
    // the script that holds both.
    expect(updateCommand("hosted")).toBe("./deploy/deploy.sh");
    expect(updateCommand("hosted")).not.toContain("docker compose up");
  });

  it("keeps the checkout command for the quickstart install", () => {
    expect(updateCommand("quickstart")).toBe("git pull && docker compose up -d --build");
  });
});

describe("the updater-enable command per deploy mode", () => {
  it("pins the hosted project and compose file, not the quickstart default", () => {
    expect(updaterEnableCommand("hosted")).toBe(
      "docker compose -p pilotdeck -f deploy/docker-compose.cloud.yml --profile updater up -d",
    );
  });

  it("uses the plain profile flag for the quickstart install", () => {
    expect(updaterEnableCommand("quickstart")).toBe("docker compose --profile updater up -d");
  });
});

import { describe, expect, it } from "vitest";
import { DELIVERY_UNVERIFIED_WARNING, verifyDelivery } from "./delivery-verification";

function response(body: unknown, ok = true): Response {
  return new Response(JSON.stringify(body), {
    status: ok ? 200 : 404,
    headers: { "content-type": "application/json" },
  });
}

describe("verifyDelivery", () => {
  it("does not verify or flag a project without a remote", async () => {
    const result = await verifyDelivery({
      repoUrl: null,
      commit: "abc123",
      branch: "main",
    });

    expect(result).toEqual({
      status: null,
      unverified: false,
      warning: null,
    });
  });

  it("verifies a commit that the GitHub branch contains", async () => {
    const fetch = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.endsWith("/commits/abc123")) return response({ sha: "abc123" });
      if (url.endsWith("/branches/main")) {
        return response({ commit: { sha: "abc123" } });
      }
      throw new Error("unexpected GitHub request");
    };

    await expect(
      verifyDelivery(
        {
          repoUrl: "https://github.com/example/board.git",
          commit: "abc123",
          branch: "main",
        },
        { fetch },
      ),
    ).resolves.toEqual({ status: "verified", unverified: false, warning: null });
  });

  it("accepts a fake commit but marks the delivery unverified", async () => {
    const result = await verifyDelivery(
      {
        repoUrl: "https://github.com/example/board",
        commit: "deadbeef",
        branch: "main",
      },
      { fetch: async () => response({ message: "Not Found" }, false) },
    );

    expect(result).toEqual({
      status: "unverified",
      unverified: true,
      warning: DELIVERY_UNVERIFIED_WARNING,
    });
  });

  it("marks a remote project without a commit as unverified", async () => {
    const result = await verifyDelivery({
      repoUrl: "https://github.com/example/board",
      branch: "main",
    });

    expect(result).toEqual({
      status: "unverified",
      unverified: true,
      warning: DELIVERY_UNVERIFIED_WARNING,
    });
  });

  it("uses ls-remote and an ancestry check for a generic remote", async () => {
    const calls: string[][] = [];
    const result = await verifyDelivery(
      {
        repoUrl: "./test-remote.git",
        commit: "abc123",
        branch: "main",
      },
      {
        git: async (args) => {
          calls.push(args);
          if (args[0] === "ls-remote") return "def456\trefs/heads/main\n";
          return "";
        },
      },
    );

    expect(result).toEqual({ status: "verified", unverified: false, warning: null });
    expect(calls[0]).toEqual([
      "ls-remote",
      "--refs",
      "--",
      "./test-remote.git",
      "refs/heads/main",
    ]);
    expect(calls.some((args) => args.includes("merge-base"))).toBe(true);
  });
});

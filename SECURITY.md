# Security Policy

## Supported Versions

Security fixes are applied to the latest published minor release. Older majors
are not backported.

| Version | Supported          |
| ------- | ------------------ |
| 2.x     | :white_check_mark: |
| 1.x     | :x:                |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Report privately using GitHub's
[private vulnerability reporting](https://github.com/ericmmartin/youtube-transcript-plus/security/advisories/new).
If that is unavailable to you, email
[eric@ericmmartin.com](mailto:eric@ericmmartin.com) with `SECURITY` in the
subject line.

Please include:

- A description of the vulnerability and its impact
- Steps to reproduce, ideally a minimal code sample
- The version of `youtube-transcript-plus` and Node.js you tested against
- Any suggested mitigation, if you have one

### What to expect

- **Acknowledgement** within 5 business days.
- **An assessment** — whether we consider it a vulnerability, and the severity —
  within 10 business days.
- **A fix and published advisory** for confirmed vulnerabilities, coordinated
  with you on timing. This is a single-maintainer project, so please allow up to
  90 days before public disclosure.

We are happy to credit you in the advisory unless you prefer to remain anonymous.

## Scope

This library fetches data from YouTube's unofficial Innertube API and parses the
response. Issues that are in scope include, but are not limited to:

- Code injection or prototype pollution reachable from library input (a video
  ID, URL, or config value) or from a malicious/unexpected API response
- Denial of service via malformed transcript XML (for example, catastrophic
  backtracking in parsing)
- Path traversal or unsafe file writes in `FsCache` cache keys
- Leakage of credentials, cookies, or proxy configuration supplied via custom
  fetch functions
- Insecure defaults in the outbound requests the library makes

### Out of scope

- **YouTube blocking, rate limiting, or breaking changes.** This library depends
  on an unofficial API; `YoutubeTranscriptTooManyRequestError` and similar
  failures are expected operational behavior, not vulnerabilities. Please open a
  regular issue.
- Vulnerabilities in a transitive dependency with no exploitable path through
  this library's API — report those upstream, though we still welcome a heads-up.
- Anything requiring the attacker to already control the machine running the
  library.
- Use of `disableHttps: true`, which is an explicitly documented opt-in.

## Supply Chain

Releases are published to npm from a GitHub Actions workflow with
[npm provenance](https://docs.npmjs.com/generating-provenance-statements)
enabled, so each published tarball is cryptographically linked to the commit and
workflow run that produced it. You can verify a release with:

```bash
npm audit signatures
```

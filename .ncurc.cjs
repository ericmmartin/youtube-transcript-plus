// npm-check-updates config. Mirrors the ignore rules in .github/dependabot.yml.
//
// These packages are held to minor/patch updates within their current major:
// - nock 15 and undici 8 require Node >= 22, but we still support Node 20 until
//   v3.0.0 (no earlier than January 2027). Remove them when Node 20 is dropped.
const MINOR_ONLY = new Set(['nock', 'undici']);

module.exports = {
  // typescript-eslint caps its supported TypeScript range, so TS majors can't
  // land until it catches up.
  reject: ['typescript'],
  target: (name) => (MINOR_ONLY.has(name) ? 'minor' : 'latest'),
};

# Contributing to youtube-transcript-plus

Thanks for taking the time to contribute! This project is small and pull requests
are genuinely welcome — bug fixes, tests, docs, and new features all help.

## Getting started

Requires Node.js >= 20.

```bash
git clone https://github.com/ericmmartin/youtube-transcript-plus.git
cd youtube-transcript-plus
npm ci
```

## Development workflow

| Command              | What it does                |
| -------------------- | --------------------------- |
| `npm test`           | Run the Vitest suite once   |
| `npm run test:watch` | Run tests in watch mode     |
| `npm run lint`       | ESLint over the repo        |
| `npm run typecheck`  | `tsc --noEmit`              |
| `npm run build`      | Build `dist/` with Rollup   |
| `npm run format`     | Prettier over `src/**/*.ts` |

Before opening a pull request, please make sure all four of these pass:

```bash
npm run lint && npm run typecheck && npm run build && npm test
```

CI runs exactly these on Node 20.x, 22.x, and 24.x.

## Project layout

```
src/
  index.ts        # YoutubeTranscript class, fetchTranscript, listLanguages
  types.ts        # TranscriptConfig, TranscriptSegment, CacheStrategy
  utils.ts        # retrieveVideoId, defaultFetch
  errors.ts       # error classes
  formatters.ts   # toSRT, toVTT, toPlainText
  constants.ts
  cache/          # InMemoryCache, FsCache
  __tests__/      # tests mirror the source layout
```

## Testing

- Tests live in `src/__tests__/` and mirror the source layout.
- HTTP is mocked with [`nock`](https://github.com/nock/nock) — **tests must not make
  real network calls to YouTube.** Add fixtures under `src/__tests__/fixtures/`
  rather than hitting the live API.
- New features and bug fixes should come with tests. For a bug fix, a test that
  fails before your change and passes after is ideal.

## Code style

Prettier and ESLint are enforced by a Husky pre-commit hook via lint-staged, so
formatting is handled for you on commit. The configured style is single quotes,
semicolons, 2-space indent, 100-character line width, and trailing commas.

## Commit messages

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add support for auto-translated caption tracks
fix: handle empty captionTracks array
chore(deps): bump vitest to 4.1.10
docs: clarify cache key format
test: cover FsCache TTL expiry
```

## Pull requests

1. Branch from `main` (e.g. `fix/empty-caption-tracks`).
2. Keep the change focused — one logical change per PR.
3. Fill out the pull request template, including how you tested.
4. Update the README if you change public API or configuration options.

## Reporting bugs

Open an issue using the bug report template. Because this library depends on
YouTube's unofficial Innertube API, please include the video ID (if the video is
public), the config you passed, the full error, and your Node version — behavior
often differs by video and region.

## Security issues

Please **do not** open a public issue for a security vulnerability. See
[SECURITY.md](SECURITY.md) for private reporting instructions.

## Code of Conduct

Participation in this project is governed by the
[Code of Conduct](CODE_OF_CONDUCT.md).

## License

By contributing, you agree that your contributions will be licensed under the
[MIT License](LICENSE).

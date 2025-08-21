# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**youtube-transcript-plus** is a Node.js library that fetches YouTube video transcripts using YouTube's unofficial Innertube API. The library provides multiple caching strategies, language support, custom fetch functions, and comprehensive error handling.

## Development Commands

### Building and Testing
- `npm run build` - Build the project using Rollup
- `npm test` - Run Jest test suite with coverage
- `npm run test:watch` - Run tests in watch mode
- `npm run format` - Format code using Prettier

### Code Quality
- `npm run prepare` - Set up Husky git hooks
- The project uses lint-staged with ESLint and Prettier on commit

## Architecture

### Core Components

**Main Entry Point (`src/index.ts`)**
- `YoutubeTranscript` class with both instance and static methods
- `fetchTranscript()` function exported for convenience
- Uses YouTube Innertube API instead of HTML scraping

**Key Flow:**
1. Extract video ID from URL/ID parameter
2. Fetch YouTube watch page to get Innertube API key
3. Call Innertube player endpoint as ANDROID client
4. Extract captionTracks from response
5. Select appropriate track based on language preference
6. Fetch and parse XML transcript data
7. Cache results if caching strategy provided

**Type Definitions (`src/types.ts`)**
- `TranscriptConfig` - Configuration options
- `TranscriptResponse` - Individual transcript segment
- `CacheStrategy` - Interface for caching implementations

**Utilities (`src/utils.ts`)**
- `retrieveVideoId()` - Extract video ID from URL or validate 11-char ID
- `defaultFetch()` - Default fetch implementation with proper headers

**Error Classes (`src/errors.ts`)**
- Specific error types for different failure scenarios
- All extend native Error with descriptive messages

### Caching System (`src/cache/`)

**Two built-in implementations:**
- `InMemoryCache` - Memory-based with TTL support
- `FsCache` - File system-based with TTL support

**Custom Strategy Support:**
- Implement `CacheStrategy` interface with `get()` and `set()` methods
- Cache keys format: `yt:transcript:{videoId}:{lang}`

### Configuration Options

**Core Options:**
- `lang` - Language code for transcript (e.g., 'en', 'fr')
- `userAgent` - Custom User-Agent string
- `disableHttps` - Use HTTP instead of HTTPS

**Advanced Options:**
- `cache` - Custom caching strategy
- `cacheTTL` - Cache time-to-live in milliseconds
- `videoFetch` - Custom fetch function for video page
- `transcriptFetch` - Custom fetch function for transcript data

## Build Configuration

**TypeScript (`tsconfig.json`)**
- Target ES2015, ESNext modules
- Declarations generated in `dist/`
- Strict mode disabled for compatibility

**Rollup (`rollup.config.js`)**
- ESM output format
- TypeScript compilation with declaration generation
- External dependencies: `fs/promises`, `path`

**Jest (`jest.config.js`)**
- ts-jest preset for TypeScript support
- Coverage reports in `coverage/`
- Test pattern: `**/*.test.ts`

## Code Style

**Prettier Configuration:**
- Single quotes, semicolons
- 2-space indentation
- 100 character line width
- Trailing commas

**Git Hooks:**
- Pre-commit: ESLint fix + Prettier format on staged TypeScript files
- Husky manages git hooks

## Testing Strategy

Tests located in `src/__tests__/` with separate directories for:
- Cache implementations (`cache/`)
- Main functionality (`index.test.ts`)

Run individual test files: `npm test -- --testPathPattern=cache`

## Common Patterns

**Error Handling:**
Always catch and handle specific error types:
```typescript
try {
  const transcript = await fetchTranscript(videoId);
} catch (error) {
  if (error instanceof YoutubeTranscriptVideoUnavailableError) {
    // Handle unavailable video
  }
  // Handle other specific error types
}
```

**Custom Fetch Functions:**
When implementing proxy or custom networking:
```typescript
const config: TranscriptConfig = {
  videoFetch: async ({ url, lang, userAgent }) => {
    // Custom logic for video page fetch
  },
  transcriptFetch: async ({ url, lang, userAgent }) => {
    // Custom logic for transcript fetch
  }
};
```

**Caching Implementation:**
Custom cache strategies must implement both `get()` and `set()` methods with proper error handling.
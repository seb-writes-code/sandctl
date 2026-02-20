// Build information — injected at compile time by Makefile via bun's --define flag.
// Falls back to dev defaults when running from source.
declare const __SANDCTL_VERSION__: string;
declare const __SANDCTL_COMMIT__: string;
declare const __SANDCTL_BUILD_TIME__: string;

export const VERSION = typeof __SANDCTL_VERSION__ !== "undefined" ? __SANDCTL_VERSION__ : "dev";
export const COMMIT = typeof __SANDCTL_COMMIT__ !== "undefined" ? __SANDCTL_COMMIT__ : "unknown";
export const BUILD_TIME =
  typeof __SANDCTL_BUILD_TIME__ !== "undefined" ? __SANDCTL_BUILD_TIME__ : "unknown";

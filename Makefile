.PHONY: build build-all test lint fmt check-fmt install clean help

# Build variables
BINARY_NAME=sandctl
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
COMMIT ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_TIME ?= $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

help: ## Show this help message
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Build the binary for the current platform
	bun build src/index.ts --compile --outfile $(BINARY_NAME) \
		--define __SANDCTL_VERSION__='"$(VERSION)"' \
		--define __SANDCTL_COMMIT__='"$(COMMIT)"' \
		--define __SANDCTL_BUILD_TIME__='"$(BUILD_TIME)"'

build-all: ## Build for all platforms (darwin-arm64, darwin-x64, linux-x64, linux-arm64)
	VERSION=$(VERSION) COMMIT=$(COMMIT) BUILD_TIME=$(BUILD_TIME) \
		./scripts/build-all.sh

test: ## Run all tests
	bun test

test\:unit: ## Run unit tests only
	bun test tests/unit/

test\:e2e: ## Run E2E tests (requires HETZNER_API_TOKEN)
	@if [ -f .env ]; then set -a; . ./.env; set +a; fi && bun test tests/e2e/

lint: ## Run linter (Biome)
	bun run lint

fmt: ## Format source code
	bun run fmt

check-fmt: ## Check code formatting (CI use)
	bun run check-fmt

install-hooks: ## Install git pre-commit hooks
	@./scripts/install-hooks.sh

install: build ## Install binary to /usr/local/bin
	sudo cp $(BINARY_NAME) /usr/local/bin/$(BINARY_NAME)

clean: ## Remove build artifacts
	rm -f $(BINARY_NAME)
	rm -f $(BINARY_NAME)-darwin-arm64 $(BINARY_NAME)-darwin-x64 $(BINARY_NAME)-linux-x64 $(BINARY_NAME)-linux-arm64
	rm -rf dist/ node_modules/.cache

.DEFAULT_GOAL := help

#!/usr/bin/env bash

# publish-release.sh — Automates the Monguito release process.
#
# Usage:
#   ./scripts/publish-release.sh <patch|minor|major>
#
# This script encodes every step documented in docs/new-version-publication.md:
#   1. Precondition checks  (.npmrc, branch, clean tree, npm auth, gh auth)
#   2. Validation            (yarn test, yarn build, npm pack --dry-run)
#   3. Version bump          (npm version <type>)
#   4. Push                  (commit + tag)
#   5. npm publish
#   6. GitHub release        (gh release create)
#   7. Post-publish verification

set -euo pipefail

# ---------------------------------------------------------------------------
# Colour helpers
# ---------------------------------------------------------------------------
if [[ -t 1 ]]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BLUE='\033[0;34m'
  BOLD='\033[1m'
  NC='\033[0m' # No Colour
else
  RED='' GREEN='' YELLOW='' BLUE='' BOLD='' NC=''
fi

info()    { echo -e "${BLUE}ℹ ${NC}${BOLD}$*${NC}"; }
success() { echo -e "${GREEN}✔ ${NC}$*"; }
warn()    { echo -e "${YELLOW}⚠ ${NC}$*"; }
error()   { echo -e "${RED}✖ ${NC}$*" >&2; }

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------
usage() {
  cat <<EOF
Usage: $0 <patch|minor|major>

Automates the Monguito release process:
  patch  — bug-fix release      (e.g. 7.0.0 → 7.0.1)
  minor  — new feature release  (e.g. 7.0.0 → 7.1.0)
  major  — breaking change      (e.g. 7.0.0 → 8.0.0)

See docs/new-version-publication.md for the full manual procedure.
EOF
  exit 1
}

# ---------------------------------------------------------------------------
# Argument validation
# ---------------------------------------------------------------------------
BUMP_TYPE="${1:-}"

if [[ -z "$BUMP_TYPE" ]]; then
  error "Missing version bump type."
  usage
fi

case "$BUMP_TYPE" in
  patch|minor|major) ;;
  *)
    error "Invalid version bump type: '$BUMP_TYPE'"
    usage
    ;;
esac

info "Starting Monguito release — bump type: ${BOLD}${BUMP_TYPE}${NC}"
echo

# ═══════════════════════════════════════════════════════════════════════════
# Step 1 — Preconditions
# ═══════════════════════════════════════════════════════════════════════════
info "Step 1/7 — Checking preconditions…"

# 1a. .npmrc tag-version-prefix
if [[ -f .npmrc ]] && grep -q '^tag-version-prefix=$' .npmrc; then
  success ".npmrc tag-version-prefix is correctly configured (empty)"
else
  error ".npmrc is missing or does not contain 'tag-version-prefix=' (empty value)."
  error "Run the following command once, then commit .npmrc:"
  error "  npm config set tag-version-prefix \"\" --location=project"
  error "See docs/new-version-publication.md for details."
  exit 1
fi

# 1b. Must be on main
CURRENT_BRANCH="$(git branch --show-current)"
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  error "You must be on the 'main' branch (currently on '${CURRENT_BRANCH}')."
  exit 1
fi
success "On branch 'main'"

# 1c. Up to date with origin/main
git fetch origin main --quiet
LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse origin/main)"
if [[ "$LOCAL_SHA" != "$REMOTE_SHA" ]]; then
  error "Local 'main' (${LOCAL_SHA:0:7}) is not up to date with origin/main (${REMOTE_SHA:0:7})."
  error "Run 'git pull origin main' first."
  exit 1
fi
success "Up to date with origin/main"

# 1d. Clean working tree (tracked changes + untracked files)
if [[ -n "$(git status --porcelain)" ]]; then
  error "Working tree is not clean. Commit or stash your changes first."
  git status --short >&2
  exit 1
fi
success "Working tree is clean"

# 1e. npm authentication (checked early to avoid pushing code without being able to publish)
NPM_USER="$(npm whoami 2>/dev/null)" || true
if [[ -z "$NPM_USER" ]]; then
  error "Not authenticated with npm. Run 'npm login' and re-run this script."
  exit 1
fi
success "Authenticated with npm as '${NPM_USER}'"

# 1f. npm registry
NPM_REGISTRY="$(npm config get registry)"
if [[ "$NPM_REGISTRY" != "https://registry.npmjs.org/" ]]; then
  error "npm registry is '${NPM_REGISTRY}', expected 'https://registry.npmjs.org/'."
  error "Run: npm config set registry https://registry.npmjs.org/"
  exit 1
fi
success "npm registry: ${NPM_REGISTRY}"

# 1g. GitHub CLI
if ! command -v gh &>/dev/null; then
  error "'gh' (GitHub CLI) is not installed. Install it from https://cli.github.com/"
  exit 1
fi
if ! gh auth status &>/dev/null; then
  error "GitHub CLI is not authenticated. Run 'gh auth login' and re-run this script."
  exit 1
fi
success "GitHub CLI (gh) is available and authenticated"
echo

# ═══════════════════════════════════════════════════════════════════════════
# Step 2 — Validation
# ═══════════════════════════════════════════════════════════════════════════
info "Step 2/7 — Running validation…"

info "Running tests…"
yarn test
success "Tests passed"

info "Building…"
yarn build
success "Build succeeded"

info "Checking package contents (npm pack --dry-run)…"
echo "---"
npm pack --dry-run
echo "---"
success "Package contents listed above — review before continuing"
echo

read -r -p "$(echo -e "${YELLOW}⚠${NC} Proceed with version bump, push, npm publish, and GitHub release? [y/N] ")" CONFIRM
case "$CONFIRM" in
  y|Y|yes|YES) ;;
  *)
    error "Aborted by user. No changes were made."
    exit 1
    ;;
esac
echo

# ═══════════════════════════════════════════════════════════════════════════
# Step 3 — Version bump
# ═══════════════════════════════════════════════════════════════════════════
info "Step 3/7 — Bumping version (${BUMP_TYPE})…"

PREV_VERSION="$(npm pkg get version | tr -d '"')"
info "Current version: ${PREV_VERSION}"

npm version "$BUMP_TYPE"

NEW_TAG="$(git describe --tags --abbrev=0)"
info "New tag: ${NEW_TAG}"

# Verify no v prefix
if [[ "$NEW_TAG" == v* ]]; then
  error "Tag '${NEW_TAG}' has a 'v' prefix. This should not happen when tag-version-prefix is empty."
  error "See the 'Prerequisite: configure npm tags' section in docs/new-version-publication.md."
  exit 1
fi
success "Version bumped: ${PREV_VERSION} → ${NEW_TAG} (no 'v' prefix)"
echo

# ═══════════════════════════════════════════════════════════════════════════
# Step 4 — Push
# ═══════════════════════════════════════════════════════════════════════════
info "Step 4/7 — Pushing to GitHub…"

git push origin main
success "Pushed version commit to origin/main"

git push origin "$NEW_TAG"
success "Pushed tag '${NEW_TAG}' to origin"
echo

# ═══════════════════════════════════════════════════════════════════════════
# Step 5 — npm publish
# ═══════════════════════════════════════════════════════════════════════════
info "Step 5/7 — Publishing to npm…"

npm publish
success "Published to npm"
echo

# ═══════════════════════════════════════════════════════════════════════════
# Step 6 — GitHub release
# ═══════════════════════════════════════════════════════════════════════════
info "Step 6/7 — Creating GitHub release…"

gh release create "$NEW_TAG" --title "$NEW_TAG" --generate-notes
success "GitHub release '${NEW_TAG}' created"
echo

# ═══════════════════════════════════════════════════════════════════════════
# Step 7 — Verification
# ═══════════════════════════════════════════════════════════════════════════
info "Step 7/7 — Verifying release…"

PUBLISHED_VERSION="$(npm view monguito version)"
if [[ "$PUBLISHED_VERSION" != "$NEW_TAG" ]]; then
  warn "npm reports version '${PUBLISHED_VERSION}', expected '${NEW_TAG}'."
  warn "It may take a moment for the registry to update. Check again shortly."
else
  success "npm version matches: ${PUBLISHED_VERSION}"
fi

echo
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Release ${BOLD}${NEW_TAG}${NC}${GREEN} completed successfully!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo
echo "  Release checklist:"
echo -e "    ${GREEN}✔${NC} .npmrc contains tag-version-prefix="
echo -e "    ${GREEN}✔${NC} main is up to date"
echo -e "    ${GREEN}✔${NC} yarn test passed"
echo -e "    ${GREEN}✔${NC} yarn build passed"
echo -e "    ${GREEN}✔${NC} npm pack --dry-run reviewed"
echo -e "    ${GREEN}✔${NC} npm version executed (${NEW_TAG})"
echo -e "    ${GREEN}✔${NC} Git tag has no 'v' prefix"
echo -e "    ${GREEN}✔${NC} Version commit pushed to main"
echo -e "    ${GREEN}✔${NC} Release tag pushed to GitHub"
echo -e "    ${GREEN}✔${NC} npm whoami succeeds (${NPM_USER})"
echo -e "    ${GREEN}✔${NC} npm publish succeeded"
echo -e "    ${GREEN}✔${NC} npm reports version ${PUBLISHED_VERSION}"
echo -e "    ${GREEN}✔${NC} GitHub release created"
echo

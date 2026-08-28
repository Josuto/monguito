#!/usr/bin/env bash

# publish-release.sh — Automates the Monguito release process.
#
# Usage:
#   ./scripts/publish-release.sh [--dry-run] <patch|minor|major>
#
# --dry-run prints the commands that would run instead of executing them
# (npm version, git push, npm publish, gh release create) and relaxes the
# 'on main' / 'synced with origin' preconditions to warnings so it can be
# run from any branch. Package contents are still validated for real via
# `npm pack --dry-run` in the validation step.
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

# run CMD... — executes CMD normally, or just prints it when --dry-run is set.
run() {
  if $DRY_RUN; then
    echo -e "${YELLOW}[dry-run]${NC} $*"
  else
    "$@"
  fi
}

# done_msg MSG — like success(), but prefixes MSG to signal nothing actually
# happened when --dry-run is set.
done_msg() {
  if $DRY_RUN; then
    success "(dry-run) $*"
  else
    success "$*"
  fi
}

# bump_version X.Y.Z <patch|minor|major> — pure-bash semver bump, used in
# --dry-run mode instead of actually invoking `npm version`.
bump_version() {
  local version="$1" type="$2" major minor patch
  IFS='.' read -r major minor patch <<< "$version"
  case "$type" in
    major) echo "$((major + 1)).0.0" ;;
    minor) echo "${major}.$((minor + 1)).0" ;;
    patch) echo "${major}.${minor}.$((patch + 1))" ;;
  esac
}

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------
usage() {
  cat <<EOF
Usage: $0 [--dry-run] <patch|minor|major>

Automates the Monguito release process:
  patch  — bug-fix release      (e.g. 7.0.0 → 7.0.1)
  minor  — new feature release  (e.g. 7.0.0 → 7.1.0)
  major  — breaking change      (e.g. 7.0.0 → 8.0.0)

  --dry-run  Print the commands that would run instead of executing them.
             Relaxes the 'on main' / 'synced with origin' checks to warnings.

See docs/new-version-publication.md for the full manual procedure.
EOF
  exit 1
}

# ---------------------------------------------------------------------------
# Argument validation
# ---------------------------------------------------------------------------
DRY_RUN=false
BUMP_TYPE=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    patch|minor|major) BUMP_TYPE="$arg" ;;
    *)
      error "Unknown argument: '$arg'"
      usage
      ;;
  esac
done

if [[ -z "$BUMP_TYPE" ]]; then
  error "Missing version bump type."
  usage
fi

if $DRY_RUN; then
  info "Starting Monguito release — bump type: ${BOLD}${BUMP_TYPE}${NC} ${YELLOW}[DRY RUN]${NC}"
else
  info "Starting Monguito release — bump type: ${BOLD}${BUMP_TYPE}${NC}"
fi
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
  if $DRY_RUN; then
    warn "Not on 'main' (currently on '${CURRENT_BRANCH}') — continuing because --dry-run is set."
  else
    error "You must be on the 'main' branch (currently on '${CURRENT_BRANCH}')."
    exit 1
  fi
else
  success "On branch 'main'"
fi

# 1c. Up to date with origin/main
git fetch origin main --quiet
LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse origin/main)"
if [[ "$LOCAL_SHA" != "$REMOTE_SHA" ]]; then
  if $DRY_RUN; then
    warn "Local HEAD (${LOCAL_SHA:0:7}) differs from origin/main (${REMOTE_SHA:0:7}) — continuing because --dry-run is set."
  else
    error "Local 'main' (${LOCAL_SHA:0:7}) is not up to date with origin/main (${REMOTE_SHA:0:7})."
    error "Run 'git pull origin main' first."
    exit 1
  fi
else
  success "Up to date with origin/main"
fi

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

CONFIRM_SUFFIX=""
$DRY_RUN && CONFIRM_SUFFIX=" [DRY RUN — no changes will be made]"
read -r -p "$(echo -e "${YELLOW}⚠${NC} Proceed with version bump, push, npm publish, and GitHub release?${CONFIRM_SUFFIX} [y/N] ")" CONFIRM
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

run npm version "$BUMP_TYPE"

if $DRY_RUN; then
  NEW_TAG="$(bump_version "$PREV_VERSION" "$BUMP_TYPE")"
else
  NEW_TAG="$(git describe --tags --abbrev=0)"
fi
info "New tag: ${NEW_TAG}"

# Verify no v prefix
if [[ "$NEW_TAG" == v* ]]; then
  error "Tag '${NEW_TAG}' has a 'v' prefix. This should not happen when tag-version-prefix is empty."
  error "See the 'Prerequisite: configure npm tags' section in docs/new-version-publication.md."
  exit 1
fi
done_msg "Version bumped: ${PREV_VERSION} → ${NEW_TAG} (no 'v' prefix)"
echo

# ═══════════════════════════════════════════════════════════════════════════
# Step 4 — Push
# ═══════════════════════════════════════════════════════════════════════════
info "Step 4/7 — Pushing to GitHub…"

run git push origin main
done_msg "Pushed version commit to origin/main"

run git push origin "$NEW_TAG"
done_msg "Pushed tag '${NEW_TAG}' to origin"
echo

# ═══════════════════════════════════════════════════════════════════════════
# Step 5 — npm publish
# ═══════════════════════════════════════════════════════════════════════════
info "Step 5/7 — Publishing to npm…"

run npm publish
done_msg "Published to npm"
echo

# ═══════════════════════════════════════════════════════════════════════════
# Step 6 — GitHub release
# ═══════════════════════════════════════════════════════════════════════════
info "Step 6/7 — Creating GitHub release…"

run gh release create "$NEW_TAG" --title "$NEW_TAG" --generate-notes
done_msg "GitHub release '${NEW_TAG}' created"
echo

# ═══════════════════════════════════════════════════════════════════════════
# Step 7 — Verification
# ═══════════════════════════════════════════════════════════════════════════
info "Step 7/7 — Verifying release…"

if $DRY_RUN; then
  PUBLISHED_VERSION="(skipped — dry run)"
  warn "Skipping npm registry verification — dry run, nothing was published."
else
  PUBLISHED_VERSION="$(npm view monguito version)"
  if [[ "$PUBLISHED_VERSION" != "$NEW_TAG" ]]; then
    warn "npm reports version '${PUBLISHED_VERSION}', expected '${NEW_TAG}'."
    warn "It may take a moment for the registry to update. Check again shortly."
  else
    success "npm version matches: ${PUBLISHED_VERSION}"
  fi
fi

echo
if $DRY_RUN; then
  echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${YELLOW}  Dry run of release ${BOLD}${NEW_TAG}${NC}${YELLOW} completed — nothing was changed.${NC}"
  echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
else
  echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  Release ${BOLD}${NEW_TAG}${NC}${GREEN} completed successfully!${NC}"
  echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
fi
echo
if $DRY_RUN; then
  CHECK="${YELLOW}○${NC}"
else
  CHECK="${GREEN}✔${NC}"
fi
echo "  Release checklist:"
echo -e "    ${CHECK} .npmrc contains tag-version-prefix="
echo -e "    ${CHECK} main is up to date"
echo -e "    ${CHECK} yarn test passed"
echo -e "    ${CHECK} yarn build passed"
echo -e "    ${CHECK} npm pack --dry-run reviewed"
echo -e "    ${CHECK} npm version executed (${NEW_TAG})"
echo -e "    ${CHECK} Git tag has no 'v' prefix"
echo -e "    ${CHECK} Version commit pushed to main"
echo -e "    ${CHECK} Release tag pushed to GitHub"
echo -e "    ${CHECK} npm whoami succeeds (${NPM_USER})"
echo -e "    ${CHECK} npm publish succeeded"
echo -e "    ${CHECK} npm reports version ${PUBLISHED_VERSION}"
echo -e "    ${CHECK} GitHub release created"
echo

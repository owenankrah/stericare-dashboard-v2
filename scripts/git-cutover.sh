#!/usr/bin/env bash
set -Eeuo pipefail

BASE_BRANCH="${BASE_BRANCH:-master}"
RELEASE_BRANCH="${RELEASE_BRANCH:-release/supabase-cutover-v3.2.1}"
RELEASE_TAG="${RELEASE_TAG:-v3.2.1}"
REMOTE="${REMOTE:-origin}"
EXECUTE=false
PREPARE_ONLY=false
SKIP_BUILD=false

usage() {
  cat <<'USAGE'
Usage: ./scripts/git-cutover.sh [options]

Creates a recoverable release branch and merges the Supabase cutover into the
GitHub production branch.

Options:
  --execute       Perform Git writes and pushes. Without this, show the plan.
  --prepare-only  Commit and push the release branch, but do not merge master.
  --skip-build    Skip npm ci and npm run build (not recommended).
  -h, --help      Show this help.

Optional environment variables:
  BASE_BRANCH      Production branch (default: master)
  RELEASE_BRANCH   Release branch name
  RELEASE_TAG      Release tag created after a successful merge
  REMOTE           Git remote (default: origin)
USAGE
}

while (($#)); do
  case "$1" in
    --execute) EXECUTE=true ;;
    --prepare-only) PREPARE_ONLY=true ;;
    --skip-build) SKIP_BUILD=true ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage; exit 2 ;;
  esac
  shift
done

repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$repo_root" ]]; then
  echo "Error: run this script inside the stericare-dashboard-v2 Git repository." >&2
  exit 1
fi
cd "$repo_root"

backup_tag="pre-supabase-cutover-$(date -u +%Y%m%dT%H%M%SZ)"

echo "Git cutover plan"
echo "  Remote:         $REMOTE"
echo "  Production:     $BASE_BRANCH"
echo "  Release branch: $RELEASE_BRANCH"
echo "  Backup tag:     $backup_tag"
echo "  Release tag:    $RELEASE_TAG"
echo

if [[ "$EXECUTE" != true ]]; then
  echo "Dry run only. The script will:"
  echo "  1. Fetch and verify $REMOTE/$BASE_BRANCH has not moved."
  echo "  2. Tag the current production commit for rollback."
  echo "  3. Create $RELEASE_BRANCH and stop tracking .env files."
  echo "  4. Run npm ci and npm run build."
  echo "  5. Commit and push the complete cutover."
  if [[ "$PREPARE_ONLY" == true ]]; then
    echo "  6. Stop for pull-request review."
  else
    echo "  6. Merge into $BASE_BRANCH, push, and create $RELEASE_TAG."
  fi
  echo
  echo "Run again with --execute after reviewing this plan."
  exit 0
fi

command -v git >/dev/null || { echo "git is required" >&2; exit 1; }
if [[ "$SKIP_BUILD" != true ]]; then
  command -v npm >/dev/null || { echo "npm is required unless --skip-build is used" >&2; exit 1; }
fi

current_branch="$(git branch --show-current)"
if [[ "$current_branch" != "$BASE_BRANCH" ]]; then
  echo "Error: start on $BASE_BRANCH; current branch is $current_branch." >&2
  exit 1
fi

echo "Fetching $REMOTE..."
git fetch "$REMOTE" "$BASE_BRANCH" --tags

local_base="$(git rev-parse "$BASE_BRANCH")"
remote_base="$(git rev-parse "$REMOTE/$BASE_BRANCH")"
if [[ "$local_base" != "$remote_base" ]]; then
  echo "Error: local $BASE_BRANCH is not aligned with $REMOTE/$BASE_BRANCH." >&2
  echo "Resolve the branch difference before running the cutover." >&2
  exit 1
fi

if git show-ref --verify --quiet "refs/heads/$RELEASE_BRANCH" || git ls-remote --exit-code --heads "$REMOTE" "$RELEASE_BRANCH" >/dev/null 2>&1; then
  echo "Error: release branch $RELEASE_BRANCH already exists." >&2
  echo "Choose another name with RELEASE_BRANCH=... or inspect the existing release." >&2
  exit 1
fi

echo "Creating rollback tag $backup_tag..."
git tag -a "$backup_tag" -m "Production state before Supabase cutover v3.2.1" "$BASE_BRANCH"
git push "$REMOTE" "$backup_tag"

git switch -c "$RELEASE_BRANCH"

# These files were tracked in the historical repository. Keep local copies but
# remove them from this and future commits. .gitignore now protects both paths.
git rm --cached --ignore-unmatch .env src/.env
git add -A

for forbidden in .env src/.env; do
  if git diff --cached --name-only --diff-filter=ACMR | grep -Fxq "$forbidden"; then
    echo "Error: secret-bearing file $forbidden would be committed." >&2
    exit 1
  fi
done

if git diff --cached --quiet; then
  echo "Error: there are no staged cutover changes." >&2
  exit 1
fi

if [[ "$SKIP_BUILD" != true ]]; then
  echo "Installing locked dependencies and running the production build..."
  npm ci
  npm run build
else
  echo "Warning: production build skipped by request."
fi

git commit -m "feat: cut over Pharma-C BMS to browser-first Supabase architecture"
git push -u "$REMOTE" "$RELEASE_BRANCH"

if [[ "$PREPARE_ONLY" == true ]]; then
  echo
  echo "Release branch pushed for review: $RELEASE_BRANCH"
  echo "After approval, merge it into $BASE_BRANCH using GitHub or rerun the merge manually."
  exit 0
fi

echo "Merging release into $BASE_BRANCH..."
git switch "$BASE_BRANCH"
git pull --ff-only "$REMOTE" "$BASE_BRANCH"
git merge --no-ff "$RELEASE_BRANCH" -m "merge: Supabase cutover v3.2.1"
git push "$REMOTE" "$BASE_BRANCH"

if git show-ref --tags --verify --quiet "refs/tags/$RELEASE_TAG"; then
  echo "Warning: tag $RELEASE_TAG already exists; release tag was not changed."
else
  git tag -a "$RELEASE_TAG" -m "Pharma-C BMS v3.2.1 Supabase cutover"
  git push "$REMOTE" "$RELEASE_TAG"
fi

echo
echo "Cutover complete."
echo "Production branch: $REMOTE/$BASE_BRANCH"
echo "Rollback tag:      $backup_tag"
echo
echo "Emergency code rollback:"
echo "  git switch $BASE_BRANCH"
echo "  git revert -m 1 HEAD"
echo "  git push $REMOTE $BASE_BRANCH"
echo
echo "The database migrations are additive and are not automatically rolled back."

# Git cutover procedure

The repository currently uses `master` as the GitHub production branch. The
cutover script creates a recoverable release branch before merging anything.

## Recommended: prepare a pull request first

From the repository root:

```bash
chmod +x scripts/git-cutover.sh
./scripts/git-cutover.sh
./scripts/git-cutover.sh --execute --prepare-only
```

The first command is a dry run. The second command:

- verifies that local `master` still matches `origin/master`;
- creates and pushes a timestamped rollback tag;
- creates `release/supabase-cutover-v3.2.1`;
- removes `.env` and `src/.env` from Git tracking while preserving local files;
- installs locked dependencies and runs a production build;
- commits and pushes the release branch;
- stops before changing `master`.

Review the release branch on GitHub and open a pull request into `master`.

## Direct merge

If branch protection and your workflow permit a direct merge:

```bash
./scripts/git-cutover.sh --execute
```

This performs the same preparation, merges with `--no-ff`, pushes `master`, and
creates the `v3.2.1` release tag.

## If the build was already independently verified

You can bypass dependency installation and building, but this is not
recommended for the production cutover:

```bash
./scripts/git-cutover.sh --execute --prepare-only --skip-build
```

## Rollback

The script prints the exact timestamped backup tag. For an emergency rollback
after the merge, prefer a new revert commit so shared Git history is preserved:

```bash
git switch master
git pull --ff-only origin master
git revert -m 1 HEAD
git push origin master
```

Do not use `git reset --hard` on the shared production branch. Database
migrations are additive and should not be reversed automatically with the code.

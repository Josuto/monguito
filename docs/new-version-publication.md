# Publishing a New Version of Monguito

This is the release procedure for publishing Monguito to npm and creating the corresponding GitHub release.

## Prerequisite: configure npm tags

Monguito uses Git tags without a `v` prefix (`7.0.0`, not `v7.0.0`).

Configure npm once at the project level:

```bash
npm config set tag-version-prefix "" --location=project
```

This adds the following to `.npmrc`:

```ini
tag-version-prefix=
```

Verify it:

```bash
npm config get tag-version-prefix
```

The result should be empty.

Do this **before** running `npm version`. The setting only affects tags created afterwards.

If a `v`-prefixed tag has already been created, rename it:

```bash
git tag -d v7.0.0
git tag 7.0.0
```

If the old tag was already pushed:

```bash
git push origin --delete v7.0.0
git push origin 7.0.0
```

## 1. Prepare the release

Start from an up-to-date `main`:

```bash
git checkout main
git pull origin main
```

Make sure the working tree is clean:

```bash
git status
```

Run the tests and build:

```bash
yarn test
yarn build
```

Check what npm will publish:

```bash
npm pack --dry-run
```

Review the output and make sure the package contains the expected files, especially `dist/`, `package.json`, `README.md`, and `LICENSE`.

## 2. Create the version

Check the current version:

```bash
npm pkg get version
```

Increment it according to the changes:

```bash
npm version patch
```

```bash
npm version minor
```

or:

```bash
npm version major
```

For example:

```bash
npm version major
```

If the current version is `6.3.2`, this creates version `7.0.0`.

`npm version` automatically:

- updates `package.json`;
- updates `package-lock.json`, if present;
- creates a commit for the version change;
- creates the Git tag.

Because `tag-version-prefix` is configured as empty, the tag will be `7.0.0`.

Verify:

```bash
git log --oneline -1
git show 7.0.0
git status
```

The tag should point to the new version commit and the working tree should be clean.

## 3. Push the release to GitHub

Push the version commit:

```bash
git push origin main
```

Then push the tag:

```bash
git push origin 7.0.0
```

Pushing the tag explicitly makes it clear which tag is being published.

## 4. Authenticate with npm

Check whether npm is authenticated:

```bash
npm whoami
```

If necessary:

```bash
npm login
```

Then verify again:

```bash
npm whoami
```

Make sure npm uses the public registry:

```bash
npm config get registry
```

It should return:

```text
https://registry.npmjs.org/
```

If necessary:

```bash
npm config set registry https://registry.npmjs.org/
```

## 5. Publish to npm

Publish the package:

```bash
npm publish
```

A successful publication will report something similar to:

```text
+ monguito@7.0.0
```

If npm reports `ENEEDAUTH`, run `npm login` and retry.

An authentication failure does not publish or consume the version.

## 6. Create the GitHub release

Create the release from the `7.0.0` tag.

Using GitHub CLI:

```bash
gh release create 7.0.0 \
  --title "7.0.0" \
  --generate-notes
```

Or use GitHub's **Releases → Draft a new release** interface and select the existing `7.0.0` tag.

## 7. Verify the release

Check the published npm version:

```bash
npm view monguito version
```

It should return:

```text
7.0.0
```

Check the Git tag:

```bash
git show 7.0.0
```

The final state should be:

```text
package.json        → 7.0.0
Git tag             → 7.0.0
GitHub Release      → 7.0.0
npm package         → monguito@7.0.0
```

## Release checklist

- [ ] `.npmrc` contains `tag-version-prefix=`
- [ ] `main` is up to date
- [ ] `yarn test` passes
- [ ] `yarn build` passes
- [ ] `npm pack --dry-run` reviewed
- [ ] `npm version` executed
- [ ] Git tag has no `v` prefix
- [ ] Version commit pushed to `main`
- [ ] Release tag pushed to GitHub
- [ ] `npm whoami` succeeds
- [ ] `npm publish` succeeds
- [ ] npm reports the new version
- [ ] GitHub release created from the same tag
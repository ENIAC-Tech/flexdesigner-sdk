# Publishing `@eniac/flexdesigner` from CI

## Trusted publishing (recommended)

This repo’s publish workflow [.github/workflows/publish.yml](../.github/workflows/publish.yml) uses **OIDC**: set the package **Trusted Publisher** on [npmjs.com](https://www.npmjs.com/) to **GitHub Actions** with repository `ENIAC-Tech/flexdesigner-sdk` and workflow **`publish.yml`** (filename only; case‑sensitive). No `NPM_TOKEN` secret is required for publishing.

Requirements from npm docs: npm CLI **≥ 11.5.1**, Node **≥ 22.14.0**. The workflow upgrades npm before `npm publish`.

**Retry publishing tag `v1.0.8` after fixing the workflow:**

1. Merge the updated workflow to default branch (`master`).
2. **Actions → Publish to npm → Run workflow** → enter tag **`v1.0.8`** → Run.

Same as re-pushing the tag, but avoids rewriting tags.

If **`1.0.8` is already on npm** (`npm view @eniac/flexdesigner versions`), npm will refuse to overwrite that version—you must bump **`package.json` version**, tag `v1.0.9`, then publish.

---

## npm error `E404 Not Found` on `PUT .../@eniac%2fflexdesigner` (token flows)

This almost always means **`NPM_TOKEN` does not have permission** to publish under the `@eniac` scope — not a wrong registry URL.

1. On [npmjs.com](https://www.npmjs.com/), sign in as an account that is already a **maintainer** of [`@eniac/flexdesigner`](https://www.npmjs.com/package/@eniac/flexdesigner) or an **owner** of the `@eniac` org.
2. Create an **Access Token**  
   - Prefer **Granular**: permission **Read and write**, packages limited to `@eniac/flexdesigner` (or the whole `@eniac` scope).  
   - Or Classic **Automation** with publish rights (if your org policy allows).
3. In GitHub: repo **Settings → Secrets and variables → Actions**, set `NPM_TOKEN` to that token.

If the token belongs to a personal account that was never added to the `@eniac` org / package, npm responds with **404** on publish (scoped packages).

## GitHub Releases

- Pushing a tag like `v1.0.8` runs [.github/workflows/github-release.yml](.github/workflows/github-release.yml).
- If a tag already exists without a release: **Actions → GitHub Release → Run workflow**, input tag `v1.0.8`.

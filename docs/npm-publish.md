# Publishing `@eniac/flexdesigner` from CI

## npm error `E404 Not Found` on `PUT .../@eniac%2fflexdesigner`

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

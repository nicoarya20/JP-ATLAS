/** Package identity for the CLI and local Postgres — env-free, safe to import before `.env` is validated. */
import pkg from '../package.json' with { type: 'json' };

export const PKG_NAME: string = pkg.name;
export const PKG_VERSION: string = pkg.version;
/** GitHub `owner/repo` that publishes release binaries (`SIMPLE_PM_REPO` overrides, e.g. for forks). */
export const RELEASE_REPO: string =
  process.env.SIMPLE_PM_REPO ??
  pkg.repository.url.replace(/^.*github\.com[/:]/, '').replace(/\.git$/, '');

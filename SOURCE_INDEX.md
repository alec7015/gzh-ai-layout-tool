# Source Index for Automation

This repository is public, but GitHub HTML directory pages such as `/tree/.../src`
can be blocked for automated readers by GitHub robots rules. Use this single
file as the stable entry point for reading the source without crawling directory
HTML pages.

## Branch

- Repository: https://github.com/alec7015/gzh-ai-layout-tool
- Branch: `codex/v5-layout-plan`
- Branch URL: https://github.com/alec7015/gzh-ai-layout-tool/tree/codex/v5-layout-plan

## Machine-readable file discovery

Use GitHub API JSON instead of GitHub `/tree/` HTML pages:

- Recursive source tree:
  https://api.github.com/repos/alec7015/gzh-ai-layout-tool/git/trees/codex%2Fv5-layout-plan?recursive=1
- `src/` directory JSON:
  https://api.github.com/repos/alec7015/gzh-ai-layout-tool/contents/src?ref=codex/v5-layout-plan
- `src-tauri/` directory JSON:
  https://api.github.com/repos/alec7015/gzh-ai-layout-tool/contents/src-tauri?ref=codex/v5-layout-plan

Each API entry includes a `path`, `type`, and `url`. For file contents, either
use the `download_url` from the contents API or construct a raw URL like this:

```text
https://raw.githubusercontent.com/alec7015/gzh-ai-layout-tool/refs/heads/codex/v5-layout-plan/<path>
```

Example:

```text
https://raw.githubusercontent.com/alec7015/gzh-ai-layout-tool/refs/heads/codex/v5-layout-plan/src/App.tsx
```

## Archive download

If the environment can download a single archive but cannot crawl pages, use:

- ZIP:
  https://github.com/alec7015/gzh-ai-layout-tool/archive/refs/heads/codex/v5-layout-plan.zip
- TAR.GZ:
  https://github.com/alec7015/gzh-ai-layout-tool/archive/refs/heads/codex/v5-layout-plan.tar.gz

## Important source roots

- Frontend source: `src/`
- Desktop shell: `src-tauri/`
- Tauri entry files: `src-tauri/src/main.rs`, `src-tauri/src/lib.rs`
- App entry files: `src/main.tsx`, `src/App.tsx`
- Package manifest: `package.json`
- Tauri config: `src-tauri/tauri.conf.json`

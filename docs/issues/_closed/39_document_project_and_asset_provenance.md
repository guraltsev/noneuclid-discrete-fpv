# 39 - Document project and third-party asset provenance

Status: completed 2026-08-03.

Priority: P2 legal clarity and onboarding.

## Problem

The root README contains only a title and two activity links. It does not tell a
new contributor how to install, test, run, build, serve HTTPS for WebXR, choose
a config, or find the active issue tracker.

The repository has no root project-license decision recorded. Many model
folders carry local license files, but the large texture/source collection does
not consistently record per-asset origin, license, downloaded version, or
required attribution. This makes safe redistribution and later asset cleanup
hard to audit.

## Required work

- Expand the root README with purpose, prerequisites, common commands, config
  URLs, browser/headset expectations, HTTPS guidance, documentation entrypoint,
  and the `docs/issues` tracking convention.
- Explain that the source repository is a multi-year project and that names
  such as `camp-2026-VR` are examples of replaceable yearly/ad-hoc deployment
  instances, not the canonical project name.
- Decide and record the license for project-authored source, or explicitly state
  that no reuse license is granted.
- Create a third-party asset manifest with path, source URL/creator, license,
  attribution text, and whether the file is source-only or runtime-distributed.
- Preserve license/provenance metadata while issue 34 moves source assets.
- Do not infer or relicense assets whose provenance is unknown; flag them for
  replacement or removal.

## Acceptance criteria

- [x] The main README now explains the project to students and educators. Per
  the requested audience boundary, its final section links to the separate
  [development guide](../../DEVELOPMENT.md) and
  [deployment guide](../../DEPLOYMENT.md), where a fresh contributor can run
  and verify the project without putting implementation material in the
  learner-facing document.
- [x] The project-authored licensing position is explicit in the root
  [MIT License](../../../LICENSE).
- [x] The canonical [asset provenance manifest](../../ASSET_PROVENANCE.md)
  records public-asset paths, sources/creators, licenses, required credits, and
  source/runtime status. It also preserves the link from derived KTX2 textures
  to their source material.
- [x] Unverified historical assets are explicitly blocked rather than relicensed
  by assumption, and have a release-gated resolution task in
  [issue 40](../40_resolve_unverified_public_assets.md).

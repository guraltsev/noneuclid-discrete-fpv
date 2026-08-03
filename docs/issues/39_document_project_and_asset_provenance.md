# 39 - Document project and third-party asset provenance

Status: open as of 2026-08-03T14:24:10-05:00.

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

- A fresh contributor can run and verify the project from the root README.
- The project-authored-code licensing position is explicit.
- Every deployed third-party asset has traceable license/provenance metadata.
- Unknown-provenance assets are removed from deployment or have an explicit
  resolution task.

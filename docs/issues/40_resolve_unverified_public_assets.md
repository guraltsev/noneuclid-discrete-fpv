# 40 - Resolve or remove unverified public assets

Status: open as of 2026-08-03.

Priority: P1 legal release gate.

## Problem

The canonical [asset provenance manifest](../ASSET_PROVENANCE.md) identifies
historical files for which this repository cannot establish a source, creator,
or license. A legacy image used for portal walls is undocumented. Vite
currently copies all of these files into builds.

## Required work

- For each blocked path, locate the original acquisition record and add a
  source URL, creator, license version, and required attribution; **or** replace
  it with a documented asset; **or** remove it from the public build input.
- Replace or verify the legacy portal-wall image before a release that includes
  it.
- Update `docs/ASSET_PROVENANCE.md`, local notices, and any affected world or
  renderer references in the same change.

## Acceptance criteria

- No runtime-requested asset is marked blocked in the provenance manifest.
- Every remaining file in the public build input has a traceable license and
  required attribution.
- A clean production build no longer copies unverified historical assets.

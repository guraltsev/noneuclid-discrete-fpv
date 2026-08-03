# Development guide

This guide is for people changing the project. It is deliberately separate from
the main README, which is written for learners and educators.

## Prerequisites

- Node.js 20 or later and npm.
- A current Chromium-, Firefox-, or Safari-based browser for manual checks.
- A headset only for WebXR work; ordinary development and tests do not require
  one.

## Install, run, and check

From the repository root:

```sh
npm ci
npm run dev
```

Vite prints the local URL. Visit it, choose a scenario with `?config=001`,
`?config=002`, `?config=default`, or `?config=full`, and confirm that the world
loads and that the menu and a placed tool work.

Run the automated checks before sharing a change:

```sh
npm run typecheck
npm test
npm run build
```

The test suite checks mathematical and renderer contracts. It does not replace
a short browser check of the interaction you changed.

## Where to start reading

- [Documentation home](Readme.md) lists the living guides and design records.
- [Implementation reading order](implementation-reading-order.md) is the best
  route through the runtime for a new contributor.
- [Development overview](Development_guide.md) records the project boundaries
  and repository map.
- [Testing guide](testing.md) explains what each kind of test should prove.
- [Asset provenance](ASSET_PROVENANCE.md) is required reading before adding,
  moving, or redistributing an asset.

## Project identity and issue tracking

`noneuclid-fpv` is the long-lived project identity. Names such as
`camp-2026-VR` are replaceable classroom or yearly deployment instances; do
not rename the source project merely to match an instance.

Open work lives in [`docs/issues`](issues/). A numbered issue is the source of
truth for its scope and acceptance criteria. Move completed records to
[`docs/issues/_closed`](issues/_closed/) only when their requested work and
verification are actually complete.

For GitHub Pages builds, HTTPS/WebXR expectations, and base-path details, use
the [deployment guide](DEPLOYMENT.md).

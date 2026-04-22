---
id: P4.1
title: Migrate server runtime from Express/Apollo to Fastify/Mercurius
status: done
impact: H
urgency: soon
tags:
  - area:api
  - area:infra
  - theme:performance
openspec: migrate-server-runtime-fastify-mercurius
updated: 2026-04-22
roadmap_ref: P4.1
depends_on: []
---

## Problem / outcome

`npx vibe-squire` install stability is currently sensitive to transitive npm resolver behavior around the Apollo dependency tree. Migrate the Nest runtime from Express + Apollo driver to Fastify + Mercurius to rely on a simpler, actively maintained stack that works out of the box without bespoke packaging workarounds.

## Acceptance criteria

- [x] Server bootstraps via Fastify adapter (`NestFastifyApplication`) and retains current API behavior for `/api/*`, `/graphql`, and static SPA hosting.
- [x] GraphQL module runs on Mercurius driver with equivalent query, mutation, and subscription behavior.
- [x] Existing operator UI flows and GraphQL contract remain backward-compatible or have documented migration notes.
- [x] Integration tests are updated and green on CI for the migrated runtime.
- [x] Documentation and setup instructions are updated to reflect the new platform defaults.
- [x] Temporary Apollo/npm conflict workarounds are removed (e.g. package-level Apollo `overrides` and root `legacy-peer-deps` setting) once no longer needed.

## Notes

OpenSpec recommended because: this is a cross-cutting platform migration that touches application bootstrap, HTTP adapter behavior, GraphQL transport, static asset hosting, and integration test harness assumptions.

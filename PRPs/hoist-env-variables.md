
# BASE PRP

## Feature: Hoist Web-UI Environment Variables

## PRP Creation Mission

Create a comprehensive PRP that enables **one-pass implementation success** by hoisting the web-ui environment variables to the top level of the project. This will centralize configuration and improve maintainability without breaking local development workflows.

**Critical Understanding**: The executing AI agent only receives:

- The PRP content you create
- Its training data knowledge
- Access to codebase files (but needs guidance on which ones)

**Therefore**: Your research and context curation directly determines implementation success. Incomplete context = implementation failure.

## Research Process

1. **Codebase Analysis**: The following files have been analyzed to understand the current environment variable setup:
   - `/home/dustin/projects/torrents-env/.env`
   - `/home/dustin/projects/torrents-env/web-ui/.env.example`
   - `/home/dustin/projects/torrents-env/docker-compose.yml`
   - `/home/dustin/projects/torrents-env/web-ui/docker-compose.dev.yml`
   - `/home/dustin/projects/torrents-env/web-ui/package.json`
   - `/home/dustin/projects/torrents-env/web-ui/src/app/api/prowlarr/[...path]/route.ts`
   - `/home/dustin/projects/torrents-env/web-ui/src/app/api/qbittorrent/[...path]/route.ts`

2. **External Research**: Research on Next.js environment variables in Docker has been conducted. The key takeaway is the distinction between build-time and runtime variables and the need for a strategy to handle runtime variables in a Dockerized environment.

## PRP Generation Process

### Step 1: Choose Template

This PRP is based on `PRPs/templates/prp_base.md`.

### Step 2: Context Completeness Validation

This PRP passes the "No Prior Knowledge" test by providing all necessary file paths, code snippets, and external documentation links.

### Step 3: Research Integration

The research findings are integrated into the implementation tasks.

### Step 4: Information Density Standards

All references are specific and actionable.

### Step 5: ULTRATHINK Before Writing

A comprehensive plan has been created.

## Goal

- **Feature Goal**: Centralize all environment variables in the root of the project.
- **Deliverable**: A single `.env` file in the project root that configures all services, including the web-ui.
- **Success Definition**: The `web-ui` can be started locally with `npm run start` and as a Docker container with `docker-compose up` and successfully connect to all backend services.

## Context

- **Files**:
  - `/home/dustin/projects/torrents-env/.env`
  - `/home/dustin/projects/torrents-env/web-ui/.env.example`
  - `/home/dustin/projects/torrents-env/docker-compose.yml`
  - `/home/dustin/projects/torrents-env/web-ui/docker-compose.dev.yml`
  - `/home/dustin/projects/torrents-env/web-ui/package.json`
  - `/home/dustin/projects/torrents-env/web-ui/src/app/api/prowlarr/[...path]/route.ts`
  - `/home/dustin/projects/torrents-env/web-ui/src/app/api/qbittorrent/[...path]/route.ts`
- **External Documentation**:
  - [Next.js Environment Variables with Docker](https://medium.com/geekculture/environment-variables-in-next-js-with-docker-5c2193a42cf)

## Implementation Tasks

1.  **Create a new `.env.example` in the root directory.**
    - This file will serve as a template for all required environment variables.
2.  **Move the content of `web-ui/.env.example` to the new root `.env.example`.**
3.  **Update the root `.env` to include the variables from `web-ui/.env.example`.**
4.  **Modify `docker-compose.yml` to pass the environment variables to the `web-ui` service.**
    - Use the `env_file` property to point to the root `.env` file.
5.  **Modify `web-ui/docker-compose.dev.yml` to use the new environment variable setup.**
    - This will likely involve using the `env_file` property as well.
6.  **Create a new API route in the `web-ui` to expose the environment variables to the client-side at runtime.**
    - This will prevent the need to rebuild the Docker image for different environments.
    - The new route should be located at `/home/dustin/projects/torrents-env/web-ui/src/app/api/config/route.ts`.
    - It should return a JSON object with the required environment variables.
7.  **Update the `web-ui` to fetch the configuration from the new API route.**

## Validation Gates

1.  Run `npm run start` in the `/home/dustin/projects/torrents-env/web-ui` directory and confirm the application starts without errors.
2.  Run `docker-compose up -d` from the project root and confirm all services start correctly.
3.  Access the web UI and verify that it can successfully connect to Prowlarr and qBittorrent.

## Confidence Score: 9/10

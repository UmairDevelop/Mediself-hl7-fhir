# Architecture Decisions & Spec Deviations

## Decision 1: Docker Alternative for Local FHIR Sandbox
* **Date**: 2026-09-15
* **Context**: Docker is not installed on the host operating system (`docker: CommandNotFoundException`).
* **Decision**: Instead of blocking development on Docker installation, the Python FastAPI backend includes a self-contained, embedded FHIR R4 store/service loaded with Synthea patient JSON bundles. It can also interface with the public HAPI FHIR server (`https://hapi.fhir.org/baseR4`).
* **Impact**: Zero external dependencies required. Fast, 100% reliable local development and testing.

## Decision 2: Backend Stack Selection
* **Date**: 2026-09-15
* **Context**: User specified Python backend and Google Gemini AI instead of Next.js API routes & Anthropic Claude.
* **Decision**: FastAPI + SQLModel (SQLite/Postgres) + Python `google-genai` SDK for Gemini Function Calling.

# Clinician Patient Portal — Technical Build Spec

This file is written to be handed directly to an AI coding agent (Claude Code or similar) as the source of truth for building this project. It assumes the agent will read this top to bottom and build in the phase order given at the end. Follow the conventions here unless a better pattern is discovered during implementation, in which case note the deviation in a `DECISIONS.md` file at the project root.

---

## 1. What this project is

A web application for hospital staff. Two things it does:

1. **A patient chart portal** — search for a patient, view their chart, and create, read, update, and deactivate/delete core clinical records (conditions, medications, labs, allergies, encounters), all backed by a FHIR server.
2. **An AI chat assistant**, scoped to exactly one patient at a time, that answers plain-English questions about that patient by querying the FHIR server directly. The AI is **read only** — it never creates, updates, or deletes anything. All writes happen through the normal chart UI, done by a human.

The AI's scoping guarantee must be architectural, not prompt-based. The patient ID gets bound to a session and injected into every AI-triggered query by the backend, not left to the AI to remember.

---

## 2. Recommended tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (React, TypeScript, App Router) | Single framework for UI and API routes, fast to scaffold, good ecosystem |
| Styling | Tailwind CSS | Fast to build clean UI without a design system dependency |
| Backend | Next.js API routes (or a separate Node/Express service if the agent prefers separation of concerns) | Keeps the FHIR calls, permissions checks, and AI orchestration server side, never exposed to the browser |
| FHIR server (dev) | HAPI FHIR public test server, or a local HAPI FHIR JPA server via Docker | Free, standards compliant, good for prototyping without touching real hospital infrastructure |
| Synthetic patient data | Synthea | Generates realistic FHIR bundles of fake patients to load into the sandbox server |
| AI / LLM | Anthropic Claude API (Messages API with tool use) | Tool use lets the model request specific FHIR queries rather than free-text guessing; the backend executes the actual query, not the model |
| App database (not clinical data) | PostgreSQL or SQLite for local dev | Stores app-specific things the FHIR server shouldn't: user accounts, roles, sessions, the AI chat audit log |
| Auth | Simple email/password or magic link for the prototype, structured so it can be swapped for SMART on FHIR / OAuth2 later | Full SMART on FHIR auth is a bigger lift; don't block early development on it |
| ORM | Prisma (if using Postgres) | Type safe queries against the app database |

If the coding agent strongly prefers a different stack (e.g. a Python FastAPI backend, or a separate SPA plus API), that's fine — the architecture and data contracts described below matter more than the specific framework.

---

## 3. Project structure

```
/clinician-patient-portal
  /app                        # Next.js App Router pages
    /login
    /search
    /patient/[id]
      page.tsx                # Patient profile screen
      /chat                   # Chat panel component lives here or as a modal
  /components
    PatientSearchBar.tsx
    PatientProfile.tsx
    ConditionList.tsx / ConditionForm.tsx
    MedicationList.tsx / MedicationForm.tsx
    ObservationList.tsx / ObservationForm.tsx
    AllergyList.tsx / AllergyForm.tsx
    EncounterList.tsx
    ChatPanel.tsx
    ChatMessage.tsx
    CitationChip.tsx
  /lib
    fhir-client.ts            # Thin wrapper around FHIR server REST calls
    permissions.ts            # Role -> allowed actions mapping
    audit-log.ts              # Writes to the app database audit table
    ai
      query-translator.ts     # Turns AI tool calls into FHIR queries (see section 7)
      system-prompt.ts        # The AI's system prompt (see section 7)
      claude-client.ts        # Wrapper around the Anthropic API call
  /api  (or /app/api if using route handlers)
    /patients
      /search/route.ts
      /[id]/route.ts          # GET patient demographics
    /patients/[id]/conditions/route.ts       # GET (list), POST (create)
    /patients/[id]/conditions/[condId]/route.ts  # GET, PUT, DELETE
    /patients/[id]/medications/...           # same CRUD pattern
    /patients/[id]/observations/...
    /patients/[id]/allergies/...
    /patients/[id]/encounters/...
    /patients/[id]/chat/route.ts             # POST a chat message, returns AI answer
    /audit/route.ts                          # GET audit log (admin/compliance only)
  /prisma
    schema.prisma             # App database schema (users, roles, sessions, audit log)
  /scripts
    seed-sandbox.ts           # Loads Synthea bundles into the local FHIR server
  DECISIONS.md                # Agent logs any deviations from this spec here
  .env.example
```

---

## 4. Environment setup

Create a `.env.example` with these variables (agent should create a real `.env.local` when running, never commit real secrets):

```
FHIR_SERVER_BASE_URL=http://localhost:8080/fhir
ANTHROPIC_API_KEY=your_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/portal_dev
SESSION_SECRET=generate_a_long_random_string
```

**Local FHIR server setup (recommended first task):**

1. Run HAPI FHIR JPA server locally via Docker:
   ```
   docker run -p 8080:8080 hapiproject/hapi:latest
   ```
2. Generate synthetic patients with Synthea (or download a pre-generated bundle set).
3. Load the generated FHIR bundles into the local server using `POST /fhir` transaction bundles, or a loop of `POST /fhir/{resourceType}` calls. Write this as `scripts/seed-sandbox.ts`.
4. Confirm data loaded by hitting `GET http://localhost:8080/fhir/Patient` and seeing results.

Do not point this project at a real hospital's FHIR server at any point during development. Sandbox and synthetic data only, unless a real integration phase is explicitly scoped later.

---

## 5. App database schema (Prisma)

This is for application concerns, not clinical data. Clinical data always lives in and comes from the FHIR server, never duplicated into this database.

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  role         Role
  createdAt    DateTime @default(now())
  auditEntries AuditEntry[]
}

enum Role {
  PHYSICIAN
  NURSE
  FRONT_DESK
  ADMIN
}

model AuditEntry {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  patientId   String              // FHIR Patient id, not a foreign key into FHIR
  action      String              // e.g. "condition.create", "chat.question"
  detail      Json                // free-form: what was created/changed, or the question asked and resources retrieved
  createdAt   DateTime @default(now())
}
```

`AuditEntry.action` values to use consistently:
`condition.create`, `condition.update`, `condition.deactivate`, `medication.create`, `medication.update`, `medication.deactivate`, `observation.create`, `observation.update`, `allergy.create`, `allergy.update`, `allergy.deactivate`, `encounter.create`, `encounter.update`, `chat.question`, `patient.view`.

---

## 6. Permissions model

Simple role to action mapping, enforced server side on every API route, not just hidden in the UI.

| Action | Physician | Nurse | Front desk | Admin |
|---|---|---|---|---|
| View chart | Yes | Yes | Yes (demographics only) | Yes |
| Create/update conditions | Yes | No | No | Yes |
| Create/update medications | Yes | No | No | Yes |
| Create/update observations | Yes | Yes | No | Yes |
| Create/update allergies | Yes | Yes | No | Yes |
| Create/update encounters | Yes | Yes | No | Yes |
| Update demographics | Yes | Yes | Yes | Yes |
| Use AI chat | Yes | Yes | No | Yes |
| View audit log | No | No | No | Yes |

Implement as a single `can(user, action)` function in `lib/permissions.ts` and call it at the top of every API route handler before doing anything else. Return `403` if the check fails.

---

## 7. The AI chat feature — implementation detail

This is the part that needs the most care. Build it in this order:

### 7.1 The scoping mechanism

When the frontend opens `/patient/[id]`, that `id` is the FHIR `Patient.id`. Every request the ChatPanel component sends to `/api/patients/[id]/chat` includes that same `id` in the URL path, not in the request body where it could be omitted or altered by a bug. The backend route handler reads `id` from the URL params and treats it as the only valid scope for that request — full stop, no exceptions, no override parameter.

```ts
// app/api/patients/[id]/chat/route.ts (pseudocode)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!can(user, "chat.use")) return new Response("Forbidden", { status: 403 });

  const { question } = await req.json();
  const patientId = params.id; // the ONLY source of truth for scope

  const answer = await answerPatientQuestion({ patientId, question, user });
  return Response.json(answer);
}
```

### 7.2 Tool use, not free-text query generation

Use Claude's tool use (function calling) feature so the model requests structured FHIR queries rather than generating a raw query string itself. Define tools like:

```ts
const tools = [
  {
    name: "search_observations",
    description: "Search lab results and vitals for the current patient",
    input_schema: {
      type: "object",
      properties: {
        code: { type: "string", description: "LOINC code, if known" },
        text: { type: "string", description: "Free text search term, e.g. 'potassium'" },
        date_from: { type: "string", description: "ISO date, optional" },
        date_to: { type: "string", description: "ISO date, optional" }
      }
    }
  },
  {
    name: "search_conditions",
    description: "Search the problem list / diagnosis history for the current patient",
    input_schema: { type: "object", properties: { text: { type: "string" } } }
  },
  {
    name: "search_medications",
    description: "Search current and past medications for the current patient",
    input_schema: { type: "object", properties: { status: { type: "string", enum: ["active", "stopped", "all"] } } }
  },
  {
    name: "search_encounters",
    description: "Search visit history for the current patient",
    input_schema: { type: "object", properties: { limit: { type: "number" } } }
  },
  {
    name: "search_allergies",
    description: "Search allergies and intolerances for the current patient",
    input_schema: { type: "object", properties: {} }
  }
];
```

**Critical:** none of these tool schemas accept a `patient_id` parameter. The model never supplies it and never sees it as an option. The backend's tool executor injects `patient={patientId}` into the actual FHIR query itself, using the `patientId` from the URL, every time, regardless of what the model asked for.

```ts
// lib/ai/query-translator.ts (pseudocode)
async function executeTool(toolName: string, toolInput: any, patientId: string) {
  switch (toolName) {
    case "search_observations": {
      const params = new URLSearchParams({ patient: patientId }); // always injected here
      if (toolInput.code) params.set("code", toolInput.code);
      if (toolInput.date_from) params.set("date", `ge${toolInput.date_from}`);
      const res = await fhirClient.get(`/Observation?${params}`);
      return res.entry?.map(e => e.resource) ?? [];
    }
    case "search_conditions": {
      const params = new URLSearchParams({ patient: patientId });
      const res = await fhirClient.get(`/Condition?${params}`);
      return res.entry?.map(e => e.resource) ?? [];
    }
    // ...same pattern for medications, encounters, allergies
  }
}
```

### 7.3 The orchestration loop

```
1. Receive question + patientId from the route handler.
2. Send question to Claude with the tool definitions and the system prompt (7.4).
3. If Claude responds with a tool_use block, call executeTool(name, input, patientId).
4. Send the tool result back to Claude as a tool_result message.
5. Repeat steps 3-4 until Claude responds with a plain text answer (no more tool calls).
6. Before returning the answer, record which resources were actually retrieved.
7. Write an audit entry: action "chat.question", detail = { question, resourcesRetrieved: [...ids] }.
8. Return { answer: string, citations: [{ resourceType, id, summary }] } to the frontend.
```

### 7.4 System prompt (starting point, refine during testing)

```
You are a clinical information assistant. You can only see data for one patient,
whose records have already been retrieved for you through the tools available.
You must never state a fact unless it came from a tool result in this conversation.
If a tool returns no results, say so plainly rather than guessing.
You do not provide diagnoses or treatment recommendations. You only report what
the record shows. If asked for a diagnosis or treatment suggestion, say that's
outside what you're able to help with and suggest the clinician review the chart directly.
Keep answers concise and reference specific dates and values from the data you retrieved.
```

### 7.5 Frontend contract

`POST /api/patients/[id]/chat`
Request body: `{ "question": "has this patient had any abnormal potassium levels in the last year?" }`
Response body:
```json
{
  "answer": "Yes, one result. On 2026-03-14, potassium was 5.8 mmol/L, above the reference range of 3.5 to 5.1.",
  "citations": [
    { "resourceType": "Observation", "id": "obs-4821", "summary": "Potassium, 2026-03-14, 5.8 mmol/L" }
  ]
}
```

The ChatPanel component renders `citations` as small tappable chips under the answer. Tapping one should scroll to or open that resource in the chart view.

---

## 8. Chart CRUD — API contract (repeat this pattern per resource type)

Using `Condition` as the example, apply the same shape to `MedicationRequest`, `Observation`, `AllergyIntolerance`, `Encounter`.

**`GET /api/patients/[id]/conditions`** — list conditions for the patient
Response: `{ conditions: Condition[] }` (raw FHIR `Condition` resources, or a lightly flattened version for the frontend, agent's choice, document it in `DECISIONS.md` if flattened)

**`POST /api/patients/[id]/conditions`** — create a condition
Request body: whatever fields the form collects, e.g. `{ code: "44054006", display: "Type 2 diabetes mellitus", onsetDate: "2019-06-01", clinicalStatus: "active" }`
Server builds a proper FHIR `Condition` resource referencing `Patient/{id}` and `POST`s it to the FHIR server.
Also writes an `AuditEntry` with action `condition.create`.

**`PUT /api/patients/[id]/conditions/[condId]`** — update a condition
Server fetches the existing resource, applies changes, `PUT`s the full updated resource back (FHIR requires the full resource on update, not a partial patch, unless using `PATCH` which HAPI also supports).
Also writes an `AuditEntry` with action `condition.update`, including what changed.

**`DELETE /api/patients/[id]/conditions/[condId]`** — deactivate a condition
Do not perform a true FHIR delete for clinical resources. Instead, update `clinicalStatus` to `inactive` or `resolved` as appropriate (follow the same pattern for medications: set `status` to `stopped` rather than deleting). This preserves history, matching real world clinical practice.
Also writes an `AuditEntry` with action `condition.deactivate`.

Every one of these routes must call `can(user, action)` from `lib/permissions.ts` before doing anything else, per the table in section 6.

---

## 9. FHIR resources reference

| Resource | Key fields the forms need | Notes |
|---|---|---|
| `Patient` | name, birthDate, gender, identifier (MRN) | Read and update only, no create/delete in this app, patients are assumed to already exist in the sandbox |
| `Condition` | code (use a simple text-to-SNOMED lookup or free text for the prototype), clinicalStatus, onsetDateTime, subject (reference to Patient) | |
| `MedicationRequest` | medicationCodeableConcept, status, dosageInstruction, authoredOn, subject | |
| `Observation` | code, valueQuantity (value + unit), effectiveDateTime, status, subject | Use LOINC codes where practical; a simple hardcoded list of common labs is fine for the prototype |
| `AllergyIntolerance` | code, criticality, clinicalStatus, patient | |
| `Encounter` | class, status, period (start/end), subject | |

For the prototype, a hardcoded dropdown of common conditions/medications/labs with their proper codes is a reasonable shortcut instead of building a full terminology search. Note this as a shortcut in `DECISIONS.md` so it's clear what would need to change for production use.

---

## 10. Frontend pages, in order of build

1. **`/login`** — simple email/password form against the app database
2. **`/search`** — search bar, hits `GET /api/patients/search?q=...`, which proxies to `GET {FHIR_SERVER}/Patient?name=...`, shows results as a list
3. **`/patient/[id]`** — the profile screen:
   - Demographics header
   - Sections for Conditions, Medications, Observations, Allergies, Encounters, each with a list view, an "Add" button opening a form, and edit/deactivate actions on each row
   - A floating button, bottom center, "Chat with AI", opening the ChatPanel
4. **ChatPanel component** — chat message list, input box, citation chips under AI answers, entirely scoped to the current `[id]` from the route
5. **`/admin/audit`** (admin role only) — table view of the audit log, filterable by patient or user

---

## 11. Build order (follow this sequence)

- [ ] **Phase 0 — environment**: Docker FHIR server running locally, Synthea data loaded, `.env.local` configured, confirm `GET /fhir/Patient` returns results
- [ ] **Phase 1 — read-only chart viewer**: login, search, patient profile page showing all sections as read-only lists, no forms yet
- [ ] **Phase 2 — CRUD**: add/edit/deactivate forms for each resource type, permissions checks wired in, audit logging for every write
- [ ] **Phase 3 — AI chat, basic**: ChatPanel UI, the `/chat` route, tool use loop, start with just `search_observations` and `search_conditions` tools working end to end before adding the rest
- [ ] **Phase 4 — AI chat, full tool set + citations**: add remaining tools, citation chips in the UI, audit logging for chat
- [ ] **Phase 5 — polish**: loading states, error handling (FHIR server down, AI API failure, empty results), admin audit log page
- [ ] **Phase 6 — testing pass**: manually test against a range of realistic questions and a range of CRUD edge cases (editing something another "user" just changed, deactivating vs deleting, permission denials)

At the end of each phase, the agent should run the app and manually verify the phase's functionality actually works against the local sandbox before moving to the next phase.

---

## 12. Things to explicitly avoid

- Never let the AI layer call the FHIR server directly without going through the query translator's forced patient filter.
- Never implement a true `DELETE` against clinical FHIR resources — deactivate/mark inactive instead.
- Never store clinical data in the app's own Postgres database — it's a pass-through and audit layer only, the FHIR server is the single source of truth for clinical data.
- Never let the AI answer without at least attempting a tool call first if the question could plausibly be answered from chart data — it should not answer from general medical knowledge.
- Never expose `ANTHROPIC_API_KEY` or the FHIR server's credentials to the frontend; all AI and FHIR calls happen server side.

---

## 13. Suggested first prompt to give the coding agent

> Read this entire file first. Then start with Phase 0: set up the local HAPI FHIR server via Docker, write the Synthea seeding script, and confirm patient data loads correctly before writing any application code. Log any setup issues or deviations from this spec in DECISIONS.md as you go.

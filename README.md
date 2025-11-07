## Smart Note Companion – Voice enabled Smart Notes for Caregivers

This application helps caregivers capture voice notes and turns them into clear, compliant, structured service notes. It also summarizes a person’s day “so far,” extracts medications, and supports bilingual viewing (English/Spanish).

### What this app does
- Record or type a caregiver note and generate a structured note with: activity, mood, prompts, participation, and a readable summary.
- Extract medications mentioned in the note (name, dose, route, time, status).
- Produce a running “Summary so far” that aggregates notes up to each note’s timestamp.
- View per‑note medications and summary next to the note timeline.
- Bilingual viewing (English/Spanish): toggle per note row; Spanish notes are translated to English for processing and saved with both languages.
- Export PDF for the day (English only, today).

### Screens & flows
- People → Member Notes (timeline, per‑note summaries/meds, add note modal)
- Add Note modal → compliance check → generate structured note → save

---

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Vercel Edge Runtime for API routes
- OpenAI (extraction, summaries, translation)
- Supabase (Postgres + JS client) for persistence
- Tailwind/shadcn‑style UI components

---

## Running locally

### 1) Prerequisites
- Node 18+
- A Supabase project with two tables:
  - `members(id uuid/text, name text, created_at timestamptz default now())`
  - `notes(id uuid/text, member_id references members(id), session_date text/timestamptz, raw_text text, structured_json jsonb, created_at timestamptz default now())`
- An OpenAI API key

### 2) Environment variables
Create `kibu-notes/.env.local` and add:

```
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://<your-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### 3) Install & run
```
npm install
npm run dev
```
Visit http://localhost:3000

Home redirects to People. Open a person → Add Note.

---

## Deploying to Vercel

### Via Dashboard
1) Import the repo → framework auto‑detect: Next.js
2) Set Environment Variables (Production + Preview):
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3) Deploy

### Via CLI (production)
```
npm i -g vercel
vercel login
vercel        # first‑time link
vercel env add OPENAI_API_KEY production
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel deploy --prod
```

> If build complains about an unused/empty API route, remove or stub it (export a simple 501 GET/POST handler).

---

## Feature details

### Medications extraction
Medication info is extracted from the caregiver note using OpenAI and saved in `structured_json.medications`. The UI shows medications next to each note.

### “Summary so far”
For each note, the server aggregates all notes up to that timestamp and generates a short daily‑so‑far summary, saved alongside the note. The UI shows it per‑note (no clicking needed).

### Bilingual viewing (EN/ES)
- On save, non‑English notes are translated to English for processing (accuracy), and the bilingual content is saved under `structured_json.i18n`.
- Each row has a small EN/ES selector to switch display for that note’s content and summary.

---

## Troubleshooting

- Build error “file is not a module”: remove or stub empty API routes (they must export GET/POST).
- “Failed to collect page data …/notes”: usually missing Supabase env vars in Vercel.
- Medications empty: ensure `OPENAI_API_KEY` is set and reachable; some notes may have no meds.

---

## Roadmap / Future upgrades

- PDF i18n: export in Spanish as well as English.
- Access controls / auth for caregiver teams.
- Better medication normalization (mapped routes/status, localizable labels).
- Offline capture queue; background sync.
- Evented integrations (calendar tasks for follow‑ups, notifications).
- Analytics/insights page: trends in mood, participation, prompts.

---

## License / Notes

Prototype quality code intended for demos and iteration. Please keep credentials out of source control and set all keys in environment variables.

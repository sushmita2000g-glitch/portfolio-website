# CineMaya AI — Full-Stack Cartoon Story Video Generator

CineMaya AI is a premium, futuristic full-stack prototype for generating cinematic animated cartoon videos from user-written stories. It now includes a Node.js backend that turns a story into a saved AI production project with character bibles, scene plans, image prompts, animation prompts, narration plans, music/SFX direction, render stages, SEO metadata, and export manifests.

**Story Input → Scene Detection → Character Generation → Image Generation → Animation → Voiceover → Lip Sync → Music → Video Render → Export → Gallery Save → Download**

## What Is Included

### Frontend

- Futuristic glassmorphism landing page with pink, green, yellow, black, and white theme colors
- Premium app name, hero section, cinematic mobile preview, and responsive layout
- Home-screen sections for Create Story, Generate AI Video, Trending Stories, Saved Videos, Character Library, and Voice Library
- Interactive story input studio with animation style, duration, and narrator voice controls
- Backend-aware buttons for generating AI stories, making animated video previews, opening generated videos, and downloading export manifests
- Offline fallback mode so the UI still previews the production plan when opened as a static file

### Backend

- Dependency-free Node.js HTTP server in `server.js`
- Static file hosting for the web app
- REST API endpoints for health, capabilities, generated story ideas, project creation, project gallery, project retrieval, render orchestration, and export manifests
- Story analysis engine for genre/category detection, scene breakdowns, consistent character generation, emotional direction, camera direction, image prompts, animation prompts, voiceover plans, music/SFX plans, render plans, thumbnail prompts, and YouTube SEO metadata
- Local JSON persistence in `data/projects.json` at runtime
- Export manifest and browser-playable animated SVG video generation in `data/exports/` at runtime

## Run the Full App

```bash
npm start
```

Then visit:

```text
http://localhost:8000
```

## Run Tests

```bash
npm test
```

The tests cover story analysis, category detection, project creation, render orchestration, export manifests, generated video previews, and API responses.

## API Reference

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Backend health check |
| `GET` | `/api/capabilities` | Supported styles, voices, durations, qualities, and workflow stages |
| `POST` | `/api/story/generate` | Generate a starter story from category, hero, and tone |
| `GET` | `/api/projects` | List saved projects for the gallery |
| `POST` | `/api/projects` | Create a new AI cartoon video project from a story |
| `GET` | `/api/projects/:id` | Retrieve one project with its full analysis |
| `POST` | `/api/projects/:id/render` | Generate a completed render manifest for the project |
| `GET` | `/api/projects/:id/export` | Download/view the export manifest JSON |
| `GET` | `/api/projects/:id/video` | Open the generated animated SVG video preview |

Example project request:

```bash
curl -X POST http://localhost:8000/api/projects \
  -H 'content-type: application/json' \
  -d '{
    "story": "A brave girl finds a glowing key in a forest and unlocks a floating kingdom above the clouds.",
    "style": "Fantasy magic world",
    "duration": "Auto duration",
    "voice": "Epic Hindi storyteller",
    "quality": "1080p"
  }'
```

## Project Files

- `index.html` — App structure, creator studio, backend feature section, workflow, and export UI
- `styles.css` — Responsive cinematic UI styling and backend/live project UI states
- `app.js` — Frontend planner logic, all button actions, backend API integration, generated video preview display, and offline fallback
- `server.js` — Full backend API, persistence, story analysis, animated SVG video generation, render orchestration, and static hosting
- `test/backend.test.js` — Node test suite for the backend
- `package.json` — App metadata and `npm start` / `npm test` scripts
- `data/.gitignore` — Keeps generated runtime project/export data out of Git
- `sushmita_&_python.py` and `sushmita_&_python (1).py` — Original Python learning files kept in the repository

## Production Upgrade Path

This prototype is intentionally dependency-free and runnable anywhere Node is installed. A production implementation could replace the mock orchestration layers with real providers:

- Frontend: Flutter, React Native, or Next.js
- Backend: Node.js API gateway with Python AI workers and queue orchestration
- AI planning: OpenAI or Gemini APIs for scene, character, subtitles, titles, and SEO
- Image generation: Stable Diffusion, Flux, or hosted image APIs
- Video generation: Runway ML, Pika Labs, Kling AI, Luma AI, or custom ComfyUI pipelines
- Voice and lip sync: ElevenLabs plus dedicated phoneme/lip-sync workers
- Database: Firebase, Supabase, PostgreSQL, or MongoDB
- Storage: AWS S3, Cloudflare R2, Firebase Storage, or Supabase Storage
- Jobs: BullMQ, Temporal, Cloud Tasks, or serverless queues for long video renders

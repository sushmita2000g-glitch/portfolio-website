const http = require('node:http');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');

const ROOT_DIR = __dirname;
const PORT = Number(process.env.PORT || 8000);
const DATA_DIR = process.env.CINEMAYA_DATA_DIR || path.join(ROOT_DIR, 'data');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const EXPORT_DIR = path.join(DATA_DIR, 'exports');
const MAX_BODY_BYTES = 1_000_000;

const STYLE_PROMPTS = {
  'Pixar-inspired 3D': 'premium 3D cartoon film, warm cinematic light, expressive eyes, soft realistic textures',
  'Fairytale cinematic cartoon': 'magical fairytale animation, glowing particles, elegant princess-film color palette',
  'Anime episode': 'high-detail anime episode, dynamic framing, painterly backgrounds, emotional character acting',
  'Cute kids animation': 'cute kids cartoon, soft rounded shapes, cheerful colors, safe family-friendly composition',
  'Realistic 3D cartoon': 'realistic 3D cartoon, cinematic depth of field, believable skin and cloth texture',
  'Fantasy magic world': 'epic fantasy cartoon world, luminous magic, grand environments, dramatic atmosphere',
};

const VOICE_PROFILES = {
  'Epic Hindi storyteller': { language: 'Hindi', tone: 'epic, emotional, kahani sunane wala storyteller', speed: 0.95, pitch: -1 },
  'Deep cinematic male': { language: 'English', tone: 'deep cinematic male narrator', speed: 0.9, pitch: -3 },
  'Emotional English narrator': { language: 'English', tone: 'warm emotional storyteller', speed: 1, pitch: 0 },
  'Fantasy storyteller': { language: 'English', tone: 'mystical fantasy narrator', speed: 0.94, pitch: 1 },
  'Horror narrator': { language: 'English', tone: 'slow suspense horror narrator', speed: 0.82, pitch: -2 },
};

const CAPABILITIES = {
  appName: 'CineMaya AI',
  qualities: ['720p', '1080p', '2K', '4K'],
  durations: ['Auto duration', '1 minute', '5 minutes', '10 minutes', '15 minutes', '20 minutes'],
  styles: Object.keys(STYLE_PROMPTS),
  voices: Object.keys(VOICE_PROFILES),
  workflow: [
    'story-analysis',
    'scene-detection',
    'character-bible',
    'image-prompts',
    'motion-plan',
    'voiceover-plan',
    'lip-sync-plan',
    'music-and-sfx',
    'render-manifest',
    'export',
  ],
};

function jsonResponse(res, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(body);
}

function errorResponse(res, statusCode, message, details = undefined) {
  jsonResponse(res, statusCode, { error: message, details });
}

async function ensureStore() {
  await fsp.mkdir(DATA_DIR, { recursive: true });
  await fsp.mkdir(EXPORT_DIR, { recursive: true });
  try {
    await fsp.access(PROJECTS_FILE);
  } catch {
    await fsp.writeFile(PROJECTS_FILE, JSON.stringify({ projects: [] }, null, 2));
  }
}

async function readStore() {
  await ensureStore();
  const raw = await fsp.readFile(PROJECTS_FILE, 'utf8');
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.projects) ? parsed : { projects: [] };
  } catch {
    return { projects: [] };
  }
}

async function writeStore(store) {
  await ensureStore();
  const tmpFile = `${PROJECTS_FILE}.${process.pid}.tmp`;
  await fsp.writeFile(tmpFile, JSON.stringify(store, null, 2));
  await fsp.rename(tmpFile, PROJECTS_FILE);
}

async function parseJsonBody(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      const error = new Error('Request body is too large.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error('Invalid JSON request body.');
    error.statusCode = 400;
    throw error;
  }
}

function splitSentences(story) {
  return story
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function detectCategory(story) {
  const normalized = story.toLowerCase();
  const categories = [
    ['horror', ['ghost', 'haunted', 'dark', 'scary', 'fear', 'nightmare']],
    ['fantasy', ['princess', 'kingdom', 'magic', 'dragon', 'forest', 'castle', 'cloud']],
    ['motivation', ['dream', 'success', 'hard work', 'winner', 'goal']],
    ['kids', ['little', 'child', 'school', 'toy', 'friend']],
    ['love', ['love', 'heart', 'romance']],
    ['action', ['battle', 'fight', 'warrior', 'chase']],
    ['sci-fi', ['robot', 'space', 'planet', 'alien', 'future']],
    ['devotional', ['god', 'temple', 'prayer', 'divine']],
    ['comedy', ['funny', 'joke', 'laugh']],
  ];
  const match = categories.find(([, words]) => words.some((word) => normalized.includes(word)));
  return match ? match[0] : 'adventure';
}

function emotionFor(sentence, index) {
  const lower = sentence.toLowerCase();
  if (/ghost|dark|fear|lost|cry|alone|storm|danger/.test(lower)) return 'tense and suspenseful';
  if (/happy|laugh|smile|friend|celebrate|success/.test(lower)) return 'joyful and uplifting';
  if (/love|heart|hug|mother|family/.test(lower)) return 'warm and emotional';
  if (/battle|run|fight|chase|escape/.test(lower)) return 'energetic and heroic';
  if (/magic|glow|dream|cloud|castle|kingdom/.test(lower)) return 'wonder-filled and magical';
  return ['curious', 'hopeful', 'dramatic', 'peaceful'][index % 4];
}

function environmentFor(sentence, category) {
  const lower = sentence.toLowerCase();
  if (lower.includes('forest')) return 'enchanted glowing forest';
  if (lower.includes('castle') || lower.includes('kingdom')) return 'floating fairytale kingdom';
  if (lower.includes('school')) return 'bright animated classroom';
  if (lower.includes('space') || lower.includes('planet')) return 'colorful sci-fi galaxy';
  if (lower.includes('temple')) return 'serene devotional temple courtyard';
  if (lower.includes('city')) return 'stylized neon cartoon city';
  if (category === 'horror') return 'misty moonlit village';
  if (category === 'fantasy') return 'cinematic fantasy landscape';
  return 'storybook cinematic environment';
}

function inferCharacters(story, category) {
  const lower = story.toLowerCase();
  const base = [];

  if (/girl|princess|queen|mother|sister|woman/.test(lower)) {
    base.push({ name: 'Maya', role: 'brave lead heroine', age: '10-16', gender: 'female' });
  }
  if (/boy|king|father|brother|man|warrior/.test(lower)) {
    base.push({ name: 'Arjun', role: 'loyal hero companion', age: '12-20', gender: 'male' });
  }
  if (/dragon|animal|cat|dog|bird/.test(lower)) {
    base.push({ name: 'Lumi', role: 'magical creature friend', age: 'timeless', gender: 'creature' });
  }
  if (/ghost|villain|monster|dark|enemy/.test(lower)) {
    base.push({ name: 'Noctra', role: 'mysterious antagonist', age: 'unknown', gender: 'shadow spirit' });
  }

  if (!base.length) {
    base.push({ name: 'Ari', role: 'curious young storyteller hero', age: '12', gender: 'neutral' });
  }

  if (base.length === 1) {
    base.push({ name: category === 'fantasy' ? 'Elder Orion' : 'Navi', role: 'wise guide and emotional support', age: 'adult', gender: 'neutral' });
  }

  return base.slice(0, 4).map((character, index) => ({
    id: `char_${index + 1}`,
    ...character,
    look: `${character.role}, consistent face, expressive eyes, signature ${index % 2 ? 'emerald' : 'rose-gold'} outfit, memorable silhouette`,
    animationRig: ['blink', 'smile', 'talk', 'walk', 'run', 'gesture', 'emotion-shift'],
  }));
}

function buildScenes(story, category, style) {
  const sentences = splitSentences(story);
  const count = clamp(Math.ceil(Math.max(sentences.length, 1) * 1.5), 4, 14);
  const stylePrompt = STYLE_PROMPTS[style] || STYLE_PROMPTS['Pixar-inspired 3D'];

  return Array.from({ length: count }, (_, index) => {
    const source = sentences[index % sentences.length] || story;
    const emotion = emotionFor(source, index);
    const environment = environmentFor(source, category);
    const shotTypes = ['wide establishing shot', 'medium emotional shot', 'close-up acting shot', 'dynamic tracking shot'];
    const motion = ['slow dolly-in', 'floating crane move', 'gentle parallax push', 'heroic orbit camera'];

    return {
      sceneNumber: index + 1,
      title: `Scene ${index + 1}: ${environment}`,
      summary: source.replace(/[.!?]$/, ''),
      emotion,
      environment,
      cameraDirection: `${shotTypes[index % shotTypes.length]} with ${motion[index % motion.length]}`,
      imagePrompt: `${stylePrompt}; ${environment}; ${emotion}; ${source}; cinematic composition; HD cartoon frame; consistent character bible`,
      animationPrompt: `${motion[index % motion.length]}, natural blinking, expressive facial acting, subtle cloth and hair movement, dialogue-ready lip-sync timing`,
      estimatedSeconds: 6 + (index % 4) * 2,
    };
  });
}

function durationSeconds(duration, scenes) {
  const map = {
    '1 minute': 60,
    '5 minutes': 300,
    '10 minutes': 600,
    '15 minutes': 900,
    '20 minutes': 1200,
  };
  return map[duration] || scenes.reduce((sum, scene) => sum + scene.estimatedSeconds, 0);
}

function titleFromStory(story, category) {
  const words = story
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 5);
  if (words.length >= 2) return words.map((word) => word[0].toUpperCase() + word.slice(1)).join(' ');
  return `${category[0].toUpperCase()}${category.slice(1)} Cartoon Story`;
}

function analyzeStory({ story, style = 'Pixar-inspired 3D', duration = 'Auto duration', voice = 'Epic Hindi storyteller', quality = '1080p' }) {
  const safeStory = String(story || '').trim();
  if (safeStory.length < 10) {
    const error = new Error('Please provide a story with at least 10 characters.');
    error.statusCode = 422;
    throw error;
  }

  const category = detectCategory(safeStory);
  const scenes = buildScenes(safeStory, category, style);
  const characters = inferCharacters(safeStory, category);
  const seconds = durationSeconds(duration, scenes);
  const voiceProfile = VOICE_PROFILES[voice] || VOICE_PROFILES['Epic Hindi storyteller'];
  const title = titleFromStory(safeStory, category);

  return {
    title,
    category,
    logline: `${title} becomes a ${style} animated ${category} film with ${voiceProfile.tone}.`,
    scenes,
    characters,
    audioPlan: {
      narrator: voice,
      ...voiceProfile,
      music: `${category} adaptive cinematic score with scene-by-scene emotional intensity`,
      soundEffects: ['footsteps', 'wind', 'magic shimmer', 'crowd ambience', 'impact hits'].slice(0, category === 'horror' ? 4 : 5),
      lipSync: 'phoneme-level lip-sync markers generated from narration and dialogue timing',
    },
    renderPlan: {
      style,
      quality,
      duration,
      estimatedSeconds: seconds,
      aspectRatios: ['16:9 YouTube', '9:16 Shorts/Reels/TikTok', '1:1 social square'],
      exportFormats: ['mp4', 'json storyboard manifest', 'subtitle srt', 'thumbnail png prompt'],
    },
    seo: {
      youtubeTitle: `${title} | AI Animated Cartoon Story`,
      thumbnailPrompt: `viral cinematic thumbnail for ${title}, expressive character, bright magical contrast, readable title space`,
      tags: [category, 'AI cartoon', 'animated story', style, 'kids animation', 'cinematic video'],
    },
  };
}


function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function createAnimatedVideoSvg(project) {
  const scenes = project.analysis.scenes.slice(0, 6);
  const totalSeconds = Math.max(12, scenes.length * 4);
  const colors = ['#ff4eb8', '#44f0a2', '#ffd84d', '#8f4dff', '#58c7ff', '#ff8a4e'];
  const sceneGroups = scenes.map((scene, index) => {
    const begin = `${index * 4}s`;
    const color = colors[index % colors.length];
    const nextColor = colors[(index + 1) % colors.length];
    return `
      <g opacity="0">
        <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.12;0.88;1" begin="${begin}" dur="4s" fill="freeze" />
        <rect width="1280" height="720" fill="url(#bg${index})" />
        <circle cx="${220 + index * 120}" cy="210" r="120" fill="${color}" opacity="0.42">
          <animate attributeName="cx" values="${220 + index * 120};${300 + index * 120}" begin="${begin}" dur="4s" fill="freeze" />
        </circle>
        <circle cx="${940 - index * 70}" cy="470" r="170" fill="${nextColor}" opacity="0.28">
          <animate attributeName="cy" values="470;390;470" begin="${begin}" dur="4s" fill="freeze" />
        </circle>
        <rect x="95" y="90" width="1090" height="540" rx="44" fill="rgba(6,5,10,0.62)" stroke="rgba(255,255,255,0.32)" />
        <text x="130" y="165" fill="#44f0a2" font-family="Inter, Arial" font-size="28" font-weight="800" letter-spacing="4">SCENE ${scene.sceneNumber}</text>
        <text x="130" y="235" fill="#fffaf7" font-family="Georgia, serif" font-size="54" font-weight="800">${escapeXml(scene.environment)}</text>
        <text x="130" y="305" fill="#ffd84d" font-family="Inter, Arial" font-size="28" font-weight="800">${escapeXml(scene.emotion)}</text>
        <foreignObject x="130" y="345" width="1000" height="150">
          <div xmlns="http://www.w3.org/1999/xhtml" style="color:#fffaf7;font-family:Inter,Arial;font-size:32px;line-height:1.35;font-weight:700;">${escapeXml(scene.summary)}</div>
        </foreignObject>
        <text x="130" y="560" fill="#cfc7d7" font-family="Inter, Arial" font-size="24">${escapeXml(scene.cameraDirection)}</text>
      </g>`;
  }).join('\n');

  const gradients = scenes.map((_, index) => `
    <linearGradient id="bg${index}" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0%" stop-color="#06050a" />
      <stop offset="45%" stop-color="${colors[index % colors.length]}" stop-opacity="0.42" />
      <stop offset="100%" stop-color="#15101f" />
    </linearGradient>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <title>${escapeXml(project.analysis.title)} animated video preview</title>
  <defs>${gradients}</defs>
  <rect width="1280" height="720" fill="#06050a" />
  ${sceneGroups}
  <rect x="80" y="650" width="1120" height="12" rx="6" fill="rgba(255,255,255,0.18)" />
  <rect x="80" y="650" width="1120" height="12" rx="6" fill="#44f0a2">
    <animate attributeName="width" values="0;1120" dur="${totalSeconds}s" repeatCount="indefinite" />
  </rect>
</svg>`;
}

function createRenderManifest(project) {
  const stages = CAPABILITIES.workflow.map((stage, index) => ({
    stage,
    status: 'complete',
    progress: Math.round(((index + 1) / CAPABILITIES.workflow.length) * 100),
    completedAt: new Date(Date.now() + index * 250).toISOString(),
  }));

  return {
    projectId: project.id,
    title: project.analysis.title,
    status: 'complete',
    renderedAt: new Date().toISOString(),
    previewUrl: `/api/projects/${project.id}/video`,
    exportManifestUrl: `/api/projects/${project.id}/export`,
    mp4Placeholder: `${project.id}.mp4`,
    generatedVideo: `${project.id}.svg`,
    storyboardFrames: project.analysis.scenes.map((scene) => ({
      sceneNumber: scene.sceneNumber,
      framePrompt: scene.imagePrompt,
      motionPrompt: scene.animationPrompt,
      seconds: scene.estimatedSeconds,
    })),
    audio: project.analysis.audioPlan,
    delivery: project.analysis.renderPlan,
    stages,
  };
}

async function createProject(payload) {
  const analysis = analyzeStory(payload);
  const now = new Date().toISOString();
  const project = {
    id: `cm_${crypto.randomUUID()}`,
    story: String(payload.story).trim(),
    status: 'planned',
    createdAt: now,
    updatedAt: now,
    analysis,
    renderManifest: null,
  };

  const store = await readStore();
  store.projects.unshift(project);
  await writeStore(store);
  return project;
}

async function updateProject(id, updater) {
  const store = await readStore();
  const index = store.projects.findIndex((project) => project.id === id);
  if (index === -1) return null;
  store.projects[index] = await updater(store.projects[index]);
  store.projects[index].updatedAt = new Date().toISOString();
  await writeStore(store);
  return store.projects[index];
}

async function renderProject(id) {
  const updated = await updateProject(id, async (project) => {
    const renderManifest = createRenderManifest(project);
    await fsp.writeFile(path.join(EXPORT_DIR, `${project.id}.json`), JSON.stringify(renderManifest, null, 2));
    await fsp.writeFile(path.join(EXPORT_DIR, `${project.id}.svg`), createAnimatedVideoSvg(project), 'utf8');
    return { ...project, status: 'rendered', renderManifest };
  });
  return updated;
}

async function listProjects() {
  const store = await readStore();
  return store.projects.map((project) => ({
    id: project.id,
    title: project.analysis.title,
    category: project.analysis.category,
    status: project.status,
    style: project.analysis.renderPlan.style,
    quality: project.analysis.renderPlan.quality,
    scenes: project.analysis.scenes.length,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }));
}

async function getProject(id) {
  const store = await readStore();
  return store.projects.find((project) => project.id === id) || null;
}

function generateStory({ category = 'fantasy', hero = 'a brave child', tone = 'emotional cinematic' }) {
  const cleanCategory = String(category).trim() || 'fantasy';
  const cleanHero = String(hero).trim() || 'a brave child';
  const cleanTone = String(tone).trim() || 'emotional cinematic';
  return {
    title: `${cleanHero.replace(/^./, (letter) => letter.toUpperCase())} and the ${cleanCategory} Light`,
    story: `${cleanHero} discovers a glowing secret in a forgotten ${cleanCategory} world. At first, everyone doubts the journey, but the hero follows a tiny spark through danger, wonder, and friendship. In the final moment, courage turns the spark into a brilliant light that saves the world and brings every heart together.`,
    prompt: `Write a ${cleanTone} ${cleanCategory} cartoon story starring ${cleanHero}.`,
  };
}

function sendStatic(req, res, pathname) {
  const requested = pathname === '/' ? '/index.html' : pathname;
  const decoded = decodeURIComponent(requested);
  const safePath = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(ROOT_DIR, safePath);

  if (!filePath.startsWith(ROOT_DIR) || filePath.includes(`${path.sep}data${path.sep}`)) {
    errorResponse(res, 403, 'Forbidden');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      errorResponse(res, 404, 'Not found');
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    const contentTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
    };

    res.writeHead(200, {
      'content-type': contentTypes[extension] || 'application/octet-stream',
      'cache-control': extension === '.html' ? 'no-store' : 'public, max-age=3600',
    });
    res.end(content);
  });
}

async function handleApi(req, res, url) {
  const method = req.method || 'GET';
  const isRead = method === 'GET' || method === 'HEAD';
  const segments = url.pathname.split('/').filter(Boolean);

  if (isRead && url.pathname === '/api/health') {
    jsonResponse(res, 200, { status: 'ok', appName: 'CineMaya AI', timestamp: new Date().toISOString() });
    return;
  }

  if (isRead && url.pathname === '/api/capabilities') {
    jsonResponse(res, 200, CAPABILITIES);
    return;
  }

  if (method === 'POST' && url.pathname === '/api/story/generate') {
    const body = await parseJsonBody(req);
    jsonResponse(res, 201, generateStory(body));
    return;
  }

  if (isRead && url.pathname === '/api/projects') {
    jsonResponse(res, 200, { projects: await listProjects() });
    return;
  }

  if (method === 'POST' && url.pathname === '/api/projects') {
    const body = await parseJsonBody(req);
    const project = await createProject(body);
    jsonResponse(res, 201, project);
    return;
  }

  if (segments[0] === 'api' && segments[1] === 'projects' && segments[2]) {
    const id = segments[2];

    if (isRead && segments.length === 3) {
      const project = await getProject(id);
      if (!project) return errorResponse(res, 404, 'Project not found');
      jsonResponse(res, 200, project);
      return;
    }

    if (method === 'POST' && segments[3] === 'render') {
      const project = await renderProject(id);
      if (!project) return errorResponse(res, 404, 'Project not found');
      jsonResponse(res, 200, project);
      return;
    }

    if (isRead && segments[3] === 'export') {
      const project = await getProject(id);
      if (!project) return errorResponse(res, 404, 'Project not found');
      const manifest = project.renderManifest || createRenderManifest(project);
      jsonResponse(res, 200, manifest);
      return;
    }

    if (isRead && segments[3] === 'video') {
      const project = await getProject(id);
      if (!project) return errorResponse(res, 404, 'Project not found');
      res.writeHead(200, {
        'content-type': 'image/svg+xml; charset=utf-8',
        'cache-control': 'no-store',
        'content-disposition': `inline; filename="${id}-video-preview.svg"`,
      });
      res.end(createAnimatedVideoSvg(project));
      return;
    }
  }

  errorResponse(res, 404, 'API route not found');
}

function createServer() {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      if (url.pathname.startsWith('/api/')) {
        await handleApi(req, res, url);
        return;
      }
      sendStatic(req, res, url.pathname);
    } catch (error) {
      errorResponse(res, error.statusCode || 500, error.message || 'Internal server error');
    }
  });
}

if (require.main === module) {
  ensureStore()
    .then(() => {
      const server = createServer();
      server.listen(PORT, () => {
        console.log(`CineMaya AI backend running at http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error('Failed to start CineMaya AI backend:', error);
      process.exit(1);
    });
}

module.exports = {
  CAPABILITIES,
  analyzeStory,
  createProject,
  createServer,
  detectCategory,
  generateStory,
  listProjects,
  renderProject,
};

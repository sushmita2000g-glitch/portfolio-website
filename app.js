const storyInput = document.querySelector('#storyInput');
const styleSelect = document.querySelector('#styleSelect');
const durationSelect = document.querySelector('#durationSelect');
const voiceSelect = document.querySelector('#voiceSelect');
const generatePlan = document.querySelector('#generatePlan');
const generateStoryButton = document.querySelector('#generateStoryButton');
const phoneRenderButton = document.querySelector('#phoneRenderButton');
const planTitle = document.querySelector('#planTitle');
const planList = document.querySelector('#planList');
const backendStatus = document.querySelector('#backendStatus');
const projectMeta = document.querySelector('#projectMeta');
const scenePreview = document.querySelector('#scenePreview');
const videoPreviewLink = document.querySelector('#videoPreviewLink');
const downloadManifestLink = document.querySelector('#downloadManifestLink');
const videoPreviewFrame = document.querySelector('#videoPreviewFrame');

const API_BASE = '/api';

const categoryKeywords = [
  ['princess', 'Princess Fantasy'],
  ['forest', 'Enchanted Forest Quest'],
  ['ghost', 'Cinematic Horror Tale'],
  ['school', 'Educational Kids Story'],
  ['robot', 'Sci-fi Cartoon Adventure'],
  ['love', 'Emotional Love Story'],
  ['battle', 'Epic Action Story'],
  ['god', 'Devotional Story'],
];

function estimateScenes(text) {
  const sentenceCount = Math.max(1, (text.match(/[.!?]+/g) || []).length);
  return Math.min(14, Math.max(4, Math.ceil(sentenceCount * 1.5)));
}

function detectCategory(text) {
  const normalized = text.toLowerCase();
  const match = categoryKeywords.find(([keyword]) => normalized.includes(keyword));
  return match ? match[1] : 'Original Cinematic Story';
}


function showElement(element) {
  if (element) element.classList.remove('hidden');
}

function hideElement(element) {
  if (element) element.classList.add('hidden');
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildLocalVideoSvg(title, scenes) {
  const safeScenes = scenes.length ? scenes : [
    { sceneNumber: 1, environment: title, emotion: 'cinematic', summary: storyInput.value.trim(), cameraDirection: 'slow magical camera push' },
    { sceneNumber: 2, environment: 'character close-up', emotion: 'emotional', summary: 'Characters blink, talk, and react with expressive cartoon acting.', cameraDirection: 'close-up lip-sync shot' },
    { sceneNumber: 3, environment: 'final render', emotion: 'triumphant', summary: 'Music, voiceover, subtitles, and transitions combine into a finished video preview.', cameraDirection: 'wide ending shot' },
  ];
  const groups = safeScenes.slice(0, 4).map((scene, index) => `
    <g opacity="0">
      <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.14;0.86;1" begin="${index * 3}s" dur="3s" repeatCount="indefinite" />
      <rect width="1280" height="720" fill="${index % 2 ? '#15101f' : '#06050a'}" />
      <circle cx="${260 + index * 170}" cy="260" r="180" fill="#ff4eb8" opacity="0.4" />
      <circle cx="${860 - index * 80}" cy="430" r="220" fill="#44f0a2" opacity="0.28" />
      <text x="100" y="145" fill="#44f0a2" font-family="Arial" font-size="30" font-weight="800">GENERATED VIDEO · SCENE ${scene.sceneNumber}</text>
      <text x="100" y="230" fill="#fffaf7" font-family="Georgia" font-size="58" font-weight="800">${escapeXml(scene.environment)}</text>
      <text x="100" y="305" fill="#ffd84d" font-family="Arial" font-size="30" font-weight="800">${escapeXml(scene.emotion)}</text>
      <foreignObject x="100" y="345" width="1060" height="170"><div xmlns="http://www.w3.org/1999/xhtml" style="color:#fffaf7;font-family:Arial;font-size:34px;line-height:1.35;font-weight:700;">${escapeXml(scene.summary)}</div></foreignObject>
      <text x="100" y="600" fill="#cfc7d7" font-family="Arial" font-size="26">${escapeXml(scene.cameraDirection)}</text>
    </g>`).join('');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><title>${escapeXml(title)} video preview</title>${groups}</svg>`)}`;
}

function setVideoPreview(url, manifestUrl = '') {
  if (!url) {
    hideElement(videoPreviewLink);
    hideElement(downloadManifestLink);
    hideElement(videoPreviewFrame);
    return;
  }
  videoPreviewLink.href = url;
  videoPreviewFrame.src = url;
  showElement(videoPreviewLink);
  showElement(videoPreviewFrame);
  if (manifestUrl) {
    downloadManifestLink.href = manifestUrl;
    showElement(downloadManifestLink);
  } else {
    hideElement(downloadManifestLink);
  }
}

function setBackendStatus(message, mode = 'neutral') {
  if (!backendStatus) return;
  backendStatus.textContent = message;
  backendStatus.dataset.mode = mode;
}

function renderList(items) {
  planList.innerHTML = '';
  items.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    planList.appendChild(li);
  });
}

function renderScenePreview(scenes = []) {
  scenePreview.innerHTML = '';
  scenes.slice(0, 4).forEach((scene) => {
    const card = document.createElement('article');
    card.innerHTML = `<strong>${scene.sceneNumber.toString().padStart(2, '0')}</strong><span>${scene.emotion}</span><p>${scene.cameraDirection}</p>`;
    scenePreview.appendChild(card);
  });
}

function buildLocalPlan() {
  const story = storyInput.value.trim() || 'A magical hero begins a new animated adventure.';
  const scenes = estimateScenes(story);
  const words = story.split(/\s+/).filter(Boolean).length;
  const category = detectCategory(story);
  const style = styleSelect.value;
  const duration = durationSelect.value;
  const voice = voiceSelect.value;

  planTitle.textContent = category;
  renderList([
    `Break ${words} story words into ${scenes} storyboard scenes with emotions, actions, environments, and dialogue.`,
    `Generate consistent characters for ${style}: same face, outfit, hairstyle, colors, and personality across every shot.`,
    'Animate scenes with cinematic camera movement, facial expressions, body motion, talking characters, and auto lip sync.',
    `Mix ${voice} narration with subtitles, adaptive music, ambience, and sound effects for ${duration.toLowerCase()}.`,
    'Render gallery-ready MP4 exports in 720p, 1080p, 2K, or 4K with social sharing presets.',
  ]);
  projectMeta.textContent = 'Local preview mode — start the Node backend for saved projects and render manifests.';
  setVideoPreview(buildLocalVideoSvg(category, []));
  renderScenePreview([]);
}

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Backend request failed.');
  }
  return data;
}

async function createBackendProject() {
  const story = storyInput.value.trim();
  if (story.length < 10) {
    setBackendStatus('Write a longer story before creating a backend project.', 'warning');
    buildLocalPlan();
    return;
  }

  generatePlan.disabled = true;
  generatePlan.textContent = 'Creating AI Project...';
  setBackendStatus('Backend is analyzing story, characters, scenes, audio, and render plan...', 'working');

  try {
    const project = await apiRequest('/projects', {
      method: 'POST',
      body: JSON.stringify({
        story,
        style: styleSelect.value,
        duration: durationSelect.value,
        voice: voiceSelect.value,
        quality: '1080p',
      }),
    });

    const rendered = await apiRequest(`/projects/${project.id}/render`, { method: 'POST' });
    const { analysis, renderManifest } = rendered;

    planTitle.textContent = analysis.title;
    renderList([
      analysis.logline,
      `Created ${analysis.characters.length} reusable characters and ${analysis.scenes.length} storyboard scenes.`,
      `Audio: ${analysis.audioPlan.narrator}, ${analysis.audioPlan.music}, lip sync ready.`,
      `Render: ${analysis.renderPlan.quality} MP4 manifest with ${renderManifest.stages.length} completed pipeline stages.`,
      `SEO: ${analysis.seo.youtubeTitle}`,
    ]);
    projectMeta.innerHTML = `Project <strong>${rendered.id}</strong> saved · Status <strong>${rendered.status}</strong> · animated video preview generated.`;
    setVideoPreview(`/api/projects/${rendered.id}/video`, `/api/projects/${rendered.id}/export`);
    renderScenePreview(analysis.scenes);
    setBackendStatus('Backend project saved and render manifest generated successfully.', 'success');
  } catch (error) {
    buildLocalPlan();
    setBackendStatus(`${error.message} Using offline preview instead.`, 'warning');
  } finally {
    generatePlan.disabled = false;
    generatePlan.textContent = 'Make Video';
  }
}

async function checkBackend() {
  try {
    const health = await apiRequest('/health');
    setBackendStatus(`${health.appName} backend online — full project saving and render manifests enabled.`, 'success');
  } catch {
    setBackendStatus('Backend offline — static preview still works. Run `npm start` for full app mode.', 'warning');
  }
}


async function generateAiStory() {
  generateStoryButton.disabled = true;
  generateStoryButton.textContent = 'Writing Story...';
  try {
    const idea = await apiRequest('/story/generate', {
      method: 'POST',
      body: JSON.stringify({ category: 'fantasy', hero: 'a brave little creator', tone: 'magical emotional' }),
    });
    storyInput.value = idea.story;
    buildLocalPlan();
    setBackendStatus('AI story generated. Press Make Video to render the animated preview.', 'success');
  } catch {
    storyInput.value = 'A brave little creator finds a glowing camera in a magical forest. The camera opens a floating studio where cartoon characters come alive, sing with emotional voices, and create a beautiful film for the whole world.';
    buildLocalPlan();
    setBackendStatus('Offline AI story template added. Press Make Video to create a preview.', 'warning');
  } finally {
    generateStoryButton.disabled = false;
    generateStoryButton.textContent = 'Generate AI Story';
  }
}

function scrollToCreatorAndRender() {
  document.querySelector('#create')?.scrollIntoView({ behavior: 'smooth' });
  createBackendProject();
}

generatePlan.addEventListener('click', createBackendProject);
generateStoryButton.addEventListener('click', generateAiStory);
phoneRenderButton.addEventListener('click', scrollToCreatorAndRender);
buildLocalPlan();
checkBackend();

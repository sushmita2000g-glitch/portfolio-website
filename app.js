const storyInput = document.querySelector('#storyInput');
const styleSelect = document.querySelector('#styleSelect');
const durationSelect = document.querySelector('#durationSelect');
const voiceSelect = document.querySelector('#voiceSelect');
const generatePlan = document.querySelector('#generatePlan');
const planTitle = document.querySelector('#planTitle');
const planList = document.querySelector('#planList');

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

function buildPlan() {
  const story = storyInput.value.trim() || 'A magical hero begins a new animated adventure.';
  const scenes = estimateScenes(story);
  const words = story.split(/\s+/).filter(Boolean).length;
  const category = detectCategory(story);
  const style = styleSelect.value;
  const duration = durationSelect.value;
  const voice = voiceSelect.value;

  planTitle.textContent = category;
  planList.innerHTML = '';

  const planItems = [
    `Break ${words} story words into ${scenes} storyboard scenes with emotions, actions, environments, and dialogue.`,
    `Generate consistent characters for ${style}: same face, outfit, hairstyle, colors, and personality across every shot.`,
    `Animate scenes with cinematic camera movement, facial expressions, body motion, talking characters, and auto lip sync.`,
    `Mix ${voice} narration with subtitles, adaptive music, ambience, and sound effects for ${duration.toLowerCase()}.`,
    'Render gallery-ready MP4 exports in 720p, 1080p, 2K, or 4K with social sharing presets.',
  ];

  planItems.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    planList.appendChild(li);
  });
}

generatePlan.addEventListener('click', buildPlan);
buildPlan();

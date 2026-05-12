const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

process.env.CINEMAYA_DATA_DIR = path.join(os.tmpdir(), `cinemaya-test-${process.pid}`);

const { analyzeStory, createServer, detectCategory } = require('../server');

test('detectCategory identifies fantasy stories', () => {
  assert.equal(detectCategory('A princess finds magic in a cloud kingdom.'), 'fantasy');
});

test('analyzeStory creates characters, scenes, audio plan, and render plan', () => {
  const analysis = analyzeStory({
    story: 'A brave girl finds a glowing key in a forest. She opens a castle above the clouds.',
    style: 'Fantasy magic world',
    duration: 'Auto duration',
    voice: 'Epic Hindi storyteller',
    quality: '4K',
  });

  assert.equal(analysis.category, 'fantasy');
  assert.ok(analysis.scenes.length >= 4);
  assert.ok(analysis.characters.length >= 2);
  assert.equal(analysis.audioPlan.language, 'Hindi');
  assert.equal(analysis.renderPlan.quality, '4K');
});

test('backend API creates and renders a project', async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const health = await fetch(`${baseUrl}/api/health`).then((response) => response.json());
    assert.equal(health.status, 'ok');

    const createResponse = await fetch(`${baseUrl}/api/projects`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        story: 'A robot child and a little princess save a glowing forest with courage.',
        style: 'Pixar-inspired 3D',
        duration: '1 minute',
        voice: 'Deep cinematic male',
        quality: '1080p',
      }),
    });
    assert.equal(createResponse.status, 201);
    const project = await createResponse.json();
    assert.equal(project.status, 'planned');
    assert.ok(project.id.startsWith('cm_'));

    const renderResponse = await fetch(`${baseUrl}/api/projects/${project.id}/render`, { method: 'POST' });
    assert.equal(renderResponse.status, 200);
    const rendered = await renderResponse.json();
    assert.equal(rendered.status, 'rendered');
    assert.equal(rendered.renderManifest.status, 'complete');

    const videoResponse = await fetch(`${baseUrl}/api/projects/${project.id}/video`);
    assert.equal(videoResponse.status, 200);
    assert.match(videoResponse.headers.get('content-type'), /image\/svg\+xml/);
    const svg = await videoResponse.text();
    assert.match(svg, /animated video preview/);

    const exportManifest = await fetch(`${baseUrl}/api/projects/${project.id}/export`).then((response) => response.json());
    assert.equal(exportManifest.previewUrl, `/api/projects/${project.id}/video`);
    assert.equal(exportManifest.generatedVideo, `${project.id}.svg`);

    const list = await fetch(`${baseUrl}/api/projects`).then((response) => response.json());
    assert.equal(list.projects.length, 1);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

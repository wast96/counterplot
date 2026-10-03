import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const html = (await readFile(new URL('../index.html', import.meta.url), 'utf8'))
  .replace('data-hosted="true"', 'data-hosted="false"');
const legacy = JSON.parse(await readFile(new URL('./fixtures/legacy-workspace.json', import.meta.url), 'utf8'));
const fields = {
  context: 'A courier waits at the gate with a sealed letter.',
  goal: 'Deliver the letter without losing her job.',
  tension: 'The guard wants to inspect the seal.',
  development: 'She tries a joke; the guard asks for her papers.',
  turn: 'She recognizes the name on the arrest notice.',
  action: 'She warns the recipient.',
  after: 'The recipient escapes; the courier has been seen.',
  reaction: 'Relief gives way to fear.',
  next: 'Find someone who can offer a safe room.',
  exit: 'She folds the notice into her coat.'
};

async function openScene(page, ideas = false) {
  await page.getByRole('button', { name: 'Write my first scene', exact: true }).click();
  if (await page.locator('[data-action="add-character"][data-next="scene"]').count()) {
    await page.getByRole('button', { name: 'Create a character' }).click();
  }
  await expect(page.getByRole('heading', { name: 'Build this scene.' })).toBeVisible();
  const planning=page.locator('.scene-planning');if(!await planning.evaluate(e=>e.open))await planning.locator('summary').first().click();return page.getByRole('dialog', { name: 'Build this scene.' });
}
async function saveScene(page, title = 'The letter') {
  await page.locator('[data-draft="title"]').fill(title);
  await page.getByRole('button', { name: 'Add scene', exact: false }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  page.testErrors = [];
  page.on('pageerror', error => page.testErrors.push(error.message));
  await page.route('http://counterplot.test/', route => route.fulfill({ contentType: 'text/html', body: html }));
  await page.goto('http://counterplot.test/#story');
});
test.afterEach(async ({ page }) => expect(page.testErrors).toEqual([]));

test('the canvas develops setup before tension, turn, outcome and reaction; continuation uses the same editor', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Write my first scene' })).toBeVisible();
  await openScene(page);
  expect(await page.locator('.scene-canvas-section h3').allTextContents()).toEqual([
    'Write freely', 'Opening', 'Development', 'Turn or continuation', 'Outcome', 'Afterward'
  ]);
  for (const [key, value] of Object.entries(fields)) await page.locator(`[data-draft="${key}"]`).fill(value);
  await saveScene(page);
  await expect(page.locator('.scene-card')).toContainText(fields.context);
  await expect(page.locator('.scene-card')).toContainText(fields.reaction);
  await page.getByRole('button', { name: 'Continue from this consequence' }).click();
  await expect(page.getByRole('heading', { name: 'Build this scene.' })).toBeVisible();
  await expect(page.locator('.cause-banner')).toContainText(fields.after);
  await expect(page.locator('.scene-planning')).toHaveAttribute('open', '');
  await page.locator('[data-draft="context"]').fill('She reaches the old boarding house.');
  await saveScene(page, 'A safe room');
  const workspace = await page.evaluate(() => counterplotDiagnostics.snapshot());
  expect(workspace.projects[0].scenes[1].parent).toBe(workspace.projects[0].scenes[0].id);
  await page.getByRole('button', { name: 'Edit scene The letter', exact: true }).click();
  await page.locator('.scene-planning>summary').click();await page.locator('[data-draft="turn"]').fill('A different name is on the arrest notice.');
  await page.getByRole('button', { name: 'Save scene', exact: false }).click();
  const stale = await page.evaluate(() => counterplotDiagnostics.staleSceneIds());
  expect(stale).toContain(workspace.projects[0].scenes[1].id);
});

test('authored possibilities remain separate, resumable and independent of planning prompts', async ({ page }) => {
  await openScene(page);
  await expect(page.locator('#scene-ideas')).toHaveCount(0);
  await page.locator('[data-draft="context"]').fill(fields.context);
  await page.locator('[data-draft="goal"]').fill(fields.goal);
  const possibilities='Perhaps the letter is empty. Or perhaps she never opens it.';
  await page.locator('[data-draft="ideaNotes"]').fill(possibilities);
  await page.locator('[data-draft="sceneKind"]').selectOption('aftermath');
  await expect(page.locator('[data-draft="goal"]')).toHaveValue(fields.goal);
  await expect(page.locator('[data-draft="action"]')).toHaveValue('');
  await expect(page.locator('[data-draft="after"]')).toHaveValue('');
  await page.getByRole('button', { name: 'Save unfinished draft' }).click();
  await page.getByRole('button', { name: 'Resume or discard' }).click();
  await page.locator('[data-action="resume-draft"]').click();
  await expect(page.locator('[data-draft="sceneKind"]')).toHaveValue('aftermath');
  await expect(page.locator('[data-draft="ideaNotes"]')).toHaveValue(possibilities);
  await saveScene(page);await page.reload();
  const scene=await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0].scenes[0]);
  expect(scene.ideaNotes).toBe(possibilities);expect(scene.action).toBe('');expect(scene.after).toBe('');
});

test('free prose and incomplete scenes can be saved, edited and recovered after reload', async ({ page }) => {
  await openScene(page);
  await page.getByRole('button', { name: 'Planning first',exact:true }).click();await page.getByRole('button', { name: 'Write freely first',exact:true }).click();
  expect((await page.locator('.scene-canvas-section h3').allTextContents())[0]).toBe('Write freely');
  await page.locator('[data-draft="notes"]').fill('The cup was still warm. She did not move it.');
  await saveScene(page, 'A quiet morning');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'A quiet morning', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Edit scene A quiet morning' }).click();
  await expect(page.locator('[data-draft="notes"]')).toHaveValue('The cup was still warm. She did not move it.');
  await expect(page.locator('[data-draft="action"]')).toHaveValue('');
  await page.locator('.scene-planning>summary').click();await page.locator('[data-draft="reaction"]').fill('Grief felt like waiting.');
  await page.getByRole('button', { name: 'Save scene', exact: false }).click();
  await expect(page.locator('.scene-card')).toContainText('Grief felt like waiting.');
});

test('development beats can be written, reordered and removed without losing other fields', async ({ page }) => {
  await openScene(page);
  await page.locator('[data-draft="context"]').fill(fields.context);
  await page.locator('.scene-beats summary').click();
  await page.getByRole('button', { name: 'Add a beat' }).click();
  await page.locator('[data-scene-beat="0"]').fill('The guard asks a question.');
  await page.getByRole('button', { name: 'Add a beat' }).click();
  await page.locator('[data-scene-beat="1"]').fill('The courier changes her answer.');
  await page.getByRole('button', { name: 'Move beat 2 earlier' }).click();
  await expect(page.locator('[data-scene-beat="0"]')).toHaveValue('The courier changes her answer.');
  await page.getByRole('button', { name: 'Remove beat 2' }).click();
  await expect(page.locator('[data-draft="context"]')).toHaveValue(fields.context);
  await saveScene(page);
  await page.reload();
  await page.getByRole('button', { name: 'Edit scene The letter' }).click();
  await expect(page.locator('[data-scene-beat="0"]')).toHaveValue('The courier changes her answer.');
});

test('legacy scenes, unfinished edits and retired range values survive loading and editing', async ({ page }) => {
  await page.addInitScript(data => localStorage.setItem('counterplot.workspace.v1', JSON.stringify(data)), legacy);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'The old letter', exact: true })).toBeVisible();
  expect(await page.evaluate(() => counterplotDiagnostics.staleSceneIds())).toEqual([]);
  await page.getByRole('button', { name: 'Edit scene The old letter' }).click();
  await expect(page.locator('[data-draft="context"]')).toHaveValue('A courier waits at the gate.');
  await expect(page.locator('[data-draft="notes"]')).toHaveValue('Legacy prose. Keep these exact words.');
  await page.locator('.scene-planning>summary').click();await page.locator('[data-draft="goal"]').fill('Get inside before the gates close.');
  await page.getByRole('button', { name: 'Save scene', exact: false }).click();
  await page.getByRole('button', { name: 'Resume or discard' }).click();
  await page.locator('[data-action="resume-draft"]').click();
  await expect(page.locator('[data-draft="notes"]')).toHaveValue('Unfinished legacy words.');
  await page.keyboard.press('Escape');
  const data = await page.evaluate(() => counterplotDiagnostics.snapshot());
  expect(data.projects[0].world.range).toEqual(legacy.projects[0].world.range);
  expect(data.projects[0].scenes[0].notes).toBe('Legacy prose. Keep these exact words.');
});

test('World and MICE have no Story range; MICE opens the same scene workshop; invalid new fields are rejected', async ({ page }) => {
  await page.locator('[data-nav="world"]').first().click();
  await expect(page.getByText('STORY RANGE', { exact: true })).toHaveCount(0);
  await expect(page.locator('[data-action="story-range"]')).toHaveCount(0);
  await page.locator('[data-nav="structure"]').click();
  await page.getByRole('button', { name: 'Write scene', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Build this scene.' })).toBeVisible();
  await expect(page.locator('.scene-planning')).toHaveAttribute('open', '');
  await page.locator('[data-draft="context"]').fill('A scene fragment.');
  await saveScene(page);
  const errors = await page.evaluate(() => {
    const data = counterplotDiagnostics.snapshot(), results = [];
    for (const patch of [{goal:42}, {beats:[false]}, {beats:Array(101).fill('x')}, {sceneKind:'unknown'}]) {
      const altered = structuredClone(data); Object.assign(altered.projects[0].scenes[0], patch);
      try {counterplotDiagnostics.validate(altered);results.push(false)} catch {results.push(true)}
    }
    return results;
  });
  expect(errors).toEqual([true,true,true,true]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('JSON and Markdown exports retain the full scene canvas and development beats', async ({ page }) => {
  await openScene(page);
  for (const [key, value] of Object.entries(fields)) await page.locator(`[data-draft="${key}"]`).fill(value);
  await page.locator('.scene-beats summary').click();
  await page.getByRole('button', { name: 'Add a beat' }).click();
  await page.locator('[data-scene-beat="0"]').fill('A boot scrapes behind her.');
  await saveScene(page);
  await page.getByRole('button', { name: 'Keep a copy', exact: true }).click();
  let downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Save complete backup', exact: false }).click();
  let download = await downloadPromise;
  const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
  for (const [key, value] of Object.entries(fields)) expect(exported.projects[0].scenes[0][key]).toBe(value);
  expect(exported.projects[0].scenes[0].beats).toEqual(['A boot scrapes behind her.']);
  downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export the writing brief' }).click();
  download = await downloadPromise;
  const markdown = await readFile(await download.path(), 'utf8');
  for (const value of Object.values(fields)) expect(markdown).toContain(value);
  expect(markdown).toContain('1. A boot scrapes behind her.');
  expect(await page.evaluate(data => counterplotDiagnostics.validate(data).projects[0].scenes.length, exported)).toBe(1);
});

test('unfinished scene content is validated as carefully as accepted scenes', async ({ page }) => {
  const rejected = await page.evaluate(data => {
    const bad = structuredClone(data);
    bad.projects[0].drafts[0].draft.beats = 'not an array';
    try {counterplotDiagnostics.validate(bad);return false} catch {return true}
  }, legacy);
  expect(rejected).toBe(true);
});

test('participants and scene approach survive saving without generated agendas', async ({ page }) => {
  await page.evaluate(data => {
    const p = data.projects[0];p.characters[0].name = 'Mara';
    p.characters.push({...structuredClone(p.characters[0]),id:'ivo',name:'Ivo'});
    counterplotBridge.replace(data);
  }, structuredClone(legacy));
  await page.getByRole('button', { name: 'Write another scene' }).click();
  await page.locator('.scene-metadata summary').click();await page.locator('[data-draft="partner"]').selectOption('ivo');
  if(!await page.locator('.scene-planning').evaluate(e=>e.open))await page.locator('.scene-planning>summary').click();
  await page.locator('[data-draft="goal"]').fill('Borrow a room without exposing Ivo.');
  await page.locator('[data-draft="sceneKind"]').selectOption('relationship');
  await saveScene(page,'The borrowed room');
  const scene=await page.evaluate(()=>counterplotDiagnostics.snapshot().projects[0].scenes.at(-1));
  expect(scene.partner).toBe('ivo');expect(scene.goal).toBe('Borrow a room without exposing Ivo.');expect(scene.sceneKind).toBe('relationship');expect(scene.action).toBe('');
});

test('a MICE thread carries its opening and link into the unified workshop', async ({ page }) => {
  await openScene(page);
  await page.keyboard.press('Escape');
  await page.locator('[data-nav="structure"]').click();
  await page.getByRole('button', { name: 'New thread', exact: false }).click();
  await page.locator('[data-mice-compose="opening"]').fill('A courier wants to stop hiding from her employer.');
  await page.locator('[data-mice-compose="title"]').fill('The courier’s courage');
  await page.getByRole('button', { name: 'Add thread', exact: false }).click();
  await page.locator('[data-action="thread-lab"]').first().click();
  await expect(page.getByRole('heading', { name: 'Build this scene.' })).toBeVisible();
  await expect(page.locator('[data-draft="context"]')).toHaveValue('A courier wants to stop hiding from her employer.');
  await expect(page.locator('[data-draft="miceId"]')).not.toHaveValue('');
  await saveScene(page, 'At the employer’s door');
  const w = await page.evaluate(() => counterplotDiagnostics.snapshot());
  expect(w.projects[0].scenes[0].miceId).toBe(w.projects[0].structure[0].id);
});


test('earlier Explorer suggestions remain recoverable in the new workshop', async ({ page }) => {
  await page.evaluate(data => {
    const p=data.projects[0],idea=structuredClone(p.scenes[0]);
    idea.id='legacy-suggestion';idea.title='An earlier possibility';idea.kept=false;
    p.lab.suggestions=[idea];p.lab.focus=p.characters[0].id;
    counterplotBridge.replace(data);
  }, structuredClone(legacy));
  await page.locator('.legacy-scene-ideas summary').click();
  await page.getByRole('button', { name: 'Open in workshop' }).click();
  await expect(page.locator('[data-draft="notes"]')).toHaveValue('Legacy prose. Keep these exact words.');
  await saveScene(page, 'An earlier possibility');
  const w=await page.evaluate(()=>counterplotDiagnostics.snapshot());
  expect(w.projects[0].scenes).toHaveLength(2);
  expect(w.projects[0].scenes[1].id).not.toBe('legacy-suggestion');
  expect(w.projects[0].lab.suggestions[0].notes).toBe('Legacy prose. Keep these exact words.');
});

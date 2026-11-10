const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.resolve(__dirname, '../extension/scripts/popup.js'), 'utf8');
const walker = source.slice(source.indexOf('function walk('), source.indexOf('function markIssues('));
const loader = source.slice(source.indexOf('let bookmarkLoadRevision'), source.indexOf('async function moveSelected('));
assert.ok(walker && loader, 'The tests must execute the production tree walker and loading functions');

function tree(bookmarkId, title) {
  return [{ id: '0', children: [{
    id: '1', parentId: '0', title: 'Bookmarks Bar',
    children: [{ id: bookmarkId, parentId: '1', title, url: `https://example.com/${bookmarkId}` }]
  }] }];
}

function setup() {
  const pending = [];
  const state = { bookmarks: [], folders: [], selected: new Set() };
  const folderFilter = { innerHTML: '' };
  const rendered = [];
  const context = vm.createContext({
    state,
    chrome: { bookmarks: { getTree: () => new Promise((resolve, reject) => pending.push({ resolve, reject })) } },
    $: selector => { assert.equal(selector, '#folderFilter'); return folderFilter; },
    escapeHtml: String,
    markIssues() {},
    render() { rendered.push(Array.from(state.bookmarks, bookmark => bookmark.id)); },
    checkRestore: async () => {}
  });
  vm.runInContext(walker + '\n' + loader, context);
  return { state, folderFilter, rendered, pending, load: () => context.loadBookmarks(), reload: () => context.reloadBookmarks() };
}

test('a delayed initial load cannot replace the newer Add-dialog refresh', async () => {
  const { state, folderFilter, rendered, pending, load, reload } = setup();
  const initial = load();
  const refresh = reload();
  pending[1].resolve(tree('20', 'New title'));
  await refresh;
  pending[0].resolve(tree('10', 'Stale title'));
  await initial;

  assert.deepEqual(Array.from(state.bookmarks, bookmark => bookmark.id), ['20']);
  assert.deepEqual(Array.from(state.folders, folder => folder.id), ['1']);
  assert.deepEqual(rendered, [['20']]);
  assert.equal((folderFilter.innerHTML.match(/<option\b/g) || []).length, 2, 'One All-folders option and one real folder');
});

test('an older response arriving first is discarded instead of appended to the latest result', async () => {
  const { state, rendered, pending, load, reload } = setup();
  const initial = load();
  const refresh = reload();
  pending[0].resolve(tree('10', 'Old title'));
  await initial;
  assert.equal(rendered.length, 0, 'An obsolete response should not be displayed while the latest load is pending');

  pending[1].resolve(tree('20', 'New title'));
  await refresh;
  assert.deepEqual(Array.from(state.bookmarks, bookmark => bookmark.id), ['20']);
  assert.deepEqual(Array.from(state.folders, folder => folder.id), ['1']);
  assert.deepEqual(rendered, [['20']]);
});

test('a normal subsequent refresh replaces the previous tree and clears selection', async () => {
  const { state, pending, load, reload } = setup();
  const initial = load();
  pending[0].resolve(tree('10', 'Before'));
  await initial;
  state.selected.add('10');

  const refresh = reload();
  pending[1].resolve(tree('20', 'After'));
  await refresh;
  assert.deepEqual(Array.from(state.bookmarks, bookmark => bookmark.id), ['20']);
  assert.deepEqual(Array.from(state.folders, folder => folder.id), ['1']);
  assert.equal(state.selected.size, 0);
});

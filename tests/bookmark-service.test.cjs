const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto').webcrypto;

const source = fs.readFileSync(path.resolve(__dirname, '../extension/scripts/bookmark-service.js'), 'utf8');

function setup() {
  const nodes = new Map([
    ['0', { id: '0', title: '' }],
    ['1', { id: '1', parentId: '0', title: 'Bookmarks Bar', folderType: 'bookmarks-bar' }],
    ['2', { id: '2', parentId: '1', title: 'Research' }],
    ['3', { id: '3', parentId: '1', title: 'Managed', unmodifiable: 'managed' }],
    ['10', { id: '10', parentId: '1', index: 0, title: 'Before', url: 'https://example.com' }]
  ]);
  const calls = [];
  const storage = {};
  const faults = {};
  let nextId = 20;
  const clone = value => structuredClone(value);
  function fail(method, args) {
    calls.push([method, ...clone(args)]);
    const fault = faults[method];
    if (typeof fault === 'function') fault(...args);
    else if (fault) throw new Error(fault);
  }
  function read(id) {
    const node = nodes.get(String(id));
    if (!node) throw new Error('Missing bookmark');
    return clone(node);
  }
  const chrome = {
    bookmarks: {
      async get(id) { fail('get', [id]); return [read(id)]; },
      async getTree() {
        fail('getTree', []);
        return [{ ...read('0'), children: [...nodes.values()].filter(n => n.id !== '0').map(clone) }];
      },
      async create(details) {
        fail('create', [details]);
        read(details.parentId);
        const node = { ...clone(details), id: String(nextId++), index: 0 };
        nodes.set(node.id, node);
        return clone(node);
      },
      async update(id, details) {
        fail('update', [id, details]);
        const node = { ...read(id), ...clone(details) };
        nodes.set(id, node);
        return clone(node);
      },
      async move(id, details) {
        fail('move', [id, details]);
        read(details.parentId);
        const node = { ...read(id), ...clone(details) };
        nodes.set(id, node);
        return clone(node);
      },
      async remove(id) { fail('remove', [id]); read(id); nodes.delete(id); }
    },
    storage: { local: {
      async get(keys) {
        fail('storageGet', [keys]);
        return Object.fromEntries(keys.filter(key => key in storage).map(key => [key, clone(storage[key])]));
      },
      async set(value) { fail('storageSet', [value]); Object.assign(storage, clone(value)); },
      async remove(keys) { fail('storageRemove', [keys]); keys.forEach(key => delete storage[key]); }
    } }
  };
  const context = vm.createContext({ chrome, window: {}, Date, Error, crypto });
  vm.runInContext(source, context);
  return { service: context.window.MarkNestBookmarkService, nodes, calls, storage, faults };
}

test('create uses chosen folder and trimmed title; records undo and remembered destination', async () => {
  const { service, storage, nodes } = setup();
  const result = await service.save({ title: '  Read later  ', url: 'https://openai.com/', parentId: '2' });
  assert.equal(result.bookmark.title, 'Read later');
  assert.equal(result.bookmark.parentId, '2');
  assert.equal(result.undoAvailable, true);
  assert.equal(storage.marknestLastAddFolderId, '2');
  assert.equal(storage.lastActionSnapshot.type, 'add');
  assert.match(storage.lastActionSnapshot.operationId, /^[0-9a-f-]{36}$/);
  await service.undo(storage.lastActionSnapshot);
  assert.equal(nodes.has(result.bookmark.id), false);
});

test('a successful create stays successful if history cannot be saved', async () => {
  const { service, faults, calls, storage } = setup();
  storage.lastActionSnapshot = { type: 'delete', items: [{}] };
  faults.storageSet = 'Quota exceeded';
  const result = await service.save({ title: 'Saved once', url: 'https://example.org', parentId: '1' });
  assert.equal(result.undoAvailable, false);
  assert.equal(result.warning, 'HISTORY_UNAVAILABLE');
  assert.equal(result.bookmark.title, 'Saved once');
  assert.equal(calls.filter(([method]) => method === 'create').length, 1);
  assert.equal(storage.lastActionSnapshot.type, 'delete');
});

test('rename and move produce a reversible edit snapshot', async () => {
  const { service, storage, nodes } = setup();
  const result = await service.save({ id: '10', title: 'After', parentId: '2' });
  assert.equal(result.bookmark.title, 'After');
  assert.equal(result.bookmark.parentId, '2');
  assert.equal(storage.lastActionSnapshot.type, 'edit');
  assert.equal(storage.lastActionSnapshot.items[0].title, 'Before');
  await service.undo(storage.lastActionSnapshot);
  assert.equal(nodes.get('10').title, 'Before');
  assert.equal(nodes.get('10').parentId, '1');
  assert.equal(nodes.get('10').index, 0);
});

test('failed move compensates the preceding rename and leaves history intact', async () => {
  const { service, faults, nodes, storage } = setup();
  storage.lastActionSnapshot = { type: 'add', items: [{ id: '99' }] };
  faults.move = 'Folder unavailable';
  await assert.rejects(service.save({ id: '10', title: 'After', parentId: '2' }), { code: 'EDIT_FAILED' });
  assert.equal(nodes.get('10').title, 'Before');
  assert.equal(nodes.get('10').parentId, '1');
  assert.equal(storage.lastActionSnapshot.items[0].id, '99');
});

test('failed compensation exposes actual state instead of claiming a full rollback', async () => {
  const { service, faults, nodes } = setup();
  faults.move = 'Folder unavailable';
  faults.update = (_id, details) => { if (details.title === 'Before') throw new Error('Rollback unavailable'); };
  await assert.rejects(service.save({ id: '10', title: 'After', parentId: '2' }), error => {
    assert.equal(error.code, 'PARTIAL_EDIT');
    assert.equal(error.bookmark.title, 'After');
    assert.equal(error.bookmark.parentId, '1');
    return true;
  });
  assert.equal(nodes.get('10').title, 'After');
});

test('a rejected first write never triggers rollback writes', async () => {
  const { service, faults, calls } = setup();
  faults.update = 'Permission denied';
  await assert.rejects(service.save({ id: '10', title: 'After', parentId: '2' }), { code: 'EDIT_FAILED' });
  assert.equal(calls.filter(([method]) => method === 'update').length, 1);
  assert.equal(calls.filter(([method]) => method === 'move').length, 0);
});

for (const parentId of ['0', 'missing', '3', '10']) {
  test(`rejects unwritable destination ${parentId} before any bookmark write`, async () => {
    const { service, calls } = setup();
    await assert.rejects(service.save({ title: 'Test', url: 'https://example.org', parentId }), { code: 'INVALID_FOLDER' });
    assert.equal(calls.filter(([method]) => ['create', 'update', 'move'].includes(method)).length, 0);
  });
}

test('rejects an empty title without writing bookmarks', async () => {
  const { service, calls } = setup();
  await assert.rejects(service.save({ title: '  ', url: 'https://example.org', parentId: '1' }), { code: 'INVALID_TITLE' });
  assert.equal(calls.length, 0);
});

test('unchanged edit does not replace prior undo', async () => {
  const { service, calls, storage } = setup();
  storage.lastActionSnapshot = { type: 'add', items: [{ id: '99' }] };
  const result = await service.save({ id: '10', title: 'Before', parentId: '1' });
  assert.equal(result.unchanged, true);
  assert.equal(storage.lastActionSnapshot.items[0].id, '99');
  assert.equal(calls.filter(([method]) => ['update', 'move', 'storageSet'].includes(method)).length, 0);
});

test('undo add is idempotent when the bookmark was already removed', async () => {
  const { service, nodes } = setup();
  nodes.delete('10');
  await service.undo({ type: 'add', items: [{ id: '10' }] });
});

test('undo add does not suppress permission failures or clear history', async () => {
  const { service, faults, storage } = setup();
  faults.remove = 'Permission denied';
  storage.lastActionSnapshot = { type: 'add', items: [{ id: '10' }] };
  await assert.rejects(service.undo(storage.lastActionSnapshot), /Permission denied/);
  assert.equal(storage.lastActionSnapshot.items[0].id, '10');
});

test('undo edit refuses a deleted original folder without partially renaming', async () => {
  const { service, nodes, calls } = setup();
  nodes.get('10').title = 'After';
  await assert.rejects(service.undo({ type: 'edit', items: [{ id: '10', title: 'Before', parentId: 'missing', index: 0 }] }), { code: 'INVALID_FOLDER' });
  assert.equal(nodes.get('10').title, 'After');
  assert.equal(calls.filter(([method]) => method === 'update').length, 0);
});

test('rejects a destination whose managed flag exists only on an ancestor', async () => {
  const { service, nodes, calls } = setup();
  nodes.set('4', { id: '4', parentId: '3', title: 'Unmarked child' });
  nodes.set('5', { id: '5', parentId: '4', title: 'Deep child' });
  await assert.rejects(service.save({ title: 'Test', url: 'https://example.org', parentId: '5' }), { code: 'INVALID_FOLDER' });
  assert.equal(calls.filter(([method]) => ['create', 'update', 'move'].includes(method)).length, 0);
});

test('rejects editing a bookmark under a managed ancestor even if the bookmark is unmarked', async () => {
  const { service, nodes, calls } = setup();
  nodes.set('4', { id: '4', parentId: '3', title: 'Unmarked child' });
  nodes.get('10').parentId = '4';
  await assert.rejects(service.save({ id: '10', title: 'After', parentId: '1' }), { code: 'READ_ONLY' });
  assert.equal(nodes.get('10').title, 'Before');
  assert.equal(calls.filter(([method]) => ['update', 'move'].includes(method)).length, 0);
});

test('rollback preserves a title concurrently changed by another window', async () => {
  const { service, nodes, faults, calls } = setup();
  faults.move = () => {
    nodes.get('10').title = 'External edit';
    throw new Error('Move failed');
  };
  await assert.rejects(service.save({ id: '10', title: 'After', parentId: '2' }), error => {
    assert.equal(error.code, 'PARTIAL_EDIT');
    assert.equal(error.bookmark.title, 'External edit');
    return true;
  });
  assert.equal(nodes.get('10').title, 'External edit');
  assert.equal(calls.filter(([method]) => method === 'update').length, 1);
});

test('rollback preserves a position concurrently changed by another window', async () => {
  const { service, nodes, faults, calls } = setup();
  nodes.set('4', { id: '4', parentId: '1', title: 'External destination' });
  faults.move = () => {
    nodes.get('10').parentId = '4';
    throw new Error('Move failed');
  };
  await assert.rejects(service.save({ id: '10', title: 'After', parentId: '2' }), error => {
    assert.equal(error.code, 'PARTIAL_EDIT');
    assert.equal(error.bookmark.parentId, '4');
    return true;
  });
  assert.equal(nodes.get('10').parentId, '4');
  assert.equal(calls.filter(([method]) => method === 'move').length, 1);
});

test('clearing undo A preserves a newer operation B from another window', async () => {
  const { service, storage, calls } = setup();
  const snapshotA = { type: 'add', operationId: 'operation-a', items: [{ id: '10' }] };
  storage.lastActionSnapshot = { type: 'edit', operationId: 'operation-b', items: [{ id: '20', title: 'Old' }] };
  assert.equal(await service.clearHistory(snapshotA), false);
  assert.equal(storage.lastActionSnapshot.operationId, 'operation-b');
  assert.equal(calls.filter(([method]) => method === 'storageRemove').length, 0);
});

test('clearing a matching operation ID removes only the current undo history', async () => {
  const { service, storage } = setup();
  const snapshot = { type: 'add', operationId: 'operation-a', items: [{ id: '10' }] };
  storage.lastActionSnapshot = structuredClone(snapshot);
  storage.lastDeleteSnapshot = null;
  storage.marknestLastAddFolderId = '2';
  assert.equal(await service.clearHistory(snapshot), true);
  assert.equal(storage.lastActionSnapshot, undefined);
  assert.equal(storage.lastDeleteSnapshot, undefined);
  assert.equal(storage.marknestLastAddFolderId, '2');
});

test('legacy snapshot comparison supports missing delete type and reordered object keys', async () => {
  const { service, storage } = setup();
  const snapshot = { type: 'delete', createdAt: '2026-11-10T00:00:00Z', items: [{ id: '10', title: 'Before', parentId: '1' }] };
  storage.lastDeleteSnapshot = { items: [{ parentId: '1', title: 'Before', id: '10' }], createdAt: snapshot.createdAt };
  assert.equal(await service.clearHistory(snapshot), true);
  assert.equal(storage.lastDeleteSnapshot, undefined);
});

test('legacy snapshot cannot clear a changed or newly identified snapshot', async () => {
  const { service, storage } = setup();
  const snapshot = { type: 'edit', createdAt: 'same-time', items: [{ id: '10', title: 'Before' }] };
  storage.lastActionSnapshot = { ...snapshot, items: [{ id: '10', title: 'Different' }] };
  assert.equal(await service.clearHistory(snapshot), false);
  storage.lastActionSnapshot = { ...snapshot, operationId: 'new-operation' };
  assert.equal(await service.clearHistory(snapshot), false);
  assert.equal(storage.lastActionSnapshot.operationId, 'new-operation');
});

test('failed history write never deletes another window’s newly saved history', async () => {
  const { service, storage, faults, calls } = setup();
  faults.storageSet = () => {
    storage.lastActionSnapshot = { type: 'edit', operationId: 'other-window', items: [{ id: '10', title: 'External' }] };
    throw new Error('Write failed after another window saved');
  };
  const result = await service.save({ title: 'Saved once', url: 'https://example.org', parentId: '1' });
  assert.equal(result.warning, 'HISTORY_UNAVAILABLE');
  assert.equal(storage.lastActionSnapshot.operationId, 'other-window');
  assert.equal(calls.filter(([method]) => method === 'storageRemove').length, 0);
});

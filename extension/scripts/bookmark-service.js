'use strict';

// Shared by the popup and organizer so a saved edit has the same undo behavior.
(() => {
  function failure(code, message, cause, bookmark) {
    const error = new Error(message, cause ? { cause } : undefined);
    error.code = code;
    if (bookmark) error.bookmark = bookmark;
    return error;
  }

  async function read(id) {
    const [node] = await chrome.bookmarks.get(String(id));
    if (!node) throw failure('NOT_FOUND', '收藏已不存在');
    return node;
  }

  async function destination(parentId) {
    if (!parentId || String(parentId) === '0') {
      throw failure('INVALID_FOLDER', '请选择一个可用的文件夹');
    }
    let folder;
    try { folder = await read(parentId); }
    catch (cause) { throw failure('INVALID_FOLDER', '文件夹已不可用，请重新选择', cause); }
    // Some managed trees mark only the ancestor. A writable-looking child
    // must not become a destination merely because its own flag is absent.
    const visited = new Set();
    let ancestor = folder;
    while (ancestor.id !== '0') {
      if (visited.has(ancestor.id) || ancestor.url || ancestor.unmodifiable || ancestor.folderType === 'managed') {
        throw failure('INVALID_FOLDER', '这个文件夹无法保存收藏，请重新选择');
      }
      visited.add(ancestor.id);
      if (!ancestor.parentId || ancestor.parentId === '0') break;
      try { ancestor = await read(ancestor.parentId); }
      catch (cause) { throw failure('INVALID_FOLDER', '文件夹已不可用，请重新选择', cause); }
    }
    return folder;
  }

  async function edit(before, title, parentId, index) {
    let current = before;
    let renamed = false;
    try {
      if (title !== before.title) {
        current = await chrome.bookmarks.update(before.id, { title });
        renamed = true;
      }
      if (parentId !== before.parentId || (Number.isInteger(index) && index !== before.index)) {
        const target = { parentId };
        if (Number.isInteger(index)) target.index = index;
        current = await chrome.bookmarks.move(before.id, target);
      }
      return current;
    } catch (cause) {
      // A failed move must not quietly leave the preceding rename committed.
      // Only compensate a write we know succeeded; a rejected first write
      // must not overwrite an edit made concurrently in another window.
      if (!renamed) throw failure('EDIT_FAILED', '未能保存，请检查文件夹后重试', cause);
      try {
        const actual = await read(before.id);
        const titleStillOurs = actual.title === title || actual.title === before.title;
        const positionUnchanged = actual.parentId === before.parentId && actual.index === before.index;
        if (!titleStillOurs || !positionUnchanged) {
          // The failed move did not commit a known position change. Any new
          // title or position may belong to another window; never undo it.
          throw failure('CONCURRENT_EDIT', '收藏已在其它窗口更改');
        }
        if (actual.title === title) await chrome.bookmarks.update(before.id, { title: before.title });
      } catch (rollbackCause) {
        let actual;
        try { actual = await read(before.id); } catch { /* The bookmark may have been removed. */ }
        throw failure('PARTIAL_EDIT', '部分修改已保存，请检查当前收藏后重试', rollbackCause, actual);
      }
      throw failure('EDIT_FAILED', '未能保存，已恢复原来的收藏', cause);
    }
  }

  async function remember(snapshot, parentId) {
    try {
      // One storage write replaces both legacy and current history together.
      await chrome.storage.local.set({
        lastActionSnapshot: snapshot,
        lastDeleteSnapshot: null,
        marknestLastAddFolderId: parentId
      });
      return true;
    } catch {
      // A bookmark has already been committed. Never report a save failure:
      // retrying a create here would create another bookmark.
      // Leave existing history intact: another window may have stored its
      // own successful operation while this storage write was pending.
      return false;
    }
  }

  async function save({ id, title, url, parentId }) {
    title = String(title || '').trim();
    if (!title) throw failure('INVALID_TITLE', '请输入收藏名称');
    const operationId = crypto.randomUUID();
    const folder = await destination(parentId);
    parentId = folder.id;
    let bookmark;
    let snapshot;
    if (id) {
      let before;
      try { before = await read(id); }
      catch (cause) { throw failure('NOT_FOUND', '这条收藏已不存在，请关闭后重试', cause); }
      if (!before.url || before.unmodifiable) throw failure('READ_ONLY', '这条收藏无法编辑');
      try { await destination(before.parentId); }
      catch (cause) { throw failure('READ_ONLY', '这条收藏无法编辑', cause); }
      if (title === before.title && parentId === before.parentId) {
        return { bookmark: before, undoAvailable: false, unchanged: true };
      }
      bookmark = await edit(before, title, parentId);
      snapshot = {
        type: 'edit', operationId, createdAt: new Date().toISOString(),
        items: [{ id: before.id, title: before.title, parentId: before.parentId, index: before.index }]
      };
    } else {
      url = String(url || '').trim();
      if (!url) throw failure('INVALID_URL', '当前页面无法添加到收藏夹');
      bookmark = await chrome.bookmarks.create({ title, url, parentId });
      snapshot = { type: 'add', operationId, createdAt: new Date().toISOString(), items: [{ id: bookmark.id }] };
    }
    const undoAvailable = await remember(snapshot, parentId);
    return { bookmark, undoAvailable, ...(undoAvailable ? {} : { warning: 'HISTORY_UNAVAILABLE' }) };
  }

  async function absent(id) {
    // Chrome rejects get() for an absent ID and for permission failures.
    // A successful tree read proves absence without matching error strings.
    const tree = await chrome.bookmarks.getTree();
    const contains = nodes => nodes.some(node => node.id === id || (node.children && contains(node.children)));
    return !contains(tree);
  }

  function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
    }
    return value;
  }

  function sameHistory(left, right) {
    if (!left || !right) return false;
    if (left.operationId || right.operationId) {
      return Boolean(left.operationId && left.operationId === right.operationId);
    }
    const legacyIdentity = snapshot => JSON.stringify(canonical({
      type: snapshot.type || 'delete',
      createdAt: snapshot.createdAt || null,
      items: snapshot.items || null,
      tree: snapshot.tree || null
    }));
    return legacyIdentity(left) === legacyIdentity(right);
  }

  async function clearHistory(snapshot) {
    const stored = await chrome.storage.local.get(['lastActionSnapshot', 'lastDeleteSnapshot']);
    const latest = stored.lastActionSnapshot || stored.lastDeleteSnapshot;
    if (!sameHistory(snapshot, latest)) return false;
    // storage.local has no compare-and-swap. Re-read immediately before the
    // delete to preserve a later operation whenever it is already observable.
    await chrome.storage.local.remove(['lastActionSnapshot', 'lastDeleteSnapshot']);
    return true;
  }

  async function undo(snapshot) {
    if (!snapshot || !['add', 'edit'].includes(snapshot.type) || !snapshot.items?.length) {
      throw failure('INVALID_HISTORY', '没有可撤销的收藏操作');
    }
    for (const item of snapshot.items) {
      if (snapshot.type === 'add') {
        try {
          const current = await read(item.id);
          if (!current.url) throw failure('INVALID_HISTORY', '撤销目标不是收藏');
          await chrome.bookmarks.remove(item.id);
        } catch (cause) {
          if (await absent(item.id)) continue;
          throw cause;
        }
      } else {
        await destination(item.parentId);
        const current = await read(item.id);
        if (!current.url || current.unmodifiable) throw failure('READ_ONLY', '这条收藏无法编辑');
        try { await destination(current.parentId); }
        catch (cause) { throw failure('READ_ONLY', '这条收藏无法编辑', cause); }
        await edit(current, item.title, item.parentId, item.index);
      }
    }
    // The caller clears history only after every inverse operation succeeds.
  }

  window.MarkNestBookmarkService = { save, undo, clearHistory };
})();

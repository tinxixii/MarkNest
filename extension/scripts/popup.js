'use strict';

const state = { bookmarks: [], folders: [], filtered: [], selected: new Set(), filter: 'all', folderPath: '', folderPickerOpen:false, folderPickerMode:'filter', folderQuery:'', search: '', lastAddedBookmark:null };
const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' }[char]));
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return '无法识别'; }
}

function normalizedUrl(url) {
  try {
    const value = new URL(url);
    value.hash = '';
    value.hostname = value.hostname.toLowerCase().replace(/^www\./, '');
    if (value.pathname !== '/') value.pathname = value.pathname.replace(/\/+$/, '');
    return value.href;
  } catch { return String(url || '').trim(); }
}

function faviconUrl(pageUrl) {
  try {
    const url = new URL(chrome.runtime.getURL('/_favicon/'));
    url.searchParams.set('pageUrl', pageUrl);
    url.searchParams.set('size', '32');
    return url.toString();
  } catch { return ''; }
}

function walk(nodes, path = [], managed = false) {
  for (const node of nodes) {
    const unmodifiable = managed || Boolean(node.unmodifiable) || node.folderType === 'managed';
    if (node.url) {
      state.bookmarks.push({ id:node.id, parentId:node.parentId, index:node.index, title:node.title || node.url, url:node.url, path:path.join(' / ') || '收藏夹', lastUsed:node.dateLastUsed || null, unmodifiable });
    } else {
      const title = node.title || '收藏夹';
      if (node.id !== '0') state.folders.push({ id:node.id, parentId:node.parentId, title, path:[...path,title].join(' / '), unmodifiable, folderType:node.folderType });
      if (node.children) walk(node.children, node.id === '0' ? path : [...path,title], unmodifiable);
    }
  }
}

function markIssues() {
  const urls = new Map();
  for (const item of state.bookmarks) {
    const url = normalizedUrl(item.url);
    if (!urls.has(url)) urls.set(url, []);
    urls.get(url).push(item);
  }
  const now = Date.now();
  for (const item of state.bookmarks) {
    item.duplicate = urls.get(normalizedUrl(item.url)).length > 1;
    item.daysIdle = item.lastUsed ? Math.floor((now - item.lastUsed) / 86400000) : null;
  }
}

function inFolder(item) { return !state.folderPath || item.path === state.folderPath || item.path.startsWith(`${state.folderPath} /`); }
function matches(item) {
  if (!inFolder(item)) return false;
  if (state.filter === 'duplicates' && !item.duplicate) return false;
  if (state.filter === 'ancient' && !(item.daysIdle !== null && item.daysIdle >= 365)) return false;
  if (state.search && !`${item.title} ${item.url} ${item.path}`.toLowerCase().includes(state.search.toLowerCase())) return false;
  return true;
}

function updateCounts() {
  const scope = state.bookmarks.filter(inFolder);
  $('#totalCount').textContent = scope.length;
  $('#duplicateCount').textContent = scope.filter(item => item.duplicate).length;
  $('#ancientCount').textContent = scope.filter(item => item.daysIdle !== null && item.daysIdle >= 365).length;
  $$('.popup-summary button').forEach(button => button.classList.toggle('active', button.dataset.filter === state.filter));
}

function renderFolderPicker() {
  const query = state.folderQuery.toLowerCase();
  const folders = state.folders.filter(folder => !query || `${folder.title} ${folder.path}`.toLowerCase().includes(query));
  const moving = state.folderPickerMode === 'move';
  $('#bookmarkList').innerHTML = `
    <div class="folder-browser">
      <div class="folder-browser-head">
        <strong>${moving ? '移动到文件夹' : '选择文件夹'}</strong>
        <button type="button" data-close-folder-picker>返回收藏列表</button>
      </div>
      <label class="folder-browser-search"><span class="popup-search-icon" aria-hidden="true"></span><input id="folderSearchInput" type="search" value="${escapeHtml(state.folderQuery)}" placeholder="搜索文件夹"></label>
      ${moving ? '' : `<button type="button" class="folder-option${state.folderPath ? '' : ' active'}" data-folder-path=""><span class="folder-option-icon" aria-hidden="true"></span><span><b>所有文件夹</b><small>查看完整收藏列表</small></span><em>${state.bookmarks.length}</em></button>`}
      ${folders.map(folder => {
        const parts = folder.path.split(' / ');
        const parent = parts.slice(0,-1).join(' / ');
        const count = state.bookmarks.filter(item => item.path === folder.path || item.path.startsWith(`${folder.path} /`)).length;
        return `<button type="button" class="folder-option${!moving && state.folderPath === folder.path ? ' active' : ''}" data-folder-path="${escapeHtml(folder.path)}" data-folder-id="${escapeHtml(folder.id)}"><span class="folder-option-icon" aria-hidden="true"></span><span><b>${escapeHtml(folder.title)}</b><small>${escapeHtml(parent || '顶层文件夹')}</small></span><em>${count}</em></button>`;
      }).join('') || '<div class="folder-browser-empty">没有匹配的文件夹</div>'}
    </div>`;
}

function render() {
  updateCounts();
  state.filtered = state.bookmarks.filter(matches);
  $('#resultCount').textContent = `${state.filtered.length} 项`;
  $('#folderFilter').value = state.folderPath;
  if (state.folderPickerOpen) {
    renderFolderPicker();
    renderSelection();
    return;
  }
  $('#bookmarkList').innerHTML = state.filtered.length ? state.filtered.map(item => `
    <article class="popup-row${state.selected.has(item.id) ? ' selected' : ''}">
      <input class="row-check" type="checkbox" data-id="${escapeHtml(item.id)}" ${state.selected.has(item.id) ? 'checked' : ''} aria-label="选择 ${escapeHtml(item.title)}">
      <div class="popup-row-main">
        <span class="popup-favicon-shell"><img class="popup-favicon" src="${escapeHtml(faviconUrl(item.url))}" alt="" loading="lazy"></span>
        <div class="popup-row-copy" translate="no">
          <a class="popup-title" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</a>
          <div class="popup-meta"><span class="popup-domain">${escapeHtml(hostOf(item.url))}</span><span>·</span><span class="popup-path" title="${escapeHtml(item.path)}"><svg class="popup-folder-glyph" viewBox="0 0 22 18" aria-hidden="true"><path d="M2 5.5V4.2c0-1.2 1-2.2 2.2-2.2h4.1l2.1 2.3h7.4c1.2 0 2.2 1 2.2 2.2v8.3c0 1.2-1 2.2-2.2 2.2H4.2C3 17 2 16 2 14.8V5.5Z"/></svg><span class="popup-path-text">${escapeHtml(item.path)}</span></span></div>
        </div>
      </div>
      ${item.unmodifiable ? '' : `<button class="row-edit" type="button" data-edit-bookmark="${escapeHtml(item.id)}" aria-label="编辑收藏" title="编辑收藏"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 5 4 4M4 20l4.5-1L20 7.5a2.8 2.8 0 0 0-4-4L4.5 15Z"/></svg></button>`}
    </article>`).join('') : `<div class="popup-empty"><div><strong>没有匹配的收藏</strong><span>换个关键词、文件夹或筛选条件试试。</span></div></div>`;
  renderSelection();
}

function renderSelection() {
  const count = state.selected.size;
  $('#selectionBar').hidden = count === 0;
  $('.popup-shell').classList.toggle('has-selection', count > 0);
  $('#selectedCount').textContent = count;
}

function syncRowSelection(row, checkbox) {
  const selected = state.selected.has(checkbox.dataset.id);
  checkbox.checked = selected;
  row.classList.toggle('selected', selected);
  renderSelection();
}

let bookmarkLoadRevision = 0;
async function loadBookmarks() {
  const revision = ++bookmarkLoadRevision;
  const tree = await chrome.bookmarks.getTree();
  if (revision !== bookmarkLoadRevision) return;
  state.bookmarks = [];
  state.folders = [];
  walk(tree);
  markIssues();
  $('#folderFilter').innerHTML = '<option value="">所有文件夹</option>' + state.folders.map(folder => `<option value="${escapeHtml(folder.path)}" translate="no">${escapeHtml(folder.path)}</option>`).join('');
  render();
  await checkRestore();
}

async function reloadBookmarks() {
  state.selected.clear();
  await loadBookmarks();
}

async function moveSelected(target) {
  if (!target) return;
  const items = state.bookmarks.filter(item => state.selected.has(item.id));
  await chrome.storage.local.remove('lastDeleteSnapshot');
  await chrome.storage.local.set({
    lastActionSnapshot: {
      type:'move',
      createdAt:new Date().toISOString(),
      items:items.map(({id,parentId,index,title}) => ({id,parentId,index,title}))
    }
  });
  for (const id of state.selected) await chrome.bookmarks.move(id, { parentId:target });
  await reloadBookmarks();
}

async function deleteSelected() {
  const items = state.bookmarks.filter(item => state.selected.has(item.id));
  await chrome.storage.local.remove('lastDeleteSnapshot');
  await chrome.storage.local.set({ lastActionSnapshot:{ type:'delete', createdAt:new Date().toISOString(), items:items.map(({title,url,parentId,index,path}) => ({title,url,parentId,index,path})) } });
  for (const item of items) await chrome.bookmarks.remove(item.id);
  state.bookmarks = state.bookmarks.filter(item => !state.selected.has(item.id));
  state.selected.clear();
  $('#confirmDialog').hidden = true;
  markIssues();
  render();
  await checkRestore();
}

async function ensureRestoredFolder() {
  const existing = state.folders.find(folder => folder.title === '已恢复');
  if (existing) return existing.id;
  const folder = await chrome.bookmarks.create({ parentId:'1', title:'已恢复' });
  return folder.id;
}

async function restoreTreeNode(node, parentId) {
  const details = { parentId, title:node.title };
  if (node.url) details.url = node.url;
  if (Number.isInteger(node.index)) details.index = node.index;
  let restored;
  try { restored = await chrome.bookmarks.create(details); }
  catch { delete details.index; restored = await chrome.bookmarks.create(details); }
  for (const child of node.children || []) await restoreTreeNode(child, restored.id);
}

async function checkRestore() {
  const stored = await chrome.storage.local.get(['lastActionSnapshot','lastDeleteSnapshot']);
  const snapshot = stored.lastActionSnapshot || stored.lastDeleteSnapshot;
  const available = snapshot?.type === 'deleteTree' ? Boolean(snapshot.tree) : Boolean(snapshot?.items?.length);
  $('#addBookmarkBtn').textContent = '添加';
  $('#undoBtn').hidden = !available;
  $('#undoBtn').classList.toggle('undo-hidden', !available);
  $('#undoBtn').disabled = !available;
  $('#undoBtn').textContent = '撤销';
  const label = snapshot?.type === 'edit' ? '撤销编辑' : snapshot?.type === 'add' ? '撤销添加' : snapshot?.type === 'move' ? '撤销移动' : '撤销删除';
  $('#undoBtn').title = label;
  $('#undoBtn').setAttribute('aria-label', label);
  MarkNestI18n.apply($('#undoBtn'));
}

let toastTimer;
function hideToastLater() {
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('#popupToast').hidden = true; }, 6500);
}
function showToast(message, withEdit = false, withUndo = false) {
  const toast = $('#popupToast');
  $('#popupToastText').textContent = message;
  $('#editAddedBtn').hidden = !withEdit;
  $('#undoToastBtn').hidden = !withUndo;
  toast.hidden = false;
  MarkNestI18n.apply(toast);
  hideToastLater();
}

let undoInProgress = false;
async function restoreLastAction(expectedId) {
  if (undoInProgress) return;
  undoInProgress = true;
  $('#undoBtn').disabled = true;
  $('#undoToastBtn').disabled = true;
  try {
    await performRestoreLastAction(expectedId);
  } catch {
    showToast('撤销失败，请重试');
  } finally {
    undoInProgress = false;
    $('#undoToastBtn').disabled = false;
    await checkRestore().catch(() => {});
  }
}
async function performRestoreLastAction(expectedId) {
  const stored = await chrome.storage.local.get(['lastActionSnapshot','lastDeleteSnapshot']);
  const snapshot = stored.lastActionSnapshot || (stored.lastDeleteSnapshot ? { ...stored.lastDeleteSnapshot, type:'delete' } : null);
  if (!snapshot) return;
  if (expectedId && !snapshot.items?.some(item => item.id === expectedId)) { showToast('操作记录已更新，请使用顶部撤销'); return; }
  const restoringAddedBookmark = snapshot.type === 'add';
  if (snapshot.type === 'move' || snapshot.type === 'folderMove') {
    for (const item of [...snapshot.items].sort((a,b) => a.index - b.index)) {
      try { await chrome.bookmarks.move(item.id, { parentId:item.parentId, index:item.index }); } catch { /* Item or folder no longer exists. */ }
    }
  } else if (snapshot.type === 'add' || snapshot.type === 'edit') {
    await MarkNestBookmarkService.undo(snapshot);
  } else if (snapshot.type === 'deleteTree' && snapshot.tree) {
    let parentId = snapshot.tree.parentId;
    try { await chrome.bookmarks.get(parentId); } catch { parentId = await ensureRestoredFolder(); }
    await restoreTreeNode(snapshot.tree, parentId);
  } else {
    for (const item of snapshot.items || []) {
      try { await chrome.bookmarks.create({ parentId:item.parentId, title:item.title, url:item.url, index:item.index }); }
      catch { await chrome.bookmarks.create({ parentId:await ensureRestoredFolder(), title:item.title, url:item.url }); }
    }
  }
  await MarkNestBookmarkService.clearHistory(snapshot);
  if (restoringAddedBookmark) {
    state.lastAddedBookmark = null;
    window.MarkNestEditor?.close();
    showToast('已撤销添加');
  }
  if (snapshot.type === 'edit') showToast('已撤销编辑');
  await reloadBookmarks();
}

async function openWorkspace() {
  await chrome.tabs.create({ url:chrome.runtime.getURL('index.html') });
  window.close();
}

$('.popup-summary').addEventListener('click', event => { const button=event.target.closest('[data-filter]'); if (!button) return; state.filter=button.dataset.filter; state.folderPickerOpen=false; state.selected.clear(); render(); });
$('#searchInput').addEventListener('input', event => { state.search=event.target.value.trim(); state.selected.clear(); render(); });
$('#folderFilter').addEventListener('change', event => { state.folderPath=event.target.value; state.folderPickerOpen=false; state.selected.clear(); render(); });
$('#bookmarkList').addEventListener('click', async event => {
  const edit = event.target.closest('[data-edit-bookmark]');
  if (edit) { await MarkNestEditor.openExisting(edit.dataset.editBookmark); return; }
  if (event.target.closest('[data-close-folder-picker]')) { state.folderPickerOpen=false; state.folderQuery=''; render(); return; }
  const folder = event.target.closest('[data-folder-path]');
  if (folder) {
    if (state.folderPickerMode === 'move') {
      await moveSelected(folder.dataset.folderId);
      state.folderPickerOpen=false;
      state.folderPickerMode='filter';
      state.folderQuery='';
      render();
      return;
    }
    state.folderPath=folder.dataset.folderPath || '';
    state.folderPickerOpen=false;
    state.folderQuery='';
    state.filter='all';
    state.selected.clear();
    render();
    return;
  }
  const row=event.target.closest('.popup-row');
  if (!row || event.target.closest('a,input,button,select')) return;
  const box=row.querySelector('.row-check');
  if (!box) return;
  if (state.selected.has(box.dataset.id)) state.selected.delete(box.dataset.id);
  else state.selected.add(box.dataset.id);
  syncRowSelection(row, box);
});
$('#bookmarkList').addEventListener('input', event => {
  if (!event.target.matches('#folderSearchInput')) return;
  state.folderQuery=event.target.value;
  renderFolderPicker();
  const input=$('#folderSearchInput');
  input.focus();
  input.setSelectionRange(input.value.length,input.value.length);
});
$('#bookmarkList').addEventListener('change', event => { const box=event.target.closest('.row-check'); if (!box) return; if (box.checked) state.selected.add(box.dataset.id); else state.selected.delete(box.dataset.id); syncRowSelection(box.closest('.popup-row'), box); });
$('#bookmarkList').addEventListener('error', event => { if (event.target.matches('.popup-favicon')) event.target.classList.add('failed'); }, true);
$('#movePickerBtn').addEventListener('click', () => { state.folderPickerOpen=true; state.folderPickerMode='move'; state.folderQuery=''; render(); });
$('#deleteBtn').addEventListener('click', () => { $('#confirmText').textContent=`将删除 ${state.selected.size} 个收藏，可通过顶部“撤销”恢复。`; $('#confirmDialog').hidden=false; });
$('#cancelDeleteBtn').addEventListener('click', () => { $('#confirmDialog').hidden=true; });
$('#confirmDeleteBtn').addEventListener('click', deleteSelected);
$('#undoBtn').addEventListener('click', () => restoreLastAction());
$('#openWorkspaceBtn').addEventListener('click', openWorkspace);
$('#addBookmarkBtn').addEventListener('click', () => MarkNestEditor.openNew());
$('#editAddedBtn').addEventListener('click', () => { if (state.lastAddedBookmark) MarkNestEditor.openExisting(state.lastAddedBookmark.id); });
$('#undoToastBtn').addEventListener('click', () => restoreLastAction(state.lastAddedBookmark?.id));
$('#popupToast').addEventListener('mouseenter', () => clearTimeout(toastTimer));
$('#popupToast').addEventListener('mouseleave', hideToastLater);
$('#popupToast').addEventListener('focusin', () => clearTimeout(toastTimer));
$('#popupToast').addEventListener('focusout', hideToastLater);

MarkNestI18n.ready.then(() => MarkNestI18n.apply());

loadBookmarks().catch(() => { $('#bookmarkList').innerHTML='<div class="popup-empty"><div><strong>读取失败</strong><span>请在扩展管理页确认收藏权限。</span></div></div>'; });

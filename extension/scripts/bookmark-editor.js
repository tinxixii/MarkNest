'use strict';

// One editor for new bookmarks and existing ones. Nothing is written until Save.
(() => {
  const dialog = $('#bookmarkEditor');
  let draft = null;
  let opening = false;
  let saving = false;
  let browseId = '0';
  let returnFocus = null;
  let returnBookmarkId = null;

  const writableFolders = () => state.folders.filter(folder => !folder.unmodifiable);
  const folderById = id => writableFolders().find(folder => folder.id === id);
  const translate = root => MarkNestI18n.apply(root || dialog);

  function setError(message) {
    $('#editorError').textContent = message;
    $('#editorError').hidden = !message;
    $('#bookmarkTitle').setAttribute('aria-invalid', String(message === '请输入收藏名称'));
    translate($('#editorError'));
  }

  function renderDestination() {
    const folder = folderById(draft?.parentId);
    $('#chosenFolderName').textContent = folder?.title || '选择文件夹';
    $('#chosenFolderName').setAttribute('translate', folder ? 'no' : 'yes');
    const parent = folderById(folder?.parentId);
    $('#chosenFolderPath').textContent = parent?.path || (folder ? '顶层文件夹' : '请选择保存位置');
    $('#chosenFolderPath').setAttribute('translate', parent ? 'no' : 'yes');
    $('#chooseFolderBtn').title = folder?.path || '';
  }

  function renderFolders() {
    const query = $('#editorFolderSearch').value.trim().toLocaleLowerCase();
    const folders = writableFolders();
    const trail = [];
    const seen = new Set();
    let current = folderById(browseId);
    while (current && !seen.has(current.id)) {
      trail.unshift(current);
      seen.add(current.id);
      current = folderById(current.parentId);
    }
    $('#editorBreadcrumbs').innerHTML = `<button class="crumb" type="button" data-browse-folder="0">全部文件夹</button>${trail.map(folder => `<span aria-hidden="true">/</span><button class="crumb" type="button" data-browse-folder="${escapeHtml(folder.id)}" translate="no">${escapeHtml(folder.title)}</button>`).join('')}`;
    $('#editorBreadcrumbs').hidden = Boolean(query);
    const visible = folders.filter(folder => query
      ? folder.path.toLocaleLowerCase().includes(query)
      : (folder.parentId || '0') === browseId);
    $('#editorFolderResults').innerHTML = visible.map(folder => {
      const selected = draft.parentId === folder.id;
      const hasChildren = folders.some(child => child.parentId === folder.id);
      const parent = folderById(folder.parentId);
      return `<div class="destination-row${selected ? ' selected' : ''}">
        <button type="button" class="destination-select" data-user-title data-select-folder="${escapeHtml(folder.id)}" aria-pressed="${selected}" title="${escapeHtml(folder.path)}">
          <span class="folder-option-icon" aria-hidden="true"></span>
          <span class="destination-copy"><b translate="no">${escapeHtml(folder.title)}</b><small${parent ? ' translate="no"' : ''}>${escapeHtml(parent?.path || '顶层文件夹')}</small></span>
        </button>
        ${hasChildren ? `<button class="destination-drill" type="button" data-browse-folder="${escapeHtml(folder.id)}" aria-label="打开子文件夹" title="打开子文件夹"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m7 4 6 6-6 6"/></svg></button>` : ''}
      </div>`;
    }).join('') || '<div class="folder-browser-empty">没有匹配的文件夹</div>';
    translate($('#editorFolderPanel'));
  }

  function toggleFolders(open) {
    $('#editorFolderPanel').hidden = !open;
    $('#chooseFolderBtn').setAttribute('aria-expanded', String(open));
    dialog.classList.toggle('choosing-folder', open);
    if (open) {
      $('#editorFolderSearch').value = '';
      browseId = folderById(draft.parentId)?.parentId || '0';
      if (browseId !== '0' && !folderById(browseId)) browseId = '0';
      renderFolders();
      $('#editorFolderSearch').focus();
    } else if (dialog.open) {
      $('#chooseFolderBtn').focus();
    }
  }

  function restoreFocus() {
    const rowButton = returnBookmarkId ? $(`[data-edit-bookmark="${CSS.escape(returnBookmarkId)}"]`) : null;
    const target = rowButton || (returnFocus?.isConnected && returnFocus !== document.body && !returnFocus.closest('[hidden]') ? returnFocus : $('#addBookmarkBtn'));
    target.focus();
  }

  function close() {
    if (saving) return;
    dialog.close();
    draft = null;
    restoreFocus();
  }

  function present(bookmark, alreadySaved = false, focusBookmarkId = null) {
    draft = { ...bookmark };
    returnFocus = document.activeElement;
    returnBookmarkId = focusBookmarkId;
    $('#editorHeading').textContent = draft.id ? '编辑收藏' : '收藏当前页面';
    $('#editorHint').textContent = alreadySaved ? '这个页面已经收藏，可以直接修改。' : '起个好找的名字，放到合适的位置。';
    $('#bookmarkTitle').value = draft.title;
    $('#editorDomain').textContent = hostOf(draft.url);
    $('#editorUrl').textContent = draft.url;
    $('#editorUrl').title = draft.url;
    $('#editorFavicon').src = faviconUrl(draft.url);
    $('#editorFavicon').hidden = false;
    $('#editorFields').disabled = false;
    $('#saveBookmarkBtn').textContent = draft.id ? '保存修改' : '保存书签';
    $('#editorFolderPanel').hidden = true;
    $('#chooseFolderBtn').setAttribute('aria-expanded', 'false');
    dialog.classList.remove('choosing-folder');
    $('#popupToast').hidden = true;
    setError('');
    renderDestination();
    translate();
    if (!dialog.open) dialog.showModal();
    $('#bookmarkTitle').focus();
    $('#bookmarkTitle').select();
  }

  async function readExisting(id, alreadySaved = false, focusBookmarkId = null) {
    const [bookmark] = await chrome.bookmarks.get(id);
    if (!bookmark?.url || bookmark.unmodifiable || state.bookmarks.find(item => item.id === id)?.unmodifiable) {
      showToast('这条收藏已移除或无法编辑');
      return;
    }
    present(bookmark, alreadySaved, focusBookmarkId);
  }

  async function openExisting(id) {
    if (opening || saving) return;
    opening = true;
    try {
      await reloadBookmarks();
      await readExisting(id, false, id);
    } catch {
      showToast('这条收藏已移除或无法编辑');
    } finally { opening = false; }
  }

  async function openNew() {
    if (opening || saving) return;
    opening = true;
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = tab?.url?.trim();
      if (!url || !/^(https?|file|ftp):/i.test(url)) {
        showToast('当前页面无法添加到收藏夹');
        return;
      }
      await reloadBookmarks();
      const existing = state.bookmarks.find(item => item.url === url && !item.unmodifiable);
      if (existing) { await readExisting(existing.id, true); return; }
      const stored = await chrome.storage.local.get('marknestLastAddFolderId');
      const folders = writableFolders();
      const target = folders.find(folder => folder.path === state.folderPath)
        || folderById(stored.marknestLastAddFolderId)
        || folders.find(folder => folder.folderType === 'bookmarks-bar')
        || folderById('1') || folders[0];
      present({ title: tab.title?.trim() || hostOf(url), url, parentId: target?.id || '' });
    } catch {
      showToast('无法读取当前页面，请重新打开插件');
    } finally { opening = false; }
  }

  async function submit(event) {
    event.preventDefault();
    if (saving || !draft) return;
    const title = $('#bookmarkTitle').value.trim();
    if (!title) {
      setError('请输入收藏名称');
      $('#bookmarkTitle').focus();
      return;
    }
    if (!folderById(draft.parentId)) {
      setError('请选择有效的保存位置');
      toggleFolders(true);
      return;
    }
    saving = true;
    setError('');
    $('#editorFields').disabled = true;
    $('#saveBookmarkBtn').textContent = '正在保存…';
    dialog.setAttribute('aria-busy', 'true');
    translate();
    let result;
    try {
      result = await MarkNestBookmarkService.save({ ...draft, title });
    } catch (error) {
      const messages = {
        INVALID_TITLE: '请输入收藏名称',
        NOT_FOUND: '这条收藏已移除或无法编辑',
        INVALID_FOLDER: '这个文件夹已不可用，请重新选择',
        READ_ONLY: '此收藏或文件夹为只读，请选择其他位置',
        INVALID_URL: '当前页面无法添加到收藏夹',
        PARTIAL_EDIT: '修改未完全完成，请检查名称和位置后重试'
      };
      setError(messages[error.code] || '保存失败，你的输入已保留，请重试');
      if (error.code === 'INVALID_FOLDER') {
        await reloadBookmarks().catch(() => {});
        renderDestination();
      }
    } finally {
      saving = false;
      $('#editorFields').disabled = false;
      dialog.removeAttribute('aria-busy');
      $('#saveBookmarkBtn').textContent = draft?.id ? '保存修改' : '保存书签';
      translate();
    }
    if (!result) return;
    const folder = folderById(result.bookmark.parentId);
    state.lastAddedBookmark = result.bookmark;
    close();
    let refreshed = true;
    await reloadBookmarks().catch(() => { refreshed = false; });
    restoreFocus();
    if (!refreshed) showToast('已保存，请重新打开插件刷新列表', true, result.undoAvailable);
    else if (result.unchanged) showToast('收藏没有变化', true);
    else if (!result.undoAvailable) showToast('已保存，暂时无法记录撤销', true);
    else showToast(`已保存到：${folder?.path || ''}`, true, true);
    const row = $(`[data-edit-bookmark="${CSS.escape(result.bookmark.id)}"]`)?.closest('.popup-row');
    row?.classList.add('just-saved');
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  $('#bookmarkForm').addEventListener('submit', submit);
  $('#cancelEditorBtn').addEventListener('click', close);
  $('#closeEditorBtn').addEventListener('click', close);
  $('#chooseFolderBtn').addEventListener('click', () => toggleFolders($('#editorFolderPanel').hidden));
  $('#closeFolderPickerBtn').addEventListener('click', () => toggleFolders(false));
  $('#editorFolderSearch').addEventListener('input', renderFolders);
  $('#editorFavicon').addEventListener('error', () => { $('#editorFavicon').hidden = true; });
  $('#editorFolderPanel').addEventListener('click', event => {
    const selected = event.target.closest('[data-select-folder]');
    const browse = event.target.closest('[data-browse-folder]');
    if (selected) {
      draft.parentId = selected.dataset.selectFolder;
      renderDestination();
      setError('');
      toggleFolders(false);
      translate();
    } else if (browse) {
      browseId = browse.dataset.browseFolder;
      $('#editorFolderSearch').value = '';
      renderFolders();
      $('#editorFolderResults').scrollTop = 0;
      $('#editorFolderResults button')?.focus();
    }
  });
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    if (saving) return;
    if (!$('#editorFolderPanel').hidden) toggleFolders(false);
    else close();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      if (saving) return;
      if (!$('#editorFolderPanel').hidden) toggleFolders(false);
      else close();
      return;
    }
    if (event.key === 'Enter' && event.target.id === 'editorFolderSearch') {
      event.preventDefault();
      $('#editorFolderResults [data-select-folder]')?.focus();
    }
  });
  window.MarkNestEditor = { openNew, openExisting, close };
})();

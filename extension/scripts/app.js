'use strict';

const ANCIENT_DAYS = 365;
const LOOSE_BOOKMARKS_FILTER = '__loose_bookmarks__';

const state = {
  bookmarks: [],
  folders: [],
  filtered: [],
  selected: new Set(),
  filter: 'all',
  dateFilter: 'all',
  dateSort: 'desc',
  folderFilter: '',
  search: '',
  collapsedDomains: new Set(),
  collapsedFolders: new Set(),
  collapsedFolderSections: new Set(),
  pendingFolderDelete: null,
  linkHealth: {},
  compare: {
    fileName: '',
    fileCount: 0,
    missing: [],
    changed: [],
    shared: [],
    extra: [],
    selected: new Set(),
    activeTab: 'missing'
  },
  scanned: false
};

const $ = selector => document.querySelector(selector);
const $$ = selector => Array.from(document.querySelectorAll(selector));
const customSelectControls = new Map();

// Rendered controls are often populated after the initial locale pass.  Translate
// the affected subtree immediately so a modal never mixes its old and new locale.
function translateUi(root = document) {
  window.MarkNestI18n?.apply?.(root);
}

function closeAllCustomSelects(exceptSelect = null) {
  let closed = false;
  customSelectControls.forEach(control => {
    if (exceptSelect && control.select === exceptSelect) return;
    if (!control.isOpen()) return;
    control.close();
    closed = true;
  });
  return closed;
}

function syncCustomSelect(selectOrSelector) {
  const select = typeof selectOrSelector === 'string' ? $(selectOrSelector) : selectOrSelector;
  customSelectControls.get(select)?.sync();
}

function enhanceCustomSelect(select, options = {}) {
  if (!select || customSelectControls.has(select)) return customSelectControls.get(select);
  const host = select.parentElement;
  if (!host) return null;
  const wrapper = document.createElement('div');
  wrapper.className = `custom-select ${options.wrapperClass || ''}`.trim();
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = `custom-select-trigger ${options.triggerClass || ''}`.trim();
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  const label = document.createElement('span');
  label.className = 'custom-select-label';
  const caret = document.createElement('span');
  caret.className = 'custom-select-caret';
  caret.setAttribute('aria-hidden', 'true');
  trigger.append(label, caret);
  const menu = document.createElement('div');
  menu.className = `custom-select-menu ${options.menuClass || ''}`.trim();
  menu.setAttribute('role', 'listbox');

  select.classList.add('custom-select-native');
  host.classList.add('enhanced');
  select.insertAdjacentElement('afterend', wrapper);
  wrapper.append(select, trigger, menu);

  let optionButtons = [];

  function buildOptions() {
    menu.textContent = '';
    optionButtons = Array.from(select.options).map((option, index) => {
      const optionButton = document.createElement('button');
      optionButton.type = 'button';
      optionButton.className = 'custom-select-option';
      optionButton.dataset.value = option.value;
      optionButton.setAttribute('role', 'option');
      optionButton.setAttribute('aria-selected', option.selected ? 'true' : 'false');
      optionButton.disabled = option.disabled;
      optionButton.tabIndex = -1;
      const check = document.createElement('span');
      check.className = 'custom-select-check';
      check.setAttribute('aria-hidden', 'true');
      check.textContent = '✓';
      const text = document.createElement('span');
      text.className = 'custom-select-option-label';
      text.textContent = option.textContent.trim();
      optionButton.append(check, text);
      optionButton.addEventListener('click', () => {
        if (option.disabled) return;
        if (select.value !== option.value) {
          select.value = option.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          sync();
        }
        close(true);
      });
      optionButton.addEventListener('keydown', event => {
        const currentIndex = optionButtons.indexOf(optionButton);
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          optionButtons[(currentIndex + 1) % optionButtons.length]?.focus();
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          optionButtons[(currentIndex - 1 + optionButtons.length) % optionButtons.length]?.focus();
        } else if (event.key === 'Home') {
          event.preventDefault();
          optionButtons[0]?.focus();
        } else if (event.key === 'End') {
          event.preventDefault();
          optionButtons[optionButtons.length - 1]?.focus();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          close(true);
        } else if (event.key === 'Tab') {
          close();
        }
      });
      menu.append(optionButton);
      return optionButton;
    });
  }

  function updatePlacement() {
    wrapper.classList.remove('open-up', 'open-right');
    const triggerRect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const spaceRight = window.innerWidth - triggerRect.right;
    const spaceLeft = triggerRect.left;
    const menuHeight = Math.min(menu.scrollHeight || menuRect.height || 0, Math.round(window.innerHeight * 0.5));
    const menuWidth = Math.min(menu.scrollWidth || menuRect.width || 0, window.innerWidth - 24);
    const preferOpenDown = wrapper.classList.contains('prefer-open-down');
    const shouldOpenUp = preferOpenDown
      ? (spaceBelow < Math.min(menuHeight + 12, 140) && spaceAbove > spaceBelow)
      : (spaceBelow < menuHeight + 12 && spaceAbove > spaceBelow);
    if (shouldOpenUp) wrapper.classList.add('open-up');
    if (spaceRight < menuWidth && spaceLeft > spaceRight) wrapper.classList.add('open-right');
  }

  function sync() {
    buildOptions();
    const selectedOption = select.selectedOptions[0] || select.options[0];
    label.textContent = selectedOption?.textContent.trim() || '';
    trigger.setAttribute('aria-label', select.getAttribute('aria-label') || '');
    optionButtons.forEach(button => {
      const selected = button.dataset.value === select.value;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
  }

  function open() {
    closeAllCustomSelects(select);
    sync();
    wrapper.classList.add('open');
    host.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
    updatePlacement();
    requestAnimationFrame(() => {
      const selectedButton = optionButtons.find(button => button.dataset.value === select.value && !button.disabled);
      (selectedButton || optionButtons.find(button => !button.disabled))?.focus();
    });
  }

  function close(focusTrigger = false) {
    wrapper.classList.remove('open', 'open-up', 'open-right');
    host.classList.remove('open');
    trigger.setAttribute('aria-expanded', 'false');
    if (focusTrigger) trigger.focus();
  }

  trigger.addEventListener('click', event => {
    event.stopPropagation();
    if (wrapper.classList.contains('open')) close();
    else open();
  });
  trigger.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      open();
    } else if (event.key === 'Escape') {
      close();
    }
  });
  select.addEventListener('change', sync);
  new MutationObserver(sync).observe(select, { subtree: true, childList: true, characterData: true, attributes: true });

  const control = { select, sync, close, isOpen: () => wrapper.classList.contains('open') };
  customSelectControls.set(select, control);
  sync();
  return control;
}

function initializeCustomSelects() {
  enhanceCustomSelect($('#languageSelect'));
  enhanceCustomSelect($('#dateFilter'), { wrapperClass: 'prefer-open-down' });
  enhanceCustomSelect($('#statusFilter'), { wrapperClass: 'prefer-open-down' });
}

function chromeDate(ms) {
  return typeof ms === 'number' ? new Date(ms) : null;
}

function daysSince(date) {
  if (!date) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function normalizeUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    for (const key of [...parsed.searchParams.keys()]) {
      if (/^(utm_|ref$|source$|fbclid$|gclid$|yclid$|mc_cid$|mc_eid$)/i.test(key)) parsed.searchParams.delete(key);
    }
    parsed.searchParams.sort();
    if (parsed.pathname !== '/') parsed.pathname = parsed.pathname.replace(/\/$/, '');
    return parsed.toString();
  } catch {
    return url || '';
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '无法识别的网址';
  }
}

function faviconUrl(pageUrl) {
  try {
    const url = new URL(chrome.runtime.getURL('/_favicon/'));
    url.searchParams.set('pageUrl', pageUrl);
    url.searchParams.set('size', '32');
    return url.toString();
  } catch {
    return '';
  }
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[char]));
}

const IMPORT_ROOT_NAMES = new Set([
  '收藏夹', '收藏栏', '书签栏', '其他书签', '移动设备书签', '书签菜单',
  'bookmarks', 'bookmarks bar', 'bookmarks toolbar', 'bookmarks menu',
  'other bookmarks', 'mobile bookmarks', 'favorites', 'favourites'
]);

function cleanImportedPath(parts) {
  const cleaned = parts.map(part => part.trim()).filter(Boolean);
  while (cleaned.length && IMPORT_ROOT_NAMES.has(cleaned[0].toLowerCase())) cleaned.shift();
  return cleaned;
}

function folderNameForDl(dl) {
  const directHeading = Array.from(dl.children).find(child => child.tagName === 'H3');
  if (directHeading) return directHeading.textContent.trim();
  const parentHeading = dl.parentElement?.tagName === 'DT'
    ? Array.from(dl.parentElement.children).find(child => child.tagName === 'H3')
    : null;
  if (parentHeading) return parentHeading.textContent.trim();
  let sibling = dl.previousElementSibling;
  while (sibling && sibling.tagName === 'P') sibling = sibling.previousElementSibling;
  const siblingHeading = sibling?.tagName === 'H3' ? sibling : sibling?.querySelector?.(':scope > h3');
  return siblingHeading?.textContent?.trim() || '';
}

function importedPathForLink(link) {
  const parts = [];
  let dl = link.closest('dl');
  while (dl) {
    const title = folderNameForDl(dl);
    if (title) parts.unshift(title);
    dl = dl.parentElement?.closest('dl') || null;
  }
  return cleanImportedPath(parts);
}

function parseBookmarkHtml(text) {
  const documentNode = new DOMParser().parseFromString(text, 'text/html');
  const parsed = [];
  for (const link of documentNode.querySelectorAll('a[href]')) {
    const url = link.getAttribute('href')?.trim() || '';
    if (!url || /^(javascript|data):/i.test(url)) continue;
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) continue;
    const addDate = Number(link.getAttribute('add_date'));
    const pathParts = importedPathForLink(link);
    parsed.push({
      title: link.textContent.trim() || url,
      url,
      normalizedUrl,
      pathParts,
      path: pathParts.join(' / ') || '未分类',
      dateAdded: Number.isFinite(addDate) && addDate > 0 ? new Date(addDate * 1000) : null
    });
  }
  const unique = new Map();
  for (const bookmark of parsed) if (!unique.has(bookmark.normalizedUrl)) unique.set(bookmark.normalizedUrl, bookmark);
  return { items: [...unique.values()], rawCount: parsed.length };
}

function comparablePath(path) {
  return cleanImportedPath(String(path || '').split(' / ')).join(' / ').toLowerCase();
}

function compareImportedBookmarks(fileName, parsed) {
  const chromeByUrl = new Map();
  for (const bookmark of state.bookmarks) {
    if (!chromeByUrl.has(bookmark.normalizedUrl)) chromeByUrl.set(bookmark.normalizedUrl, bookmark);
  }
  const importedByUrl = new Map(parsed.items.map(item => [item.normalizedUrl, item]));
  const missing = [];
  const changed = [];
  const shared = [];
  for (const source of parsed.items) {
    const target = chromeByUrl.get(source.normalizedUrl);
    if (!target) {
      missing.push(source);
      continue;
    }
    const differences = [];
    if (source.title.trim() !== target.title.trim()) differences.push('名称不同');
    if (comparablePath(source.path) !== comparablePath(target.path)) differences.push('文件夹不同');
    if (differences.length) changed.push({ source, target, differences });
    else shared.push({ source, target });
  }
  const extra = [...chromeByUrl.values()].filter(item => !importedByUrl.has(item.normalizedUrl));
  state.compare = {
    fileName,
    fileCount: parsed.rawCount,
    missing,
    changed,
    shared,
    extra,
    selected: new Set(missing.map(item => item.normalizedUrl)),
    activeTab: 'missing'
  };
  renderCompareResults();
}

function walkTree(nodes, folders, bookmarks, folderStack = []) {
  for (const node of nodes) {
    if (node.url) {
      bookmarks.push({
        id: node.id,
        parentId: node.parentId,
        index: node.index,
        title: node.title || node.url,
        url: node.url,
        normalizedUrl: normalizeUrl(node.url),
        dateAdded: chromeDate(node.dateAdded),
        dateLastUsedRaw: node.dateLastUsed,
        path: folderStack.join(' / ') || '收藏夹'
      });
      continue;
    }

    const title = node.title || '收藏夹';
    if (node.id !== '0') {
      folders.push({
        id: node.id,
        parentId: node.parentId,
        index: node.index,
        title,
        path: [...folderStack, title].join(' / ')
      });
    }

    if (node.children) {
      walkTree(
        node.children,
        folders,
        bookmarks,
        node.id === '0' ? folderStack : [...folderStack, title]
      );
    }
  }
}

function isLooseBookmark(bookmark) {
  const parentFolder = state.folders.find(folder => folder.id === bookmark.parentId);
  return !parentFolder || parentFolder.parentId === '0';
}

async function enrichBookmark(bookmark) {
  const visitTime = bookmark.dateLastUsedRaw;
  const lastOpened = chromeDate(visitTime);
  return {
    ...bookmark,
    lastOpened,
    daysIdle: daysSince(lastOpened),
    isDuplicate: false
  };
}

function markDomainDuplicates(bookmarks) {
  const groups = new Map();
  for (const bookmark of bookmarks) {
    const domain = hostOf(bookmark.url);
    if (!groups.has(domain)) groups.set(domain, []);
    groups.get(domain).push(bookmark);
  }

  for (const [domain, group] of groups) {
    if (group.length < 2) continue;
    group.sort((a, b) => {
      const aUsed = a.lastOpened?.getTime() || a.dateAdded?.getTime() || 0;
      const bUsed = b.lastOpened?.getTime() || b.dateAdded?.getTime() || 0;
      return bUsed - aUsed;
    });
    group.forEach(bookmark => {
      bookmark.isDomainGroup = true;
      bookmark.groupDomain = domain;
      bookmark.isDuplicate = true;
    });
  }
  return bookmarks;
}

async function scanBookmarks() {
  const storedData = await chrome.storage.local.get('linkHealth');
  setScanning(true);

  try {
    const tree = await chrome.bookmarks.getTree();
    const folders = [];
    const bookmarks = [];
    walkTree(tree, folders, bookmarks);

    state.linkHealth = storedData.linkHealth || {};
    state.bookmarks = markDomainDuplicates(await Promise.all(bookmarks.map(enrichBookmark))).sort(sortForReview);
    for (const bookmark of state.bookmarks) bookmark.linkHealth = state.linkHealth[bookmark.id] || null;
    state.folders = folders;
    if (state.folderFilter && state.folderFilter !== LOOSE_BOOKMARKS_FILTER && !folders.some(folder => folder.path === state.folderFilter)) state.folderFilter = '';
    state.selected.clear();
    state.scanned = true;
    chooseUsefulDefaultFilter();
    renderEverything();
    showWorkspace();
    showToast(`扫描完成，共找到 ${state.bookmarks.length} 个收藏`);
  } catch (error) {
    console.error(error);
    showToast('扫描失败，请在扩展管理页确认权限后重试');
  } finally {
    setScanning(false);
  }
}

function sortForReview(a, b) {
  if (a.isDuplicate !== b.isDuplicate) return a.isDuplicate ? -1 : 1;
  const aDays = a.daysIdle === null ? Number.MAX_SAFE_INTEGER : a.daysIdle;
  const bDays = b.daysIdle === null ? Number.MAX_SAFE_INTEGER : b.daysIdle;
  return bDays - aDays;
}

function chooseUsefulDefaultFilter() {
  state.filter = 'all';
}

function setScanning(scanning) {
  if ($('#startBtn')) {
    $('#startBtn').disabled = scanning;
    $('#startBtn').innerHTML = scanning ? '正在扫描，请稍候…' : '开始扫描收藏夹 <span aria-hidden="true">→</span>';
  }
  $('#scanBtn').disabled = scanning;
  $('#scanBtn').textContent = scanning ? '扫描中…' : '重新扫描';
}

function showWorkspace() {
  if ($('#welcome')) $('#welcome').hidden = true;
  if ($('#workspace')) $('#workspace').hidden = false;
}

function matchesIssueFilter(bookmark) {
  if (state.filter === 'duplicates' && !bookmark.isDomainGroup) return false;
  if (state.filter === 'ancient' && !(bookmark.daysIdle !== null && bookmark.daysIdle >= ANCIENT_DAYS)) return false;
  if (state.filter === 'broken' && bookmark.linkHealth?.status !== 'broken') return false;
  return true;
}

function matchesSearch(bookmark) {
  if (state.search) {
    const haystack = `${bookmark.title} ${bookmark.url} ${bookmark.path} ${hostOf(bookmark.url)}`.toLowerCase();
    if (!haystack.includes(state.search.toLowerCase())) return false;
  }
  return true;
}

function bookmarkYear(bookmark) {
  return bookmark.dateAdded instanceof Date && !Number.isNaN(bookmark.dateAdded.getTime())
    ? bookmark.dateAdded.getFullYear()
    : null;
}

function matchesDateFilter(bookmark) {
  if (state.dateFilter === 'all') return true;
  const year = bookmarkYear(bookmark);
  if (state.dateFilter === 'unknown') return year === null;
  if (state.dateFilter.startsWith('year:')) return year === Number(state.dateFilter.slice(5));
  if (state.dateFilter.startsWith('before:')) {
    const threshold = Number(state.dateFilter.slice(7));
    return year !== null && year <= threshold;
  }
  return true;
}

function passesFilter(bookmark) {
  if (!matchesIssueFilter(bookmark) || !matchesSearch(bookmark) || !matchesDateFilter(bookmark)) return false;
  if (state.folderFilter === LOOSE_BOOKMARKS_FILTER) return isLooseBookmark(bookmark);
  if (state.folderFilter && bookmark.path !== state.folderFilter && !bookmark.path.startsWith(`${state.folderFilter} /`)) return false;
  return true;
}

function renderEverything() {
  renderCounts();
  renderFolders();
  renderFolderTree();
  renderList();
  renderSelection();
  checkRestore();
  translateUi();
}

function renderCounts() {
  const scope = bookmarksInFolder(state.folderFilter);
  const total = scope.length;
  const duplicates = scope.filter(item => item.isDuplicate).length;
  const ancient = scope.filter(item => item.daysIdle !== null && item.daysIdle >= ANCIENT_DAYS).length;
  $('#quickCountAll').textContent = total;
  $('#quickCountDuplicates').textContent = duplicates;
  $('#quickCountAncient').textContent = ancient;
  const globalTotal = state.bookmarks.length;
  $('#scanSummary').textContent = state.folderFilter
    ? `${total} 个收藏`
    : `${globalTotal} 个收藏`;

  const years = [...new Set(scope.map(bookmarkYear).filter(year => year !== null))].sort((a, b) => b - a);
  const select = $('#dateFilter');
  const previousValue = state.dateFilter;
  const options = [{ value: 'all', label: '全部时间' }];
  if (years.length <= 4) {
    years.forEach(year => options.push({ value: `year:${year}`, label: String(year) }));
  } else {
    years.slice(0, 3).forEach(year => options.push({ value: `year:${year}`, label: String(year) }));
    options.push({ value: `before:${years[3]}`, label: `${years[3]} 及更早` });
  }
  if (scope.some(bookmark => bookmarkYear(bookmark) === null)) options.push({ value: 'unknown', label: '无记录' });
  select.innerHTML = options.map(option => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`).join('');
  if (options.some(option => option.value === previousValue)) state.dateFilter = previousValue;
  else state.dateFilter = 'all';
  select.value = state.dateFilter;
  syncCustomSelect(select);

  if (['all', 'duplicates', 'ancient', 'broken'].includes(state.filter)) {
    $('#statusFilter').value = state.filter;
    syncCustomSelect('#statusFilter');
  }
  $$('#folderQuickFilters [data-folder-issue]').forEach(button => {
    button.classList.toggle('active', button.dataset.folderIssue === state.filter);
  });
}

function renderFolders() {
  const target = $('#targetFolder');
  const previous = target.value;
  const options = state.folders
    .filter(folder => folder.id !== '0')
    .map(folder => `<option value="${escapeHtml(folder.id)}">${escapeHtml(folder.path)}</option>`)
    .join('');
  target.innerHTML = '<option value="">选择文件夹</option>' + options;
  if (state.folders.some(folder => folder.id === previous)) target.value = previous;
  const parentSelect = $('#newFolderParent');
  if (parentSelect) {
    const previousParent = parentSelect.value;
    parentSelect.innerHTML = options;
    if (state.folders.some(folder => folder.id === previousParent)) parentSelect.value = previousParent;
  }
  const compareTarget = $('#compareTargetFolder');
  if (compareTarget) {
    const previousCompareTarget = compareTarget.value;
    compareTarget.innerHTML = options;
    const preferred = state.folders.find(folder => folder.parentId === '0' && /书签栏|bookmarks bar/i.test(folder.title))
      || state.folders.find(folder => folder.parentId === '0')
      || state.folders[0];
    if (state.folders.some(folder => folder.id === previousCompareTarget)) compareTarget.value = previousCompareTarget;
    else if (preferred) compareTarget.value = preferred.id;
  }
}

async function openCompareDialog() {
  if (!state.scanned) await scanBookmarks();
  document.body.classList.add('modal-open');
  $('#compareDialog').hidden = false;
  renderCompareResults();
  setTimeout(() => (state.compare.fileName ? $('#closeCompareBtn') : $('#chooseCompareFileBtn')).focus(), 0);
}

function closeCompareDialog() {
  $('#compareDialog').hidden = true;
  document.body.classList.remove('modal-open');
}

function chooseCompareFile() {
  $('#compareFileInput').value = '';
  $('#compareFileInput').click();
}

async function loadCompareFile(file) {
  if (!file) return;
  if (file.size > 20 * 1024 * 1024) {
    showToast('文件超过 20MB，请确认是否为书签 HTML');
    return;
  }
  try {
    const parsed = parseBookmarkHtml(await file.text());
    if (!parsed.items.length) {
      showToast('没有读取到书签，请选择浏览器导出的 HTML 文件');
      return;
    }
    compareImportedBookmarks(file.name, parsed);
  } catch (error) {
    console.error(error);
    showToast('书签文件读取失败，请更换文件重试');
  }
}

function activeCompareItems() {
  return state.compare[state.compare.activeTab] || [];
}

function compareRowData(entry) {
  if (state.compare.activeTab === 'missing') return { bookmark: entry, detail: entry.path, note: '可导入' };
  if (state.compare.activeTab === 'extra') return { bookmark: entry, detail: entry.path, note: '仅在 Chrome' };
  if (state.compare.activeTab === 'changed') {
    return {
      bookmark: entry.source,
      detail: `文件：${entry.source.path} · Chrome：${entry.target.path}`,
      note: entry.differences.join('、')
    };
  }
  return { bookmark: entry.source, detail: entry.source.path, note: '两边都有' };
}

function renderCompareResults() {
  const hasFile = Boolean(state.compare.fileName);
  $('.compare-dialog-card').classList.toggle('has-results', hasFile);
  $('#compareUpload').hidden = hasFile;
  $('#compareResults').hidden = !hasFile;
  if (!hasFile) return;

  $('#compareFileName').textContent = state.compare.fileName;
  $('#compareFileMeta').textContent = `文件中读取 ${state.compare.fileCount} 条，按网址去重后 ${state.compare.missing.length + state.compare.changed.length + state.compare.shared.length} 条`;
  $('#compareMissingCount').textContent = state.compare.missing.length;
  $('#compareChangedCount').textContent = state.compare.changed.length;
  $('#compareSharedCount').textContent = state.compare.shared.length;
  $('#compareExtraCount').textContent = state.compare.extra.length;
  $$('#compareTabs [data-compare-tab]').forEach(button => button.classList.toggle('active', button.dataset.compareTab === state.compare.activeTab));

  const canSelect = state.compare.activeTab === 'missing';
  $('#compareSelectAllLabel').hidden = !canSelect;
  $('#compareListHint').textContent = canSelect
    ? '这些网址尚未存在于 Chrome，可选择导入'
    : state.compare.activeTab === 'changed'
      ? '网址相同，但名称或所在文件夹不同'
      : state.compare.activeTab === 'shared'
        ? '名称、网址和文件夹均一致'
        : '这些网址只存在于当前 Chrome 收藏夹';
  const list = $('#compareList');
  const items = activeCompareItems();
  if (!items.length) {
    list.innerHTML = '<div class="compare-empty"><span>✓</span><strong>这一组没有内容</strong></div>';
  } else {
    list.innerHTML = items.map((entry, index) => {
      const { bookmark, detail, note } = compareRowData(entry);
      const checked = canSelect && state.compare.selected.has(bookmark.normalizedUrl);
      return `
        <article class="compare-row${checked ? ' selected' : ''}" data-compare-index="${index}">
          ${canSelect ? `<input class="compare-row-check" type="checkbox" data-url="${escapeHtml(bookmark.normalizedUrl)}" ${checked ? 'checked' : ''} aria-label="选择 ${escapeHtml(bookmark.title)}">` : '<span class="compare-row-spacer"></span>'}
          <span class="compare-favicon-shell"><img src="${escapeHtml(faviconUrl(bookmark.url))}" alt="" loading="lazy"></span>
          <div class="compare-row-copy"><a href="${escapeHtml(bookmark.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(bookmark.title)}</a><span>${escapeHtml(detail)}</span></div>
          <em>${escapeHtml(note)}</em>
        </article>
      `;
    }).join('');
  }
  const allSelected = state.compare.missing.length > 0 && state.compare.missing.every(item => state.compare.selected.has(item.normalizedUrl));
  $('#compareSelectAll').checked = allSelected;
  $('#compareSelectAll').indeterminate = !allSelected && state.compare.selected.size > 0;
  $('#importComparedBtn').disabled = state.compare.selected.size === 0;
  $('#importComparedBtn').textContent = state.compare.selected.size ? `导入所选 ${state.compare.selected.size} 项` : '导入所选';
  $('#compareTargetFolder').closest('label').hidden = !canSelect;
  $('#preserveCompareFolders').closest('label').hidden = !canSelect;
  $('#importComparedBtn').hidden = !canSelect;
  translateUi($('#compareDialog'));
}

async function ensureImportedFolder(parentId, parts, cache) {
  let currentId = parentId;
  for (const title of parts) {
    const key = `${currentId}\u0000${title}`;
    if (cache.has(key)) {
      currentId = cache.get(key);
      continue;
    }
    const children = await chrome.bookmarks.getChildren(currentId);
    let folder = children.find(child => !child.url && child.title === title);
    if (!folder) folder = await chrome.bookmarks.create({ parentId: currentId, title });
    cache.set(key, folder.id);
    currentId = folder.id;
  }
  return currentId;
}

async function importComparedBookmarks() {
  const selected = state.compare.missing.filter(item => state.compare.selected.has(item.normalizedUrl));
  const rootId = $('#compareTargetFolder').value;
  if (!selected.length || !rootId) return;
  const button = $('#importComparedBtn');
  const preserveFolders = $('#preserveCompareFolders').checked;
  const cache = new Map();
  button.disabled = true;
  button.textContent = '正在导入…';
  let imported = 0;
  try {
    for (const item of selected) {
      const parentId = preserveFolders
        ? await ensureImportedFolder(rootId, cleanImportedPath(item.pathParts), cache)
        : rootId;
      await chrome.bookmarks.create({ parentId, title: item.title, url: item.url });
      imported += 1;
    }
    closeCompareDialog();
    state.compare.fileName = '';
    state.compare.selected.clear();
    await scanBookmarks();
    showToast(`已导入 ${imported} 个新收藏`);
  } catch (error) {
    console.error(error);
    showToast(`已导入 ${imported} 个，其余项目导入失败`);
    renderCompareResults();
  } finally {
    button.disabled = false;
  }
}

function preferredNewFolderParent() {
  const active = state.folders.find(folder => folder.path === state.folderFilter);
  if (active) return active;
  return state.folders.find(folder => folder.parentId === '0' && /书签栏|bookmarks bar/i.test(folder.title))
    || state.folders.find(folder => folder.parentId === '0')
    || state.folders[0];
}

function openNewFolderDialog(event) {
  event?.stopPropagation();
  const parent = preferredNewFolderParent();
  if (parent) $('#newFolderParent').value = parent.id;
  $('#newFolderName').value = '';
  $('#newFolderDialog').hidden = false;
  setTimeout(() => $('#newFolderName').focus(), 0);
}

function closeNewFolderDialog() {
  $('#newFolderDialog').hidden = true;
}

async function createNewFolder() {
  const title = $('#newFolderName').value.trim();
  const parentId = $('#newFolderParent').value;
  if (!title) {
    $('#newFolderName').focus();
    return;
  }
  if (title.includes('/')) {
    showToast('文件夹名称不能包含“/”');
    return;
  }
  const parent = state.folders.find(folder => folder.id === parentId);
  if (!parent) {
    showToast('请选择上级文件夹');
    return;
  }
  $('#confirmNewFolderBtn').disabled = true;
  try {
    const children = await chrome.bookmarks.getChildren(parentId);
    let folder = children.find(child => !child.url && child.title === title);
    const existed = Boolean(folder);
    if (!folder) folder = await chrome.bookmarks.create({ parentId, title });
    const newPath = `${parent.path} / ${title}`;
    closeNewFolderDialog();
    await scanBookmarks();
    state.folderFilter = newPath;
    state.filter = 'all';
    renderEverything();
    showToast(existed ? `“${title}”已存在` : `已创建“${title}”`);
  } catch (error) {
    console.error(error);
    showToast('新建文件夹失败');
  } finally {
    $('#confirmNewFolderBtn').disabled = false;
  }
}

function bookmarksInFolder(path) {
  if (!path) return state.bookmarks;
  if (path === LOOSE_BOOKMARKS_FILTER) return state.bookmarks.filter(isLooseBookmark);
  return state.bookmarks.filter(bookmark => bookmark.path === path || bookmark.path.startsWith(`${path} /`));
}

function renderFolderTree() {
  const tree = $('#folderTree');
  if (!tree) return;
  if (state.folderFilter && state.folderFilter !== LOOSE_BOOKMARKS_FILTER && !state.folders.some(folder => folder.path === state.folderFilter)) state.folderFilter = '';

  const allActive = state.folderFilter === '' ? ' active' : '';
  const matchingInFolder = path => bookmarksInFolder(path).filter(bookmark => matchesIssueFilter(bookmark) && matchesSearch(bookmark));
  const filterLabels = { duplicates: '同站页面', ancient: '一年未打开', broken: '失效链接', all: '全部收藏' };
  const rows = [`
    <button class="folder-tree-button${allActive}" data-folder-filter="" style="--depth: 0">
      <span class="tree-disclosure-placeholder" aria-hidden="true"></span>
      <span class="tree-folder" aria-hidden="true"></span>
      <span class="tree-name">全部文件夹</span>
      <span class="tree-count">${state.bookmarks.length}</span>
      <span class="tree-drag-placeholder" aria-hidden="true"></span>
    </button>
  `];

  const looseBookmarks = bookmarksInFolder(LOOSE_BOOKMARKS_FILTER);
  if (looseBookmarks.length) {
    const active = state.folderFilter === LOOSE_BOOKMARKS_FILTER ? ' active' : '';
    rows.push(`
      <button class="folder-tree-button loose-bookmarks${active}" data-folder-filter="${LOOSE_BOOKMARKS_FILTER}" style="--depth: 0" title="直接保存在书签栏或其他书签根目录的收藏">
        <span class="tree-disclosure-placeholder" aria-hidden="true"></span>
        <span class="tree-bookmark" aria-hidden="true"></span>
        <span class="tree-name">未归入子文件夹</span>
        <span class="tree-count">${looseBookmarks.length}</span>
        <span class="tree-drag-placeholder" aria-hidden="true"></span>
      </button>
    `);
  }

  const childrenByParent = new Map();
  for (const folder of state.folders) {
    if (!childrenByParent.has(folder.parentId)) childrenByParent.set(folder.parentId, []);
    childrenByParent.get(folder.parentId).push(folder);
  }
  for (const children of childrenByParent.values()) children.sort((a, b) => (a.index ?? 0) - (b.index ?? 0));

  const appendFolder = (folder, depth) => {
    const children = childrenByParent.get(folder.id) || [];
    const hasChildren = children.length > 0;
    const collapsed = state.collapsedFolders.has(folder.id);
    const count = bookmarksInFolder(folder.path).length;
    const active = folder.path === state.folderFilter ? ' active' : '';
    const movable = folder.parentId !== '0';
    rows.push(`
      <button class="folder-tree-button${active}${hasChildren ? ' has-children' : ''}${collapsed ? ' collapsed' : ''}" data-folder-filter="${escapeHtml(folder.path)}" data-folder-id="${escapeHtml(folder.id)}" style="--depth: ${depth}" title="${escapeHtml(folder.path)}">
        ${hasChildren
          ? `<span class="tree-disclosure" data-toggle-folder="${escapeHtml(folder.id)}" role="button" aria-label="${collapsed ? '展开' : '折叠'} ${escapeHtml(folder.title)}" aria-expanded="${!collapsed}"><i></i></span>`
          : '<span class="tree-disclosure-placeholder" aria-hidden="true"></span>'}
        <span class="tree-folder" aria-hidden="true"></span>
        <span class="tree-name">${escapeHtml(folder.title)}</span>
        <span class="tree-count">${count}</span>
        ${movable ? '<span class="tree-drag-handle" draggable="true" title="拖动调整顺序或层级" aria-label="拖动文件夹">⠿</span>' : '<span class="tree-drag-placeholder" aria-hidden="true"></span>'}
      </button>
    `);
    if (!collapsed) for (const child of children) appendFolder(child, depth + 1);
  };
  for (const rootFolder of childrenByParent.get('0') || []) appendFolder(rootFolder, 0);

  tree.innerHTML = rows.join('');
  const totalCount = bookmarksInFolder(state.folderFilter).length;
  const matchingCount = matchingInFolder(state.folderFilter).length;
  const activeFolder = state.folders.find(folder => folder.path === state.folderFilter);
  $('#activeFolderName').textContent = state.folderFilter === LOOSE_BOOKMARKS_FILTER
    ? '未归入子文件夹'
    : state.folderFilter || '全部文件夹';
  if ($('#activeFolderHint')) {
    $('#activeFolderHint').textContent = state.folderFilter
      ? `当前匹配 ${matchingCount} 个 / 文件夹共 ${totalCount} 个（包含子文件夹）`
      : `当前“${filterLabels[state.filter] || '筛选'}”共 ${matchingCount} 个`;
  }
  $('#folderTreeScope').textContent = '点击文件夹直接查看全部';
  const canDeleteFolder = activeFolder && activeFolder.parentId !== '0';
  $('#deleteFolderBtn').hidden = !canDeleteFolder;
  if (canDeleteFolder) $('#deleteFolderBtn').dataset.folderId = activeFolder.id;
}

let linkCheckController = null;
const LINK_CHECK_ORIGINS = ['http://*/*', 'https://*/*'];

async function fetchLinkHeaders(url, method, parentSignal) {
  const controller = new AbortController();
  const abortFromParent = () => controller.abort();
  parentSignal.addEventListener('abort', abortFromParent, { once: true });
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    return await fetch(url, {
      method,
      redirect: 'follow',
      cache: 'no-store',
      credentials: 'omit',
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
    parentSignal.removeEventListener('abort', abortFromParent);
  }
}

function linkResult(response, checkedAt) {
  if (response.status >= 200 && response.status < 400) {
    return { status: 'ok', httpStatus: response.status, checkedAt };
  }
  if (response.status === 404 || response.status === 410) {
    return { status: 'broken', httpStatus: response.status, checkedAt };
  }
  return { status: 'unknown', httpStatus: response.status, checkedAt };
}

async function probeBookmarkLink(bookmark, signal) {
  const checkedAt = new Date().toISOString();
  if (!/^https?:\/\//i.test(bookmark.url)) return { status: 'unknown', checkedAt, reason: '不支持检测此类地址' };
  let headResponse;
  try {
    headResponse = await fetchLinkHeaders(bookmark.url, 'HEAD', signal);
    if (headResponse.status >= 200 && headResponse.status < 400) return linkResult(headResponse, checkedAt);
  } catch (error) {
    if (signal.aborted) throw error;
  }
  try {
    const getResponse = await fetchLinkHeaders(bookmark.url, 'GET', signal);
    getResponse.body?.cancel().catch(() => {});
    return linkResult(getResponse, checkedAt);
  } catch (error) {
    if (signal.aborted) throw error;
    return { status: 'unknown', checkedAt, reason: '网络错误或网站拒绝检测' };
  }
}

async function checkAllLinks() {
  if (linkCheckController) {
    linkCheckController.abort();
    return;
  }
  if (!state.scanned) {
    showToast('请先扫描收藏夹');
    return;
  }
  let granted = false;
  try {
    granted = await chrome.permissions.contains({ origins: LINK_CHECK_ORIGINS });
  } catch (error) {
    console.error(error);
  }
  if (!granted) {
    openLinkPermissionDialog();
    return;
  }

  await runLinkCheck();
}

function openLinkPermissionDialog() {
  $('#linkPermissionTitle').textContent = '允许检查收藏链接？';
  $('#linkPermissionText').textContent = '需要访问收藏中的网站，才能判断链接是否仍可打开。仅检查响应状态，不保存页面内容。';
  $('#grantLinkPermissionBtn').textContent = '允许并检查';
  $('#openExtensionSettingsBtn').hidden = true;
  $('#linkPermissionDialog').hidden = false;
}

function closeLinkPermissionDialog() {
  $('#linkPermissionDialog').hidden = true;
}

async function requestLinkPermissionAndCheck() {
  let granted = false;
  try {
    granted = await chrome.permissions.request({ origins: LINK_CHECK_ORIGINS });
  } catch (error) {
    console.error(error);
  }
  if (!granted) {
    $('#linkPermissionTitle').textContent = '还没有获得访问权限';
    $('#linkPermissionText').textContent = '请允许 MarkNest 访问网站，或在扩展设置的“网站访问权限”中开启后再试。';
    $('#grantLinkPermissionBtn').textContent = '重新授权';
    $('#openExtensionSettingsBtn').hidden = false;
    return;
  }
  closeLinkPermissionDialog();
  await runLinkCheck();
}

async function openExtensionSettings() {
  try {
    await chrome.tabs.create({ url: `chrome://extensions/?id=${chrome.runtime.id}` });
  } catch (error) {
    console.error(error);
    showToast('请打开 chrome://extensions 并进入 MarkNest 详情页');
  }
}

async function runLinkCheck() {

  const controller = new AbortController();
  linkCheckController = controller;
  const button = $('#checkLinksBtn');
  const items = [...state.bookmarks];
  const health = { ...state.linkHealth };
  let cursor = 0;
  let completed = 0;
  let broken = 0;
  let unknown = 0;
  button.classList.add('checking');
  button.textContent = `停止检查 · 0/${items.length}`;

  const worker = async () => {
    while (!controller.signal.aborted) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      const bookmark = items[index];
      try {
        const result = await probeBookmarkLink(bookmark, controller.signal);
        health[bookmark.id] = result;
        bookmark.linkHealth = result;
        if (result.status === 'broken') broken += 1;
        if (result.status === 'unknown') unknown += 1;
      } catch {
        if (!controller.signal.aborted) unknown += 1;
      }
      completed += 1;
      button.textContent = `停止检查 · ${completed}/${items.length}`;
    }
  };

  try {
    await Promise.all(Array.from({ length: Math.min(6, items.length || 1) }, worker));
    state.linkHealth = health;
    await chrome.storage.local.set({ linkHealth: health });
    if (controller.signal.aborted) {
      showToast(`已停止检查，完成 ${completed}/${items.length}`);
    } else {
      if (broken) {
        state.folderFilter = '';
        state.filter = 'broken';
      }
      renderEverything();
      showToast(broken ? `发现 ${broken} 个失效链接，${unknown} 个无法确认` : `没有发现明确失效链接，${unknown} 个无法确认`);
    }
  } finally {
    if (linkCheckController === controller) linkCheckController = null;
    button.classList.remove('checking');
    button.textContent = '检查链接';
  }
}

function reasonFor(bookmark) {
  if (state.filter === 'broken' && bookmark.linkHealth?.status === 'broken') {
    const status = bookmark.linkHealth.httpStatus ? `HTTP ${bookmark.linkHealth.httpStatus}` : '无法访问';
    return { label: `链接失效 · ${status}`, className: 'broken' };
  }
  if (state.filter === 'duplicates' && bookmark.isDuplicate) {
    return { label: '同站页面', className: 'duplicate' };
  }
  if (state.filter === 'ancient' && bookmark.daysIdle !== null && bookmark.daysIdle >= ANCIENT_DAYS) {
    return { label: '一年未打开', className: '' };
  }
  if (bookmark.linkHealth?.status === 'broken') {
    const status = bookmark.linkHealth.httpStatus ? `HTTP ${bookmark.linkHealth.httpStatus}` : '无法访问';
    return { label: `链接失效 · ${status}`, className: 'broken' };
  }
  if (bookmark.isDuplicate) return { label: '同站页面', className: 'duplicate' };
  if (bookmark.daysIdle !== null && bookmark.daysIdle >= ANCIENT_DAYS) return { label: '一年未打开', className: '' };
  return { label: '—', className: 'quiet' };
}

function formatBookmarkDate(date) {
  if (!date || Number.isNaN(date.getTime())) return '时间未知';
  return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date).replaceAll('/', '-');
}

function renderList() {
  state.filtered = state.bookmarks.filter(passesFilter);
  state.filtered.sort((a, b) => {
    const aTime = a.dateAdded?.getTime();
    const bTime = b.dateAdded?.getTime();
    if (!aTime && !bTime) return 0;
    if (!aTime) return 1;
    if (!bTime) return -1;
    return state.dateSort === 'asc' ? aTime - bTime : bTime - aTime;
  });
  $('#dateSortIcon').textContent = state.dateSort === 'asc' ? '↑' : '↓';
  $('#dateSortBtn').setAttribute('aria-label', state.dateSort === 'asc' ? '按收藏时间从旧到新排序' : '按收藏时间从新到旧排序');
  const list = $('#bookmarkList');
  const panel = $('#bookmarkPanel');
  const isEmpty = state.filtered.length === 0;
  panel.classList.toggle('is-empty', isEmpty);
  $('#selectAll').closest('.select-all').hidden = isEmpty;
  list.classList.toggle('grouped-list', state.filter === 'duplicates');
  $('#visibleCount').textContent = state.filter === 'duplicates'
    ? new Set(state.filtered.map(item => item.groupDomain)).size
    : state.filtered.length;

  if (isEmpty) {
    const isSearch = Boolean(state.search);
    const isFolder = Boolean(state.folderFilter);
    const isDateFilter = state.dateFilter !== 'all';
    const emptyCopy = state.filter === 'broken'
      ? ['没有发现失效链接', '当前范围内的链接暂未发现明确失效。']
      : state.filter === 'duplicates'
        ? ['没有同站页面', '当前范围内没有需要处理的同站页面。']
        : state.filter === 'ancient'
          ? ['没有一年未打开的收藏', '当前范围内没有超过一年未打开的收藏。']
          : isDateFilter
            ? ['这个年份下没有收藏', '可以切换到其他年份，或回到全部时间。']
            : ['这里还没有收藏', '可以切换文件夹，或重新扫描收藏夹。'];
    list.innerHTML = `
      <div class="empty-state">
        <div>
          <span class="empty-state-mark">${isSearch ? '⌕' : '✓'}</span>
          <h2>${isSearch ? '没有找到匹配的收藏' : isFolder && state.filter === 'all' ? '这个文件夹还没有收藏' : emptyCopy[0]}</h2>
          <p>${isSearch ? '换个关键词试试。' : isFolder && state.filter === 'all' ? '可以在左侧切换到其他文件夹。' : emptyCopy[1]}</p>
        </div>
      </div>
    `;
    return;
  }

  if (state.filter === 'duplicates') {
    list.innerHTML = renderDomainGroups(state.filtered);
    return;
  }

  if (state.folderFilter && state.folderFilter !== LOOSE_BOOKMARKS_FILTER) {
    list.innerHTML = renderFolderSections(state.filtered);
    return;
  }

  list.innerHTML = state.filtered.map(bookmark => renderBookmarkRow(bookmark)).join('');
}

function renderBookmarkRow(bookmark) {
    const checked = state.selected.has(bookmark.id) ? 'checked' : '';
    const selected = checked ? ' selected' : '';
    const reason = reasonFor(bookmark);
    const dateLabel = formatBookmarkDate(bookmark.dateAdded);
    return `
      <article class="bookmark-row${selected}" data-id="${escapeHtml(bookmark.id)}" data-bookmark-id="${escapeHtml(bookmark.id)}" draggable="true">
        <input type="checkbox" class="row-check" data-id="${escapeHtml(bookmark.id)}" ${checked} aria-label="选择 ${escapeHtml(bookmark.title)}">
        <div class="bookmark-copy">
          <span class="bookmark-favicon-shell"><img class="bookmark-favicon" src="${escapeHtml(faviconUrl(bookmark.url))}" alt="" loading="lazy" draggable="false"></span>
          <div class="bookmark-name-stack">
            <a class="bookmark-title" href="${escapeHtml(bookmark.url)}" target="_blank" rel="noopener noreferrer" draggable="false">${escapeHtml(bookmark.title)}</a>
            <span class="bookmark-url-tooltip" role="tooltip">${escapeHtml(bookmark.url)}</span>
          </div>
        </div>
        <time class="bookmark-date" datetime="${bookmark.dateAdded ? bookmark.dateAdded.toISOString() : ''}">${escapeHtml(dateLabel)}</time>
        <span class="reason ${reason.className}">${reason.label}</span>
      </article>
    `;
}

function renderDomainGroups(bookmarks) {
  const groups = new Map();
  for (const bookmark of bookmarks) {
    if (!groups.has(bookmark.groupDomain)) groups.set(bookmark.groupDomain, []);
    groups.get(bookmark.groupDomain).push(bookmark);
  }

  return [...groups.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([domain, items]) => {
      const collapsed = state.collapsedDomains.has(domain);
      const allSelected = items.every(item => state.selected.has(item.id));
      return `
        <section class="domain-group${collapsed ? ' collapsed' : ''}" data-domain="${escapeHtml(domain)}">
          <div class="domain-header">
            <button class="domain-toggle" data-toggle-domain="${escapeHtml(domain)}" aria-expanded="${!collapsed}">
              <span class="domain-avatar" aria-hidden="true">${escapeHtml(domain.charAt(0).toUpperCase())}</span>
              <strong class="domain-name">${escapeHtml(domain)}<small>(${items.length})</small></strong>
              <span class="domain-chevron" aria-hidden="true">⌄</span>
            </button>
            <button class="select-group-button" data-select-domain="${escapeHtml(domain)}">${allSelected ? '取消整组' : '选择整组'}</button>
          </div>
          <div class="domain-items">
            ${items.map(item => renderBookmarkRow(item)).join('')}
          </div>
        </section>
      `;
    }).join('');
}

function renderFolderSections(bookmarks) {
  const activePath = state.folderFilter;
  if (!activePath || activePath === LOOSE_BOOKMARKS_FILTER) return bookmarks.map(bookmark => renderBookmarkRow(bookmark)).join('');

  const grouped = new Map();
  for (const bookmark of bookmarks) {
    if (!grouped.has(bookmark.path)) grouped.set(bookmark.path, []);
    grouped.get(bookmark.path).push(bookmark);
  }

  const hasSubfolders = [...grouped.keys()].some(p => p !== activePath);
  if (!hasSubfolders) return bookmarks.map(bookmark => renderBookmarkRow(bookmark)).join('');

  const orderedPaths = [];
  state.folders
    .filter(folder => folder.path.startsWith(`${activePath} /`) && grouped.has(folder.path))
    .forEach(folder => orderedPaths.push(folder.path));
  if (grouped.has(activePath)) orderedPaths.push(activePath);

  for (const path of grouped.keys()) {
    if (!orderedPaths.includes(path)) orderedPaths.push(path);
  }

  return orderedPaths.map(path => {
    const items = grouped.get(path) || [];
    const isLooseInCurrentFolder = path === activePath;
    const relativePath = isLooseInCurrentFolder ? '' : path.slice(activePath.length + 3);
    const title = isLooseInCurrentFolder ? '其他' : (path.split(' / ').filter(Boolean).pop() || '文件夹');
    const initial = title.charAt(0).toUpperCase();
    const collapsed = state.collapsedFolderSections.has(path);
    const allSelected = items.every(item => state.selected.has(item.id));
    return `
      <section class="folder-section domain-group${collapsed ? ' collapsed' : ''}" data-folder-section="${escapeHtml(path)}">
        <div class="domain-header">
          <button class="domain-toggle" data-toggle-folder-section="${escapeHtml(path)}" aria-expanded="${!collapsed}">
            <span class="domain-avatar" aria-hidden="true">${escapeHtml(initial)}</span>
            <strong class="domain-name">${escapeHtml(title)}<small>(${items.length})</small></strong>
            <span class="domain-chevron" aria-hidden="true">⌄</span>
          </button>
          <button class="select-group-button" data-select-folder-section="${escapeHtml(path)}">${allSelected ? '取消整组' : '选择整组'}</button>
        </div>
        <div class="domain-items">
          ${items.map(item => renderBookmarkRow(item)).join('')}
        </div>
      </section>
    `;
  }).join('');
}

function selectableFiltered() {
  return state.filtered;
}

function renderSelection() {
  const count = state.selected.size;
  $('#selectedCount').textContent = count;
  $('#moveBtn').disabled = count === 0 || !$('#targetFolder').value;
  $('#exportBtn').disabled = count === 0;
  $('#deleteBtn').disabled = count === 0;
  $('#actionBar').classList.toggle('visible', count > 0);
  const selectable = selectableFiltered();
  const selectAllInput = $('#selectAll');
  const allVisibleSelected = selectable.length > 0 && selectable.every(item => state.selected.has(item.id));
  const hasVisibleSelected = selectable.some(item => state.selected.has(item.id));
  selectAllInput.checked = allVisibleSelected;
  selectAllInput.indeterminate = !allVisibleSelected && hasVisibleSelected;
  $('#selectAllText').textContent = count > 0 ? '取消选择' : '全选';
  $('#selectAllControl').setAttribute('aria-label', count > 0 ? '取消选择' : '全选');
  $('#selectAllControl').classList.toggle('has-selection', count > 0);
}

function selectedBookmarks() {
  return state.bookmarks.filter(bookmark => state.selected.has(bookmark.id));
}

const SYSTEM_BOOKMARK_ROOTS = new Set([
  '收藏夹', '书签栏', '其他书签', '移动设备书签',
  'Bookmarks', 'Bookmarks bar', 'Other bookmarks', 'Mobile bookmarks'
]);

function buildExportTree(items) {
  const root = { folders: new Map(), bookmarks: [] };
  for (const bookmark of items) {
    const parts = bookmark.path.split(' / ').map(part => part.trim()).filter(Boolean);
    while (parts.length && SYSTEM_BOOKMARK_ROOTS.has(parts[0])) parts.shift();
    let node = root;
    for (const part of parts) {
      if (!node.folders.has(part)) node.folders.set(part, { folders: new Map(), bookmarks: [] });
      node = node.folders.get(part);
    }
    node.bookmarks.push(bookmark);
  }
  return root;
}

function renderExportNode(node, indent = '    ') {
  const lines = [];
  const folders = [...node.folders.entries()].sort(([a], [b]) => a.localeCompare(b, 'zh-CN'));
  for (const [title, child] of folders) {
    lines.push(`${indent}<DT><H3>${escapeHtml(title)}</H3>`);
    lines.push(`${indent}<DL><p>`);
    lines.push(renderExportNode(child, `${indent}    `));
    lines.push(`${indent}</DL><p>`);
  }
  const bookmarks = [...node.bookmarks].sort((a, b) => a.title.localeCompare(b.title, 'zh-CN'));
  for (const bookmark of bookmarks) {
    const addedAt = Math.floor((bookmark.dateAdded?.getTime() || Date.now()) / 1000);
    lines.push(`${indent}<DT><A HREF="${escapeHtml(bookmark.url)}" ADD_DATE="${addedAt}">${escapeHtml(bookmark.title)}</A>`);
  }
  return lines.filter(Boolean).join('\n');
}

async function exportSelected() {
  const items = selectedBookmarks();
  if (!items.length) return;
  const tree = buildExportTree(items);
  const content = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<!-- This is an automatically generated file. It will be read and overwritten. -->',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
    renderExportNode(tree),
    '</DL><p>'
  ].join('\n');
  const blobUrl = URL.createObjectURL(new Blob([content], { type: 'text/html;charset=utf-8' }));
  const date = new Date().toISOString().slice(0, 10);
  try {
    await chrome.downloads.download({
      url: blobUrl,
      filename: `收藏夹导出-${date}.html`,
      saveAs: true
    });
    showToast(`已导出 ${items.length} 个收藏，可直接导入 Chrome`);
  } catch (error) {
    if (!String(error?.message || '').includes('USER_CANCELED')) showToast('导出未完成，请重试');
  } finally {
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  }
}

function clearSelection() {
  state.selected.clear();
  renderList();
  renderSelection();
}

function handleSelectAllControl() {
  if (state.selected.size > 0) {
    clearSelection();
    return;
  }
  for (const bookmark of selectableFiltered()) state.selected.add(bookmark.id);
  renderList();
  renderSelection();
}

async function moveSelectedToFolder(folderId) {
  const items = selectedBookmarks();
  if (!folderId || !items.length) return;

  const previousView = { filter: state.filter, folderFilter: state.folderFilter };
  $('#moveBtn').disabled = true;
  await saveMoveSnapshot(items);
  for (const item of items) {
    await chrome.bookmarks.move(item.id, { parentId: folderId });
  }
  await scanBookmarks();
  state.filter = previousView.filter;
  state.folderFilter = previousView.folderFilter;
  renderEverything();
  showToast(`已移动 ${items.length} 个收藏，可撤销`);
}

async function saveMoveSnapshot(items) {
  await chrome.storage.local.set({
    lastActionSnapshot: {
      type: 'move',
      createdAt: new Date().toISOString(),
      items: items.map(({ id, parentId, index, title }) => ({ id, parentId, index, title }))
    }
  });
}

function requestDelete(message = '') {
  const count = state.selected.size;
  if (!count) return;
  state.pendingFolderDelete = null;
  const safeMessage = typeof message === 'string' ? message : '';
  $('#confirmTitle').textContent = count === 1 ? '确认删除这 1 个收藏？' : `确认删除这 ${count} 个收藏？`;
  $('#confirmText').textContent = safeMessage || (count === 1
    ? '可通过右上角撤销恢复。'
    : `将删除 ${count} 个收藏，可通过右上角撤销恢复。`);
  $('#confirmDeleteBtn').textContent = '确认删除';
  $('#confirmDialog').hidden = false;
  translateUi($('#confirmDialog'));
}

function closeDeleteDialog() {
  state.pendingFolderDelete = null;
  $('#confirmDialog').hidden = true;
}

function requestFolderDelete() {
  const folder = state.folders.find(item => item.id === $('#deleteFolderBtn').dataset.folderId);
  if (!folder || folder.parentId === '0') return;
  const bookmarkCount = bookmarksInFolder(folder.path).length;
  const childFolderCount = state.folders.filter(item => item.path.startsWith(`${folder.path} /`)).length;
  state.pendingFolderDelete = folder;
  $('#confirmTitle').textContent = `删除“${folder.title}”整个文件夹？`;
  $('#confirmText').textContent = `将同时删除 ${bookmarkCount} 个收藏和 ${childFolderCount} 个子文件夹。完整层级会先保存，可通过右上角撤销恢复。`;
  $('#confirmDeleteBtn').textContent = '删除整个文件夹';
  $('#confirmDialog').hidden = false;
  translateUi($('#confirmDialog'));
}

function snapshotTreeNode(node) {
  return {
    title: node.title,
    url: node.url,
    parentId: node.parentId,
    index: node.index,
    children: (node.children || []).map(child => snapshotTreeNode(child))
  };
}

async function deleteFolderTree() {
  const folder = state.pendingFolderDelete;
  if (!folder) return;
  $('#confirmDeleteBtn').disabled = true;
  try {
    const [subtree] = await chrome.bookmarks.getSubTree(folder.id);
    const treeSnapshot = snapshotTreeNode(subtree);
    await chrome.storage.local.set({
      lastActionSnapshot: {
        type: 'deleteTree',
        createdAt: new Date().toISOString(),
        tree: treeSnapshot,
        itemCount: bookmarksInFolder(folder.path).length
      }
    });
    await chrome.bookmarks.removeTree(folder.id);
    const parentPath = folder.path.split(' / ').slice(0, -1).join(' / ');
    state.folderFilter = state.folders.some(item => item.path === parentPath) ? parentPath : '';
    closeDeleteDialog();
    showToast(`已删除“${folder.title}”及其中内容，可在右上角撤销`);
    await scanBookmarks();
  } catch (error) {
    console.error(error);
    showToast(`文件夹删除失败：${error.message}`);
  } finally {
    $('#confirmDeleteBtn').disabled = false;
  }
}

async function confirmDeleteAction() {
  if (state.pendingFolderDelete) await deleteFolderTree();
  else await deleteSelected();
}

async function deleteSelected() {
  const items = selectedBookmarks();
  if (!items.length) return;
  closeDeleteDialog();

  await chrome.storage.local.set({
    lastActionSnapshot: {
      type: 'delete',
      createdAt: new Date().toISOString(),
      items: items.map(({ title, url, parentId, index, path }) => ({
        title, url, parentId, index, path
      }))
    }
  });

  for (const item of items) {
    await chrome.bookmarks.remove(item.id);
  }

  showToast(`已删除 ${items.length} 个收藏，可在右上角撤销`);
  await scanBookmarks();
}

async function ensureRestoredFolder() {
  const tree = await chrome.bookmarks.getTree();
  const folders = [];
  walkTree(tree, folders, []);
  let restored = folders.find(folder => folder.title === '已恢复');
  if (restored) return restored.id;
  restored = await chrome.bookmarks.create({ parentId: '1', title: '已恢复' });
  return restored.id;
}

async function restoreTreeNode(node, parentId) {
  const details = { parentId, title: node.title };
  if (node.url) details.url = node.url;
  if (Number.isInteger(node.index)) details.index = node.index;
  let restored;
  try {
    restored = await chrome.bookmarks.create(details);
  } catch {
    delete details.index;
    restored = await chrome.bookmarks.create(details);
  }
  for (const child of node.children || []) await restoreTreeNode(child, restored.id);
  return restored;
}

async function restoreLastAction() {
  const stored = await chrome.storage.local.get(['lastActionSnapshot', 'lastDeleteSnapshot']);
  const snapshot = stored.lastActionSnapshot || (stored.lastDeleteSnapshot
    ? { ...stored.lastDeleteSnapshot, type: 'delete' }
    : null);
  if (!snapshot || (snapshot.type !== 'deleteTree' && !snapshot.items?.length) || (snapshot.type === 'deleteTree' && !snapshot.tree)) return;

  if (snapshot.type === 'add' || snapshot.type === 'edit') {
    $('#restoreBtn').disabled = true;
    try {
      await MarkNestBookmarkService.undo(snapshot);
      await MarkNestBookmarkService.clearHistory(snapshot);
      showToast(snapshot.type === 'add' ? '已撤销添加' : '已撤销编辑');
      await scanBookmarks();
    } catch {
      showToast('未能撤销，请检查收藏或文件夹后重试');
      await checkRestore();
    }
    return;
  }

  if (snapshot.type === 'deleteTree') {
    let parentId = snapshot.tree.parentId;
    try {
      await chrome.bookmarks.get(parentId);
    } catch {
      parentId = await ensureRestoredFolder();
    }
    await restoreTreeNode(snapshot.tree, parentId);
    await chrome.storage.local.remove(['lastActionSnapshot', 'lastDeleteSnapshot']);
    showToast(`已恢复文件夹“${snapshot.tree.title}”及 ${snapshot.itemCount || 0} 个收藏`);
    await scanBookmarks();
    return;
  }

  if (snapshot.type === 'move' || snapshot.type === 'folderMove') {
    let restored = 0;
    const orderedItems = [...snapshot.items].sort((a, b) =>
      String(a.parentId).localeCompare(String(b.parentId)) || a.index - b.index
    );
    for (const item of orderedItems) {
      try {
        await chrome.bookmarks.move(item.id, { parentId: item.parentId, index: item.index });
        restored += 1;
      } catch {
        // The bookmark or its original folder may no longer exist.
      }
    }
    await chrome.storage.local.remove(['lastActionSnapshot', 'lastDeleteSnapshot']);
    showToast(snapshot.type === 'folderMove' ? '已撤销文件夹调整' : `已撤销 ${restored} 个收藏的移动`);
    await scanBookmarks();
    return;
  }

  for (const item of snapshot.items) {
    let restoredBookmark;
    try {
      restoredBookmark = await chrome.bookmarks.create({
        parentId: item.parentId,
        title: item.title,
        url: item.url,
        index: item.index
      });
    } catch {
      const fallbackId = await ensureRestoredFolder();
      restoredBookmark = await chrome.bookmarks.create({ parentId: fallbackId, title: item.title, url: item.url });
    }
  }

  await chrome.storage.local.remove(['lastActionSnapshot', 'lastDeleteSnapshot']);
  showToast(`已恢复 ${snapshot.items.length} 个收藏`);
  await scanBookmarks();
}

async function checkRestore() {
  const stored = await chrome.storage.local.get(['lastActionSnapshot', 'lastDeleteSnapshot']);
  const snapshot = stored.lastActionSnapshot || stored.lastDeleteSnapshot;
  const canRestore = snapshot?.type === 'deleteTree' ? Boolean(snapshot.tree) : Boolean(snapshot?.items?.length);
  $('#restoreBtn').disabled = !canRestore;
  $('#restoreBtn').textContent = !snapshot
    ? '撤销上次操作'
    : snapshot.type === 'move' ? '撤销上次整理'
      : snapshot.type === 'folderMove' ? '撤销文件夹调整'
      : snapshot.type === 'deleteTree' ? '撤销删除'
      : snapshot.type === 'add' ? '撤销添加'
      : snapshot.type === 'edit' ? '撤销编辑'
        : '撤销上次删除';
}

let toastTimer;
function showToast(message) {
  const toast = $('#toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  translateUi(toast);
  toast.classList.add('visible');
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
}

function syncSelectionInView() {
  $$('.bookmark-row[data-bookmark-id]').forEach(row => {
    const selected = state.selected.has(row.dataset.bookmarkId);
    row.classList.toggle('selected', selected);
    const checkbox = row.querySelector('.row-check');
    if (checkbox) checkbox.checked = selected;
  });
  renderSelection();
}

let suppressRowClickUntil = 0;

function beginMarqueeSelection(event) {
  if (event.button !== 0 || event.target.closest('a,button,input,select,.domain-header,.bookmark-row[data-bookmark-id]')) return;
  const rows = $$('.bookmark-row[data-bookmark-id]');
  if (!rows.length) return;
  const startX = event.clientX;
  const startY = event.clientY;
  const additive = event.metaKey || event.ctrlKey || event.shiftKey;
  const baseSelection = additive ? new Set(state.selected) : new Set();
  let marquee = null;
  let moved = false;

  const move = moveEvent => {
    if (!moved && Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < 5) return;
    if (!moved) {
      moved = true;
      event.preventDefault();
      state.selected = new Set(baseSelection);
      marquee = document.createElement('div');
      marquee.className = 'selection-marquee';
      document.body.appendChild(marquee);
    }
    const left = Math.min(startX, moveEvent.clientX);
    const top = Math.min(startY, moveEvent.clientY);
    const right = Math.max(startX, moveEvent.clientX);
    const bottom = Math.max(startY, moveEvent.clientY);
    marquee.style.left = `${left}px`;
    marquee.style.top = `${top}px`;
    marquee.style.width = `${right - left}px`;
    marquee.style.height = `${bottom - top}px`;
    state.selected = new Set(baseSelection);
    for (const row of rows) {
      const rect = row.getBoundingClientRect();
      if (rect.left < right && rect.right > left && rect.top < bottom && rect.bottom > top) {
        state.selected.add(row.dataset.bookmarkId);
      }
    }
    syncSelectionInView();
  };

  const end = () => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', end);
    document.removeEventListener('pointercancel', end);
    if (marquee) marquee.remove();
    if (moved) {
      suppressRowClickUntil = Date.now() + 220;
      renderSelection();
    }
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', end);
  document.addEventListener('pointercancel', end);
}

function clearFolderDropTargets() {
  $$('.folder-tree-button.drop-target, .folder-tree-button.drop-before, .folder-tree-button.drop-after')
    .forEach(button => button.classList.remove('drop-target', 'drop-before', 'drop-after'));
}

let draggingFolderId = null;
let activeDragPreview = null;

function clearDragPreview() {
  activeDragPreview?.remove();
  activeDragPreview = null;
}

function createBookmarkDragPreview(ids) {
  clearDragPreview();
  const preview = document.createElement('div');
  preview.className = 'drag-preview';
  const count = ids.length;
  const firstBookmark = state.bookmarks.find(item => String(item.id) === String(ids[0]));
  const title = count > 1
    ? `已选 ${count} 项`
    : '已选 1 项';
  preview.innerHTML = `
    <span class="drag-preview-badge">${count}</span>
    <span class="drag-preview-text">${escapeHtml(title)}</span>
  `;
  document.body.append(preview);
  activeDragPreview = preview;
  return preview;
}

function beginFolderDrag(event) {
  const handle = event.target.closest('.tree-drag-handle');
  if (!handle) return;
  const folderRow = handle.closest('.folder-tree-button[data-folder-id]');
  const folder = state.folders.find(item => item.id === folderRow?.dataset.folderId);
  if (!folder || folder.parentId === '0') {
    event.preventDefault();
    return;
  }
  draggingFolderId = folder.id;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('application/x-marknest-folder', folder.id);
  event.dataTransfer.setData('text/plain', folder.id);
  folderRow.classList.add('dragging-folder');
}

function beginBookmarkDrag(event) {
  if (event.target.closest('a,button,input,select')) {
    event.preventDefault();
    return;
  }
  const row = event.target.closest('.bookmark-row[data-bookmark-id]');
  if (!row) return;
  const id = row.dataset.bookmarkId;
  if (!state.selected.has(id)) {
    state.selected.clear();
    state.selected.add(id);
    syncSelectionInView();
  }
  const ids = [...state.selected];
  suppressRowClickUntil = Date.now() + 400;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', JSON.stringify(ids));
  const preview = createBookmarkDragPreview(ids);
  event.dataTransfer.setDragImage(preview, 24, 18);
  ids.forEach(selectedId => {
    document.querySelector(`.bookmark-row[data-bookmark-id="${CSS.escape(selectedId)}"]`)?.classList.add('dragging');
  });
}

function endBookmarkDrag() {
  suppressRowClickUntil = Date.now() + 220;
  clearDragPreview();
  $$('.bookmark-row.dragging').forEach(row => row.classList.remove('dragging'));
  $$('.folder-tree-button.dragging-folder').forEach(row => row.classList.remove('dragging-folder'));
  draggingFolderId = null;
  clearFolderDropTargets();
}

function showFolderDropTarget(event) {
  const folder = event.target.closest('.folder-tree-button[data-folder-id]');
  if (!folder) return;
  if (draggingFolderId) {
    const source = state.folders.find(item => item.id === draggingFolderId);
    const target = state.folders.find(item => item.id === folder.dataset.folderId);
    if (!source || !target || source.id === target.id || target.path.startsWith(`${source.path} /`)) return;
  }
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  clearFolderDropTargets();
  if (!draggingFolderId) {
    folder.classList.add('drop-target');
    return;
  }
  const rect = folder.getBoundingClientRect();
  const ratio = (event.clientY - rect.top) / rect.height;
  folder.classList.add(ratio < .25 ? 'drop-before' : ratio > .75 ? 'drop-after' : 'drop-target');
}

async function moveFolderByDrop(sourceId, targetId, position) {
  const source = state.folders.find(folder => folder.id === sourceId);
  const target = state.folders.find(folder => folder.id === targetId);
  if (!source || !target || source.parentId === '0' || source.id === target.id || target.path.startsWith(`${source.path} /`)) return;
  let destination;
  if (position === 'inside') {
    destination = { parentId: target.id };
  } else {
    const allSiblings = (await chrome.bookmarks.getChildren(target.parentId)).filter(node => node.id !== source.id);
    const targetIndex = allSiblings.findIndex(node => node.id === target.id);
    destination = {
      parentId: target.parentId,
      index: Math.max(0, targetIndex + (position === 'after' ? 1 : 0))
    };
  }
  await chrome.storage.local.set({
    lastActionSnapshot: {
      type: 'folderMove',
      createdAt: new Date().toISOString(),
      items: [{ id: source.id, parentId: source.parentId, index: source.index, title: source.title }]
    }
  });
  try {
    await chrome.bookmarks.move(source.id, destination);
    await scanBookmarks();
    const moved = state.folders.find(folder => folder.id === source.id);
    if (moved) state.folderFilter = moved.path;
    renderEverything();
    showToast(position === 'inside' ? `已将“${source.title}”移入“${target.title}”` : `已调整“${source.title}”的顺序`);
  } catch (error) {
    console.error(error);
    showToast('文件夹移动失败，请重试');
  }
}

async function dropBookmarksOnFolder(event) {
  const folder = event.target.closest('.folder-tree-button[data-folder-id]');
  if (!folder) return;
  event.preventDefault();
  const position = folder.classList.contains('drop-before') ? 'before'
    : folder.classList.contains('drop-after') ? 'after'
      : 'inside';
  clearFolderDropTargets();
  if (draggingFolderId) {
    const sourceId = draggingFolderId;
    draggingFolderId = null;
    await moveFolderByDrop(sourceId, folder.dataset.folderId, position);
    return;
  }
  if (!state.selected.size) return;
  await moveSelectedToFolder(folder.dataset.folderId);
}

function bindEvents() {
  $('#startBtn')?.addEventListener('click', () => scanBookmarks());
  $('#scanBtn').addEventListener('click', () => scanBookmarks());
  $('#compareBtn').addEventListener('click', openCompareDialog);
  $('#closeCompareBtn').addEventListener('click', closeCompareDialog);
  $('#chooseCompareFileBtn').addEventListener('click', chooseCompareFile);
  $('#replaceCompareFileBtn').addEventListener('click', chooseCompareFile);
  $('#compareFileInput').addEventListener('change', event => loadCompareFile(event.target.files?.[0]));
  $('#compareTabs').addEventListener('click', event => {
    const button = event.target.closest('[data-compare-tab]');
    if (!button) return;
    state.compare.activeTab = button.dataset.compareTab;
    renderCompareResults();
  });
  $('#compareList').addEventListener('change', event => {
    const checkbox = event.target.closest('.compare-row-check');
    if (!checkbox) return;
    if (checkbox.checked) state.compare.selected.add(checkbox.dataset.url);
    else state.compare.selected.delete(checkbox.dataset.url);
    renderCompareResults();
  });
  $('#compareList').addEventListener('error', event => {
    if (event.target.matches('img')) event.target.classList.add('failed');
  }, true);
  $('#compareSelectAll').addEventListener('change', event => {
    state.compare.selected.clear();
    if (event.target.checked) for (const item of state.compare.missing) state.compare.selected.add(item.normalizedUrl);
    renderCompareResults();
  });
  $('#importComparedBtn').addEventListener('click', importComparedBookmarks);
  $('#compareDialog').addEventListener('click', event => {
    if (event.target === $('#compareDialog')) closeCompareDialog();
  });
  $('#checkLinksBtn').addEventListener('click', checkAllLinks);
  $('#cancelLinkPermissionBtn').addEventListener('click', closeLinkPermissionDialog);
  $('#grantLinkPermissionBtn').addEventListener('click', requestLinkPermissionAndCheck);
  $('#openExtensionSettingsBtn').addEventListener('click', openExtensionSettings);
  $('#linkPermissionDialog').addEventListener('click', event => {
    if (event.target === $('#linkPermissionDialog')) closeLinkPermissionDialog();
  });
  $('#restoreBtn').addEventListener('click', restoreLastAction);
  $('#newFolderBtn').addEventListener('click', openNewFolderDialog);
  $('#cancelNewFolderBtn').addEventListener('click', closeNewFolderDialog);
  $('#confirmNewFolderBtn').addEventListener('click', createNewFolder);
  $('#newFolderName').addEventListener('keydown', event => {
    if (event.key === 'Enter') createNewFolder();
  });
  $('#newFolderDialog').addEventListener('click', event => event.stopPropagation());
  document.addEventListener('click', event => {
    if (!$('#newFolderDialog').hidden && !event.target.closest('#newFolderBtn')) closeNewFolderDialog();
  });
  $('#statusFilter').addEventListener('change', event => {
    state.filter = event.target.value;
    state.selected.clear();
    renderCounts();
    renderFolderTree();
    renderList();
    renderSelection();
  });
  $('#dateFilter').addEventListener('change', event => {
    state.dateFilter = event.target.value;
    state.selected.clear();
    renderFolderTree();
    renderList();
    renderSelection();
  });

  $('#folderTree').addEventListener('click', event => {
    const disclosure = event.target.closest('[data-toggle-folder]');
    if (disclosure) {
      const folderId = disclosure.dataset.toggleFolder;
      if (state.collapsedFolders.has(folderId)) state.collapsedFolders.delete(folderId);
      else state.collapsedFolders.add(folderId);
      renderFolderTree();
      return;
    }
    if (event.target.closest('.tree-drag-handle')) return;
    const button = event.target.closest('[data-folder-filter]');
    if (!button) return;
    state.folderFilter = button.dataset.folderFilter;
    state.filter = 'all';
    state.selected.clear();
    renderCounts();
    renderFolderTree();
    renderList();
    renderSelection();
  });

  $('#folderQuickFilters').addEventListener('click', event => {
    const button = event.target.closest('[data-folder-issue]');
    if (!button) return;
    state.filter = button.dataset.folderIssue;
    state.selected.clear();
    renderCounts();
    renderFolderTree();
    renderList();
    renderSelection();
  });

  $('#searchInput').addEventListener('input', event => {
    state.search = event.target.value.trim();
    renderFolderTree();
    renderList();
    renderSelection();
  });

  $('#dateSortBtn').addEventListener('click', () => {
    state.dateSort = state.dateSort === 'desc' ? 'asc' : 'desc';
    renderList();
    renderSelection();
  });

  $('#bookmarkList').addEventListener('change', event => {
    const checkbox = event.target.closest('.row-check');
    if (!checkbox) return;
    if (checkbox.checked) state.selected.add(checkbox.dataset.id);
    else state.selected.delete(checkbox.dataset.id);
    checkbox.closest('.bookmark-row')?.classList.toggle('selected', checkbox.checked);
    renderSelection();
  });
  $('#bookmarkList').addEventListener('error', event => {
    if (event.target.matches('.bookmark-favicon')) event.target.classList.add('failed');
  }, true);
  $('#bookmarkPanel')?.addEventListener('pointerdown', beginMarqueeSelection);
  $('#bookmarkList').addEventListener('dragstart', beginBookmarkDrag);
  $('#bookmarkList').addEventListener('dragend', endBookmarkDrag);
  $('#folderTree').addEventListener('dragstart', beginFolderDrag);
  $('#folderTree').addEventListener('dragend', endBookmarkDrag);
  $('#folderTree').addEventListener('dragover', showFolderDropTarget);
  $('#folderTree').addEventListener('drop', dropBookmarksOnFolder);
  $('#folderTree').addEventListener('dragleave', event => {
    if (!event.currentTarget.contains(event.relatedTarget)) clearFolderDropTargets();
  });

  $('#bookmarkList').addEventListener('click', event => {
    const row = event.target.closest('.bookmark-row[data-bookmark-id]');
    if (row && !event.target.closest('a,button,input')) {
      if (Date.now() < suppressRowClickUntil) return;
      const id = row.dataset.bookmarkId;
      if (state.selected.has(id)) state.selected.delete(id);
      else state.selected.add(id);
      syncSelectionInView();
      return;
    }

    const folderLink = event.target.closest('[data-filter-folder]');
    if (folderLink) {
      state.folderFilter = folderLink.dataset.filterFolder;
      state.filter = 'all';
      state.selected.clear();
      renderCounts();
      renderFolderTree();
      renderList();
      renderSelection();
      return;
    }

    const folderSectionToggle = event.target.closest('[data-toggle-folder-section]');
    if (folderSectionToggle) {
      const path = folderSectionToggle.dataset.toggleFolderSection;
      if (path) {
        if (state.collapsedFolderSections.has(path)) state.collapsedFolderSections.delete(path);
        else state.collapsedFolderSections.add(path);
        renderList();
        renderSelection();
      }
      return;
    }

    const toggle = event.target.closest('[data-toggle-domain]');
    if (toggle) {
      const domain = toggle.dataset.toggleDomain;
      if (state.collapsedDomains.has(domain)) state.collapsedDomains.delete(domain);
      else state.collapsedDomains.add(domain);
      renderList();
      renderSelection();
      return;
    }

    const selectGroup = event.target.closest('[data-select-domain]');
    if (selectGroup) {
      const domain = selectGroup.dataset.selectDomain;
      const group = state.bookmarks.filter(item => item.groupDomain === domain);
      const allSelected = group.every(item => state.selected.has(item.id));
      group.forEach(item => {
        if (allSelected) state.selected.delete(item.id);
        else state.selected.add(item.id);
      });
      renderList();
      renderSelection();
      return;
    }

    const selectFolderGroup = event.target.closest('[data-select-folder-section]');
    if (selectFolderGroup) {
      const path = selectFolderGroup.dataset.selectFolderSection;
      const group = state.bookmarks.filter(item => item.path === path);
      const allSelected = group.every(item => state.selected.has(item.id));
      group.forEach(item => {
        if (allSelected) state.selected.delete(item.id);
        else state.selected.add(item.id);
      });
      renderList();
      renderSelection();
      return;
    }
  });

  $('#selectAll').addEventListener('change', event => {
    event.preventDefault();
    handleSelectAllControl();
  });
  $('#selectAllControl').addEventListener('click', event => {
    if (event.target === $('#selectAll')) return;
    handleSelectAllControl();
  });
  $('#selectAllControl').addEventListener('keydown', event => {
    if (!['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    handleSelectAllControl();
  });

  $('#targetFolder').addEventListener('change', renderSelection);
  $('#moveBtn').addEventListener('click', () => moveSelectedToFolder($('#targetFolder').value));
  $('#exportBtn').addEventListener('click', exportSelected);
  $('#deleteBtn').addEventListener('click', () => requestDelete());
  $('#deleteFolderBtn').addEventListener('click', requestFolderDelete);
  $('#cancelDeleteBtn').addEventListener('click', closeDeleteDialog);
  $('#confirmDeleteBtn').addEventListener('click', confirmDeleteAction);
  $('#confirmDialog').addEventListener('click', event => {
    if (event.target === $('#confirmDialog')) closeDeleteDialog();
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (closeAllCustomSelects()) return;
      if (!$('#newFolderDialog').hidden) closeNewFolderDialog();
      else if (!$('#confirmDialog').hidden) closeDeleteDialog();
      else if (!$('#linkPermissionDialog').hidden) closeLinkPermissionDialog();
      else if (!$('#compareDialog').hidden) closeCompareDialog();
      else clearSelection();
    }
  });
  document.addEventListener('click', event => {
    if (event.target.closest('.custom-select')) return;
    closeAllCustomSelects();
  });
  window.addEventListener('resize', () => closeAllCustomSelects());
}

initializeCustomSelects();
bindEvents();
checkRestore();
MarkNestI18n.ready.then(locale => {
  $('#languageSelect').value = locale;
  syncCustomSelect('#languageSelect');
  MarkNestI18n.apply();
});
$('#languageSelect').addEventListener('change', event => MarkNestI18n.setLocale(event.target.value));
scanBookmarks();

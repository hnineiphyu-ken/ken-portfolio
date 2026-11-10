'use strict';

const menuBtn = document.getElementById('menuBtn');
const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshBtn');
const treeEl = document.getElementById('tree');
const mainEl = document.getElementById('main');
const repositoryEl = document.getElementById('repository');
const quickReportsEl = document.getElementById('quickReports');
const quickReportsToggle = document.getElementById('quickReportsToggle');
const quickReportsBody = document.getElementById('quickReportsBody');
const quickReportsCount = document.getElementById('quickReportsCount');
const quickReportsList = document.getElementById('quickReportsList');
const reportDateFrom = document.getElementById('reportDateFrom');
const reportDateTo = document.getElementById('reportDateTo');
const quickFilterActions = document.getElementById('quickFilterActions');
const reportFilterStatus = document.getElementById('reportFilterStatus');
const reportFilterClear = document.getElementById('reportFilterClear');
let files = [];
let dailyReports = [];
let selectedPath = '';
let mermaidInitialized = false;
let quickReportsCollapsed = false;
let activeLoadToken = 0;
let activeFetchController = null;

let rootManualOrder = [];
let folderSortDirs = {};
const collapsedFolders = new Set();
let draggedRootName = null;

try {
  rootManualOrder = JSON.parse(localStorage.getItem('my_md_root_order') || '[]');
  folderSortDirs = JSON.parse(localStorage.getItem('my_md_folder_sorts') || '{}');
  quickReportsCollapsed = localStorage.getItem('my_md_quick_reports_collapsed') === '1';
} catch {}

let currentMarkdownText = '';

const REPORT_PATH_RE = /^(?:(.+?)\/)?reports\/(?:\d{4}\/)?(\d{4}-\d{2}-\d{2})\.md$/i;
const SHORT_WEEKDAY_FMT = new Intl.DateTimeFormat('en-US', { weekday: 'short' });
const SHORT_DATE_FMT = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });

function getTodayAndYesterdayIso() {
  if (typeof Temporal !== 'undefined') {
    const today = Temporal.Now.plainDateISO();
    const yesterday = today.subtract({ days: 1 });
    return { today: today.toString(), yesterday: yesterday.toString() };
  }
  const now = new Date();
  const toIso = (d) => [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0')
  ].join('-');
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  return { today: toIso(now), yesterday: toIso(yesterday) };
}

function formatReportDateMeta(isoDate) {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [year, month, day] = parts;
  if (typeof Temporal !== 'undefined') {
    try {
      const plain = Temporal.PlainDate.from({ year, month, day }, { overflow: 'reject' });
      return {
        weekday: plain.toLocaleString('en-US', { weekday: 'short' }),
        shortDate: plain.toLocaleString('en-US', { month: 'short', day: 'numeric' })
      };
    } catch {
      return null;
    }
  }
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return {
    weekday: SHORT_WEEKDAY_FMT.format(d),
    shortDate: SHORT_DATE_FMT.format(d)
  };
}

function extractDailyReports(entries) {
  const { today, yesterday } = getTodayAndYesterdayIso();
  const byDate = new Map();

  for (const entry of entries) {
    const match = entry.path.match(REPORT_PATH_RE);
    if (!match) continue;
    const rootScope = (match[1] || '').toLowerCase();
    const date = match[2];
    const meta = formatReportDateMeta(date);
    if (!meta) continue;

    const isHachiwareReport = rootScope === 'hachiware' || rootScope === '';
    const existing = byDate.get(date);
    if (!existing || (isHachiwareReport && !existing.isHachiwareReport)) {
      let badge = '';
      if (date === today) badge = 'Today';
      else if (date === yesterday) badge = 'Yesterday';

      byDate.set(date, {
        date,
        path: entry.path,
        weekday: meta.weekday,
        shortDate: meta.shortDate,
        badge,
        isHachiwareReport
      });
    }
  }

  return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date));
}

function getDefaultFolderSort(path) {
  return /(?:^|\/)(?:reports|plans)(?:\/|$)/i.test(path) ? 'desc' : 'asc';
}

function encodeHashPath(filePath) {
  return '#' + filePath.split('/').map(encodeURIComponent).join('/');
}

function decodeHashPath(rawHash = window.location.hash) {
  if (!rawHash || rawHash === '#') return '';
  const body = rawHash.startsWith('#') ? rawHash.slice(1) : rawHash;
  if (!body) return '';
  try {
    return decodeURIComponent(body).replace(/^\/+/, '');
  } catch {
    return '';
  }
}

function syncUrlHash(filePath, { replace = false } = {}) {
  if (!filePath) return;
  const targetHash = encodeHashPath(filePath);
  if (window.location.hash === targetHash) return;
  try {
    if (replace) {
      history.replaceState(null, '', targetHash);
    } else {
      history.pushState(null, '', targetHash);
    }
  } catch {
    window.location.hash = targetHash;
  }
}

function findInitialFilePath(entries, reports, hashPath) {
  if (!entries.length) return '';
  if (hashPath) {
    const exact = entries.find(file => file.path === hashPath);
    if (exact) return exact.path;
  }
  if (reports.length) return reports[0].path;
  return entries[0].path;
}

function getCopyIconSvg(size = 14) {
  return '<svg class="copy-svg" aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="' + size + '" height="' + size + '" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path></svg>';
}

function getCheckIconSvg(size = 14) {
  return '<svg class="check-svg" aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="' + size + '" height="' + size + '" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path></svg>';
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {}
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '-9999px';
  textarea.setAttribute('readonly', '');
  document.body.appendChild(textarea);
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {}
  document.body.removeChild(textarea);
  return ok;
}

function showCopiedFeedback(btn, defaultText = '') {
  btn.classList.add('copied');
  if (btn._copiedTimer) clearTimeout(btn._copiedTimer);
  const span = btn.querySelector('span');
  const size = btn.classList.contains('doc-copy-btn') ? 14 : 12;
  btn.innerHTML = getCheckIconSvg(size) + (span && defaultText ? '<span>Copied!</span>' : '');
  btn._copiedTimer = setTimeout(() => {
    btn.classList.remove('copied');
    btn.innerHTML = getCopyIconSvg(size) + (span && defaultText ? '<span>' + defaultText + '</span>' : '');
  }, 2000);
}

mainEl.addEventListener('click', async (e) => {
  const navBtn = e.target.closest('.doc-nav-btn');
  if (navBtn) {
    e.stopPropagation();
    if (navBtn.getAttribute('aria-disabled') === 'true') return;
    const navPath = navBtn.dataset.navPath;
    if (navPath) await openRemoteFile(navPath);
    return;
  }
  const docBtn = e.target.closest('.doc-copy-btn');
  if (docBtn) {
    e.stopPropagation();
    if (currentMarkdownText) {
      await copyTextToClipboard(currentMarkdownText);
      showCopiedFeedback(docBtn, 'Copy');
    }
    return;
  }
  const codeBtn = e.target.closest('.code-copy-btn');
  if (codeBtn) {
    e.stopPropagation();
    const block = codeBtn.closest('.code-block');
    if (!block) return;
    const code = block.querySelector('code');
    const text = code ? code.textContent : '';
    await copyTextToClipboard(text);
    showCopiedFeedback(codeBtn, 'Copy');
    return;
  }
});

function getSortIconSvg(dir) {
  if (dir === 'desc') {
    return '<svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="11" height="11" fill="currentColor"><path d="M3.5 13.25a.75.75 0 0 0 1.5 0V5.56l1.72 1.72a.75.75 0 0 0 1.06-1.06l-3-3a.75.75 0 0 0-1.06 0l-3 3a.75.75 0 1 0 1.06 1.06l1.72-1.72v7.69zM10.25 3.5h3a.75.75 0 0 1 .58 1.22l-2.07 2.53h1.49a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1-.58-1.22l2.07-2.53h-1.49a.75.75 0 0 1 0-1.5zm.75 6.5a.75.75 0 0 0-1.5 0v3.25a.75.75 0 0 0 1.5 0V10z"/></svg>';
  }
  return '<svg aria-hidden="true" focusable="false" viewBox="0 0 16 16" width="11" height="11" fill="currentColor"><path d="M3.5 2.75a.75.75 0 0 1 1.5 0v7.69l1.72-1.72a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06l1.72 1.72V2.75zM10.25 3.5h3a.75.75 0 0 1 .58 1.22l-2.07 2.53h1.49a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1-.58-1.22l2.07-2.53h-1.49a.75.75 0 0 1 0-1.5zm.75 6.5a.75.75 0 0 0-1.5 0v3.25a.75.75 0 0 0 1.5 0V10z"/></svg>';
}

function syncQuickReportsCollapsed() {
  if (!quickReportsToggle) return;
  quickReportsToggle.setAttribute('aria-expanded', String(!quickReportsCollapsed));
  if (quickReportsBody) quickReportsBody.hidden = quickReportsCollapsed;
  else if (quickReportsList) quickReportsList.hidden = quickReportsCollapsed;
}

if (quickReportsToggle) {
  syncQuickReportsCollapsed();
  quickReportsToggle.addEventListener('click', () => {
    quickReportsCollapsed = !quickReportsCollapsed;
    try { localStorage.setItem('my_md_quick_reports_collapsed', quickReportsCollapsed ? '1' : '0'); } catch {}
    syncQuickReportsCollapsed();
  });
}

function handleReportDateFilterChange() {
  renderQuickReports();
  refreshActiveDocumentNav();
}

if (reportDateFrom) {
  reportDateFrom.addEventListener('change', handleReportDateFilterChange);
}
if (reportDateTo) {
  reportDateTo.addEventListener('change', handleReportDateFilterChange);
}
if (reportFilterClear) {
  reportFilterClear.addEventListener('click', () => {
    if (reportDateFrom) {
      reportDateFrom.value = '';
      reportDateFrom.removeAttribute('aria-invalid');
    }
    if (reportDateTo) {
      reportDateTo.value = '';
      reportDateTo.removeAttribute('aria-invalid');
    }
    if (typeof document !== 'undefined' && document.activeElement === reportFilterClear && reportDateFrom && typeof reportDateFrom.focus === 'function') {
      reportDateFrom.focus();
    }
    handleReportDateFilterChange();
  });
}

menuBtn.addEventListener('click', () => {
  const drawerMode = isDrawerMode();
  const opened = document.body.classList.toggle(drawerMode ? 'sidebar-open' : 'sidebar-closed');
  updateMenuButtonLabel();
  if (drawerMode && opened && sidebarCloseBtn) {
    sidebarCloseBtn.focus();
  }
});
sidebarCloseBtn.addEventListener('click', () => {
  const wasDrawer = isDrawerMode();
  closeSidebar();
  if (wasDrawer) menuBtn.focus();
});
sidebarOverlay.addEventListener('click', closeSidebar);
searchInput.addEventListener('input', renderTree);
refreshBtn.addEventListener('click', loadTree);

function handleHashNavigation() {
  const hashPath = decodeHashPath();
  if (!hashPath || !files.length) return;
  if (hashPath === selectedPath) return;
  if (files.some(file => file.path === hashPath)) {
    openRemoteFile(hashPath, { hashMode: 'none', closeOnMobile: true });
  }
}

window.addEventListener('hashchange', handleHashNavigation);
window.addEventListener('popstate', handleHashNavigation);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && isDrawerMode() && document.body.classList.contains('sidebar-open')) {
    closeSidebar();
    menuBtn.focus();
  }
});

async function requestJson(url, { signal } = {}) {
  const response = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' }, signal });
  if (response.status === 401) {
    window.location.assign('/api/auth/login');
    throw new Error('Authentication required.');
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

async function loadTree() {
  refreshBtn.disabled = true;
  treeEl.innerHTML = '<li class="loading-row">Refreshing…</li>';
  try {
    const data = await requestJson('/api/markdown/tree');
    files = data.files;
    dailyReports = extractDailyReports(files);
    syncReportDateBounds();
    repositoryEl.textContent = data.repository + ' · ' + data.branch;
    renderTree();

    const hashPath = decodeHashPath();
    const keepCurrent = selectedPath && files.some(file => file.path === selectedPath);
    const targetPath = keepCurrent ? selectedPath : findInitialFilePath(files, dailyReports, hashPath);

    if (targetPath) {
      await openRemoteFile(targetPath, {
        hashMode: keepCurrent ? 'replace' : (hashPath === targetPath ? 'none' : 'replace'),
        closeOnMobile: false
      });
    } else {
      renderEmpty('<div class="empty">No Markdown files found in this repository.</div>');
    }
  } catch (error) {
    treeEl.innerHTML = '<li class="error">' + escapeHtml(error.message) + '</li>';
    renderEmpty('<div class="error">' + escapeHtml(error.message) + '</div>');
  } finally {
    refreshBtn.disabled = false;
  }
}

function syncReportDateBounds() {
  const oldest = dailyReports.length ? dailyReports[dailyReports.length - 1].date : '';
  const newest = dailyReports.length ? dailyReports[0].date : '';
  [reportDateFrom, reportDateTo].forEach(input => {
    if (!input) return;
    if (oldest) input.min = oldest;
    else input.removeAttribute('min');
    if (newest) input.max = newest;
    else input.removeAttribute('max');
  });
}

function getFilteredDailyReports() {
  const term = searchInput.value.trim().toLowerCase();
  const fromDate = reportDateFrom ? reportDateFrom.value.trim() : '';
  const toDate = reportDateTo ? reportDateTo.value.trim() : '';
  const hasDateFilter = Boolean(fromDate || toDate);
  const invalidRange = Boolean(fromDate && toDate && fromDate > toDate);

  if (invalidRange) {
    return { term, fromDate, toDate, hasDateFilter, invalidRange, items: [] };
  }

  const items = dailyReports.filter(item => {
    if (fromDate && item.date < fromDate) return false;
    if (toDate && item.date > toDate) return false;
    if (term) {
      return (
        item.date.toLowerCase().includes(term) ||
        item.path.toLowerCase().includes(term) ||
        item.weekday.toLowerCase().includes(term) ||
        item.shortDate.toLowerCase().includes(term) ||
        item.badge.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return { term, fromDate, toDate, hasDateFilter, invalidRange, items };
}

function renderQuickReports() {
  if (!quickReportsEl || !quickReportsList || !quickReportsCount) return;
  const { term, hasDateFilter, invalidRange, items: visibleReports } = getFilteredDailyReports();

  [reportDateFrom, reportDateTo].forEach(input => {
    if (!input) return;
    if (invalidRange) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  });

  if (!dailyReports.length || (term && !hasDateFilter && !visibleReports.length)) {
    quickReportsEl.hidden = true;
    quickReportsList.innerHTML = '';
    quickReportsCount.textContent = '0';
    if (reportFilterStatus) {
      reportFilterStatus.textContent = '';
      reportFilterStatus.classList.remove('is-error');
    }
    if (reportFilterClear) reportFilterClear.hidden = true;
    if (quickFilterActions) quickFilterActions.hidden = true;
    return;
  }

  quickReportsEl.hidden = false;
  quickReportsCount.textContent = hasDateFilter
    ? visibleReports.length + '/' + dailyReports.length
    : String(visibleReports.length);

  let statusText = '';
  if (invalidRange) {
    statusText = 'Start date cannot be after end date.';
  } else if (hasDateFilter) {
    statusText = visibleReports.length + ' of ' + dailyReports.length + (dailyReports.length === 1 ? ' report' : ' reports');
  }
  if (reportFilterStatus) {
    reportFilterStatus.textContent = statusText;
    reportFilterStatus.classList.toggle('is-error', invalidRange);
  }
  if (reportFilterClear) reportFilterClear.hidden = !hasDateFilter;
  if (quickFilterActions) quickFilterActions.hidden = !statusText && !hasDateFilter;

  quickReportsList.innerHTML = '';

  if (!visibleReports.length) {
    const emptyLi = document.createElement('li');
    emptyLi.className = 'quick-reports-empty';
    emptyLi.textContent = invalidRange
      ? 'Adjust the From / To dates to view reports.'
      : 'No daily reports match the selected date range.';
    quickReportsList.appendChild(emptyLi);
    return;
  }

  let activeBtn = null;
  for (const report of visibleReports) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'quick-date-btn';
    btn.dataset.path = report.path;

    if (report.path === selectedPath) {
      btn.setAttribute('aria-current', 'date');
      activeBtn = btn;
    }

    const labelParts = [report.date];
    if (report.badge) labelParts.push(report.badge);
    if (report.weekday || report.shortDate) labelParts.push((report.weekday + ' ' + report.shortDate).trim());
    btn.setAttribute('aria-label', 'Open report ' + labelParts.join(', '));

    const mainSpan = document.createElement('span');
    mainSpan.className = 'quick-date-main';

    const isoSpan = document.createElement('span');
    isoSpan.className = 'quick-date-iso';
    isoSpan.textContent = report.date;
    mainSpan.appendChild(isoSpan);

    if (report.badge) {
      const badgeSpan = document.createElement('span');
      badgeSpan.className = 'quick-date-badge ' + (report.badge === 'Today' ? 'is-today' : 'is-yesterday');
      badgeSpan.textContent = report.badge;
      mainSpan.appendChild(badgeSpan);
    }

    const metaSpan = document.createElement('span');
    metaSpan.className = 'quick-date-meta';
    metaSpan.textContent = report.weekday ? (report.weekday + ' · ' + report.shortDate) : report.shortDate;

    btn.append(mainSpan, metaSpan);
    btn.addEventListener('click', () => openRemoteFile(report.path));
    li.appendChild(btn);
    quickReportsList.appendChild(li);
  }

  if (activeBtn && !quickReportsCollapsed && typeof activeBtn.scrollIntoView === 'function') {
    activeBtn.scrollIntoView({ block: 'nearest' });
  }
}

function renderTree() {
  renderQuickReports();
  const term = searchInput.value.trim().toLowerCase();
  const visible = term ? files.filter(file => file.path.toLowerCase().includes(term)) : files;
  treeEl.innerHTML = '';
  if (!visible.length) {
    treeEl.innerHTML = '<li class="empty">No matching Markdown files.</li>';
    return;
  }
  buildTreeNodes(toTree(visible), treeEl, '', 'asc');
}

function toTree(entries) {
  const root = {};
  for (const entry of entries) {
    let node = root;
    for (const part of entry.path.split('/')) {
      node[part] ||= {};
      node = node[part];
    }
    node.__file = entry;
  }
  return root;
}

function getSortedNames(node, prefix, sortDir = getDefaultFolderSort(prefix)) {
  const names = Object.keys(node).filter(name => name !== '__file');

  if (prefix === '') {
    // Main root items: manual order (drag & drop)
    if (!rootManualOrder.length) {
      return names.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    }
    return names.sort((a, b) => {
      const idxA = rootManualOrder.indexOf(a);
      const idxB = rootManualOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }

  // Folders under main root: folders first, then files sorted chronologically/alphabetically
  return names.sort((a, b) => {
    const aIsDir = !node[a].__file;
    const bIsDir = !node[b].__file;
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;

    return sortDir === 'desc'
      ? b.localeCompare(a, undefined, { numeric: true })
      : a.localeCompare(b, undefined, { numeric: true });
  });
}

function buildTreeNodes(node, parent, prefix = '', sortDir = '') {
  const isRoot = prefix === '';
  const currentSortDir = isRoot ? 'asc' : (sortDir || getDefaultFolderSort(prefix));
  const sortedNames = getSortedNames(node, prefix, currentSortDir);

  for (const name of sortedNames) {
    const child = node[name];
    const path = prefix ? prefix + '/' + name : name;
    const li = document.createElement('li');

    if (isRoot) {
      li.className = 'tree-node-item root-item';
      li.draggable = true;
      enableRootDrag(li, name, sortedNames);
    }

    if (child.__file) {
      const row = document.createElement('div');
      row.className = 'file-row';

      const link = document.createElement('a');
      link.href = encodeHashPath(child.__file.path);
      link.textContent = '📄 ' + name;
      link.classList.toggle('active', child.__file.path === selectedPath);
      link.addEventListener('click', (e) => {
        if (!e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {
          e.preventDefault();
          openRemoteFile(child.__file.path);
        }
      });
      row.appendChild(link);

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'file-copy-btn';
      copyBtn.title = 'Copy file content';
      copyBtn.setAttribute('aria-label', 'Copy ' + name + ' content');
      copyBtn.innerHTML = getCopyIconSvg(12);
      copyBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          if (child.__file.path === selectedPath && currentMarkdownText) {
            await copyTextToClipboard(currentMarkdownText);
            showCopiedFeedback(copyBtn);
          } else {
            const data = await requestJson('/api/markdown/file?path=' + encodeURIComponent(child.__file.path));
            await copyTextToClipboard(data.content);
            showCopiedFeedback(copyBtn);
          }
        } catch (err) {
          console.error(err);
        }
      });
      row.appendChild(copyBtn);

      li.appendChild(row);
    } else {
      const folderRow = document.createElement('div');
      folderRow.className = 'folder-row';

      const folder = document.createElement('div');
      folder.className = 'folder';
      folder.textContent = name;
      const isCollapsed = collapsedFolders.has(path);
      folder.classList.toggle('collapsed', isCollapsed);
      folder.classList.toggle('selected-parent', Boolean(selectedPath) && selectedPath.startsWith(path + '/'));
      folderRow.appendChild(folder);

      // Sort button on each folder under the main root (defaults to descending for reports/ & plans/)
      const thisFolderSort = folderSortDirs[path] || getDefaultFolderSort(path);
      if (!isRoot) {
        const sortBtn = document.createElement('button');
        sortBtn.type = 'button';
        sortBtn.className = 'row-sort-btn';
        sortBtn.title = 'Sort: ' + (thisFolderSort === 'asc' ? 'A-Z (click for Z-A)' : 'Z-A (click for A-Z)');
        sortBtn.setAttribute('aria-label', 'Sort ' + name + ': ' + (thisFolderSort === 'asc' ? 'ascending' : 'descending'));
        sortBtn.innerHTML = getSortIconSvg(thisFolderSort) + '<span>' + (thisFolderSort === 'asc' ? 'A-Z' : 'Z-A') + '</span>';
        sortBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const nextDir = thisFolderSort === 'asc' ? 'desc' : 'asc';
          folderSortDirs[path] = nextDir;
          try { localStorage.setItem('my_md_folder_sorts', JSON.stringify(folderSortDirs)); } catch {}
          renderTree();
        });
        folderRow.appendChild(sortBtn);
      }
      li.appendChild(folderRow);

      const children = document.createElement('ul');
      children.className = 'children';
      children.classList.toggle('collapsed', isCollapsed);
      folder.addEventListener('click', () => {
        const collapsed = folder.classList.toggle('collapsed');
        children.classList.toggle('collapsed', collapsed);
        if (collapsed) {
          collapsedFolders.add(path);
        } else {
          collapsedFolders.delete(path);
        }
      });
      buildTreeNodes(child, children, path, thisFolderSort);
      li.appendChild(children);
    }
    parent.appendChild(li);
  }
}

function enableRootDrag(item, name, siblingNames) {
  item.addEventListener('dragstart', event => {
    draggedRootName = name;
    item.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', name);
  });

  item.addEventListener('dragover', event => {
    if (!draggedRootName || draggedRootName === name) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = item.getBoundingClientRect();
    const isAfter = event.clientY > rect.top + rect.height / 2;
    item.classList.toggle('drop-before', !isAfter);
    item.classList.toggle('drop-after', isAfter);
  });

  item.addEventListener('dragleave', () => {
    item.classList.remove('drop-before', 'drop-after');
  });

  item.addEventListener('drop', event => {
    if (!draggedRootName || draggedRootName === name) return;
    event.preventDefault();
    event.stopPropagation();
    const isAfter = item.classList.contains('drop-after');
    item.classList.remove('drop-before', 'drop-after');

    let order = rootManualOrder.length ? [...rootManualOrder] : [...siblingNames];
    for (const s of siblingNames) {
      if (!order.includes(s)) order.push(s);
    }
    const fromIdx = order.indexOf(draggedRootName);
    if (fromIdx !== -1) order.splice(fromIdx, 1);
    const toIdx = order.indexOf(name);
    if (toIdx !== -1) {
      order.splice(isAfter ? toIdx + 1 : toIdx, 0, draggedRootName);
    } else {
      order.push(draggedRootName);
    }

    rootManualOrder = order;
    try { localStorage.setItem('my_md_root_order', JSON.stringify(rootManualOrder)); } catch {}
    draggedRootName = null;
    renderTree();
  });

  item.addEventListener('dragend', () => {
    draggedRootName = null;
    document.querySelectorAll('.tree .root-item').forEach(el => el.classList.remove('dragging', 'drop-before', 'drop-after'));
  });
}

function getNavigationReports(filePath) {
  const filtered = getFilteredDailyReports();
  if (filtered.hasDateFilter && !filtered.invalidRange && filtered.items.some(item => item.path === filePath)) {
    return filtered.items;
  }
  return dailyReports;
}

function buildDateNavInnerHtml(older, newer) {
  const prevAttrs = older
    ? 'data-nav-path="' + escapeHtml(older.path) + '" title="Previous report (' + escapeHtml(older.date) + ')" aria-label="Previous report: ' + escapeHtml(older.date) + '"'
    : 'aria-disabled="true" title="No older report" aria-label="Previous report unavailable"';
  const nextAttrs = newer
    ? 'data-nav-path="' + escapeHtml(newer.path) + '" title="Next report (' + escapeHtml(newer.date) + ')" aria-label="Next report: ' + escapeHtml(newer.date) + '"'
    : 'aria-disabled="true" title="Already on latest report" aria-label="Next report unavailable"';

  return '<button type="button" class="doc-nav-btn" ' + prevAttrs + '><span aria-hidden="true">‹</span> Prev</button>' +
    '<button type="button" class="doc-nav-btn" ' + nextAttrs + '>Next <span aria-hidden="true">›</span></button>';
}

function refreshActiveDocumentNav() {
  if (!selectedPath) return;
  const navGroup = mainEl.querySelector('.doc-date-nav');
  if (!navGroup) return;
  const navReports = getNavigationReports(selectedPath);
  const reportIndex = navReports.findIndex(item => item.path === selectedPath);
  if (reportIndex === -1) return;
  const newer = reportIndex > 0 ? navReports[reportIndex - 1] : null;
  const older = reportIndex < navReports.length - 1 ? navReports[reportIndex + 1] : null;
  navGroup.innerHTML = buildDateNavInnerHtml(older, newer);
}

function buildDocumentHeaderHtml(filePath) {
  const navReports = getNavigationReports(filePath);
  const reportIndex = navReports.findIndex(item => item.path === filePath);
  let dateNavHtml = '';
  if (reportIndex !== -1) {
    const newer = reportIndex > 0 ? navReports[reportIndex - 1] : null;
    const older = reportIndex < navReports.length - 1 ? navReports[reportIndex + 1] : null;

    dateNavHtml =
      '<div class="doc-date-nav" role="group" aria-label="Adjacent daily reports">' +
        buildDateNavInnerHtml(older, newer) +
      '</div>';
  }

  return '<div class="document-header">' +
    '<div class="document-path"><span class="doc-icon" aria-hidden="true">📄</span><span class="doc-name">' + escapeHtml(filePath) + '</span></div>' +
    '<div class="document-actions">' +
      dateNavHtml +
      '<button type="button" class="doc-copy-btn" id="docCopyBtn" title="Copy Markdown content" aria-label="Copy Markdown content">' +
        getCopyIconSvg(14) + '<span>Copy</span>' +
      '</button>' +
    '</div>' +
  '</div>';
}

async function openRemoteFile(path, { hashMode = 'push', closeOnMobile = true } = {}) {
  if (activeFetchController) activeFetchController.abort();
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  activeFetchController = controller;
  const token = ++activeLoadToken;

  renderLoading('Loading ' + path + '…');
  try {
    const data = await requestJson('/api/markdown/file?path=' + encodeURIComponent(path), { signal: controller?.signal });
    if (token !== activeLoadToken) return;
    if (activeFetchController === controller) activeFetchController = null;

    selectedPath = data.path;
    currentMarkdownText = data.content;
    if (hashMode === 'replace') syncUrlHash(data.path, { replace: true });
    else if (hashMode === 'push') syncUrlHash(data.path, { replace: false });

    const fileName = data.path.split('/').pop() || data.path;
    document.title = fileName + " · KEN'S-MD";

    renderTree();
    mainEl.innerHTML = '<article class="markdown">' + buildDocumentHeaderHtml(data.path) + renderMarkdown(data.content) + '</article>';
    mainEl.scrollTop = 0;
    await renderMermaidDiagrams();
    if (token !== activeLoadToken) return;
    if (closeOnMobile && isDrawerMode()) closeSidebar();
  } catch (error) {
    if (error && error.name === 'AbortError') return;
    if (token !== activeLoadToken) return;
    renderEmpty('<div class="error">' + escapeHtml(error.message) + '</div>');
  }
}

loadTree();
async function renderMermaidDiagrams() {
  const nodes = Array.from(document.querySelectorAll('.markdown .mermaid'));
  if (nodes.length === 0) return;

  if (typeof window.mermaid === 'undefined') {
    nodes.forEach(node => {
      node.classList.add('mermaid-error');
      node.textContent = 'Mermaid could not be loaded. Check your internet connection and reload the page.\n\n' + node.textContent;
    });
    return;
  }

  if (!mermaidInitialized) {
    window.mermaid.initialize({
      startOnLoad: false,
      theme: 'default'
    });
    mermaidInitialized = true;
  }

  // Render separately so one invalid diagram does not prevent the others.
  for (const node of nodes) {
    const source = node.textContent;
    try {
      node.removeAttribute('data-processed');
      await window.mermaid.run({ nodes: [node] });
    } catch (error) {
      node.removeAttribute('data-processed');
      node.classList.add('mermaid-error');
      node.textContent = 'Mermaid diagram error: ' + (error.message || String(error)) + '\n\n' + source;
    }
  }
}

function closeSidebar() {
  if (isDrawerMode()) {
    document.body.classList.remove('sidebar-open');
  } else {
    document.body.classList.add('sidebar-closed');
  }
  updateMenuButtonLabel();
}

function isDrawerMode() {
  return window.matchMedia('(max-width: 1023px)').matches;
}

function updateMenuButtonLabel() {
  const isOpen = isDrawerMode()
    ? document.body.classList.contains('sidebar-open')
    : !document.body.classList.contains('sidebar-closed');
  menuBtn.setAttribute('aria-label', isOpen ? 'Close sidebar' : 'Open sidebar');
  menuBtn.setAttribute('aria-expanded', String(isOpen));
}
updateMenuButtonLabel();

/* ---- lightweight markdown renderer ---- */
function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function closeList(listType) {
  return listType && listType !== 'task' ? '</' + listType + '>' : listType === 'task' ? '</ul>' : '';
}

function safeUrl(value) {
  const decoded = value.replace(/&amp;/g, '&');
  return /^(https?:\/\/|mailto:|#|\/[^/])/i.test(decoded) ? value : '#';
}

function renderInline(text) {
  text = escapeHtml(text);
  // Escaped characters: pull them aside so later patterns don't process them
  const esc = [];
  text = text.replace(/\\([\\`*_~\[\]#+\-.!<>()|])/g, (m, c) => {
    esc.push(c);
    return '\u0000' + (esc.length - 1) + '\u0000';
  });
  // Inline code (before other inline markup)
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Images (must run before links): ![alt](url), optional title
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (match, alt, url, title = '') => '<img src="' + safeUrl(url) + '" alt="' + alt + '" title="' + title + '">');
  // Footnote references: [^n]
  text = text.replace(/\[\^([^\]]+)\](?!\s*:)/g, '<a class="footnote-ref" href="#fn-$1" id="fnref-$1">$1</a>');
  // Bold
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Strikethrough
  text = text.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  // Italic
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label, url) => '<a href="' + safeUrl(url) + '" rel="noopener noreferrer">' + label + '</a>');
  // Restore escaped characters
  text = text.replace(/\u0000(\d+)\u0000/g, (m, i) => esc[+i] === '\\' ? '&#92;' : esc[+i]);
  return text;
}

function normalizeMermaidSource(source) {
  const firstLine = source.split('\n').find(line => line.trim() !== '') || '';
  if (!/^erDiagram\b/i.test(firstLine.trim())) return source;

  // Mermaid requires combined ER attribute keys to be comma-separated:
  // `bigint user_id PK FK` -> `bigint user_id PK, FK`.
  return source.replace(/\b(PK|FK|UK)(?:\s+(PK|FK|UK))+/g, match =>
    match.trim().split(/\s+/).join(', ')
  );
}

function renderMarkdown(md) {
  md = md.replace(/\r\n|\r/g, '\n');

  // Also support files that contain Mermaid source directly, without a
  // ```mermaid fence. This is useful for exported ERD files whose first
  // meaningful line is `erDiagram`.
  const firstMeaningfulLine = md.split('\n').find(line => line.trim() !== '');
  if (firstMeaningfulLine && /^(?:erDiagram|flowchart|graph|sequenceDiagram|classDiagram|stateDiagram(?:-v2)?|journey|gantt|pie|gitGraph|mindmap|timeline|quadrantChart|xychart-beta|sankey-beta|block-beta|packet-beta|architecture-beta)\b/i.test(firstMeaningfulLine.trim())) {
    return '<div class="mermaid">' + escapeHtml(normalizeMermaidSource(md)) + '</div>\n';
  }

  const lines = md.split('\n');
  let html = '';
  let inCode = false;
  let codeLines = [];
  let listType = null;
  let inQuote = false;
  let footnotes = {};
  let footnoteKeys = [];
  let currentLang = '';

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    if (/^```/.test(line)) {
      if (inCode) {
        const lang = currentLang || '';
        const isMermaid = lang.trim().toLowerCase() === 'mermaid';
        if (isMermaid) {
          html += '<div class="mermaid">' + escapeHtml(normalizeMermaidSource(codeLines.join('\n'))) + '</div>\n';
        } else {
          html += '<div class="code-block"><button type="button" class="code-copy-btn" title="Copy code" aria-label="Copy code">' + getCopyIconSvg(12) + '<span>Copy</span></button><pre><code>' + escapeHtml(codeLines.join('\n')) + '</code></pre></div>\n';
        }
        codeLines = [];
        currentLang = '';
        inCode = false;
      } else {
        currentLang = line.replace(/^```/, '').trim();
        inCode = true;
      }
      continue;
    }
    if (inCode) {
      codeLines.push(raw);
      continue;
    }
    if (line === '') {
      if (listType) { html += closeList(listType) + '\n'; listType = null; }
      if (inQuote) { html += '</blockquote>\n'; inQuote = false; }
      continue;
    }

    let m;
    if ((m = line.match(/^\[\^([^\]]+)\]:\s*(.+)$/))) {
      const key = m[1];
      footnotes[key] = m[2];
      footnoteKeys.push(key);
      continue;
    }
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
      closeBlocks();
      html += '<h' + m[1].length + '>' + renderInline(m[2]) + '</h' + m[1].length + '>\n';
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      closeBlocks();
      html += '<hr>\n';
      continue;
    }
    if (isTableHeader(line, lines[i + 1])) {
      closeBlocks();
      const headers = parseTableRow(line);
      const rows = [];
      i += 2;
      while (i < lines.length && isTableRow(lines[i].trim())) {
        rows.push(parseTableRow(lines[i].trim()));
        i++;
      }
      i--;
      html += renderTable(headers, rows);
      continue;
    }
    if ((m = line.match(/^>\s?(.*)$/))) {
      if (!inQuote) { html += '<blockquote>\n'; inQuote = true; }
      html += '<p>' + renderInline(m[1]) + '</p>\n';
      continue;
    }
    // Task lists (before regular lists)
    if ((m = line.match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/))) {
      if (listType && listType !== 'task') { html += closeList(listType); listType = null; }
      if (listType !== 'task') { html += '<ul class="task-list">\n'; listType = 'task'; }
      const checked = m[1].toLowerCase() === 'x' ? ' checked' : '';
      html += '<li><input type="checkbox"' + checked + ' disabled><span>' + renderInline(m[2]) + '</span></li>\n';
      continue;
    }
    if ((m = line.match(/^[-*+]\s+(.*)$/))) {
      if (listType && listType !== 'ul') { html += closeList(listType); listType = null; }
      if (listType !== 'ul') { html += '<ul>\n'; listType = 'ul'; }
      html += '<li>' + renderInline(m[1]) + '</li>\n';
      continue;
    }
    if ((m = line.match(/^\d+[.)]\s+(.*)$/))) {
      if (listType && listType !== 'ol') { html += closeList(listType); listType = null; }
      if (listType !== 'ol') { html += '<ol>\n'; listType = 'ol'; }
      html += '<li>' + renderInline(m[1]) + '</li>\n';
      continue;
    }

    closeBlocks();
    html += '<p>' + renderInline(line) + '</p>\n';
  }

  if (inCode) {
    const lang = currentLang || '';
    if (lang.trim().toLowerCase() === 'mermaid') {
      html += '<div class="mermaid">' + escapeHtml(normalizeMermaidSource(codeLines.join('\n'))) + '</div>\n';
    } else {
      html += '<div class="code-block"><button type="button" class="code-copy-btn" title="Copy code" aria-label="Copy code">' + getCopyIconSvg(12) + '<span>Copy</span></button><pre><code>' + escapeHtml(codeLines.join('\n')) + '</code></pre></div>\n';
    }
  }
  if (listType) html += closeList(listType) + '\n';
  if (inQuote) html += '</blockquote>\n';

  // Render footnotes section
  if (footnoteKeys.length > 0) {
    html += '<div class="footnotes"><h2>Footnotes</h2><ol>\n';
    for (const key of footnoteKeys) {
      html += '<li id="fn-' + key + '">' + renderInline(footnotes[key]) + ' <a href="#fnref-' + key + '" class="footnote-ref">&#8617;</a></li>\n';
    }
    html += '</ol></div>\n';
  }

  return html;

  function closeBlocks() {
    if (listType) { html += '</' + listType + '>\n'; listType = null; }
    if (inQuote) { html += '</blockquote>\n'; inQuote = false; }
  }
}

function isTableHeader(line, nextLine) {
  return isTableRow(line) && typeof nextLine === 'string' && isTableDelimiter(nextLine.trim());
}

function isTableRow(line) {
  return line.includes('|') && parseTableRow(line).length > 1;
}

function isTableDelimiter(line) {
  if (!isTableRow(line)) return false;
  return parseTableRow(line).every(cell => /^:?-{3,}:?$/.test(cell));
}

function parseTableRow(line) {
  return line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(cell => cell.trim());
}

function renderTable(headers, rows) {
  let html = '<table>\n<thead><tr>';
  for (const header of headers) {
    html += '<th>' + renderInline(header) + '</th>';
  }
  html += '</tr></thead>\n<tbody>\n';
  for (const row of rows) {
    html += '<tr>';
    for (let i = 0; i < headers.length; i++) {
      html += '<td>' + renderInline(row[i] || '') + '</td>';
    }
    html += '</tr>\n';
  }
  html += '</tbody>\n</table>\n';
  return html;
}

function renderEmpty(htmlContent) {
  mainEl.innerHTML = htmlContent;
}

function renderLoading(message) {
  mainEl.innerHTML = '<div class="loading"><span class="spinner" aria-hidden="true"></span><span>' + escapeHtml(message) + '</span></div>';
}

'use strict';

const menuBtn = document.getElementById('menuBtn');
const sidebarCloseBtn = document.getElementById('sidebarCloseBtn');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const searchInput = document.getElementById('searchInput');
const refreshBtn = document.getElementById('refreshBtn');
const treeEl = document.getElementById('tree');
const mainEl = document.getElementById('main');
const repositoryEl = document.getElementById('repository');
let files = [];
let selectedPath = '';
let mermaidInitialized = false;

let rootManualOrder = [];
let folderSortDirs = {};
const collapsedFolders = new Set();
let draggedRootName = null;

try {
  rootManualOrder = JSON.parse(localStorage.getItem('my_md_root_order') || '[]');
  folderSortDirs = JSON.parse(localStorage.getItem('my_md_folder_sorts') || '{}');
} catch {}

let currentMarkdownText = '';

function getCopyIconSvg(size = 14) {
  return '<svg class="copy-svg" viewBox="0 0 16 16" width="' + size + '" height="' + size + '" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25Z"></path><path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25Zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25Z"></path></svg>';
}

function getCheckIconSvg(size = 14) {
  return '<svg class="check-svg" viewBox="0 0 16 16" width="' + size + '" height="' + size + '" fill="currentColor"><path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z"></path></svg>';
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
    return '<svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor"><path d="M3.5 13.25a.75.75 0 0 0 1.5 0V5.56l1.72 1.72a.75.75 0 0 0 1.06-1.06l-3-3a.75.75 0 0 0-1.06 0l-3 3a.75.75 0 1 0 1.06 1.06l1.72-1.72v7.69zM10.25 3.5h3a.75.75 0 0 1 .58 1.22l-2.07 2.53h1.49a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1-.58-1.22l2.07-2.53h-1.49a.75.75 0 0 1 0-1.5zm.75 6.5a.75.75 0 0 0-1.5 0v3.25a.75.75 0 0 0 1.5 0V10z"/></svg>';
  }
  return '<svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor"><path d="M3.5 2.75a.75.75 0 0 1 1.5 0v7.69l1.72-1.72a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 1 1 1.06-1.06l1.72 1.72V2.75zM10.25 3.5h3a.75.75 0 0 1 .58 1.22l-2.07 2.53h1.49a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1-.58-1.22l2.07-2.53h-1.49a.75.75 0 0 1 0-1.5zm.75 6.5a.75.75 0 0 0-1.5 0v3.25a.75.75 0 0 0 1.5 0V10z"/></svg>';
}

menuBtn.addEventListener('click', () => {
  document.body.classList.toggle(isDrawerMode() ? 'sidebar-open' : 'sidebar-closed');
  updateMenuButtonLabel();
});
sidebarCloseBtn.addEventListener('click', closeSidebar);
sidebarOverlay.addEventListener('click', closeSidebar);
searchInput.addEventListener('input', renderTree);
refreshBtn.addEventListener('click', loadTree);

async function requestJson(url) {
  const response = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
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
    repositoryEl.textContent = data.repository + ' · ' + data.branch;
    renderTree();
    if (!selectedPath && files.length) await openRemoteFile(files[0].path);
  } catch (error) {
    treeEl.innerHTML = '<li class="error">' + escapeHtml(error.message) + '</li>';
    renderEmpty('<div class="error">' + escapeHtml(error.message) + '</div>');
  } finally {
    refreshBtn.disabled = false;
  }
}

function renderTree() {
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

function getSortedNames(node, prefix, sortDir = 'asc') {
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

  // Folders under main root: alphabet sort (folders first, then files)
  return names.sort((a, b) => {
    const aIsDir = !node[a].__file;
    const bIsDir = !node[b].__file;
    if (aIsDir !== bIsDir) return aIsDir ? -1 : 1; // folders first

    return sortDir === 'desc'
      ? b.localeCompare(a, undefined, { numeric: true })
      : a.localeCompare(b, undefined, { numeric: true });
  });
}

function buildTreeNodes(node, parent, prefix = '', sortDir = 'asc') {
  const isRoot = prefix === '';
  const currentSortDir = isRoot ? 'asc' : sortDir;
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
      link.textContent = '📄 ' + name;
      link.classList.toggle('active', child.__file.path === selectedPath);
      link.addEventListener('click', () => openRemoteFile(child.__file.path));
      row.appendChild(link);

      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'file-copy-btn';
      copyBtn.title = 'Copy file content';
      copyBtn.setAttribute('aria-label', 'Copy file content');
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
      folderRow.appendChild(folder);

      // Alphabet sort button on each folder under the main root
      const thisFolderSort = folderSortDirs[path] || 'asc';
      if (!isRoot) {
        const sortBtn = document.createElement('button');
        sortBtn.type = 'button';
        sortBtn.className = 'row-sort-btn';
        sortBtn.title = 'Sort: ' + (thisFolderSort === 'asc' ? 'A-Z (click for Z-A)' : 'Z-A (click for A-Z)');
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

async function openRemoteFile(path) {
  renderLoading('Loading ' + path + '…');
  try {
    const data = await requestJson('/api/markdown/file?path=' + encodeURIComponent(path));
    selectedPath = data.path;
    currentMarkdownText = data.content;
    renderTree();
    mainEl.innerHTML = '<article class="markdown">' +
      '<div class="document-header">' +
        '<div class="document-path"><span class="doc-icon">📄</span><span class="doc-name">' + escapeHtml(data.path) + '</span></div>' +
        '<button type="button" class="doc-copy-btn" id="docCopyBtn" title="Copy Markdown content" aria-label="Copy Markdown content">' +
          getCopyIconSvg(14) + '<span>Copy</span>' +
        '</button>' +
      '</div>' +
      renderMarkdown(data.content) +
    '</article>';
    await renderMermaidDiagrams();
    if (isDrawerMode()) closeSidebar();
  } catch (error) {
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
}

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

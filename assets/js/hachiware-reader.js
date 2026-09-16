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
  buildTreeNodes(toTree(visible), treeEl);
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

function buildTreeNodes(node, parent, prefix = '') {
  for (const name of Object.keys(node).filter(name => name !== '__file').sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))) {
    const child = node[name];
    const path = prefix ? prefix + '/' + name : name;
    const li = document.createElement('li');
    if (child.__file) {
      const link = document.createElement('a');
      link.textContent = '📄 ' + name;
      link.classList.toggle('active', child.__file.path === selectedPath);
      link.addEventListener('click', () => openRemoteFile(child.__file.path));
      li.appendChild(link);
    } else {
      const folder = document.createElement('div');
      folder.className = 'folder';
      folder.textContent = name;
      const children = document.createElement('ul');
      children.className = 'children';
      folder.addEventListener('click', () => {
        folder.classList.toggle('collapsed');
        children.classList.toggle('collapsed');
      });
      buildTreeNodes(child, children, path);
      li.append(folder, children);
    }
    parent.appendChild(li);
  }
}

async function openRemoteFile(path) {
  renderLoading('Loading ' + path + '…');
  try {
    const data = await requestJson('/api/markdown/file?path=' + encodeURIComponent(path));
    selectedPath = data.path;
    renderTree();
    mainEl.innerHTML = '<article class="markdown"><div class="document-path">' + escapeHtml(data.path) + '</div>' + renderMarkdown(data.content) + '</article>';
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
          html += '<pre><code>' + escapeHtml(codeLines.join('\n')) + '</code></pre>\n';
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
      html += '<pre><code>' + escapeHtml(codeLines.join('\n')) + '</code></pre>\n';
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

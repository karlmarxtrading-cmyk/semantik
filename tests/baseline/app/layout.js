/* Spatial PDF layout analysis. All source items remain traceable; no content is
 * discarded as a header, footer, equation or uncertain table. Coordinates are
 * PDF viewport coordinates at scale 1 (top-left origin). */

const median = values => {
  const a = values.filter(Number.isFinite).sort((x, y) => x - y);
  return a.length ? a[Math.floor(a.length / 2)] : 10;
};
const union = items => {
  const x = Math.min(...items.map(i => i.x));
  const y = Math.min(...items.map(i => i.y));
  return [x, y, Math.max(...items.map(i => i.x + i.width)) - x,
    Math.max(...items.map(i => i.y + i.height)) - y];
};
const headingWords = /^(?:\d+(?:\.\d+)*[.)]?\s+)?(?:abstract|abstrak|introduction|pendahuluan|background|latar belakang|methods?|methodology|metode|metodologi|materials(?: and methods)?|hasil(?: dan pembahasan)?|results?(?: and discussion)?|discussion|pembahasan|conclusions?|kesimpulan|references|referensi|daftar pustaka|bibliography|acknowledg(?:e)?ments?|appendix|lampiran|keywords?|kata kunci|limitations?|keterbatasan)\s*[:.]?$/i;
const referenceWords = /^(?:\d+(?:\.\d+)*[.)]?\s+)?(?:references|referensi|daftar pustaka|bibliography)\s*[:.]?$/i;

function joinItems(items) {
  let text = '';
  let previous;
  for (const item of items) {
    const value = String(item.text).replace(/[\r\n]+/g, ' ');
    const gap = previous ? item.x - (previous.x + previous.width) : 0;
    const space = previous && !/\s$/.test(text) && !/^\s|^[,.;:!?)}\]]/.test(value)
      && gap > Math.max(0.5, Math.min(previous.height, item.height) * 0.12);
    text += (space ? ' ' : '') + value;
    previous = item;
  }
  return text.trim();
}

function makeLine(items, column = 0) {
  items.sort((a, b) => a.x - b.x || a.sourceIndex - b.sourceIndex);
  const chunks = [];
  let chunk = [];
  for (const item of items) {
    const previous = chunk.at(-1);
    if (previous && item.x - previous.x - previous.width > Math.max(10, previous.height * 1.7)) {
      chunks.push(chunk); chunk = [];
    }
    chunk.push(item);
  }
  if (chunk.length) chunks.push(chunk);
  const bbox = union(items);
  return {items, text: joinItems(items), bbox, x: bbox[0], y: bbox[1],
    width: bbox[2], height: bbox[3], fontSize: median(items.map(i => i.fontSize || i.height)),
    bold: items.filter(i => i.bold).length > items.length / 2, column, rotated: items.some(i => i.rotated),
    cells: chunks.map(c => ({text: joinItems(c), x: c[0].x, bbox: union(c)}))};
}

function baselineLines(items) {
  const sorted = [...items].sort((a, b) => (a.baseline ?? a.y + a.height) - (b.baseline ?? b.y + b.height) || a.x - b.x);
  const groups = [];
  for (const item of sorted) {
    const baseline = item.baseline ?? item.y + item.height;
    let best;
    let distance = Infinity;
    for (let j = groups.length - 1; j >= Math.max(0, groups.length - 4); j--) {
      const group = groups[j];
      const delta = Math.abs(group.baseline - baseline);
      const smallScript = Math.min(item.height, group.height) < Math.max(item.height, group.height) * 0.8;
      const nearText = group.items.some(other => item.x <= other.x + other.width + Math.max(item.height, other.height)
        && item.x + item.width >= other.x - Math.max(item.height, other.height));
      const scriptAligned = smallScript && nearText && delta <= Math.max(item.height, group.height) * 0.8;
      if ((delta <= Math.max(1.5, Math.min(item.height, group.height) * 0.4) || scriptAligned) && delta < distance) {
        best = group; distance = delta;
      }
    }
    if (best) {
      best.items.push(item);
      best.height = Math.max(best.height, item.height);
    } else groups.push({baseline, height: item.height, items: [item]});
  }
  return groups.map(g => makeLine(g.items));
}

function inferColumnCut(lines, width, layout) {
  if (layout === 'single') return null;
  if (layout === 'columns' || layout === 'two-column') return width / 2;
  const votes = [];
  for (const line of lines) {
    for (let j = 1; j < line.items.length; j++) {
      const left = line.items[j - 1], right = line.items[j];
      const start = left.x + left.width, end = right.x;
      if (end - start >= Math.max(22, line.fontSize * 2) && start < width * 0.65 && end > width * 0.35
        && left.x < width * 0.48 && right.x > width * 0.46) {
        votes.push({start, end, center: (start + end) / 2});
      }
    }
  }
  if (votes.length < 3) {
    // Columns need not share a baseline (different paragraph spacing, dropped
    // capitals, footnotes). Look for two sustained, nonoverlapping prose bands.
    const leftBand = lines.filter(l => l.width < width * 0.5 && l.x < width * 0.3 && l.text.length >= 32);
    const rightBand = lines.filter(l => l.width < width * 0.5 && l.x > width * 0.42 && l.text.length >= 32);
    if (leftBand.length >= 3 && rightBand.length >= 3) {
      const leftEdge = Math.max(...leftBand.map(l => l.x + l.width));
      const rightEdge = Math.min(...rightBand.map(l => l.x));
      const bandCut = (leftEdge + rightEdge) / 2;
      if (rightEdge - leftEdge >= 15 && bandCut > width * 0.3 && bandCut < width * 0.7) return bandCut;
    }
    return null;
  }
  const cut = median(votes.map(v => v.center));
  const support = votes.filter(v => v.start < cut && v.end > cut).length;
  const left = lines.filter(l => l.items.some(i => i.x + i.width < cut)).length;
  const right = lines.filter(l => l.items.some(i => i.x >= cut)).length;
  // A table also has a central gutter. Require running prose on both sides so
  // short numeric table cells are not silently turned into newspaper columns.
  const proseLeft = lines.filter(l => l.items.filter(i => i.x + i.width < cut).map(i => i.text).join(' ').length >= 32).length;
  const proseRight = lines.filter(l => l.items.filter(i => i.x >= cut).map(i => i.text).join(' ').length >= 32).length;
  return support >= Math.max(3, Math.min(left, right) * 0.22) && proseLeft >= 3 && proseRight >= 3
    && cut > width * 0.3 && cut < width * 0.7 ? cut : null;
}

function readingOrder(lines, cut) {
  if (cut === null) return [...lines].sort((a, b) => a.y - b.y || a.x - b.x);
  const columns = [], spans = [];
  const crosses = line => line.items.some(i => i.x < cut - 2 && i.x + i.width > cut + 2);
  const bodySize = median(lines.map(l => l.fontSize));
  const spanYs = lines.filter(crosses).map(l => l.y).sort((a, b) => a - b);
  const rightYs = lines.filter(l => l.items.some(i => i.x >= cut)).map(l => l.y).sort((a, b) => a - b);
  const lowerBound = (array, value, strict = false) => {
    let left = 0, right = array.length;
    while (left < right) {
      const middle = (left + right) >>> 1;
      if (array[middle] < value || (strict && array[middle] === value)) left = middle + 1;
      else right = middle;
    }
    return left;
  };
  for (const line of lines) {
    const nextSpanY = spanYs[lowerBound(spanYs, line.y, true)] ?? Infinity;
    const rightBelow = (rightYs[lowerBound(rightYs, line.y)] ?? Infinity) < nextSpanY;
    const sectionAfterColumns = line.x < cut && !rightBelow
      && (headingWords.test(line.text) || line.fontSize >= bodySize * 1.25);
    if (crosses(line) || sectionAfterColumns) {
      spans.push(makeLine(line.items, -1));
    } else {
      const left = line.items.filter(i => i.x < cut), right = line.items.filter(i => i.x >= cut);
      if (left.length) columns.push(makeLine(left, 0));
      if (right.length) columns.push(makeLine(right, 1));
    }
  }
  spans.sort((a, b) => a.y - b.y);
  columns.sort((a, b) => a.y - b.y || a.x - b.x);
  const output = [];
  let cursor = 0;
  for (const span of [...spans, {y: Infinity}]) {
    const region = [];
    while (cursor < columns.length && columns[cursor].y < span.y) region.push(columns[cursor++]);
    output.push(...region.filter(l => l.column === 0), ...region.filter(l => l.column === 1));
    if (Number.isFinite(span.y)) output.push(span);
  }
  return output;
}

function classify(line, bodySize) {
  const text = line.text;
  if (headingWords.test(text)) return 'heading';
  if (/^(?:figure|fig\.?|gambar|table|tabel)\s*[\dIVX]+[.:(\s]/i.test(text)) return 'caption';
  const operators = (text.match(/[=∑∫√∞≤≥≠±×÷∂∇∏≈]/g) || []).length;
  const words = text.match(/[A-Za-z]{3,}/g) || [];
  if (operators && words.length <= 2 && text.length < 240) return 'formula';
  if (text.length < 160 && (line.fontSize >= bodySize * 1.25 || (line.bold && text.split(/\s+/).length < 14))) return 'heading';
  return 'paragraph';
}

function sameTable(a, b) {
  return a.column === b.column && a.cells.length >= 2 && b.cells.length >= 2
    && a.cells.length === b.cells.length && b.y - a.y < Math.max(a.height, b.height) * 3.6
    && a.cells.every((c, i) => Math.abs(c.x - b.cells[i].x) < Math.max(15, a.fontSize * 1.4));
}

/** Convert normalized PDF/OCR text items to source-traceable reading blocks. */
export function analyzeLayout(inputItems, {pageNumber = 1, width = 595, height = 842, layout = 'auto',
  source = 'pdf-text', referenceSection = false} = {}) {
  const items = inputItems.filter(i => typeof i.text === 'string' && i.text.trim()).map((item, i) => ({
    ...item, sourceIndex: Number.isInteger(item.sourceIndex) ? item.sourceIndex : i,
    height: Math.max(1, Number(item.height) || 10), width: Math.max(0, Number(item.width) || 0),
    x: Number(item.x) || 0, y: Number(item.y) || 0,
  }));
  if (!items.length) return {blocks: [], columnCount: 1, sourceItemCount: 0, coveredItemCount: 0, referenceSection, warnings: []};
  const bodySize = median(items.map(i => i.fontSize || i.height));
  const rotatedPage = items.filter(i => i.rotated).length > items.length * 0.8;
  const rows = rotatedPage ? [...items].sort((a, b) => a.sourceIndex - b.sourceIndex).map(i => makeLine([i])) : baselineLines(items);
  const cut = rotatedPage ? null : inferColumnCut(rows, width, layout);
  const lines = rotatedPage ? rows : readingOrder(rows, cut);
  const blocks = [];
  const warnings = [];
  let references = referenceSection;
  function addBlock(group, type, extra = {}) {
    const all = group.flatMap(l => l.items);
    const bbox = union(all);
    const issues = [];
    if (source === 'ocr') issues.push('Teks hasil OCR perlu dibandingkan dengan halaman asli.');
    if (all.some(i => i.rotated)) issues.push('Teks berotasi: periksa urutan baca.');
    if (group.some(l => /[a-z]-$/i.test(l.text))) issues.push('Pemenggalan kata pada akhir baris dipertahankan; periksa ejaan.');
    if (group.some(line => line.items.some(item => item.height < line.fontSize * 0.8
      && Math.abs((item.baseline ?? item.y + item.height) - median(line.items.map(i => i.baseline ?? i.y + i.height))) > 1.5))) {
      issues.push('Posisi superskrip atau subskrip tersimpan pada gambar; teks ekstraksi berupa teks datar.');
    }
    if (type === 'formula') issues.push('Persamaan dipertahankan dari sumber; konversi LaTeX tidak ditebak.');
    const text = group.map(l => l.text).join(type === 'table' ? '\n' : ' ');
    blocks.push({id: `p${String(pageNumber).padStart(4, '0')}-b${String(blocks.length + 1).padStart(4, '0')}`,
      page: pageNumber, type, text, bbox, source, column: group[0].column,
      rotated: all.some(i => i.rotated),
      confidence: source === 'ocr' ? Math.min(...all.map(i => i.confidence ?? 50)) / 100 : (cut === null ? 0.96 : 0.84),
      issues, sourceItemIds: all.map(i => i.sourceIndex), translatable: !['formula', 'reference', 'table'].includes(type),
      sourceLines: group.map(l => l.text), ...extra});
  }
  let paragraph = [];
  function flush() {
    if (paragraph.length) addBlock(paragraph, references ? 'reference' : 'paragraph');
    paragraph = [];
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.cells.length >= 2 && sameTable(line, lines[i + 1] || {cells: []})) {
      const table = [line];
      while (i + 1 < lines.length && sameTable(table.at(-1), lines[i + 1])) table.push(lines[++i]);
      if (table.length >= 2) {
        flush();
        addBlock(table, 'table', {rows: table.map(l => l.cells.map(c => c.text)),
          issues: ['Tabel dipertahankan sebagai baris sumber dan gambar. Periksa batas sel serta label kolom.'],
          confidence: 0.72, translatable: false});
        continue;
      }
    }
    const type = classify(line, bodySize);
    if (type !== 'paragraph') {
      flush();
      if (referenceWords.test(line.text)) references = true;
      else if (type === 'heading' && headingWords.test(line.text)) references = false;
      addBlock([line], type, type === 'heading' ? {level: line.fontSize >= bodySize * 1.6 ? 1 : 2} : {});
      continue;
    }
    const previous = paragraph.at(-1);
    if (previous && (previous.rotated || line.rotated || previous.column !== line.column || line.y < previous.y
      || line.y - previous.y > Math.max(previous.height, line.height) * 1.9
      || Math.abs(line.fontSize - previous.fontSize) > bodySize * 0.22
      || (line.x - previous.x > bodySize * 1.5 && /[.!?:]$/.test(previous.text)))) flush();
    paragraph.push(line);
  }
  flush();
  const covered = new Set(blocks.flatMap(b => b.sourceItemIds));
  if (covered.size !== new Set(items.map(i => i.sourceIndex)).size) throw new Error('Analisis layout tidak mencakup semua elemen teks.');
  if (cut !== null) warnings.push('Layout dua kolom terdeteksi. Periksa urutan baca di pratinjau.');
  if (items.some(i => i.text.includes('\uFFFD'))) warnings.push('Sebagian font tidak memiliki pemetaan Unicode lengkap; bandingkan dengan gambar halaman.');
  return {blocks, columnCount: cut === null ? 1 : 2, columnCut: cut, sourceItemCount: items.length,
    coveredItemCount: covered.size, referenceSection: references, warnings};
}

/** Parse Tesseract TSV without HTML insertion and retain confidence per word. */
export function itemsFromTsv(tsv, scale = 1) {
  const items = [];
  const rows = String(tsv || '').split(/\r?\n/);
  for (const row of rows.slice(1)) {
    const cells = row.split('\t');
    if (cells.length < 12 || cells[0] !== '5') continue;
    const text = cells.slice(11).join('\t').trim();
    if (!text) continue;
    const [x, y, width, height, confidence] = cells.slice(6, 11).map(Number);
    if (![x, y, width, height].every(Number.isFinite)) continue;
    items.push({text, x: x / scale, y: y / scale, width: width / scale, height: height / scale,
      fontSize: height / scale, baseline: (y + height) / scale,
      confidence: Math.max(0, confidence), sourceIndex: items.length});
  }
  return items;
}

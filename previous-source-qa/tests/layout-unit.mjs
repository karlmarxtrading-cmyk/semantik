import assert from 'node:assert/strict';
import {analyzeLayout, itemsFromTsv} from '../app/layout.js';

let index = 0;
const item = (text, x, y, width = text.length * 5, size = 10) => ({text, x, y, width,
  height: size, fontSize: size, baseline: y + size, sourceIndex: index++});
const checks = [];
function test(name, run) { run(); checks.push(name); }

test('two columns keep the entire left column before the right, bounded by spanning content', () => {
  index = 0;
  const input = [item('A scientific article across both columns', 40, 20, 500, 20),
    item('The introduction spans the complete width of the page.', 40, 60, 500)];
  for (let n = 0; n < 4; n++) {
    input.push(item(`LEFT-${n} The participants completed a survey.`, 40, 120 + 22 * n, 220));
    input.push(item(`RIGHT-${n} Replication will support these findings.`, 330, 120 + 22 * n, 220));
  }
  input.push(item('Conclusion', 40, 280, 180, 16), item('This conclusion spans the two columns on the page.', 40, 310, 500));
  const result = analyzeLayout(input, {width: 600, height: 800});
  assert.equal(result.columnCount, 2);
  const text = result.blocks.map(b => b.text).join('\n');
  assert.ok(text.indexOf('LEFT-3') < text.indexOf('RIGHT-0'));
  assert.ok(text.indexOf('RIGHT-3') < text.indexOf('Conclusion'));
  assert.equal(result.coveredItemCount, input.length);
});

test('numeric tables do not masquerade as newspaper columns', () => {
  index = 0;
  const input = [item('Measured results', 40, 30, 200, 18)];
  for (const [row, values] of [['Group', 'n', 'Mean'], ['Control', '60', '12.50'], ['Treatment', '65', '14.25'], ['Combined', '125', '13.40']].entries()) {
    for (let col = 0; col < 3; col++) input.push(item(values[col], 40 + col * 180, 100 + row * 20, values[col].length * 5));
  }
  const result = analyzeLayout(input, {width: 600, height: 800});
  assert.equal(result.columnCount, 1);
  const table = result.blocks.find(b => b.type === 'table');
  assert.ok(table);
  assert.deepEqual(table.rows[2], ['Treatment', '65', '14.25']);
  assert.equal(result.coveredItemCount, input.length);
});

test('staggered column baselines retain column reading order', () => {
  index = 0;
  const input = [];
  for (let n = 0; n < 4; n++) {
    input.push(item(`LEFT-${n} This study collected valid survey responses.`, 40, 100 + n * 22, 220));
    input.push(item(`RIGHT-${n} Replication is needed in other regions.`, 330, 106 + n * 22, 220));
  }
  const result = analyzeLayout(input, {width: 600, height: 800});
  assert.equal(result.columnCount, 2);
  const text = result.blocks.map(b => b.text).join('\n');
  assert.ok(text.indexOf('LEFT-3') < text.indexOf('RIGHT-0'));
  assert.equal(result.coveredItemCount, input.length);
});

test('scientific notation and bibliography text stay unchanged and source traceable', () => {
  index = 0;
  const input = [item('E = mc²; α = 0.05', 40, 40, 150), item('References', 40, 100, 120, 16),
    item('Li, B. (2025). https://doi.org/10.5678/test.12', 40, 140, 420),
    item('Appendix', 40, 200, 140, 16), item('This additional paragraph can be translated.', 40, 240, 420)];
  const result = analyzeLayout(input);
  assert.equal(result.blocks[0].type, 'formula');
  assert.equal(result.blocks[0].text, 'E = mc²; α = 0.05');
  assert.equal(result.blocks[2].type, 'reference');
  assert.equal(result.blocks[2].translatable, false);
  assert.equal(result.blocks.at(-1).type, 'paragraph');
  assert.equal(result.blocks.at(-1).translatable, true);
  assert.deepEqual(result.blocks.flatMap(b => b.sourceItemIds).sort((a, b) => a - b), input.map(i => i.sourceIndex));
});

test('OCR TSV parses confidence and coordinates while keeping HTML-looking strings inert', () => {
  const tsv = 'level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n'
    + '5\t1\t1\t1\t1\t1\t20\t40\t60\t24\t93.4\t<script>\n';
  const items = itemsFromTsv(tsv, 2);
  assert.equal(items.length, 1);
  assert.equal(items[0].text, '<script>');
  assert.equal(items[0].x, 10);
  assert.equal(items[0].height, 12);
  assert.equal(items[0].confidence, 93.4);
});

test('small raised equation glyphs stay with their mathematical line and remain traceable', () => {
  index = 0;
  const input = [item('E = mc', 40, 50, 40, 12), item('2', 80, 47, 4, 7)];
  const result = analyzeLayout(input);
  assert.equal(result.blocks.length, 1);
  assert.equal(result.blocks[0].type, 'formula');
  assert.equal(result.coveredItemCount, 2);
  assert.equal(result.blocks[0].text, 'E = mc2');
});

test('rotated pages keep source items separate and retain their source order', () => {
  index = 0;
  const input = [{...item('Rotated Article', 50, 100, 120), rotated: true},
    {...item('This rotated page contains 27 observations.', 50, 90, 290), rotated: true}];
  const result = analyzeLayout(input);
  assert.equal(result.blocks.length, 2);
  assert.equal(result.blocks[0].text, 'Rotated Article');
  assert.ok(result.blocks.every(b => b.issues.some(i => i.includes('berotasi'))));
});

test('large but bounded two-column input keeps complete coverage and column order', () => {
  index = 0;
  const input = [];
  for (let n = 0; n < 10_000; n++) {
    const left = n < 3 ? `LEFT-${n} Sustained prose anchors the left column.` : `L${n}`;
    const right = n < 3 ? `RIGHT-${n} Sustained prose anchors the right column.` : `R${n}`;
    input.push(item(left, 40, n * 15, 220), item(right, 330, n * 15, 220));
  }
  const result = analyzeLayout(input, {width: 600, height: 150_010});
  assert.equal(result.columnCount, 2);
  assert.equal(result.coveredItemCount, 20_000);
  const text = result.blocks.map(b => b.text).join('\n');
  assert.ok(text.indexOf('L9999') < text.indexOf('RIGHT-0'));
});

console.log(JSON.stringify({suite: 'layout-unit', passed: checks.length, checks}, null, 2));

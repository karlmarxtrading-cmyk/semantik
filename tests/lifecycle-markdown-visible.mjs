import assert from 'node:assert/strict';
import {markdownText,createMarkdown} from '../app/app/export.js';
import {marked} from '../tools/node_modules/marked/lib/marked.esm.js';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const cases=[
 ['unordered-hyphen','- Local estimates remain uncertain.\n- Regulatory agencies review evidence.'],
 ['unordered-plus','+ Positive effect\n+ Negative control'],
 ['ordered-label','1. First scientific claim.\n2. Second scientific claim.'],
 ['internal-line-list','Paragraph introduction.\n1. Literal label.\n- Literal dash.'],
 ['parenthesis-label','1) Literal identifier\n2) Another identifier'],
 ['three-space-indent','   - Literal source bullet\n   3. Literal label'],
 ['four-space-indent','    - Literal *words* and |x|\n    1. source label (A)'],
 ['tab-indent','\t- Literal *words* and |x|\n\t1. source label (A)'],
 ['horizontal-rule','Before\n---\nAfter'],
 ['spaced-horizontal-rule','Before\n- - -\nAfter'],
 ['setext-heading','A literal line\n===\nContinuation'],
 ['decimal-control','1.5 μM was measured.\n-5.2 mg is a signed value.\n+3.0 °C is positive.'],
 ['ordered-boundaries','0. Zero label\n999999999. Nine digit label\n1000000000. Ten digit value'],
 ['other-markup','# Literal heading\n* Literal star\n[Reference]: text\n> literal quote\n~~~'],
 ['safe-html','<script>unsafe()</script> & literal &amp;'],
 ['math-literal','Solve $|𝑥| < 1$ over ℝ.\n1. Preserve ∅ and (−∞, 0).'],
 ['multiline-math','Text\n$$\nx < 1\n$$\n2. Source label.'],
 ['bare-markers','-\n+\n1.\n===\n---'],
];
// CP19 deliberately renders explicit math instead of code; those two cases now
// run through real KaTeX in cp19-markdown.mjs, including MathML assertions.
const literalCases=cases.filter(([id])=>!['math-literal','multiline-math'].includes(id));
const rows=literalCases.map(([id,source])=>({id,source,markdown:markdownText(source),html:marked.parse(markdownText(source))}));
for(const row of rows){assert.ok(!/<script\b/i.test(row.html));assert.ok(!/<(?:ul|ol|hr|h[1-6])(?:\s|>)/i.test(row.html),row.id);}
const table={id:'table',type:'table',page:1,text:'Label | Value',target:'Label | Value',rows:[['Label','Value'],['A','1. item']],translatedRows:[['Label','Value'],['A','1. item']],status:'translated'};
const doc={numPages:1,pages:[{number:1}],blocks:[table],assets:[]};const html=marked.parse(createMarkdown({document:doc,status:'complete'},'translation'));assert.ok(html.includes('<table>'));assert.ok(html.includes('1. item'));
await writeFile(new URL('../evidence/lifecycle/markdown-visible-render-cases.json',import.meta.url),JSON.stringify({sourceSha256:createHash('sha256').update(await readFile(new URL('../app/app/export.js',import.meta.url))).digest('hex'),method:'actual markdownText + marked17 renderer; expected original source characters, only whitespace normalized in separate HTMLParser check',rows,generatedTableStillStructured:true},null,2));
console.log('16 literal prose render cases prepared; math covered by cp19-markdown.mjs');

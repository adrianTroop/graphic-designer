const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const json = p => fs.readFile(p, 'utf8').then(JSON.parse);

function checkKeys(value, allowed, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  for (const k of Object.keys(value)) if (!allowed.includes(k)) throw new Error(`Unknown ${label} field: ${k}`);
}
function string(value, label, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new Error(`${label} must be non-empty text, at most ${max} characters`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) throw new Error(`${label} contains control characters`);
}
function validateBrief(brief) {
  checkKeys(brief, ['schema_version','job_id','brand','family','language','content_status','headline','event','notice','fact_sources','icon'], 'brief');
  if (brief.schema_version !== 1) throw new Error('schema_version must be 1');
  for (const k of ['job_id','brand']) {
    string(brief[k], k, 80);
    if (!SLUG.test(brief[k])) throw new Error(`${k} must be a lowercase hyphenated ID`);
  }
  if (!['operational','guide','monthly-cover'].includes(brief.family)) throw new Error('Unsupported family: automatic rendering supports operational, guide and monthly-cover only');
  if (!['TC-EN','SC-EN','EN'].includes(brief.language)) throw new Error('language must be TC-EN, SC-EN or EN');
  if (!['demo','provided-facts'].includes(brief.content_status)) throw new Error('content_status must be demo or provided-facts');
  checkKeys(brief.headline, ['primary','secondary'], 'headline');
  string(brief.headline.primary, 'headline.primary', 110);
  string(brief.headline.secondary, 'headline.secondary', 180);
  checkKeys(brief.event, ['name','date_display','venue'], 'event');
  for (const k of ['name','date_display','venue']) string(brief.event[k], `event.${k}`, 120);
  string(brief.notice, 'notice', 240);
  if (!Array.isArray(brief.fact_sources) || brief.fact_sources.some(v => typeof v !== 'string')) throw new Error('fact_sources must be an array of URLs');
  for (const v of brief.fact_sources) {
    let u; try { u = new URL(v); } catch { throw new Error('fact_sources must contain valid URLs'); }
    if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password) throw new Error('fact_sources must be public HTTP(S) URLs without credentials');
  }
  if (brief.content_status === 'provided-facts' && !brief.fact_sources.length) throw new Error('provided-facts requires at least one source URL; supplied URLs are recorded, not automatically fact-checked');
  if (brief.icon !== undefined && (!SLUG.test(brief.icon) || brief.family !== 'operational')) throw new Error('icon must be an asset ID and is supported only for operational covers');
  return brief;
}

async function containedFile(base, relative) {
  if (typeof relative !== 'string' || path.isAbsolute(relative)) throw new Error('Expected a relative package path');
  const realBase = await fs.realpath(base);
  const target = await fs.realpath(path.resolve(base, relative));
  if (!target.startsWith(realBase + path.sep)) throw new Error('Asset path escapes its brand package');
  return target;
}

async function loadBrand(id, root = ROOT) {
  if (!SLUG.test(id)) throw new Error('Invalid brand ID');
  const dir = await containedFile(path.join(root, 'brands'), id);
  const brand = await json(path.join(dir, 'brand.json'));
  if (brand.schema_version !== 1 || brand.id !== id) throw new Error('Brand ID or schema version mismatch');
  const manifestPath = await containedFile(dir, brand.asset_manifest);
  const manifest = await json(manifestPath);
  return { brand, dir, assetRoot: path.dirname(manifestPath), assets: manifest.assets };
}

async function prepare(input, root = ROOT) {
  const brief = validateBrief(input);
  const pkg = await loadBrand(brief.brand, root);
  const template = pkg.brand.templates[brief.family];
  if (!template) throw new Error(`Brand ${brief.brand} has no ${brief.family} template`);
  if (!Array.isArray(template.canvas) || template.canvas.some(v => !Number.isInteger(v) || v < 200 || v > 8000)) throw new Error('Invalid template canvas');
  const ids = [pkg.brand.logo, template.frame, template.panel, template.overlay, brief.icon || template.icon].filter(Boolean);
  const used = [];
  for (const id of ids) {
    const record = pkg.assets.find(a => a.id === id);
    if (!record) throw new Error(`Unknown asset: ${id}`);
    const file = record.files.find(f => f.endsWith('.png'));
    if (!file) throw new Error(`Missing PNG export: ${id}`);
    const resolved = await containedFile(pkg.assetRoot, file);
    const bytes = await fs.readFile(resolved);
    const meta = await sharp(bytes).metadata();
    if (!meta.hasAlpha) throw new Error(`Asset has no alpha channel: ${id}`);
    if (id === pkg.brand.logo && pkg.brand.logo_width > meta.width) throw new Error('Logo placement exceeds native raster width; supply a larger source');
    const vectorFile = record.files.find(f => f.endsWith('.svg'));
    let vector = null;
    if (vectorFile) {
      vector = await fs.readFile(await containedFile(pkg.assetRoot,vectorFile),'utf8');
      if (/<script\b|<foreignObject\b|<!DOCTYPE|(?:href|src)\s*=\s*["'](?:https?:|file:|\/\/)/i.test(vector)) throw new Error(`Unsupported active or external SVG content: ${id}`);
    }
    used.push({ ...record, file:vectorFile||file, bytes, vector, width:meta.width, height:meta.height, sha256:crypto.createHash('sha256').update(vector||bytes).digest('hex') });
  }
  return { brief, ...pkg, template, used };
}

async function measure(text, font, size, bold) {
  if (!text) return 0;
  const metadata = await sharp({text:{text:esc(text),font:`${font}${bold ? ' Bold' : ''} ${size}`,dpi:72}}).metadata();
  return metadata.width;
}
async function wrapped(text, width, font, size, bold) {
  const lines = [];
  for (const paragraph of text.split('\n')) {
    if (!paragraph) { lines.push(''); continue; }
    const tokens = paragraph.match(/[^\S\n]+|[A-Za-z0-9][A-Za-z0-9'’.,:/-]*|[^\s]/gu) || [];
    let line = '';
    for (let token of tokens) {
      if (!line) token = token.trimStart();
      if (await measure(line + token, font, size, bold) <= width) { line += token; continue; }
      if (line.trim()) { lines.push(line.trimEnd()); line = ''; }
      token = token.trim();
      if (await measure(token, font, size, bold) <= width) { line = token; continue; }
      for (const char of token) {
        if (await measure(line + char, font, size, bold) > width && line) { lines.push(line); line = ''; }
        if (await measure(char, font, size, bold) > width) throw new Error('Text box narrower than one glyph');
        line += char;
      }
    }
    if (line) lines.push(line.trimEnd());
  }
  return lines;
}

async function textGroup(id, content, box, options, checks) {
  const {font, colour, align='center', max=68, min=32, bold=false} = options;
  const [x,y,w,h] = box;
  if (![x,y,w,h].every(Number.isFinite) || w <= 0 || h <= 0) throw new Error(`Invalid box: ${id}`);
  let lines, size;
  for (size=max; size>=min; size-=2) {
    lines = await wrapped(content,w-12,font,size,bold);
    if (lines.length*size*1.24 <= h) break;
  }
  if (size < min) throw new Error(`${id} overflows its text box at the minimum ${min}px size; shorten or restructure the copy`);
  const baseX = align==='center' ? x+w/2 : x;
  const baseline = y + (h-lines.length*size*1.24)/2 + size;
  checks.push({id,box,font_size:size,line_count:lines.length,status:'fits'});
  return `<g id="${id}" data-component="editable-text"><text font-family="${esc(font)}" font-size="${size}" font-weight="${bold ? 700 : 400}" fill="${colour}" text-anchor="${align==='center' ? 'middle' : 'start'}">${lines.map((line,i)=>`<tspan x="${baseX}" y="${baseline+i*size*1.24}">${esc(line)}</tspan>`).join('')}</text></g>`;
}

async function artwork(job) {
  const {brief,brand,template:t,used} = job;
  const [w,h] = t.canvas;
  const font = process.env.DESIGNER_FONT || brand.font_family;
  const checks = [];
  const placed = new Map(used.map(a=>[a.id,a]));
  const asset = (id,box,group) => {
    const a=placed.get(id);
    let drawing;
    if (a.vector) {
      drawing=a.vector.replace(/<\?xml[^>]*\?>/g,'').replace(/<svg\b([^>]*)>/,(_,attrs)=>`<svg ${attrs.replace(/\s(?:x|y|width|height)="[^"]*"/g,'')} x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}">`);
    } else {
      drawing=`<image x="${box[0]}" y="${box[1]}" width="${box[2]}" height="${box[3]}" preserveAspectRatio="xMidYMid meet" href="data:image/png;base64,${a.bytes.toString('base64')}"/>`;
    }
    return `<g id="${group}" data-asset-id="${esc(id)}" data-provenance="${esc(a.status)}">${drawing}</g>`;
  };
  const parts = [`<g id="background"><rect width="${w}" height="${h}" fill="${t.background}"/></g>`];
  if (t.frame) parts.push(asset(t.frame,[0,0,w,h],'frame'));
  if (t.panel) parts.push(asset(t.panel,[0,0,w,h],'information-panel'));
  if (t.overlay) parts.push(asset(t.overlay,[0,0,w,h],'court-motif'));
  const logo = placed.get(brand.logo);
  parts.push(asset(brand.logo,[...brand.logo_position,brand.logo_width,brand.logo_width*logo.height/logo.width],'venue-logo'));
  const monthly=brief.family==='monthly-cover';
  const darkText=brand.tokens.ink;
  const align=monthly?'left':'center';
  parts.push(await textGroup('event-header',brief.event.name,t.header,{font,colour:brief.family==='operational'?darkText:'#FFFFFF',max:38,min:26,align,bold:true},checks));
  if (t.icon) parts.push(asset(brief.icon||t.icon,t.icon_box,'service-icon'));
  parts.push(await textGroup('primary-headline',brief.headline.primary,t.primary,{font,colour:monthly?'#FFFFFF':darkText,max:monthly?94:78,min:56,align,bold:true},checks));
  parts.push(await textGroup('english-support',brief.headline.secondary,t.secondary,{font,colour:monthly?'#FFFFFF':brand.tokens.secondary,max:44,min:30,align},checks));
  parts.push(await textGroup('event-facts',`${brief.event.date_display}\n${brief.event.venue}`,t.facts,{font,colour:monthly?'#FFFFFF':darkText,max:32,min:26,align},checks));
  parts.push(await textGroup('notice',brief.notice,t.footer,{font,colour:'#FFFFFF',max:22,min:18,align:monthly?'left':'center'},checks));
  const badge = brief.content_status==='demo'?'DESIGN SAMPLE':'DRAFT · REVIEW PENDING';
  parts.push(`<g id="review-label"><rect x="660" y="55" width="355" height="52" rx="26" fill="#FFFFFF" fill-opacity="0.92"/><text x="837.5" y="89" text-anchor="middle" font-family="${esc(font)}" font-size="23" fill="#3B3B3B">${badge}</text></g>`);
  return {svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><title>${esc(brief.headline.primary)}</title><desc>Review draft. Editable text and separately grouped source assets. Raster assets retain their source resolution.</desc>${parts.join('\n')}</svg>`,checks,font};
}

async function render(input, {root=ROOT, outputRoot=path.join(root,'jobs')}={}) {
  const job = await prepare(input,root);
  const {svg,checks,font} = await artwork(job);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const meta=await sharp(png).metadata();
  if (meta.width!==job.template.canvas[0] || meta.height!==job.template.canvas[1]) throw new Error('Export dimensions differ from template');
  await fs.mkdir(outputRoot,{recursive:true});
  const destination = path.join(outputRoot,job.brief.job_id);
  const staging = await fs.mkdtemp(path.join(outputRoot,'.draft-'));
  const cleanAssets=job.used.map(({bytes,vector,...a})=>a);
  const manifest={schema_version:1,job_id:job.brief.job_id,brand:job.brief.brand,family:job.brief.family,canvas:job.template.canvas,created_at:new Date().toISOString(),review_state:'pending',content_status:job.brief.content_status,font,font_status:job.brand.font_status,evidence:job.template.evidence,assets:cleanAssets,outputs:['artwork.svg','artwork.png','caption.txt','alt-text.txt','qa.json','review.html'],fact_sources:job.brief.fact_sources};
  const qa={mechanical_status:'passed',dimensions:[meta.width,meta.height],text_boxes:checks,asset_count:cleanAssets.length,manual_checks_pending:['Visual comparison with reference','Font and CJK glyph appearance on this system','Readability at placement size','Event facts and translation','Asset approval and any required credits'],review_state:'pending'};
  const caption=[job.brief.headline.primary,job.brief.headline.secondary,'',job.brief.event.name,job.brief.event.date_display,job.brief.event.venue,'',job.brief.notice,...(job.brief.content_status==='demo'?['','DESIGN SAMPLE — not a live event announcement.']:[])].join('\n')+'\n';
  const alt=`${job.brand.name} ${job.brief.family} design draft: ${job.brief.headline.primary}. ${job.brief.headline.secondary}. ${job.brief.event.date_display}. ${job.brief.event.venue}.`;
  const review=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(job.brief.job_id)} — design review</title><style>body{margin:0;background:#f3f1ed;color:#24262b;font:16px/1.5 system-ui}main{max-width:1100px;margin:40px auto;padding:0 24px}h1{font-size:32px}section{display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,.7fr);gap:36px}img{width:100%;box-shadow:0 8px 30px #0002}a{color:#9a1645}pre{white-space:pre-wrap;background:white;padding:20px}small{color:#68666c}@media(max-width:650px){section{display:block}}</style><main><small>DRAFT · HUMAN REVIEW PENDING</small><h1>${esc(job.brief.headline.primary)}</h1><section><a href="artwork.png"><img src="artwork.png" alt="${esc(alt)}"></a><div><p>${esc(job.brief.headline.secondary)}</p><p>Mechanical checks passed. Visually inspect the artwork and verify facts before treating it as ready.</p><p><a href="artwork.svg">Editable SVG</a> · <a href="artwork.png">PNG</a> · <a href="manifest.json">Manifest</a> · <a href="qa.json">QA</a></p><h2>Caption draft</h2><pre>${esc(caption)}</pre><h2>Alt text draft</h2><p>${esc(alt)}</p><p>Font: ${esc(font)}. Source and redraw statuses are recorded in the manifest.</p></div></section></main></html>`;
  try {
    await Promise.all([
      fs.writeFile(path.join(staging,'artwork.svg'),svg),fs.writeFile(path.join(staging,'artwork.png'),png),
      fs.writeFile(path.join(staging,'brief.json'),JSON.stringify(job.brief,null,2)+'\n'),
      fs.writeFile(path.join(staging,'manifest.json'),JSON.stringify(manifest,null,2)+'\n'),
      fs.writeFile(path.join(staging,'qa.json'),JSON.stringify(qa,null,2)+'\n'),
      fs.writeFile(path.join(staging,'caption.txt'),caption),fs.writeFile(path.join(staging,'alt-text.txt'),alt+'\n'),
      fs.writeFile(path.join(staging,'review.html'),review)
    ]);
    // Reserve the destination exclusively so a concurrent render cannot overwrite a prior job.
    await fs.mkdir(destination);
    try {
      for (const file of await fs.readdir(staging)) await fs.rename(path.join(staging,file),path.join(destination,file));
    } catch (error) { await fs.rm(destination,{recursive:true,force:true}); throw error; }
  } catch (error) {
    if (error.code==='EEXIST') throw new Error(`Job ${job.brief.job_id} already exists. Use a new versioned job_id.`);
    throw error;
  } finally { await fs.rm(staging,{recursive:true,force:true}); }
  return {destination,manifest,qa};
}

module.exports={ROOT,esc,validateBrief,containedFile,loadBrand,prepare,artwork,render};

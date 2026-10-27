const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require('sharp');

const ROOT = path.resolve(__dirname, '..');
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FIELD = /^[a-z][a-z0-9_]*$/;
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const readJSON = p => fs.readFile(p, 'utf8').then(JSON.parse);
function object(value, allowed, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object`);
  if (allowed) for (const key of Object.keys(value)) if (!allowed.includes(key)) throw new Error(`Unknown ${label} field: ${key}`);
}
function text(value, label, max=1000, empty=false) {
  if (typeof value !== 'string' || (!empty && !value.trim()) || value.length > max) throw new Error(`${label} must be text ${empty?'':'with content '}of at most ${max} characters`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) throw new Error(`${label} contains control characters`);
}
function slug(value,label) {
  if (typeof value !== 'string' || value.length>80 || !SLUG.test(value)) throw new Error(`${label} must be a lowercase hyphenated ID`);
}
function validateBrief(b) {
  object(b,['schema_version','job_id','brand','template','locales','content_status','content','assets','fact_sources','caption','alt_text'],'brief');
  if(b.schema_version!==2) throw new Error('Brief schema_version must be 2; see docs/migration-v2.md');
  for(const k of ['job_id','brand','template']) slug(b[k],k);
  if(!Array.isArray(b.locales)||!b.locales.length||b.locales.length>8) throw new Error('locales must contain 1–8 BCP 47 language tags');
  try { if(b.locales.some(l=>typeof l!=='string')) throw new Error(); Intl.getCanonicalLocales(b.locales); } catch { throw new Error('locales must be valid BCP 47 language tags, such as en, es or zh-Hant'); }
  if(!['demo','provided-facts'].includes(b.content_status)) throw new Error('content_status must be demo or provided-facts');
  object(b.content,null,'content');
  for(const [k,v] of Object.entries(b.content)) {if(!FIELD.test(k)) throw new Error(`Invalid content field: ${k}`);text(v,`content.${k}`,5000,true);}
  object(b.assets||{},null,'assets');
  for(const [k,v] of Object.entries(b.assets||{})) {if(!FIELD.test(k)) throw new Error('Invalid asset binding');slug(v,`assets.${k}`);}
  if(!Array.isArray(b.fact_sources)) throw new Error('fact_sources must be an array');
  for(const v of b.fact_sources) {let u;try {u=new URL(v);}catch {throw new Error('Invalid fact source URL');} if(!['http:','https:'].includes(u.protocol)||u.username||u.password) throw new Error('Fact sources must use HTTP(S) without credentials');}
  if(b.content_status==='provided-facts'&&!b.fact_sources.length) throw new Error('provided-facts requires a source URL; sources are recorded, not automatically verified');
  for(const k of ['caption','alt_text']) if(b[k]!==undefined) text(b[k],k,10000,true);
  return b;
}
async function containedFile(base,relative) {
  if(typeof relative!=='string'||path.isAbsolute(relative)) throw new Error('Expected a relative package path');
  const realBase=await fs.realpath(base);const result=await fs.realpath(path.resolve(base,relative));
  if(!result.startsWith(realBase+path.sep)) throw new Error('Asset path escapes its brand package');
  return result;
}
function colour(value,tokens) {
  const c=typeof value==='string'&&value.startsWith('$')?tokens[value.slice(1)]:value;
  if(typeof c!=='string'||!(/^(#[0-9a-f]{3}|#[0-9a-f]{6}|#[0-9a-f]{8}|none)$/i.test(c))) throw new Error(`Invalid or missing colour token: ${value}`);
  return c;
}
function box(value,canvas,label,allowZero=false) {
  if(!Array.isArray(value)||value.length!==4||value.some(x=>!Number.isFinite(x))) throw new Error(`Invalid box: ${label}`);
  const [x,y,w,h]=value;
  if(x<0||y<0||w<(allowZero?0:1)||h<(allowZero?0:1)||x+w>canvas[0]||y+h>canvas[1]) throw new Error(`Box outside canvas or empty: ${label}`);
}
function validateBrand(brand) {
  object(brand,['schema_version','id','name','status','design_guide','asset_manifest','typography','tokens','templates'],'brand');
  if(brand.schema_version!==2) throw new Error('Brand schema_version must be 2');
  slug(brand.id,'brand.id');text(brand.name,'brand.name',160);text(brand.status,'brand.status',300);
  object(brand.typography,['family','status'],'typography');text(brand.typography.family,'font family',160);text(brand.typography.status,'font status',500);
  object(brand.tokens,null,'tokens');for(const v of Object.values(brand.tokens)) colour(v,{});
  object(brand.templates,null,'templates');if(!Object.keys(brand.templates).length) throw new Error('Brand needs at least one template');
  for(const [name,t] of Object.entries(brand.templates)) {
    slug(name,'template name');object(t,['description','canvas','background','evidence','fields','layers','review_label'],'template');
    text(t.description,'template.description',500);
    if(!Array.isArray(t.canvas)||t.canvas.length!==2||t.canvas.some(v=>!Number.isInteger(v)||v<200||v>8000)) throw new Error('Invalid template canvas');
    colour(t.background,brand.tokens);
    if(!Array.isArray(t.evidence)||!t.evidence.length||t.evidence.some(v=>typeof v!=='string'||!v.trim())) throw new Error('Template needs evidence references or a declared proposed-design record');
    object(t.fields,null,'fields');
    for(const [k,f] of Object.entries(t.fields)) {
      if(!FIELD.test(k)) throw new Error(`Invalid field name: ${k}`);
      object(f,['required','max_length'],'field definition');
      if(typeof f.required!=='boolean'||!Number.isInteger(f.max_length)||f.max_length<1||f.max_length>5000) throw new Error(`Invalid field definition: ${k}`);
    }
    if(!Array.isArray(t.layers)||!t.layers.length||t.layers.length>100) throw new Error('Template needs 1–100 layers');
    const ids=new Set();const consumed=new Set();
    for(const l of t.layers) {
      object(l,['id','type','box','fill','stroke','stroke_width','radius','opacity','field','text','font_size','min_font_size','weight','align','valign','direction','line_height','asset','asset_field','optional','when_field'],'layer');
      slug(l.id,'layer.id');if(['background','review-label','review-label-background'].includes(l.id)) throw new Error('Reserved layer ID');if(ids.has(l.id)) throw new Error(`Duplicate layer ID: ${l.id}`);ids.add(l.id);
      if(!['rect','ellipse','line','text','asset'].includes(l.type)) throw new Error(`Unsupported layer type: ${l.type}`);
      box(l.box,t.canvas,l.id,l.type==='line');
      if(l.when_field!==undefined&&!Object.hasOwn(t.fields,l.when_field)) throw new Error('Unknown conditional field');
      if(l.fill!==undefined) colour(l.fill,brand.tokens);if(l.stroke!==undefined) colour(l.stroke,brand.tokens);
      if(l.opacity!==undefined&&(!Number.isFinite(l.opacity)||l.opacity<0||l.opacity>1)) throw new Error('Opacity must be 0–1');
      if(l.radius!==undefined&&(!Number.isFinite(l.radius)||l.radius<0)) throw new Error('Radius must be nonnegative');
      if(l.stroke_width!==undefined&&(!Number.isFinite(l.stroke_width)||l.stroke_width<=0)) throw new Error('Stroke width must be positive');
      if(l.type==='text') {
        if((l.field!==undefined)===(l.text!==undefined)) throw new Error('Text layer needs exactly one of field or text');
        if(l.field!==undefined) {if(!Object.hasOwn(t.fields,l.field)) throw new Error(`Unknown layer field: ${l.field}`);consumed.add(l.field);} else text(l.text,'static text',5000);
        if(!Number.isFinite(l.font_size)||!Number.isFinite(l.min_font_size)||l.min_font_size<10||l.font_size<l.min_font_size||l.font_size>600) throw new Error('Invalid text font size range');
        if(![400,500,600,700,800].includes(l.weight||400)) throw new Error('Unsupported font weight');
        if(!['left','center','right'].includes(l.align||'left')||!['top','middle','bottom'].includes(l.valign||'top')) throw new Error('Invalid text alignment');
        if(!['ltr','rtl'].includes(l.direction||'ltr')) throw new Error('Invalid text direction');
        if(l.line_height!==undefined&&(!Number.isFinite(l.line_height)||l.line_height<1||l.line_height>2)) throw new Error('line_height must be 1–2');
        colour(l.fill,brand.tokens);
      }
      if(l.type==='asset') {
        if((l.asset!==undefined)===(l.asset_field!==undefined)) throw new Error('Asset layer needs one asset ID or asset_field');
        if(l.asset) slug(l.asset,'asset ID');
        if(l.asset_field&&!FIELD.test(l.asset_field)) throw new Error('Invalid asset field');
        if(l.optional!==undefined&&typeof l.optional!=='boolean') throw new Error('optional must be boolean');
      }
    }
    for(const k of Object.keys(t.fields)) if(!consumed.has(k)) throw new Error(`Unused template field: ${k}`);
    object(t.review_label,['box','fill','colour','font_size'],'review_label');box(t.review_label.box,t.canvas,'review label');
    colour(t.review_label.fill,brand.tokens);colour(t.review_label.colour,brand.tokens);
    if(!Number.isFinite(t.review_label.font_size)||t.review_label.font_size<10) throw new Error('Invalid review label font size');
  }
  return brand;
}
async function loadBrand(id,root=ROOT) {
  slug(id,'brand ID');const dir=await containedFile(path.join(root,'brands'),id);
  const brand=validateBrand(await readJSON(path.join(dir,'brand.json')));
  if(brand.id!==id) throw new Error('Brand ID differs from directory');
  await containedFile(dir,brand.design_guide);
  const manifestPath=await containedFile(dir,brand.asset_manifest);const manifest=await readJSON(manifestPath);
  if(!Array.isArray(manifest.assets)) throw new Error('Asset manifest needs an assets array');
  const seen=new Set();for(const a of manifest.assets) {slug(a.id,'asset ID');if(seen.has(a.id)) throw new Error('Duplicate asset ID');seen.add(a.id);if(!['logo','icon','photo','graphic'].includes(a.kind)||!Array.isArray(a.files)||!a.files.length) throw new Error('Invalid asset kind or files');text(a.status,'asset status',500);text(a.source,'asset source',2000);}
  return {brand,dir,assetRoot:path.dirname(manifestPath),assets:manifest.assets};
}
function safeSvg(svg) {
  if(/<script\b|<foreignObject\b|<!DOCTYPE|<!ENTITY|<\?xml-stylesheet|\son[a-z]+\s*=|@import/i.test(svg)) throw new Error('Active SVG content is not supported');
  for(const m of svg.matchAll(/(?:href|src)\s*=\s*["']([^"']*)["']/gi)) if(!/^(#|data:image\/(png|jpeg|webp);base64,)/i.test(m[1])) throw new Error('External SVG references are not supported');
  for(const m of svg.matchAll(/url\s*\(([^)]*)\)/gi)) if(!/^["']?#[^"']+["']?$/.test(m[1].trim())) throw new Error('External SVG URLs are not supported');
  if(!/<svg\b[^>]*>[\s\S]*<\/svg>\s*$/.test(svg.trim())) throw new Error('Invalid SVG root');
  return svg;
}
async function prepare(input,root=ROOT) {
  const brief=validateBrief(input);const pkg=await loadBrand(brief.brand,root);
  const t=pkg.brand.templates[brief.template];if(!t) throw new Error(`Unknown template ${brief.template} for brand ${brief.brand}`);
  for(const k of Object.keys(brief.content)) if(!Object.hasOwn(t.fields,k)) throw new Error(`Unknown content field for this template: ${k}`);
  for(const [k,f] of Object.entries(t.fields)) {if(f.required&&!brief.content[k]?.trim()) throw new Error(`Missing required content: ${k}`);if(brief.content[k]!==undefined) text(brief.content[k],`content.${k}`,f.max_length,!f.required);}
  const bindings=new Set(t.layers.filter(l=>l.asset_field).map(l=>l.asset_field));
  for(const k of Object.keys(brief.assets||{})) if(!bindings.has(k)) throw new Error(`Unknown asset binding: ${k}`);
  const ids=[];
  for(const l of t.layers.filter(l=>l.type==='asset'&&(!l.when_field||brief.content[l.when_field]?.trim()))) {const id=l.asset||brief.assets?.[l.asset_field];if(!id&&!l.optional) throw new Error(`Missing asset binding: ${l.asset_field}`);if(id&&!ids.includes(id)) ids.push(id);}
  const used=[];
  for(const id of ids) {
    const a=pkg.assets.find(r=>r.id===id);if(!a) throw new Error(`Unknown asset: ${id}`);
    const file=a.files.find(f=>f.endsWith('.svg'))||a.files.find(f=>/\.(png|jpe?g|webp)$/i.test(f));if(!file) throw new Error(`No supported asset format: ${id}`);
    const bytes=await fs.readFile(await containedFile(pkg.assetRoot,file));const vector=file.endsWith('.svg')?safeSvg(bytes.toString('utf8')):null;
    const meta=await sharp(bytes).metadata();if(!meta.width||!meta.height) throw new Error(`Missing dimensions: ${id}`);
    if(a.kind==='logo') {
      const stats=await sharp(bytes).ensureAlpha().stats();
      if(stats.channels[stats.channels.length-1].min!==0) throw new Error(`Logo ${id} needs a transparent canvas`);
    }
    for(const l of t.layers.filter(l=>l.type==='asset'&&(l.asset||brief.assets?.[l.asset_field])===id)) {
      if(!vector&&a.kind==='logo'&&Math.min(l.box[2]/meta.width,l.box[3]/meta.height)>1) throw new Error(`Logo ${id} exceeds its native raster size`);
    }
    used.push({...a,file,bytes,vector,width:meta.width,height:meta.height,mime:meta.format==='jpeg'?'image/jpeg':`image/${meta.format}`,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
  }
  return {brief,...pkg,template:t,used};
}
async function measure(value,font,size,weight) {
  if(!value) return 0;
  return (await sharp({text:{text:esc(value),font:`${font}${weight>=600?' Bold':''} ${size}`,dpi:72}}).metadata()).width;
}
async function wrap(value,width,font,size,weight,locale) {
  const segmenter=new Intl.Segmenter(locale,{granularity:'word'});const graphemes=new Intl.Segmenter(locale,{granularity:'grapheme'});const lines=[];
  for(const paragraph of value.split('\n')) {
    if(!paragraph){lines.push('');continue;}let line='';
    for(const {segment} of segmenter.segment(paragraph)) {
      let token=line?segment:segment.trimStart();
      if(await measure(line+token,font,size,weight)<=width){line+=token;continue;}
      if(line.trim()){lines.push(line.trimEnd());line='';}token=token.trim();
      if(await measure(token,font,size,weight)<=width){line=token;continue;}
      for(const {segment:char} of graphemes.segment(token)) {
        if(await measure(line+char,font,size,weight)>width&&line){lines.push(line);line='';}
        if(await measure(char,font,size,weight)>width) throw new Error('Text box narrower than one grapheme');line+=char;
      }
    }
    if(line)lines.push(line.trimEnd());
  }
  return lines;
}
async function textLayer(l,value,font,tokens,locale,checks) {
  if(!value)return '';
  const [x,y,w,h]=l.box;const weight=l.weight||400;const leading=l.line_height||1.2;let lines,size=l.font_size;
  while(true) {
    lines=await wrap(value,w-8,font,size,weight,locale);
    if(lines.length*size*leading<=h)break;
    if(size===l.min_font_size) throw new Error(`${l.id} overflows at minimum ${size}px; shorten or restructure the text`);
    size=Math.max(l.min_font_size,size-2);
  }
  const align=l.align||'left';const rtl=l.direction==='rtl';
  const px=align==='center'?x+w/2:align==='right'?x+w:x;
  const anchor=align==='center'?'middle':((align==='right')!==rtl?'end':'start');
  const spare=h-lines.length*size*leading;const offset=l.valign==='middle'?spare/2:l.valign==='bottom'?spare:0;
  checks.push({id:l.id,box:l.box,font_size:size,line_count:lines.length,status:'fits'});
  return `<g id="${l.id}" data-component="editable-text"><text font-family="${esc(font)}" font-size="${size}" font-weight="${weight}" fill="${colour(l.fill,tokens)}" text-anchor="${anchor}" direction="${rtl?'rtl':'ltr'}">${lines.map((s,i)=>`<tspan x="${px}" y="${y+offset+size+i*size*leading}">${esc(s)}</tspan>`).join('')}</text></g>`;
}
function assetLayer(layer,a) {
  const [x,y,w,h]=layer.box;let body;
  if(a.vector) {
    let svg=a.vector.replace(/<\?xml[^>]*\?>/g,'').trim();
    // Namespace IDs per placement so repeated gradient/mask assets do not collide.
    const prefix=`${layer.id}--`;
    svg=svg.replace(/\bid\s*=\s*(['"])(.*?)\1/g,(_,q,id)=>`id=${q}${prefix}${id}${q}`).replace(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g,(_,q,id)=>`url(${q}#${prefix}${id}${q})`).replace(/(href\s*=\s*['"])#([^'"]*)/g,(_,start,id)=>`${start}#${prefix}${id}`);
    body=svg.replace(/<svg\b([^>]*)>/,(_,attrs)=>`<svg${attrs.replace(/\s(?:x|y|width|height|preserveAspectRatio)\s*=\s*(['"])[\s\S]*?\1/g,'')} x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet">`);
  } else body=`<image x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid meet" href="data:${a.mime};base64,${a.bytes.toString('base64')}"/>`;
  return `<g id="${layer.id}" data-asset-id="${a.id}" data-provenance="${esc(a.status)}" opacity="${layer.opacity??1}">${body}</g>`;
}
async function artwork(job) {
  const {brief,brand,template:t,used}=job;const [w,h]=t.canvas;const font=process.env.DESIGNER_FONT||brand.typography.family;const checks=[];
  const placed=new Map(used.map(a=>[a.id,a]));const parts=[`<g id="background"><rect width="${w}" height="${h}" fill="${colour(t.background,brand.tokens)}"/></g>`];
  for(const l of t.layers) {
    if(l.when_field&&!brief.content[l.when_field]?.trim()) continue;
    const [x,y,lw,lh]=l.box;const styles=`fill="${colour(l.fill||'none',brand.tokens)}" stroke="${colour(l.stroke||'none',brand.tokens)}" stroke-width="${l.stroke_width||1}" opacity="${l.opacity??1}"`;
    if(l.type==='text')parts.push(await textLayer(l,l.field?brief.content[l.field]:l.text,font,brand.tokens,brief.locales[0],checks));
    if(l.type==='asset'){const a=placed.get(l.asset||brief.assets?.[l.asset_field]);if(a)parts.push(assetLayer(l,a));}
    if(l.type==='rect')parts.push(`<g id="${l.id}"><rect x="${x}" y="${y}" width="${lw}" height="${lh}" rx="${l.radius||0}" ${styles}/></g>`);
    if(l.type==='ellipse')parts.push(`<g id="${l.id}"><ellipse cx="${x+lw/2}" cy="${y+lh/2}" rx="${lw/2}" ry="${lh/2}" ${styles}/></g>`);
    if(l.type==='line')parts.push(`<g id="${l.id}"><line x1="${x}" y1="${y}" x2="${x+lw}" y2="${y+lh}" ${styles}/></g>`);
  }
  const r=t.review_label;const [rx,ry,rw,rh]=r.box;
  parts.push(`<g id="review-label-background"><rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${colour(r.fill,brand.tokens)}"/></g>`);
  parts.push(await textLayer({id:'review-label',box:r.box,font_size:r.font_size,min_font_size:r.font_size,align:'center',valign:'middle',fill:r.colour},brief.content_status==='demo'?'DESIGN SAMPLE':'DRAFT / REVIEW',font,brand.tokens,brief.locales[0],checks));
  return {svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><title>${esc(brand.name+' / '+brief.template)}</title><desc>Draft artwork. Each configured layer remains separate; source raster images retain their original format.</desc>${parts.join('\n')}</svg>`,checks,font};
}
async function writeExclusive(directory,files) {
  await fs.mkdir(path.dirname(directory),{recursive:true});const staging=await fs.mkdtemp(path.join(path.dirname(directory),'.draft-'));
  try {
    await Promise.all(Object.entries(files).map(async([name,content])=>{const p=path.join(staging,name);await fs.mkdir(path.dirname(p),{recursive:true});await fs.writeFile(p,content);}));
    await fs.mkdir(directory);
    try {for(const name of await fs.readdir(staging)) await fs.rename(path.join(staging,name),path.join(directory,name));}
    catch(e){await fs.rm(directory,{recursive:true,force:true});throw e;}
  }catch(e){if(e.code==='EEXIST')throw new Error(`${path.basename(directory)} already exists; choose a new versioned ID`);throw e;}
  finally{await fs.rm(staging,{recursive:true,force:true});}
}
async function render(input,{root=ROOT,outputRoot=path.join(root,'jobs')}={}) {
  const job=await prepare(input,root);const {svg,checks,font}=await artwork(job);const png=await sharp(Buffer.from(svg)).png().toBuffer();const meta=await sharp(png).metadata();
  if(meta.width!==job.template.canvas[0]||meta.height!==job.template.canvas[1])throw new Error('Export dimensions mismatch');
  const b=job.brief;const content=Object.values(b.content).filter(Boolean);const caption=b.caption??content.join('\n\n');const alt=b.alt_text??`${job.brand.name} design draft. ${content.join('. ')}`;
  const assets=job.used.map(({bytes,vector,...a})=>a);
  const manifest={schema_version:2,job_id:b.job_id,brand:b.brand,template:b.template,locales:b.locales,canvas:job.template.canvas,created_at:new Date().toISOString(),review_state:'pending',content_status:b.content_status,font,font_status:job.brand.typography.status,evidence:job.template.evidence,assets,fact_sources:b.fact_sources};
  const qa={mechanical_status:'passed',dimensions:[meta.width,meta.height],text_boxes:checks,asset_count:assets.length,manual_checks_pending:['Visual hierarchy and reference comparison','Font and script shaping','Readability at placement size','Claims, facts and translations','Asset ownership and approvals'],review_state:'pending'};
  const review=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(b.job_id)}</title><style>body{margin:0;background:#f5f5f3;color:#202522;font:16px/1.5 system-ui}main{max-width:1100px;margin:40px auto;padding:0 24px}section{display:grid;grid-template-columns:minmax(0,1fr) minmax(250px,.7fr);gap:32px}img{width:100%}a{color:#2d5c40}pre{white-space:pre-wrap;background:white;padding:18px}@media(max-width:650px){section{display:block}}</style><main><p>DRAFT / REVIEW PENDING</p><h1>${esc(job.brand.name)} · ${esc(b.template)}</h1><section><a href="artwork.png"><img src="artwork.png" alt="${esc(alt)}"></a><div><p>Mechanical checks passed. Visual and factual review remains pending.</p><p><a href="artwork.svg">Editable SVG</a> · <a href="artwork.png">PNG</a> · <a href="manifest.json">Manifest</a> · <a href="qa.json">QA</a></p><h2>Caption draft</h2><pre>${esc(caption)}</pre><h2>Alt text draft</h2><p>${esc(alt)}</p><p>Font: ${esc(font)}</p></div></section></main></html>`;
  const destination=path.join(outputRoot,b.job_id);const j=v=>JSON.stringify(v,null,2)+'\n';
  await writeExclusive(destination,{'artwork.svg':svg,'artwork.png':png,'brief.json':j(b),'manifest.json':j(manifest),'qa.json':j(qa),'caption.txt':caption+'\n','alt-text.txt':alt+'\n','review.html':review});
  return {destination,manifest,qa};
}
async function initBrand(id,name,{root=ROOT}={}) {
  slug(id,'brand ID');text(name,'brand name',160);
  const seed=path.join(ROOT,'brands','_template');const brand=await readJSON(path.join(seed,'brand.json'));brand.id=id;brand.name=name;validateBrand(brand);
  const brief=await readJSON(path.join(seed,'example-brief.json'));brief.brand=id;brief.job_id=`${id.slice(0,65)}-sample-v01`;
  const guide=(await fs.readFile(path.join(seed,'design.md'),'utf8')).replaceAll('{{brand_name}}',name).replaceAll('{{brand_id}}',id);
  const destination=path.join(root,'brands',id);const j=v=>JSON.stringify(v,null,2)+'\n';
  await writeExclusive(destination,{'brand.json':j(brand),'design.md':guide,'assets/asset-manifest.json':j({assets:[]}),'example-brief.json':j(brief)});
  return {destination,brief:path.join(destination,'example-brief.json')};
}
module.exports={ROOT,esc,validateBrief,validateBrand,containedFile,loadBrand,prepare,artwork,render,initBrand};

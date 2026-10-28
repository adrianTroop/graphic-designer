const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {ROOT, loadBrand, containedFile, writeExclusive} = require('./designer.cjs');

const LIMITS = Object.freeze({design_guide:12000, image_style:600});
const json = value => JSON.stringify(value,null,2)+'\n';

function exactObject(value, keys, label) {
  if(!value||typeof value!=='object'||Array.isArray(value)) throw new Error(`${label} must be an object`);
  for(const key of Object.keys(value)) if(!keys.includes(key)) throw new Error(`Unknown ${label} field: ${key}`);
}
function validateText(value, field) {
  if(typeof value!=='string'||!value.trim()) throw new Error(`${field} must contain text`);
  if(value.length>LIMITS[field]) throw new Error(`${field} is ${value.length} UTF-16 code units; maximum ${LIMITS[field]}. Edit the source; text was not truncated.`);
  if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) throw new Error(`${field} contains control characters`);
  if(/!\s*\[|<\s*(?:img|picture|svg|iframe|script)\b|data:image\//i.test(value)) throw new Error(`${field} contains image or active markup. Keep visual references in the full brand guide and asset library.`);
  return value;
}
function palette(config, brand) {
  if(!Array.isArray(config)||!config.length||config.length>32) throw new Error('colours must contain 1–32 ordered entries, with the primary colour first');
  const tokens=new Set();
  return config.map((entry,i)=>{
    exactObject(entry,['name','token','role'],'colour');
    if(typeof entry.name!=='string'||!entry.name.trim()||entry.name.length>120||/[\r\n\t]/.test(entry.name)) throw new Error('Colour name must be a single line of at most 120 characters');
    if(!['primary','secondary','accent','background','text'].includes(entry.role)) throw new Error('Invalid colour role');
    if((i===0)!==(entry.role==='primary')) throw new Error('Only the first colour must have role primary');
    if(typeof entry.token!=='string'||!Object.hasOwn(brand.tokens,entry.token)||tokens.has(entry.token)) throw new Error('Colour tokens must exist in brand.json and appear only once');
    tokens.add(entry.token);
    let hex=brand.tokens[entry.token];
    if(!/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(hex)) throw new Error('Workspace colours must be opaque #RGB or #RRGGBB tokens');
    if(hex.length===4) hex='#'+[...hex.slice(1)].map(c=>c+c).join('');
    return {name:entry.name,role:entry.role,hex:hex.toUpperCase(),token:entry.token};
  });
}

async function prepareWorkspace(id,{root=ROOT}={}) {
  const {brand,dir}=await loadBrand(id,root);
  const configPath=await containedFile(dir,'workspace-settings.json');
  const config=JSON.parse(await fs.readFile(configPath,'utf8'));
  exactObject(config,['schema_version','design_guide_file','image_style_file','colours'],'workspace settings');
  if(config.schema_version!==1) throw new Error('Workspace settings schema_version must be 1');
  const sources={};
  for(const [field,file] of [['design_guide',config.design_guide_file],['image_style',config.image_style_file]]) {
    sources[field]=validateText(await fs.readFile(await containedFile(dir,file),'utf8'),field);
  }
  const heading=brand.typography.heading||brand.typography.family;
  const body=brand.typography.body||brand.typography.family;
  for(const font of [heading,body]) if(/[\r\n\t]/.test(font)) throw new Error('Workspace font names must be a single line');
  const counts=Object.fromEntries(Object.entries(sources).map(([key,value])=>[key,value.length]));
  const sha256=Object.fromEntries(Object.entries(sources).map(([key,value])=>[key,crypto.createHash('sha256').update(value).digest('hex')]));
  return {
    schema_version:1,
    target:'workspace-brand-guidelines',
    brand:{id:brand.id,name:brand.name,status:brand.status},
    review_state:'pending',
    fields:{...sources,brand_colours:palette(config.colours,brand),heading_font:heading,body_font:body},
    validation:{limits:LIMITS,counts,count_unit:'UTF-16 code units, including whitespace; conservative browser-input convention',sha256},
    provenance:{design_guide_file:config.design_guide_file,image_style_file:config.image_style_file,colour_source:'brand.json tokens, in workspace-settings.json order',font_source:'brand.json typography; heading/body fall back to family',font_status:brand.typography.status},
    notes:['Paste-ready files only; no workspace settings have been changed.','Visual references and transparent assets remain in the brand package.','Limits follow the supplied settings screenshot. No target application API or import format is assumed.','Font installation, licensing, language coverage and target-app substitution require review.']
  };
}

async function exportWorkspace(id,revision,{root=ROOT,outputRoot=path.join(root,'exports')}={}) {
  if(typeof revision!=='string'||revision.length>80||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(revision)) throw new Error('Export revision must be a lowercase hyphenated ID');
  const settings=await prepareWorkspace(id,{root});
  settings.revision=revision;
  const f=settings.fields;
  const files={
    'DESIGN.md':f.design_guide,
    'IMAGE_STYLE.txt':f.image_style,
    'BRAND_COLOURS.txt':f.brand_colours.map((c,i)=>`${i+1}. ${c.name} | ${c.hex} | ${c.role}`).join('\n')+'\n',
    'FONTS.txt':`Heading font: ${f.heading_font}\nBody font: ${f.body_font}\n`,
    'workspace-settings.json':json(settings),
    'README.md':`# Workspace brand settings\n\nBrand: ${settings.brand.name}\n\nStatus: ${settings.brand.status}\n\nThese files match the separate fields in the supplied Brand guidelines screen. They do not change the workspace automatically.\n\n| Screen field | File | Paste or enter |\n| --- | --- | --- |\n| Design guide | [DESIGN.md](DESIGN.md) | Entire raw file: ${settings.validation.counts.design_guide} / 12,000 |\n| Image style | [IMAGE_STYLE.txt](IMAGE_STYLE.txt) | Entire raw file: ${settings.validation.counts.image_style} / 600 |\n| Brand colours | [BRAND_COLOURS.txt](BRAND_COLOURS.txt) | Add each HEX value in listed order, primary first |\n| Heading font / Body font | [FONTS.txt](FONTS.txt) | Enter each family in its own field |\n\nCopy raw text rather than a rendered Markdown selection. Counts include whitespace and use UTF-16 code units, a conservative browser-input convention. No text is silently shortened.\n\nReview these settings, then use the target screen's Save control. The JSON is a portable record for this bot, not a claimed native import format. Fonts come from the brand package, not a temporary DESIGNER_FONT rendering override. Font status: ${settings.provenance.font_status}\n\nKeep images, original transparent SVG/PNG logos, motif assets and annotated publication examples in the supporting brand library. The text fields cannot transfer those files. Review assets separately and make them available through the target tool's supported file or asset controls when needed.\n\nThis export retains pending review status. A provisional brand package is not an approved identity.\n`
  };
  const destination=path.join(outputRoot,id,revision);
  await writeExclusive(destination,files);
  return {destination,settings};
}
module.exports={LIMITS,validateText,prepareWorkspace,exportWorkspace};

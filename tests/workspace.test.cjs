const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {initBrand,prepare,artwork,validateBrand}=require('../src/designer.cjs');
const {validateText,prepareWorkspace,exportWorkspace}=require('../src/workspace.cjs');
const read=p=>fs.readFile(p,'utf8').then(JSON.parse);
const save=(p,value)=>fs.writeFile(p,JSON.stringify(value,null,2));
async function fixture(fn) {
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'workspace-settings-'));
 try {const created=await initBrand('new-brand','New Brand',{root});await fn(root,created.destination);} finally {await fs.rm(root,{recursive:true,force:true});}
}

test('workspace export separates fields, preserves exact copy and refuses to overwrite revisions',async()=>fixture(async(root,dir)=>{
 const source='# New brand\n\nUse concise headlines.\n';await fs.writeFile(path.join(dir,'workspace-design.md'),source);
 const r=await exportWorkspace('new-brand','v01',{root});const s=r.settings;
 assert.equal(s.fields.design_guide,source);assert.equal(s.validation.counts.design_guide,source.length);
 assert.equal(await fs.readFile(path.join(r.destination,'DESIGN.md'),'utf8'),source);
 assert.equal(await fs.readFile(path.join(r.destination,'IMAGE_STYLE.txt'),'utf8'),s.fields.image_style);
 assert.deepEqual((await read(path.join(r.destination,'workspace-settings.json'))).fields,s.fields);
 assert.equal(s.fields.brand_colours[0].role,'primary');assert.equal(s.review_state,'pending');
 assert.equal((await fs.readdir(r.destination)).length,6);
 await fs.writeFile(path.join(dir,'workspace-design.md'),'Changed copy');
 await assert.rejects(()=>exportWorkspace('new-brand','v01',{root}),/already exists/);
 assert.equal(await fs.readFile(path.join(r.destination,'DESIGN.md'),'utf8'),source);
 await assert.rejects(()=>exportWorkspace('new-brand','../escape',{root}),/revision/);
}));

test('limits count whitespace and UTF-16 units, accepting exact limits without silent truncation',()=>{
 for(const [field,limit] of [['design_guide',12000],['image_style',600]]){
  const value='😀'.repeat(limit/2);assert.equal(validateText(value,field),value);
  assert.throws(()=>validateText(value+'\n',field),/not truncated/);
  assert.throws(()=>validateText(' ',field),/contain text/);
 }
});

test('failed export writes nothing; visual markup stays in the separate full guide',async()=>fixture(async(root,dir)=>{
 await fs.writeFile(path.join(dir,'image-style.txt'),'x'.repeat(601));
 await assert.rejects(()=>exportWorkspace('new-brand','v01',{root}),/maximum 600/);
 await assert.rejects(()=>fs.access(path.join(root,'exports')),/ENOENT/);
 for(const value of ['![reference](assets/photo.png)','<img src="picture.png">','![logo][mark]','<svg></svg>']) assert.throws(()=>validateText(value,'design_guide'),/visual references/i);
 await fs.writeFile(path.join(dir,'image-style.txt'),'A clear focal subject.');
 await fs.writeFile(path.join(dir,'design.md'),'![Full guide reference](assets/example.png)');
 await prepareWorkspace('new-brand',{root});
 const config=await read(path.join(dir,'workspace-settings.json'));
 await fs.writeFile(path.join(root,'outside.md'),'Private source');config.design_guide_file='../../outside.md';await save(path.join(dir,'workspace-settings.json'),config);
 await assert.rejects(()=>prepareWorkspace('new-brand',{root}),/escapes/);
}));

test('exports an unrelated palette in deliberate order and keeps heading/body roles consistent with rendering',async()=>fixture(async(root,dir)=>{
 const p=path.join(dir,'brand.json');const b=await read(p);b.tokens={ink:'#024',paper:'#FFF',accent:'#FA7'};
 b.typography={family:'sans-serif',heading:'serif',body:'monospace',status:'Proposed test fonts'};await save(p,b);
 const config=await read(path.join(dir,'workspace-settings.json'));config.colours=[{name:'Apricot',token:'accent',role:'primary'},{name:'Navy',token:'ink',role:'text'}];await save(path.join(dir,'workspace-settings.json'),config);
 const s=await prepareWorkspace('new-brand',{root});assert.deepEqual(s.fields.brand_colours.map(c=>c.hex),['#FFAA77','#002244']);
 assert.equal(s.fields.heading_font,'serif');assert.equal(s.fields.body_font,'monospace');
 const output=await artwork(await prepare(await read(path.join(dir,'example-brief.json')),root));
 assert.match(output.svg,/<g id="headline"[^>]*><text font-family="serif"/);
 assert.ok(output.checks.some(c=>c.font_family==='monospace'));
 const bad=structuredClone(b);bad.templates.announcement.layers.find(l=>l.type==='text').font_role='caption';assert.throws(()=>validateBrand(bad),/font_role/);
 delete b.typography.heading;delete b.typography.body;await save(p,b);const fallback=await prepareWorkspace('new-brand',{root});assert.equal(fallback.fields.heading_font,'sans-serif');assert.equal(fallback.fields.body_font,'sans-serif');
}));

test('rejects ambiguous palette ordering, missing tokens and unsupported transparency',async()=>fixture(async(root,dir)=>{
 const p=path.join(dir,'workspace-settings.json');const original=await read(p);
 for(const [mutate,pattern] of [
  [c=>c.colours.reverse(),/first colour/],
  [c=>c.colours[1].role='primary',/first colour/],
  [c=>c.colours[1].token='missing',/tokens must exist/],
  [c=>c.colours[1].token=c.colours[0].token,/only once/],
  [c=>c.colours=[],/ordered entries/]
 ]){const c=structuredClone(original);mutate(c);await save(p,c);await assert.rejects(()=>prepareWorkspace('new-brand',{root}),pattern);}
 await save(p,original);const bp=path.join(dir,'brand.json');const b=await read(bp);b.tokens.ink='#12345688';await save(bp,b);
 await assert.rejects(()=>prepareWorkspace('new-brand',{root}),/opaque/);
}));

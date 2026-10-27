const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const sharp=require('sharp');
const {ROOT,validateBrief,prepare,artwork,render,containedFile}=require('../src/designer.cjs');
const example=require('../examples/operational.json');
const fresh=()=>structuredClone(example);

test('renders all supported families with separate editable text, vector paths and native logo',async()=>{
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'designer-render-'));
  try {
    for(const name of ['operational','guide','monthly']) {
      const brief=JSON.parse(await fs.readFile(path.join(ROOT,'examples',name+'.json'),'utf8'));
      const {destination,manifest,qa}=await render(brief,{outputRoot:temp});
      const meta=await sharp(path.join(destination,'artwork.png')).metadata();
      assert.deepEqual([meta.width,meta.height],manifest.canvas);
      const svg=await fs.readFile(path.join(destination,'artwork.svg'),'utf8');
      assert.match(svg,/<path\b/); // Reconstructed components remain vector paths.
      assert.match(svg,/<g id="primary-headline"/);
      assert.match(svg,/href="data:image\/png;base64,/); // Native raster logo is preserved.
      assert.ok(manifest.assets.every(a=>a.sha256.length===64 && a.status && a.source));
      assert.equal(qa.review_state,'pending');
      assert.ok(qa.manual_checks_pending.length>0);
      assert.equal((await fs.readdir(destination)).length,8);
    }
  } finally {await fs.rm(temp,{recursive:true,force:true});}
});

test('rejects overflowing text rather than silently clipping or shrinking below its minimum',async()=>{
  const b=fresh();b.headline.primary='W'.repeat(110);
  await assert.rejects(async()=>artwork(await prepare(b)),/overflows/);
});

test('does not overwrite an existing job or leave a failed staging directory',async()=>{
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'designer-revision-'));
  try {
    const result=await render(fresh(),{outputRoot:temp});
    const before=await fs.readFile(path.join(result.destination,'artwork.png'));
    await assert.rejects(()=>render(fresh(),{outputRoot:temp}),/already exists/);
    assert.deepEqual(await fs.readFile(path.join(result.destination,'artwork.png')),before);
    assert.deepEqual(await fs.readdir(temp),[example.job_id]);
  } finally {await fs.rm(temp,{recursive:true,force:true});}
});

test('blocks unsupported formats, invalid IDs, unknown fields and unsourced real-event briefs',()=>{
  for(const [field,value,pattern] of [['family','video',/Unsupported/],['job_id','../escape',/hyphenated/],['brand','../escape',/hyphenated/],['extra','ignored?',/Unknown/],['content_status','provided-facts',/source URL/]]) {
    const b=fresh();b[field]=value;assert.throws(()=>validateBrief(b),pattern);
  }
  const b=fresh();b.fact_sources=['file:///etc/passwd'];assert.throws(()=>validateBrief(b),/HTTP/);
});

test('rejects missing assets and paths escaping a brand package',async()=>{
  const b=fresh();b.icon='nonexistent-icon';await assert.rejects(()=>prepare(b),/Unknown asset/);
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'designer-path-'));
  try {
    await fs.mkdir(path.join(temp,'inside'));
    await fs.writeFile(path.join(temp,'outside.txt'),'x');
    await assert.rejects(()=>containedFile(path.join(temp,'inside'),'../outside.txt'),/escapes/);
  } finally {await fs.rm(temp,{recursive:true,force:true});}
});

test('user text is escaped in SVG rather than interpreted as markup',async()=>{
  const b=fresh();b.headline.primary='<script> & Design';
  const out=await artwork(await prepare(b));
  assert.doesNotMatch(out.svg,/<script>/);
  assert.match(out.svg,/&lt;script&gt; &amp; Design/);
});

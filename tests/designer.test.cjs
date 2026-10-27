const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const sharp=require('sharp');
const {ROOT,validateBrief,validateBrand,prepare,artwork,render,initBrand,containedFile}=require('../src/designer.cjs');
const example=require('../examples/announcement.json');
const fresh=()=>structuredClone(example);
const temp=()=>fs.mkdtemp(path.join(os.tmpdir(),'graphic-designer-'));
const read=p=>fs.readFile(p,'utf8').then(JSON.parse);
const save=(p,j)=>fs.writeFile(p,JSON.stringify(j,null,2));

async function customBrand(root){
  await initBrand('atelier','Atelier',{root});
  const p=path.join(root,'brands/atelier/brand.json');const brand=await read(p);
  brand.tokens={paper:'#FFFFFF',ink:'#123DA5',accent:'#FFF3BD'};
  brand.typography={family:'serif',status:'Independent test font choice'};
  brand.templates={'product-offer':{description:'A product graphic with brand-defined fields.',canvas:[720,960],background:'$paper',evidence:['design.md#proposed-starter-layouts'],fields:{product:{required:true,max_length:80},price:{required:true,max_length:40}},layers:[
    {id:'product-name',type:'text',field:'product',box:[40,200,640,200],font_size:72,min_font_size:40,fill:'$ink'},
    {id:'product-price',type:'text',field:'price',box:[40,500,640,100],font_size:48,min_font_size:32,fill:'$ink'}
  ],review_label:{box:[400,30,270,45],fill:'$ink',colour:'$paper',font_size:18}}};
  await save(p,brand);
  return {schema_version:2,job_id:'atelier-offer-v01',brand:'atelier',template:'product-offer',locales:['fr-FR'],content_status:'demo',content:{product:'Une idée lumineuse',price:'À partir de 29 €'},assets:{},fact_sources:[]};
}

test('renders portrait, square and landscape with no logo or external assets',async()=>{
 const dir=await temp();try{
  for(const name of ['announcement','square','landscape']){
   const b=await read(path.join(ROOT,'examples',name+'.json'));const result=await render(b,{outputRoot:dir});
   const meta=await sharp(path.join(result.destination,'artwork.png')).metadata();assert.deepEqual([meta.width,meta.height],result.manifest.canvas);
   assert.equal(result.manifest.assets.length,0);assert.equal(result.qa.review_state,'pending');assert.equal((await fs.readdir(result.destination)).length,8);
   const svg=await fs.readFile(path.join(result.destination,'artwork.svg'),'utf8');assert.match(svg,/data-component="editable-text"/);assert.doesNotMatch(svg,/<image/);
  }
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('supports a second brand, arbitrary template name/fields, font, palette, locale and dimensions without engine edits',async()=>{
 const dir=await temp();try{
  const b=await customBrand(dir);const result=await render(b,{root:dir});
  assert.deepEqual(result.manifest.canvas,[720,960]);assert.equal(result.manifest.font,'serif');assert.deepEqual(result.manifest.locales,['fr-FR']);
  const svg=await fs.readFile(path.join(result.destination,'artwork.svg'),'utf8');assert.match(svg,/#123DA5/);assert.match(svg,/Une idée lumineuse/);assert.match(svg,/29 €/);assert.doesNotMatch(svg,/STUDIO DEMO|Date to be confirmed|Venue/);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('onboards a working brand without an identity asset and refuses to overwrite it',async()=>{
 const dir=await temp();try{
  const created=await initBrand('new-studio','New Studio',{root:dir});const b=await read(created.brief);const p=await prepare(b,dir);assert.equal(p.brand.name,'New Studio');assert.equal(p.used.length,0);
  await assert.rejects(()=>initBrand('new-studio','Different Name',{root:dir}),/already exists/);assert.equal((await read(path.join(created.destination,'brand.json'))).name,'New Studio');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('rejects overflowing text and keeps existing jobs unchanged',async()=>{
 const dir=await temp();try{
  const b=fresh();b.content.headline='W'.repeat(140);await assert.rejects(async()=>artwork(await prepare(b)),/overflows/);
  const result=await render(fresh(),{outputRoot:dir});const before=await fs.readFile(path.join(result.destination,'artwork.png'));
  await assert.rejects(()=>render(fresh(),{outputRoot:dir}),/already exists/);assert.deepEqual(await fs.readFile(path.join(result.destination,'artwork.png')),before);assert.deepEqual(await fs.readdir(dir),[example.job_id]);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('validates locale tags, sources, IDs and template-specific required or unknown fields',async()=>{
 for(const [field,value,pattern] of [['job_id','../escape',/hyphenated/],['brand','../escape',/hyphenated/],['extra','ignored',/Unknown/],['locales',['not_a_locale'],/BCP/],['content_status','provided-facts',/source URL/],['schema_version',1,/migration/]]){const b=fresh();b[field]=value;assert.throws(()=>validateBrief(b),pattern);}
 const b=fresh();delete b.content.headline;await assert.rejects(()=>prepare(b),/required content/);
 b.content.headline='Hello';b.content.unused='Do not silently drop this';await assert.rejects(()=>prepare(b),/Unknown content field/);
 const unknown=fresh();unknown.template='not-configured';await assert.rejects(()=>prepare(unknown),/Unknown template/);
 const url=fresh();url.fact_sources=['file:///etc/passwd'];assert.throws(()=>validateBrief(url),/HTTP/);
});

test('renders optional fields conditionally and escapes user markup',async()=>{
 const b=fresh();delete b.content.cta;b.content.headline='<script> & Design';const out=await artwork(await prepare(b));
 assert.doesNotMatch(out.svg,/<script>|id="cta-panel"/);assert.match(out.svg,/&lt;script&gt; &amp; Design/);
});

test('validates layout bounds, missing tokens and paths escaping a package',async()=>{
 const brand=await read(path.join(ROOT,'brands/studio-demo/brand.json'));
 const bad=structuredClone(brand);bad.templates.announcement.layers[0].box=[1000,0,200,80];assert.throws(()=>validateBrand(bad),/outside canvas/);
 const token=structuredClone(brand);token.templates.announcement.background='$missing';assert.throws(()=>validateBrand(token),/colour token/);
 const dir=await temp();try{await fs.mkdir(path.join(dir,'inside'));await fs.writeFile(path.join(dir,'outside.txt'),'x');await assert.rejects(()=>containedFile(path.join(dir,'inside'),'../outside.txt'),/escapes/);}finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('preserves reusable vector assets and namespaces their IDs per placement',async()=>{
 const dir=await temp();try{
  const b=await customBrand(dir);const brandPath=path.join(dir,'brands/atelier/brand.json');const brand=await read(brandPath);const assets=path.join(dir,'brands/atelier/assets');
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><defs><linearGradient id="paint"><stop stop-color="#123DA5"/><stop offset="1" stop-color="#33AACC"/></linearGradient></defs><path d="M10 10H90V90H10Z" fill="url(#paint)"/></svg>';
  await fs.writeFile(path.join(assets,'mark.svg'),svg);await save(path.join(assets,'asset-manifest.json'),{assets:[{id:'mark',kind:'logo',status:'new original test graphic',source:'test fixture',files:['mark.svg']}]});
  for(const [id,x] of [['mark-one',40],['mark-two',180]])brand.templates['product-offer'].layers.push({id,type:'asset',asset:'mark',box:[x,700,100,100]});await save(brandPath,brand);
  const result=await render(b,{root:dir});const output=await fs.readFile(path.join(result.destination,'artwork.svg'),'utf8');assert.match(output,/url\(#mark-one--paint\)/);assert.match(output,/url\(#mark-two--paint\)/);assert.equal(result.manifest.assets.length,1);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('preserves raster images, checks transparent logos and rejects missing or external SVG assets',async()=>{
 const dir=await temp();try{
  const b=await customBrand(dir);const p=path.join(dir,'brands/atelier/brand.json');const brand=await read(p);const assets=path.join(dir,'brands/atelier/assets');
  brand.templates['product-offer'].layers.push({id:'hero',type:'asset',asset_field:'hero',box:[40,700,300,180]});await save(p,brand);b.assets.hero='photo';
  await sharp({create:{width:300,height:180,channels:3,background:'#123DA5'}}).jpeg().toFile(path.join(assets,'photo.jpg'));
  const a={id:'photo',kind:'photo',status:'original test raster',source:'test fixture',files:['photo.jpg']};await save(path.join(assets,'asset-manifest.json'),{assets:[a]});
  const out=await artwork(await prepare(b,dir));assert.match(out.svg,/data:image\/jpeg;base64,/);
  a.kind='logo';await save(path.join(assets,'asset-manifest.json'),{assets:[a]});await assert.rejects(()=>prepare(b,dir),/transparent canvas/);
  b.assets.hero='missing';await assert.rejects(()=>prepare(b,dir),/Unknown asset/);b.assets.hero='photo';
  a.kind='graphic';a.files=['bad.svg'];await fs.writeFile(path.join(assets,'bad.svg'),'<svg xmlns="http://www.w3.org/2000/svg"><image href="file:///etc/passwd"/></svg>');await save(path.join(assets,'asset-manifest.json'),{assets:[a]});await assert.rejects(()=>prepare(b,dir),/External SVG/);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

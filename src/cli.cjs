#!/usr/bin/env node
const fs=require('node:fs/promises');
const {prepare,render,initBrand,loadBrand}=require('./designer.cjs');
const {exportWorkspace}=require('./workspace.cjs');
async function main(){
  const [command,file,...rest]=process.argv.slice(2);
  if(command==='init-brand'&&file&&rest[0]==='--name'&&rest.length===2){console.log(JSON.stringify(await initBrand(file,rest[1]),null,2));return;}
  if(command==='validate-brand'&&file&&!rest.length){const p=await loadBrand(file);console.log(JSON.stringify({valid:true,brand:p.brand.id,templates:Object.keys(p.brand.templates)},null,2));return;}
  if(command==='export-workspace'&&file&&rest[0]==='--id'&&rest.length===2){const r=await exportWorkspace(file,rest[1]);console.log(JSON.stringify({output:r.destination,counts:r.settings.validation.counts,review_state:r.settings.review_state},null,2));return;}
  if(!['validate','render'].includes(command)||!file||rest.length){console.error('Usage:\n  node src/cli.cjs <validate|render> <brief.json>\n  node src/cli.cjs init-brand <id> --name "Brand name"\n  node src/cli.cjs validate-brand <id>\n  node src/cli.cjs export-workspace <brand-id> --id <revision>');process.exitCode=2;return;}
  const brief=JSON.parse(await fs.readFile(file,'utf8'));
  if(command==='validate'){const p=await prepare(brief);console.log(JSON.stringify({valid:true,brand:p.brief.brand,template:p.brief.template,canvas:p.template.canvas,assets:p.used.length,note:'Structure and assets checked. Rendering checks text fit. Visual quality and facts remain unverified.'},null,2));}
  else {const r=await render(brief);console.log(JSON.stringify({output:r.destination,mechanical_status:r.qa.mechanical_status,review_state:'pending'},null,2));}
}
main().catch(e=>{console.error(`Designer: ${e.message}`);process.exitCode=1;});

#!/usr/bin/env node
const fs=require('node:fs/promises');
const {prepare,render}=require('./designer.cjs');

async function main(){
  const [command,file,...rest]=process.argv.slice(2);
  if (!['validate','render'].includes(command)||!file||rest.length) {
    console.error('Usage: node src/cli.cjs <validate|render> <brief.json>');
    process.exitCode=2;return;
  }
  const brief=JSON.parse(await fs.readFile(file,'utf8'));
  if(command==='validate') {
    const j=await prepare(brief);
    console.log(JSON.stringify({valid:true,brand:j.brief.brand,family:j.brief.family,canvas:j.template.canvas,assets:j.used.length,note:'Structure and assets checked; rendering performs text-fit checks. Facts and translation remain unverified.'},null,2));
  } else {
    const result=await render(brief);
    console.log(JSON.stringify({output:result.destination,mechanical_status:result.qa.mechanical_status,review_state:'pending'},null,2));
  }
}
main().catch(error=>{console.error(`Designer: ${error.message}`);process.exitCode=1;});

import * as pdfjs from './vendor/pdfjs/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.mjs',import.meta.url).href;
const matrix=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
function imageBoxes(ops,viewport){
let ctm=[1,0,0,1,0,0],clip=null,stack=[],boxes=[],pendingClip=false;
const bounds=(coords)=>{const points=coords.map(([x,y])=>viewport.convertToViewportPoint(ctm[0]*x+ctm[2]*y+ctm[4],ctm[1]*x+ctm[3]*y+ctm[5]));return {x:Math.min(...points.map(p=>p[0])),y:Math.min(...points.map(p=>p[1])),right:Math.max(...points.map(p=>p[0])),bottom:Math.max(...points.map(p=>p[1]))};};
const intersect=(a,b)=>({x:Math.max(a.x,b.x),y:Math.max(a.y,b.y),right:Math.min(a.right,b.right),bottom:Math.min(a.bottom,b.bottom)});
for(let i=0;i<ops.fnArray.length;i++){
 const f=ops.fnArray[i],a=ops.argsArray[i];
 if(f===pdfjs.OPS.save)stack.push({ctm:[...ctm],clip:clip?{...clip}:null});
 else if(f===pdfjs.OPS.restore){const old=stack.pop();ctm=old?.ctm||[1,0,0,1,0,0];clip=old?.clip||null;}
 else if(f===pdfjs.OPS.transform)ctm=matrix(ctm,a);
 else if(f===pdfjs.OPS.clip||f===pdfjs.OPS.eoClip)pendingClip=true;
 else if(f===pdfjs.OPS.constructPath&&pendingClip&&a[2]){const b=a[2],path=bounds([[b[0],b[1]],[b[2],b[1]],[b[0],b[3]],[b[2],b[3]]]);clip=clip?intersect(clip,path):path;pendingClip=false;}
 else if([pdfjs.OPS.paintImageXObject,pdfjs.OPS.paintInlineImageXObject,pdfjs.OPS.paintJpegXObject].includes(f)){
  let b=bounds([[0,0],[1,0],[0,1],[1,1]]);if(clip)b=intersect(b,clip);b=intersect(b,{x:0,y:0,right:viewport.width,bottom:viewport.height});if(b.right-b.x>70&&b.bottom-b.y>55)boxes.push(b);
 }
}return boxes;
}
function crop(canvas,b){const out=document.createElement('canvas');const w=Math.max(1,Math.ceil(b.right-b.x)),h=Math.max(1,Math.ceil(b.bottom-b.y));const scale=Math.min(1,1400/Math.max(w,h));out.width=Math.round(w*scale);out.height=Math.round(h*scale);out.getContext('2d').drawImage(canvas,b.x,b.y,w,h,0,0,out.width,out.height);return out.toDataURL('image/jpeg',.87);}
function linesFrom(items,viewport){let lines=[];for(const it of items){if(!it.str?.trim())continue;const [x,y]=viewport.convertToViewportPoint(it.transform[4],it.transform[5]);const size=Math.hypot(it.transform[2],it.transform[3])*viewport.scale;let l=lines.find(l=>Math.abs(l.y-y)<Math.max(2,size*.18));if(!l){l={y,x,size,parts:[]};lines.push(l);}l.size=Math.max(l.size,size);l.x=Math.min(l.x,x);l.parts.push({x,text:it.str,width:it.width*viewport.scale});}for(const l of lines){l.parts.sort((a,b)=>a.x-b.x);l.text=l.parts.map((p,i)=>p.text+(i<l.parts.length-1&&l.parts[i+1].x>p.x+p.width+.3?' ':'')).join('').trim();}return lines.sort((a,b)=>a.y-b.y);}
export async function importPDF(file,onProgress=()=>{}){
if(file.size>50*1024*1024)throw new Error('Choose a PDF smaller than 50 MB.');
const data=new Uint8Array(await file.arrayBuffer());const task=pdfjs.getDocument({data,isEvalSupported:false,useSystemFonts:true});task.onPassword=()=>{task.destroy();};let pdf;try{pdf=await task.promise;}catch(e){throw new Error('This PDF could not be opened. If it has a password, export an unlocked copy first.');}
if(pdf.numPages>80){await pdf.destroy();throw new Error('Please split this report into PDFs of 80 pages or fewer.');}
const pages=[];let allText='';
try{for(let n=1;n<=pdf.numPages;n++){
onProgress(`Reading page ${n} of ${pdf.numPages}…`);const page=await pdf.getPage(n),vp=page.getViewport({scale:1.5}),canvas=document.createElement('canvas');canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);await page.render({canvasContext:canvas.getContext('2d'),viewport:vp}).promise;
const content=await page.getTextContent();const lines=linesFrom(content.items,vp);allText+=lines.map(l=>l.text).join('\n')+'\n';const ops=await page.getOperatorList();let boxes=imageBoxes(ops,vp);boxes.sort((a,b)=>a.y-b.y);
// Consolidate overlapping picture pieces into a single photo/collage.
for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];if(a.x<=b.right+6&&a.right+6>=b.x&&a.y<=b.bottom+6&&a.bottom+6>=b.y){boxes[i]={x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),right:Math.max(a.right,b.right),bottom:Math.max(a.bottom,b.bottom)};boxes.splice(j--,1);}}
const images=boxes.filter(b=>(b.right-b.x)*(b.bottom-b.y)>vp.width*vp.height*.012).map(b=>({...b,image:crop(canvas,b),type:'image'}));pages.push({lines,images,width:vp.width,height:vp.height,scan:lines.length<3?canvas.toDataURL('image/jpeg',.85):null});canvas.width=canvas.height=1;page.cleanup();await new Promise(r=>setTimeout(r,0));}}finally{await pdf.destroy();}
const sizes=new Map();for(const p of pages)for(const l of p.lines){const s=Math.round(l.size);sizes.set(s,(sizes.get(s)||0)+l.text.length);}const bodySize=[...sizes.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]||15;
let stories=[],current=null,donationReached=false,scanned=0,paragraph=[],lastLine=null;
const flush=()=>{if(current&&paragraph.length){current.body+=(current.body?'\n\n':'')+paragraph.join(' ').replace(/\s+/g,' ').trim();}paragraph=[];};
const start=title=>{flush();current={id:crypto.randomUUID(),title,subtitle:'',body:'',image:'',alt:title,pattern:stories.length%2?'paws':'loop',imageWidth:632};stories.push(current);lastLine=null;};
for(const p of pages){if(donationReached)break;if(p.scan){flush();scanned++;start(`Page ${stories.length+1}`);current.image=p.scan;continue;}const events=[...p.lines.map(l=>({...l,type:'text'})),...p.images].sort((a,b)=>a.y-b.y);lastLine=null;
for(const e of events){if(e.type==='image'){flush();if(!current)continue;if(!current.image)current.image=e.image;else{current.additionalImages??=[];current.additionalImages.push(e.image);}lastLine=null;continue;}
const text=e.text.trim();if(!text||/^\d+$/.test(text)||/^(PAWS Newsletter|PAWS [A-Z]+ \d{4} NEWSLETTER|Plants & Animals Welfare Society)/i.test(text)||/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+20\d{2}$/i.test(text))continue;
if(/^(Hands that help|YOUR DONATIONS|Electronic Transfers)/i.test(text)){flush();donationReached=true;break;}
const isHeading=e.size>=bodySize*1.14&&text.length<190;
if(isHeading){if(current&&!current.body&&!current.image&&lastLine&&lastLine.isHeading&&Math.abs(e.y-lastLine.y)<e.size*2){current.title+=' '+text;current.alt=current.title;}else start(text);lastLine={...e,isHeading:true};continue;}
if(!current){if(e.y<p.height*.18)continue;start('Monthly update');}
if(lastLine&&!lastLine.isHeading&&e.y-lastLine.y>bodySize*1.65)flush();
paragraph.push(text);lastLine=e;
}flush();}
stories=stories.filter(s=>s.body||s.image);
// Preserve every extracted photo: extra photographs become a collage.
for(const s of stories){if(s.additionalImages?.length){const sources=[s.image,...s.additionalImages];const imgs=await Promise.all(sources.map(src=>new Promise(resolve=>{const im=new Image;im.onload=()=>resolve(im);im.src=src;})));const w=1200,cols=imgs.length>1?2:1,cellW=w/cols,heights=[];for(let i=0;i<imgs.length;i+=cols)heights.push(Math.max(...imgs.slice(i,i+cols).map(im=>Math.min(700,cellW*im.height/im.width))));const c=document.createElement('canvas');c.width=w;c.height=Math.ceil(heights.reduce((a,b)=>a+b,0));const cx=c.getContext('2d');cx.fillStyle='#fffaf5';cx.fillRect(0,0,c.width,c.height);let y=0;for(let i=0;i<imgs.length;i++){const im=imgs[i],row=Math.floor(i/cols),h=heights[row],scale=Math.min((cellW-8)/im.width,(h-8)/im.height);cx.drawImage(im,i%cols*cellW+(cellW-im.width*scale)/2,y+(h-im.height*scale)/2,im.width*scale,im.height*scale);if(i%cols===cols-1)y+=h;}s.image=c.toDataURL('image/jpeg',.87);delete s.additionalImages;}}
const date=allText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)[ '\u2019]*(20\d{2}|\d{2})/i);
return {stories,month:date?.[1],year:date?(date[2].length===2?'20'+date[2]:date[2]):null,scanned,pageCount:pages.length,imageCount:stories.filter(s=>s.image).length};
}

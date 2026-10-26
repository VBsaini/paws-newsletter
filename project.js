export const MAX_STORIES=200;
export const ASSET_NAMES=new Set(['assets/paws-logo.png','assets/loop.png','assets/paw-pattern.png',...Array.from({length:7},(_,i)=>`assets/story-${i+1}.jpg`)]);
export function newId(){if(globalThis.crypto?.randomUUID)return crypto.randomUUID();const bytes=new Uint8Array(16);try{crypto.getRandomValues(bytes);}catch{for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);}bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const h=[...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
export const clamp=(n,min,max,fallback)=>Number.isFinite(Number(n))?Math.max(min,Math.min(max,Number(n))):fallback;
export function validImage(value){
 if(typeof value!=='string')return false;
 if(ASSET_NAMES.has(value))return true;
 const match=value.match(/^data:image\/(png|jpeg|webp);base64,([a-zA-Z0-9+/]+={0,2})$/);
 if(!match||match[2].length>45*1024*1024||match[2].length%4!==0)return false;
 try{const bytes=atob(match[2].slice(0,48));return match[1]==='png'?bytes.startsWith('\x89PNG\r\n\x1a\n'):match[1]==='jpeg'?bytes.startsWith('\xff\xd8\xff'):bytes.startsWith('RIFF')&&bytes.slice(8,12)==='WEBP';}catch{return false;}
}
export function validateProject(value,defaults){
 if(!value||value.version!==1||!Array.isArray(value.stories)||value.stories.length>MAX_STORIES)throw Error('This is not a supported PAWS Studio project (maximum 200 stories).');
 const s=structuredClone(defaults);
 for(const key of Object.keys(s))if(key!=='stories'&&typeof value[key]===typeof s[key])s[key]=value[key];
 for(const [key,v] of Object.entries(s))if(key!=='logo'&&typeof v==='string'&&v.length>1000000)throw Error('A project field is too long.');
 s.pawOpacity=clamp(s.pawOpacity,10,100,70);
 for(const key of ['accent','background','paper'])if(!/^#[0-9a-f]{6}$/i.test(s[key]))s[key]=defaults[key];
 if(!validImage(s.logo))throw Error('The project logo has an unsupported or damaged image.');
 const ids=new Set();
 s.stories=value.stories.map(x=>{
  if(!x||typeof x.title!=='string'||typeof x.body!=='string')throw Error('A story is missing its title or text.');
  for(const key of ['title','body','subtitle','alt'])if(x[key]!=null&&(typeof x[key]!=='string'||x[key].length>1000000))throw Error('A story field is invalid or too long.');
  if(x.image&&!validImage(x.image))throw Error('A photo has an unsupported or damaged image.');
  let id=typeof x.id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(x.id)?x.id:newId();if(ids.has(id))id=newId();ids.add(id);
  return {id,title:x.title,subtitle:x.subtitle||'',body:x.body,image:x.image||'',alt:x.alt||'',pattern:['paws','loop','plain'].includes(x.pattern)?x.pattern:'paws',imageWidth:clamp(x.imageWidth,220,632,632)};
 });return s;
}
export const freshStories=stories=>stories.map(s=>({...structuredClone(s),id:newId()}));
export const projectSlug=s=>`PAWS_${s.month.replace(/[^a-z0-9]/gi,'_')||'Newsletter'}_${s.year.replace(/[^a-z0-9]/gi,'_')||'Draft'}`;

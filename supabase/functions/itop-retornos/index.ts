import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import webpush from 'npm:web-push@3.6.7';
const origin='https://mjfc9296-boop.github.io';
const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Vary':'Origin'};
const url=Deno.env.get('SUPABASE_URL')!;
const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...headers,'Content-Type':'application/json'}});
async function rpc(action:string,data:unknown={}){const r=await admin.rpc('itop_push_servico',{p_acao:action,p_dados:data});if(r.error)throw new Error('Serviço temporariamente indisponível.');return r.data;}
function safeEndpoint(value:string){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&(!u.port||u.port==='443')&&(u.hostname==='fcm.googleapis.com'||u.hostname==='web.push.apple.com'||/^[a-z0-9.-]+\.push\.services\.mozilla\.com$/.test(u.hostname)||/^[a-z0-9.-]+\.notify\.windows\.com$/.test(u.hostname));}catch{return false;}}
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers});
 if(req.method!=='POST')return reply({error:'Método inválido.'},405);
 if(req.headers.get('origin')&&req.headers.get('origin')!==origin)return reply({error:'Origem não permitida.'},403);
 if(Number(req.headers.get('content-length')||0)>12000)return reply({error:'Requisição inválida.'},413);
 try{
 const raw=await req.text();if(raw.length>12000)return reply({error:'Requisição inválida.'},413);const data=JSON.parse(raw);
 if(data.action==='login'){
  const phone=String(data.phone||'').replace(/\D/g,'');const password=String(data.password||'');
  if(!/^(55)?[1-9]\d9\d{8}$/.test(phone)||password.length<1||password.length>1024)return reply({error:'Celular ou senha inválidos.'},401);
  const ip=req.headers.get('x-forwarded-for')?.split(',')[0]||'unknown';const ipHash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip)))).map(x=>x.toString(16).padStart(2,'0')).join('');
  const account=await rpc('login',{telefone:phone,ip:ipHash});if(account.limited)return reply({error:'Muitas tentativas. Aguarde 5 minutos.'},429);
  if(!account.email)return reply({error:'Celular ou senha inválidos.'},401);
  const auth=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const result=await auth.auth.signInWithPassword({email:account.email,password});
  if(result.error||!result.data.session)return reply({error:'Celular ou senha inválidos.'},401);
  return reply({access_token:result.data.session.access_token,refresh_token:result.data.session.refresh_token});
 }
 let config=await rpc('config');
 if(data.action==='publicKey'){
  const token=req.headers.get('Authorization')?.replace(/^Bearer /i,'');if(!token)return reply({error:'Faça login.'},401);
  const {data:user,error}=await admin.auth.getUser(token);if(error||!user.user)return reply({error:'Faça login.'},401);
  const {data:profile}=await admin.from('perfis').select('ativo,status_aprovacao').eq('id',user.user.id).single();if(!profile?.ativo||profile.status_aprovacao!=='aprovado')return reply({error:'Acesso não autorizado.'},403);
  const canonical=config.public_key?config:await rpc('init',webpush.generateVAPIDKeys());return reply({publicKey:canonical.public_key});
 }
 if(data.action!=='dispatch'||!req.headers.get('x-itop-tick')||req.headers.get('x-itop-tick')!==config.tick_token)return reply({error:'Acesso não autorizado.'},401);
 if(!config.public_key)config=await rpc('init',webpush.generateVAPIDKeys());
 webpush.setVapidDetails('https://mjfc9296-boop.github.io/ficha-itop/',config.public_key,config.private_key);
 const jobs=await rpc('claim');let delivered=0;
 await Promise.all(jobs.map(async(job:any)=>{let status=500;try{
  if(!safeEndpoint(job.subscription.endpoint))status=410;
  else{const r=await webpush.sendNotification(job.subscription,JSON.stringify({title:'Retorno comercial ITOP',body:'Você tem um cliente aguardando retorno. Toque para consultar.',tag:'itop-retornos',url:'https://mjfc9296-boop.github.io/ficha-itop/?retornos=1'}),{TTL:3600,urgency:'normal',timeout:10000});status=r.statusCode;if(status>=200&&status<300)delivered++;}
 }catch(e){status=Number((e as any)?.statusCode)||500;}await rpc('ack',{id:job.id,lease:job.lease,status});}));
 return reply({processed:jobs.length,delivered});
 }catch{return reply({error:'Não foi possível completar a operação. Tente novamente.'},500);}
});

import { API_URL } from './config.js';
const $ = id => document.getElementById(id);
const fmt = n => n.toLocaleString('zh-TW');
const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n));
const today = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let year=Number(today.slice(0,4)),month=Number(today.slice(5,7)),selected=0,records=[],token=null,expiresAt=0,timer,challengeId,editing=null,mode='entry',loading=0;
const monthKey = () => `${year}-${String(month).padStart(2,'0')}`;
const short = date => date.slice(5).replace('-','/');
const total = rows => rows.reduce((s,r)=>s+(r.category==='收入'?r.amount:-r.amount),0);
function notify(message){$('status').textContent=message;}
function node(tag,text='',cls=''){const n=document.createElement(tag);n.textContent=text;n.className=cls;return n;}
function lock(message='已登出') {
  token=null;expiresAt=0;records=[];loading++;clearTimeout(timer);
  $('dialog').close();$('form').reset();$('ledger').hidden=true;$('auth').hidden=false;
  $('entries').replaceChildren();$('fixedList').replaceChildren();$('weeks').replaceChildren();
  for(const id of ['weekTotal','expenseTotal','fixedTotal','incomeTotal','grandTotal']) $(id).textContent='';
  $('verifyForm').hidden=true;$('loginForm').hidden=false;$('code').value='';challengeId=null;notify(message);
}
async function api(path,method='GET',body) {
  if(token && Date.now()>=expiresAt){lock('登入已滿 20 分鐘，請重新登入');throw new Error('登入已過期');}
  const auth=token;
  const response=await fetch(API_URL+path,{method,credentials:'omit',cache:'no-store',headers:{...(body?{'Content-Type':'application/json'}:{}),...(auth?{Authorization:`Bearer ${auth}`}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
  const result=await response.json();
  if(response.status===401 && auth===token && token) lock();
  if(!response.ok) throw new Error(result.error || '操作失敗');
  return result;
}
async function busy(button,work){button.disabled=true;try{await work();}catch(e){notify(e.name==='TimeoutError'?'連線逾時，請重新整理確認是否已儲存':e.message);}finally{button.disabled=false;}}
$('loginForm').onsubmit=e=>{e.preventDefault();busy($('requestCode'),async()=>{
  const result=await api('/auth/request','POST',{userId:$('userId').value.trim(),email:$('email').value.trim()});
  challengeId=result.challengeId;$('loginForm').hidden=true;$('verifyForm').hidden=false;$('code').focus();notify(result.message);
});};
$('verifyForm').onsubmit=e=>{e.preventDefault();busy($('verifyCode'),async()=>{
  const result=await api('/auth/verify','POST',{challengeId,code:$('code').value});
  token=result.token;expiresAt=result.expiresAt;timer=setTimeout(()=>lock('登入已滿 20 分鐘，請重新登入'),Math.max(0,expiresAt-Date.now()));
  $('code').value='';$('auth').hidden=true;$('ledger').hidden=false;notify('登入成功');await refresh();
});};
$('backLogin').onclick=()=>{$('verifyForm').hidden=true;$('loginForm').hidden=false;$('code').value='';};
$('logout').onclick=()=>busy($('logout'),async()=>{try{await api('/auth/logout','POST',{});lock();}catch(e){lock('本機已登出；連線失敗，伺服器憑證最遲於原 20 分鐘期限失效');}});
document.addEventListener('visibilitychange',()=>{if(token && Date.now()>=expiresAt)lock('登入已過期');});
function weeks() {
  const first=new Date(Date.UTC(year,month-1,1)),last=new Date(Date.UTC(year,month,0));
  first.setUTCDate(first.getUTCDate()-((first.getUTCDay()+6)%7));
  const output=[];
  for(let t=first.getTime();t<=last.getTime();t+=604800000){
    const from=new Date(t),to=new Date(t+518400000),thu=new Date(t+259200000);
    const w=Math.ceil(((thu-Date.UTC(thu.getUTCFullYear(),0,1))/86400000+1)/7);
    output.push({from:from.toISOString().slice(0,10),to:to.toISOString().slice(0,10),w});
  }return output;
}
async function refresh() {
  const generation=++loading,m=monthKey(),auth=token;
  $('new').disabled=true;$('addFixed').disabled=true;
  records=[];render();
  try{const result=await api('/records?month='+m);if(generation!==loading || auth!==token)return;records=result.records;render();notify('');}
  finally{if(generation===loading){$('new').disabled=false;$('addFixed').disabled=false;}}
}
function actionButtons(r){
  const wrap=node('div','','row-actions');
  const edit=node('button','✎','edit-button');edit.setAttribute('aria-label','編輯'+r.name);edit.onclick=()=>openForm(r.kind,r);
  const del=node('button','×','delete-button');del.setAttribute('aria-label','刪除'+r.name);del.onclick=()=>{if(confirm(`確定刪除「${r.name}」？`))busy(del,async()=>{await api(`/records/${r.id}?version=${r.version}`,'DELETE');await refresh();});};
  wrap.append(edit,del);return wrap;
}
function render(){
  $('month').textContent=`${year} / ${String(month).padStart(2,'0')}`;
  const ws=weeks();selected=Math.min(selected,ws.length-1);const active=ws[selected],entries=records.filter(r=>r.kind==='entry'),fixed=records.filter(r=>r.kind==='fixed');
  const within=w=>entries.filter(r=>r.date>=w.from && r.date<=w.to);
  $('weeks').replaceChildren();
  ws.forEach((w,i)=>{const button=node('button','','week'+(i===selected?' selected':''));button.setAttribute('aria-pressed',String(i===selected));button.append(node('em','W'+String(w.w).padStart(2,'0')),node('span',short(w.from)+'–'+short(w.to)),node('strong',signed(total(within(w)))));button.onclick=()=>{selected=i;render();};$('weeks').append(button);});
  $('weekRange').textContent=short(active.from)+' — '+short(active.to);
  const rows=within(active).sort((a,b)=>a.date.localeCompare(b.date));$('entries').replaceChildren();
  for(const r of rows){const tr=node('tr'),desc=node('td',r.name);desc.prepend(node('span',r.category,'tag'));const actions=node('td','','delete-cell');actions.append(actionButtons(r));tr.append(node('td',short(r.date)),desc,node('td',signed(r.category==='收入'?r.amount:-r.amount),'money'),actions);$('entries').append(tr);}
  if(!rows.length){const tr=node('tr'),td=node('td','這週還沒有紀錄','empty');td.colSpan=4;tr.append(td);$('entries').append(tr);}
  $('weekTotal').textContent=signed(total(rows));$('fixedList').replaceChildren();
  for(const r of fixed.sort((a,b)=>a.date.localeCompare(b.date))){
    const item=node('div','','fixed-item'),check=document.createElement('input');check.type='checkbox';check.checked=r.paid;check.setAttribute('aria-label',r.name+'已收付');
    check.onchange=()=>busy(check,async()=>{try{await api('/records/'+r.id,'PUT',{...r,paid:check.checked});await refresh();}catch(e){check.checked=r.paid;throw e;}});
    const name=node('span',r.name,'item-name');name.prepend(node('span',r.category,'tag'));name.append(node('small',short(r.date)+' 到期','due'));
    item.append(check,name,node('span',signed(r.category==='收入'?r.amount:-r.amount),'amount money'),actionButtons(r));$('fixedList').append(item);
  }
  if(!fixed.length)$('fixedList').append(node('p','尚未新增本月繳費','auth-note'));
  const paid=fixed.filter(r=>r.paid),all=[...entries,...paid];
  $('expenseTotal').textContent=fmt(entries.filter(r=>r.category==='支出').reduce((s,r)=>s+r.amount,0));
  $('fixedTotal').textContent=fmt(paid.filter(r=>r.category==='支出').reduce((s,r)=>s+r.amount,0));
  $('incomeTotal').textContent=signed(all.filter(r=>r.category==='收入').reduce((s,r)=>s+r.amount,0));
  $('grandTotal').textContent=signed(total(all));
}
function openForm(kind,record=null){
  mode=kind;editing=record;$('form').reset();$('formTitle').textContent=record?'編輯紀錄':kind==='entry'?'記一筆':'新增繳費';
  const last=new Date(Date.UTC(year,month,0)).getUTCDate();$('entryDate').min=monthKey()+'-01';$('entryDate').max=monthKey()+'-'+last;
  $('entryDate').value=record?.date || (today.startsWith(monthKey())?today:monthKey()+'-01');
  $('entryName').value=record?.name || '';$('entryAmount').value=record?.amount || '';$('entryAmount').max='999999999';$('category').value=record?.category || '支出';
  $('dialog').showModal();$('entryName').focus();
}
$('new').onclick=()=>openForm('entry');$('addFixed').onclick=()=>openForm('fixed');
$('close').onclick=$('cancel').onclick=()=>$('dialog').close();
$('form').onsubmit=e=>{e.preventDefault();busy($('form').querySelector('[type=submit]'),async()=>{
  const value={kind:mode,date:$('entryDate').value,name:$('entryName').value.trim(),amount:Number($('entryAmount').value),category:$('category').value,paid:editing?.paid || false,...(editing?{version:editing.version}:{})};
  await api(editing?'/records/'+editing.id:'/records',editing?'PUT':'POST',value);
  selected=Math.max(0,weeks().findIndex(w=>value.date>=w.from && value.date<=w.to));$('dialog').close();await refresh();
});};
function move(n){const next=new Date(Date.UTC(year,month-1+n,1));if(next.getUTCFullYear()<2000||next.getUTCFullYear()>2099)return;year=next.getUTCFullYear();month=next.getUTCMonth()+1;selected=0;refresh().catch(e=>notify(e.message));}
$('prev').onclick=()=>move(-1);$('next').onclick=()=>move(1);
selected=Math.max(0,weeks().findIndex(w=>today>=w.from && today<=w.to));

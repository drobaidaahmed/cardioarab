(function(){
var D=window.ECHO_IDX||[];
var MAP={'أ':'ا','إ':'ا','آ':'ا','ٱ':'ا','ى':'ي','ئ':'ي','ؤ':'و','ة':'ه'};
function norm(s){s=String(s).toLowerCase();s=s.replace(/[\u064B-\u065F\u0670\u0640]/g,'');s=s.replace(/[أإآٱىئؤة]/g,function(c){return MAP[c]});s=s.replace(/[٠-٩]/g,function(d){return String(d.charCodeAt(0)-1632)});return s;}
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
for(var i=0;i<D.length;i++){D[i].nx=norm(D[i].x);D[i].ns=norm(D[i].st);D[i].nc=norm(D[i].ct);}
var $=function(id){return document.getElementById(id)};
var q=$('qs'),info=$('qinfo'),res=$('qres');
var shown=0,cur=[],tokens=[],PAGE=25,timer=null;
function parse(v){var t=[],m,re=/"([^"]+)"|(\S+)/g;while((m=re.exec(v))){var w=norm(m[1]||m[2]).trim();if(w)t.push(w);}return t;}
function isWordChar(c){return /[\u0600-\u06FFa-z0-9]/.test(c||'');}
var PRE={'':1,'و':1,'ف':1,'ب':1,'ل':1,'ك':1,'ال':1,'وال':1,'بال':1,'كال':1,'فال':1,'لل':1,'ولل':1,'ول':1,'وب':1,'فب':1,'ولل':1};
var SUF={'':1,'ه':1,'ها':1,'هم':1,'هما':1,'ات':1,'ان':1,'ين':1,'ون':1,'ي':1,'يه':1,'يات':1,'ك':1,'نا':1,'تين':1,'ي':1};
function wholeOk(h,i,len){
  var ws=i;while(ws>0&&isWordChar(h.charAt(ws-1)))ws--;
  var we=i+len;while(we<h.length&&isWordChar(h.charAt(we)))we++;
  return PRE[h.slice(ws,i)]===1&&SUF[h.slice(i+len,we)]===1;
}
function countIn(h,tok,whole){
  var n=0,i=0;
  while((i=h.indexOf(tok,i))!==-1){
    if(!whole||wholeOk(h,i,tok.length)) n++;
    i+=Math.max(1,tok.length);
  }
  return n;
}
function firstPos(h,tok,whole){
  var i=0;while((i=h.indexOf(tok,i))!==-1){
    if(!whole||wholeOk(h,i,tok.length)) return i;
    i+=Math.max(1,tok.length);
  }return -1;
}
function snippet(e,whole){
  var pos=-1;for(var k=0;k<tokens.length;k++){var p=firstPos(e.nx,tokens[k],whole);if(p>=0&&(pos<0||p<pos))pos=p;}
  if(pos<0)return esc(e.x.slice(0,150))+'…';
  var a=Math.max(0,pos-60),b=Math.min(e.x.length,pos+110);
  var raw=e.x.slice(a,b),nn=e.nx.slice(a,b),ranges=[];
  for(var k=0;k<tokens.length;k++){var i=0;while((i=nn.indexOf(tokens[k],i))!==-1){ranges.push([i,i+tokens[k].length]);i+=Math.max(1,tokens[k].length);}}
  ranges.sort(function(x,y){return x[0]-y[0]});
  var out='',last=0;
  for(var r=0;r<ranges.length;r++){var s=ranges[r][0],t=ranges[r][1];if(s<last)continue;out+=esc(raw.slice(last,s))+'<mark>'+esc(raw.slice(s,t))+'</mark>';last=t;}
  out+=esc(raw.slice(last));
  return (a>0?'… ':'')+out+(b<e.x.length?' …':'');
}
function run(){
  var v=q.value.trim();tokens=parse(v);
  var whole=$('oWord').checked,titles=$('oTitle').checked,sec=$('oSec').value;
  if($('oPhrase').checked&&tokens.length>1)tokens=[tokens.join(' ')];
  res.innerHTML='';cur=[];shown=0;
  if(!v){info.textContent='';return;}
  var total=0;for(var k=0;k<tokens.length;k++)total+=tokens[k].length;
  if(!tokens.length||total<2){info.textContent='اكتب حرفين على الأقل.';return;}
  var out=[];
  for(var i=0;i<D.length;i++){
    var e=D[i];if(sec!==''&&String(e.g)!==sec)continue;
    var score=0,ok=true;
    for(var k=0;k<tokens.length;k++){
      var ts=countIn(e.ns,tokens[k],whole),tcn=countIn(e.nc,tokens[k],whole);
      var xc=titles?0:countIn(e.nx,tokens[k],whole);
      if(ts===0&&tcn===0&&xc===0){ok=false;break;}
      var dens=Math.min(40,xc*3000/Math.max(300,e.x.length));
      score+=Math.min(ts,2)*14+Math.min(tcn,2)*3+Math.min(xc,10)+dens;
    }
    if(ok){if(tokens.length>1&&!titles){var p0=e.nx.indexOf(tokens[0]);}out.push([score,i]);}
  }
  out.sort(function(a,b){return b[0]-a[0]||a[1]-b[1]});
  cur=out;
  info.textContent=out.length?('تم العثور على '+out.length+' موضعاً'):'لا توجد نتائج. جرّب كلمة أقصر أو أزل بعض الخيارات.';
  more();
}
function more(){
  var end=Math.min(cur.length,shown+PAGE),whole=$('oWord').checked,html='';
  var old=document.getElementById('qmore');if(old)old.parentNode.removeChild(old);
  for(var i=shown;i<end;i++){
    var e=D[cur[i][1]],h=e.f+'?h='+encodeURIComponent(q.value.trim().replace(/"/g,''))+'#'+e.id;
    html+='<a class="qr" href="'+h+'"><div class="qc">الفصل '+e.n+' · '+esc(e.ct)+'</div><div class="qt">'+esc(e.st)+'</div><div class="qs">'+($('oTitle').checked?esc(e.x.slice(0,150))+'…':snippet(e,whole))+'</div></a>';
  }
  res.insertAdjacentHTML('beforeend',html);shown=end;
  if(shown<cur.length){res.insertAdjacentHTML('beforeend','<button class="qmore" id="qmore" type="button">عرض المزيد ('+(cur.length-shown)+')</button>');$('qmore').onclick=more;}
}
function sched(){clearTimeout(timer);timer=setTimeout(run,130);}
q.addEventListener('input',sched);
['oWord','oPhrase','oTitle','oSec'].forEach(function(id){$(id).addEventListener('change',run);});
$('qclear').addEventListener('click',function(){q.value='';run();q.focus();});
q.addEventListener('keydown',function(e){if(e.key==='Escape'){q.value='';run();}if(e.key==='Enter'){var a=res.querySelector('.qr');if(a)a.focus();}});
document.addEventListener('keydown',function(e){if(e.key==='/'&&document.activeElement!==q&&!/INPUT|TEXTAREA|SELECT/.test((document.activeElement||{}).tagName||'')){e.preventDefault();q.focus();}});
})();
/* ===========================
   PROMIL DETOKS – Admin JS v4
   =========================== */
'use strict';

var ADMIN_PASSWORD = 'promil2026';
var maxMB = 5;

var STATE = {
  token:'', repo:'', owner:'', branch:'main',
  content:null, fileSha:'', ordersSha:'', dealersSha:'', usersSha:'',
  dirty:false, currentPage:'dashboard', currentProduct:0,
  commits:[], orders:[], dealers:[], users:[], pendingImages:{}
};

function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return Array.from(document.querySelectorAll(sel)); }
function mkEl(tag,cls,html){ var e=document.createElement(tag); if(cls)e.className=cls; if(html!==undefined)e.innerHTML=html; return e; }
function escHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function getVal(id){ var e=qs('#'+id); return e?(e.value||'').trim():''; }
function setVal(id,val){ var e=qs('#'+id); if(e&&val!==undefined&&val!==null) e.value=val; }

/* Toast */
function toast(msg,type,dur){
  type=type||'success'; dur=dur||3500;
  var t=mkEl('div','toast '+type,'<span>'+escHtml(msg)+'</span>');
  var c=qs('#toastContainer');
  if(!c){c=mkEl('div','');c.id='toastContainer';c.style.cssText='position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;';document.body.appendChild(c);}
  c.appendChild(t);
  setTimeout(function(){t.classList.add('show');},10);
  setTimeout(function(){t.classList.remove('show');setTimeout(function(){if(t.parentNode)t.parentNode.removeChild(t);},300);},dur);
}

/* GitHub API */
var GH='https://api.github.com';
function ghFetch(path,opts){
  opts=opts||{};
  return fetch(GH+path,Object.assign({},opts,{
    headers:Object.assign({'Authorization':'Bearer '+STATE.token,'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},opts.headers||{})
  })).then(function(r){
    if(!r.ok) return r.json().catch(function(){return{};}).then(function(e){throw new Error(e.message||'GitHub API hatasi: '+r.status);});
    return r.json();
  });
}
function verifyToken(){ return ghFetch('/user').then(function(u){return u.login;}); }
function decodeB64(b64){
  var clean=b64.replace(/\n/g,'');
  var bytes=Uint8Array.from(atob(clean),function(c){return c.charCodeAt(0);});
  return JSON.parse(new TextDecoder('utf-8').decode(bytes));
}
function encodeB64(obj){
  var str=JSON.stringify(obj,null,2);
  var bytes=new TextEncoder().encode(str);
  var bin=''; bytes.forEach(function(b){bin+=String.fromCharCode(b);}); return btoa(bin);
}
function getContentFile(){
  return ghFetch('/repos/'+STATE.owner+'/'+STATE.repo+'/contents/data/content.json?ref='+STATE.branch)
    .then(function(d){STATE.fileSha=d.sha; return decodeB64(d.content);});
}
function loadContent(){
  if(!STATE.token) return Promise.resolve(STATE.content||getDefaultContent());
  return getContentFile().then(function(c){STATE.content=c; return c;});
}
function commitContent(content,msg){
  return ghFetch('/repos/'+STATE.owner+'/'+STATE.repo+'/contents/data/content.json',{
    method:'PUT',body:JSON.stringify({message:msg,content:encodeB64(content),sha:STATE.fileSha,branch:STATE.branch})
  }).then(function(r){STATE.fileSha=r.content.sha; return r;});
}
function getCommits(){
  return ghFetch('/repos/'+STATE.owner+'/'+STATE.repo+'/commits?path=data/content.json&per_page=10&ref='+STATE.branch);
}
function getJsonFile(fp,sk){
  return ghFetch('/repos/'+STATE.owner+'/'+STATE.repo+'/contents/'+fp+'?ref='+STATE.branch)
    .then(function(d){STATE[sk]=d.sha; return decodeB64(d.content);})
    .catch(function(){STATE[sk]=''; return [];});
}
function commitJsonFile(fp,sk,data,msg){
  var body={message:msg,content:encodeB64(data),branch:STATE.branch};
  if(STATE[sk]) body.sha=STATE[sk];
  return ghFetch('/repos/'+STATE.owner+'/'+STATE.repo+'/contents/'+fp,{method:'PUT',body:JSON.stringify(body)})
    .then(function(r){STATE[sk]=r.content.sha; return r;});
}

function getDefaultContent(){
  return {
    site:{title:'Promil Detoks',description:'',badge:'%100 Dogal Bitkisel Formul'},
    seo:{title:'',description:'',keywords:'',canonical:'',og_title:'',og_description:'',og_image:'',twitter_card:'summary_large_image',robots:'index, follow',lang:'tr',ga_id:''},
    images:{logo:'',favicon:'',hero_bg:'',hero_video:'',og_image:''},
    social:{instagram:'',facebook:'',twitter:'',youtube:'',tiktok:''},
    hero:{title_white1:'Alkol Sonrasi',title_green:'Hizli Toparlan,',title_white2:'Gune Hazir Ol',description:'',cta_primary:'Urunleri Kesfet',cta_secondary:'Nasil Calisir?',stat1_num:'50K+',stat1_label:'Mutlu Kullanici',stat2_num:'%98',stat2_label:'Memnuniyet',stat3_num:'2',stat3_label:'Ozel Formul',badge_float_1:'Bitkisel Icerik',badge_float_2:'Yasal Guvenli'},
    trust_bar:[{icon:'leaf',text:'Bitkisel Dogal'},{icon:'microscope',text:'Klinik Analizi Tamamlandi'},{icon:'truck',text:'Ucretsiz Kargo'},{icon:'shield-check',text:'Turkiyede Yasal Izinli'},{icon:'refresh-ccw',text:'30 Gun Iade'}],
    how_it_works:{tag:'Surec',title:'Nasil Calisir?',description:'3 basit adimda alkol sonrasi toparlanma surecini destekle',steps:[{num:'01',title:'Urununu Sec',text:''},{num:'02',title:'Kullan',text:''},{num:'03',title:'Farki Hisset',text:''}]},
    products:[
      {id:'toz',badge:'En Cok Satan',tag:'Toz Formul',name:'Promil Detoks Toz',description:'',features:['Bitkisel Dogal Icerik','Suyla Karistirilir','Klinik Analizi Tamamlandi','Turkiyede Yasal Izinli'],packages:[{id:'toz-tekli',name:'Tekli',qty:'1 Adet',price:199,save:''},{id:'toz-uclu',name:'Uclu',qty:'3 Adet',price:549,save:'Tasarruf 48 TL'},{id:'toz-stand',name:'20li Stand',qty:'20 Adet',price:2499,save:'Adet basi 125 TL',featured:true}],images:['images/tekli.jpeg','images/tekli2.jpeg','images/tekli3.jpeg'],price_new:199,shipping:{free:true,carrier:'Yurtici Kargo',days:'2-3'}},
      {id:'shot',badge:'Cok Yakinda',tag:'Shot Formul',name:'Promil Detoks Shot',description:'Ayni guclu bitkisel formulun pratik shot versiyonu.',coming_soon:true,images:[],price_new:0}
    ],
    benefits:{tag:'Neden Promil?',title:'Farkimizi Hissedin',description:'',rating_value:'4.9/5',rating_label:'50.000+ degerlendirme',items:[{title:'%100 Bitkisel Icerikler',text:''},{title:'Yasal Guvenli',text:''},{title:'Klinik Analizi Tamamlandi',text:''},{title:'Hizli Etki',text:''}]},
    testimonials:[],
    cta:{title:'Alkol Sonrasi Toparlanmayi Kolaylastir',description:'Ilk siparisinde %30 indirim ucretsiz kargo firsatini kacirma!',button:'Hemen Basla'},
    footer:{brand_desc:'',copyright:'2026 Promil Detoks. Tum haklari saklidir.'},
    contact:{email:'info@promildetoks.com',phone:'0850 XXX XX XX',address:'Istanbul, Turkiye'},
    announcement:{enabled:false,text:''}
  };
}

/* Login */
window.toggleLoginPwd=function(btn){
  var inp=qs('#inputPassword'); if(!inp) return;
  var h=inp.type==='password'; inp.type=h?'text':'password';
};
window.toggleVisibility=function(inputId,btn){
  var inp=qs('#'+inputId); if(!inp) return;
  var h=inp.type==='password'; inp.type=h?'text':'password';
};
window.copyWebhookUrl=function(){
  var inp=qs('#iyzico_webhook_url'); if(!inp||!inp.value) return;
  if(navigator.clipboard){
    navigator.clipboard.writeText(inp.value).then(function(){toast('Webhook URL kopyalandi!','success');});
  } else {
    var ta=document.createElement('textarea'); ta.value=inp.value;
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta); toast('Webhook URL kopyalandi!','success');
  }
};

function handleLogin(e){
  if(e) e.preventDefault();
  var btn=qs('#loginBtn'), errEl=qs('#loginError');
  if(errEl) errEl.classList.remove('show');
  var pwEl=qs('#inputPassword'); if(!pwEl) return;
  var pw=pwEl.value.trim();
  if(pw!==ADMIN_PASSWORD){
    if(errEl){errEl.textContent='Hatalı şifre. Lütfen tekrar deneyin.'; errEl.classList.add('show');}
    return;
  }
  btn.disabled=true; btn.textContent='Yükleniyor...';

  // Önce API'den token almayı dene (Vercel production), sonra local config'i kullan
  var tokenPromise;
  if(window.loadAdminConfigFromAPI){
    tokenPromise = window.loadAdminConfigFromAPI(pw).catch(function(){return false;});
  } else {
    tokenPromise = Promise.resolve(false);
  }

  tokenPromise.then(function(){
    // Token API'den veya local config'den gelmiş olabilir
    var cfg=window.ADMIN_CONFIG&&window.ADMIN_CONFIG.github;
    if(cfg&&cfg.token){
      var parts=cfg.repo.split('/');
      STATE.token=cfg.token; STATE.owner=parts[0]; STATE.repo=parts[1]; STATE.branch=cfg.branch||'main';
    }
    // Her zaman once content.json'u fetch et (token olsa da olmasa da)
    return loadContentFromServer().then(function(c){
      STATE.content=c;
      sessionStorage.setItem('gh_authed','1');
      sessionStorage.setItem('gh_pw', pw); // Oturum yenileme için şifreyi sakla
      if(STATE.token){
        return verifyToken().then(function(u){
          return getCommits().catch(function(){return[];}).then(function(cm){
            STATE.commits=cm; showAdminUI(u);
          });
        }).catch(function(err){
          console.warn('Token doğrulama hatası:', err.message);
          showAdminUI('Admin');
        });
      } else {
        showAdminUI('Admin');
      }
    }).catch(function(err){
      console.warn('İçerik yüklenemedi:',err.message);
      STATE.content=getDefaultContent();
      sessionStorage.setItem('gh_authed','1');
      showAdminUI('Admin');
    });
  }).finally(function(){btn.disabled=false; btn.textContent='Giriş Yap';});
}

// content.json'u once GitHub API ile, basarisiz olursa GitHub raw URL ile, son care default ile yukle
function loadContentFromServer(){
  if(STATE.token){
    return getContentFile().catch(function(){
      // GitHub API basarisiz: raw URL dene
      return fetch('https://raw.githubusercontent.com/busebolova/promil-detoks/main/data/content.json?v='+Date.now())
        .then(function(r){return r.ok?r.json():getDefaultContent();})
        .catch(function(){return getDefaultContent();});
    });
  }
  // Token yok: once GitHub raw URL dene, sonra local, son care default
  return fetch('https://raw.githubusercontent.com/busebolova/promil-detoks/main/data/content.json?v='+Date.now())
    .then(function(r){return r.ok?r.json():null;})
    .then(function(c){
      if(c) return c;
      return fetch('/data/content.json?v='+Date.now())
        .then(function(r){return r.ok?r.json():getDefaultContent();})
        .catch(function(){return getDefaultContent();});
    })
    .catch(function(){
      return fetch('/data/content.json?v='+Date.now())
        .then(function(r){return r.ok?r.json():getDefaultContent();})
        .catch(function(){return getDefaultContent();});
    });
}

function showAdminUI(username){
  qs('#loginScreen').style.display='none';
  qs('#adminApp').classList.add('show');
  var hasToken=!!STATE.token;
  var rt=hasToken?(STATE.owner+'/'+STATE.repo):'promildetoks';
  var bt=hasToken?STATE.branch:'main';
  if(qs('#repoDisplay')) qs('#repoDisplay').textContent=rt;
  if(qs('#branchDisplay')) qs('#branchDisplay').textContent=bt;
  if(qs('#repoDisplay2')) qs('#repoDisplay2').textContent=rt;
  if(qs('#branchDisplay2')) qs('#branchDisplay2').textContent=bt;
  var badge=qs('#statusBadge');
  if(badge){
    badge.className='status-badge connected';
    badge.innerHTML='<span class="status-dot"></span> '+(hasToken?'GitHub Bağlı':'Admin');
  }
  if(STATE.content&&STATE.content.products){
    STATE.content.products.forEach(function(p){if(!p.shipping)p.shipping={free:true,carrier:'Yurtiçi Kargo',days:'2-3'};});
  }
  populateAllForms();
  if(hasToken) renderCommits();
  // Siparisleri ve kullanicilari her zaman yukle
  loadOrders();
  loadUsers();
  renderDashboard();
  navigateTo('dashboard');
}

function handleLogout(){
  sessionStorage.clear(); STATE.token=''; STATE.content=null; STATE.dirty=false;
  STATE.pendingImages={}; STATE.orders=[]; STATE.dealers=[];
  qs('#adminApp').classList.remove('show'); qs('#loginScreen').style.display='';
  if(qs('#inputPassword')) qs('#inputPassword').value='';
}

/* Navigation */
function navigateTo(page){
  STATE.currentPage=page;
  qsa('.nav-item').forEach(function(i){i.classList.remove('active');});
  var ni=document.querySelector('.nav-item[data-page="'+page+'"]'); if(ni) ni.classList.add('active');
  qsa('.page').forEach(function(p){p.classList.remove('active');});
  var pg=document.getElementById('page-'+page); if(pg) pg.classList.add('active');
  var titles={dashboard:'Dashboard',hero:'Hero Bölümü',products:'Ürünler',howitworks:'Nasıl Çalışır?',benefits:'Avantajlar',packages:'Paket Fiyatları',trustbar:'Güven Bantları',footer:'Footer',testimonials:'Müşteri Yorumları',cta:'CTA & İletişim',images:'Görsel & Video Yönetimi',seo:'SEO Ayarları',iyzico:'iyzico API',settings:'Site Ayarları',commits:'Commit Geçmişi',store:'Mağaza Ürünleri',orders:'Siparişler',users:'Kullanıcılar',dealers:'Bayilik Başvuruları'};
  var tt=qs('#topbarTitle'); if(tt) tt.textContent=titles[page]||page;
  if(page==='iyzico') loadIyzicoConfig();
  if(page==='seo') populateSeoForm();
  if(page==='images') renderImagesPage();
  if(page==='store') renderStoreProducts();
  if(page==='orders') loadOrders();
  if(page==='users') loadUsers();
  if(page==='dealers') loadDealers();
  if(page==='commits') renderCommits();
  if(page==='settings') populateSettingsForm();
  if(page==='dashboard'){
    renderDashboard();
    if(!STATE.orders||STATE.orders.length===0) loadOrders();
  }
  if(page==='products') renderProductEditor(STATE.currentProduct||0);
  if(page==='testimonials') renderTestimonialEditor();
}

/* Dashboard */
function renderDashboard(){
  if(!STATE.content) return;
  var c=STATE.content;
  var dp=qs('#dashProductCount'); if(dp) dp.textContent=c.products?c.products.filter(function(p){return !p.coming_soon;}).length:0;
  var dt=qs('#dashTestimonialCount'); if(dt) dt.textContent=c.testimonials?c.testimonials.length:0;
  var dtz=qs('#dashTozPrice');
  if(dtz){
    var tozProd=c.products&&c.products[0];
    var tozPrice=tozProd?(tozProd.price_new||(tozProd.packages&&tozProd.packages[0]?tozProd.packages[0].price:'--')):'--';
    dtz.textContent='₺'+tozPrice;
  }
  var ic=readIyzicoConfig();
  var di=qs('#dashIyzicoStatus');
  if(di) di.textContent=(ic&&ic.api_key&&ic.secret_key)?(ic.env==='production'?'Production':'Sandbox'):'Pasif';
  var el=qs('#orderTotalCount'); if(el) el.textContent=(STATE.orders&&STATE.orders.length)||0;
  var el2=qs('#orderPendingCount'); if(el2) el2.textContent=(STATE.orders&&STATE.orders.filter(function(o){return o.status==='pending';}).length)||0;
  var el3=qs('#dealerTotalCount'); if(el3) el3.textContent=(STATE.dealers&&STATE.dealers.length)||0;
  var el4=qs('#dealerPendingCount'); if(el4) el4.textContent=(STATE.dealers&&STATE.dealers.filter(function(d){return d.status==='pending';}).length)||0;
  var el5=qs('#userTotalCount'); if(el5) el5.textContent=(STATE.users&&STATE.users.length)||0;
}

/* Populate Forms */
function populateAllForms(){
  var c=STATE.content; if(!c) return;
  var h=c.hero||{};
  setVal('hero_badge',h.badge||(c.site&&c.site.badge)||'');
  setVal('hero_title_white1',h.title_white1||''); setVal('hero_title_green',h.title_green||''); setVal('hero_title_white2',h.title_white2||'');
  setVal('hero_description',h.description||''); setVal('hero_cta_primary',h.cta_primary||''); setVal('hero_cta_secondary',h.cta_secondary||'');
  setVal('hero_stat1_num',h.stat1_num||''); setVal('hero_stat1_label',h.stat1_label||'');
  setVal('hero_stat2_num',h.stat2_num||''); setVal('hero_stat2_label',h.stat2_label||'');
  setVal('hero_stat3_num',h.stat3_num||''); setVal('hero_stat3_label',h.stat3_label||'');
  setVal('hero_badge_float1',h.badge_float_1||''); setVal('hero_badge_float2',h.badge_float_2||'');
  setVal('hero_video_url',(c.images&&c.images.hero_video)||'');
  var hiw=c.how_it_works||{}; var steps=hiw.steps||[{},{},{}];
  setVal('hiw_tag',hiw.tag||''); setVal('hiw_title',hiw.title||''); setVal('hiw_description',hiw.description||'');
  setVal('hiw_step1_num',steps[0]&&steps[0].num||''); setVal('hiw_step1_title',steps[0]&&steps[0].title||''); setVal('hiw_step1_text',steps[0]&&steps[0].text||'');
  setVal('hiw_step2_num',steps[1]&&steps[1].num||''); setVal('hiw_step2_title',steps[1]&&steps[1].title||''); setVal('hiw_step2_text',steps[1]&&steps[1].text||'');
  setVal('hiw_step3_num',steps[2]&&steps[2].num||''); setVal('hiw_step3_title',steps[2]&&steps[2].title||''); setVal('hiw_step3_text',steps[2]&&steps[2].text||'');
  var ben=c.benefits||{}; var bi=ben.items||[{},{},{},{}];
  setVal('ben_tag',ben.tag||''); setVal('ben_title',ben.title||''); setVal('ben_description',ben.description||'');
  setVal('ben_rating_value',ben.rating_value||''); setVal('ben_rating_label',ben.rating_label||'');
  setVal('ben_item1_title',bi[0]&&bi[0].title||''); setVal('ben_item1_text',bi[0]&&bi[0].text||'');
  setVal('ben_item2_title',bi[1]&&bi[1].title||''); setVal('ben_item2_text',bi[1]&&bi[1].text||'');
  setVal('ben_item3_title',bi[2]&&bi[2].title||''); setVal('ben_item3_text',bi[2]&&bi[2].text||'');
  setVal('ben_item4_title',bi[3]&&bi[3].title||''); setVal('ben_item4_text',bi[3]&&bi[3].text||'');
  var pkgs=c.products&&c.products[0]&&c.products[0].packages||[{},{},{}];
  setVal('pkg1_name',pkgs[0]&&pkgs[0].name||''); setVal('pkg1_qty',pkgs[0]&&pkgs[0].qty||''); setVal('pkg1_price',pkgs[0]&&pkgs[0].price||''); setVal('pkg1_save',pkgs[0]&&pkgs[0].save||'');
  setVal('pkg2_name',pkgs[1]&&pkgs[1].name||''); setVal('pkg2_qty',pkgs[1]&&pkgs[1].qty||''); setVal('pkg2_price',pkgs[1]&&pkgs[1].price||''); setVal('pkg2_save',pkgs[1]&&pkgs[1].save||'');
  setVal('pkg3_name',pkgs[2]&&pkgs[2].name||''); setVal('pkg3_qty',pkgs[2]&&pkgs[2].qty||''); setVal('pkg3_price',pkgs[2]&&pkgs[2].price||''); setVal('pkg3_save',pkgs[2]&&pkgs[2].save||'');
  var tb=c.trust_bar||[{},{},{},{},{}];
  [1,2,3,4,5].forEach(function(i){setVal('trust'+i,tb[i-1]&&tb[i-1].text||'');});
  var ft=c.footer||{}; var ct=c.contact||{}; var sc=c.social||{};
  setVal('footer_brand_desc',ft.brand_desc||''); setVal('footer_copyright',ft.copyright||'');
  setVal('footer_contact_email',ct.email||''); setVal('footer_contact_phone',ct.phone||''); setVal('footer_contact_address',ct.address||'');
  setVal('footer_instagram',sc.instagram||''); setVal('footer_facebook',sc.facebook||''); setVal('footer_twitter',sc.twitter||''); setVal('footer_youtube',sc.youtube||''); setVal('footer_tiktok',sc.tiktok||'');
  var cta=c.cta||{};
  setVal('cta_title',cta.title||''); setVal('cta_description',cta.description||''); setVal('cta_button',cta.button||'');
  setVal('contact_email',ct.email||''); setVal('contact_phone',ct.phone||''); setVal('contact_address',ct.address||'');
  setVal('social_instagram',sc.instagram||''); setVal('social_facebook',sc.facebook||''); setVal('social_twitter',sc.twitter||''); setVal('social_youtube',sc.youtube||''); setVal('social_tiktok',sc.tiktok||'');
  var st=c.site||{}; setVal('site_title',st.title||''); setVal('site_description',st.description||'');
  var ann=c.announcement||{}; var at=qs('#announcement_enabled'); if(at) at.checked=ann.enabled||false;
  setVal('announcement_text',ann.text||'');
  renderProductEditor(STATE.currentProduct||0);
  renderTestimonialEditor();
}

/* SEO */
function populateSeoForm(){
  var c=STATE.content; if(!c) return;
  var seo=c.seo||{}; var st=c.site||{};
  setVal('seo_title',seo.title||st.title||'');
  setVal('seo_description',seo.description||st.description||'');
  setVal('seo_keywords',seo.keywords||'');
  setVal('seo_canonical',seo.canonical||'');
  setVal('og_title',seo.og_title||seo.title||'');
  setVal('og_description',seo.og_description||seo.description||'');
  setVal('og_image_url',seo.og_image||'');
  var tc=qs('#twitter_card'); if(tc) tc.value=seo.twitter_card||'summary_large_image';
  var rb=qs('#seo_robots'); if(rb) rb.value=seo.robots||'index, follow';
  var lg=qs('#seo_lang'); if(lg) lg.value=seo.lang||'tr';
  setVal('seo_ga_id',seo.ga_id||'');
  updateSeoPreview(); updateSeoCounters();
}
function updateSeoPreview(){
  var title=getVal('seo_title'); var desc=getVal('seo_description'); var url=getVal('seo_canonical')||'promildetoks.com';
  var pu=url.replace(/^https?:\/\//,'').replace(/\/$/,'');
  var pt=qs('#seoPreviewTitle'); if(pt) pt.textContent=title||'Sayfa Basligi';
  var pd=qs('#seoPreviewDesc'); if(pd) pd.textContent=desc||'Meta aciklama buraya gelecek...';
  var pu2=qs('#seoPreviewUrl'); if(pu2) pu2.textContent=pu||'promildetoks.com';
}
function updateSeoCounters(){
  var tl=getVal('seo_title').length; var dl=getVal('seo_description').length;
  var tc=qs('#seoTitleCount'); if(tc) tc.textContent=tl;
  var dc=qs('#seoDescCount'); if(dc) dc.textContent=dl;
}

/* Settings */
function populateSettingsForm(){
  var c=STATE.content; if(!c) return;
  setVal('site_title',c.site&&c.site.title||'');
  setVal('site_description',c.site&&c.site.description||'');
  var ae=qs('#announcement_enabled'); if(ae) ae.checked=c.announcement&&c.announcement.enabled||false;
  setVal('announcement_text',c.announcement&&c.announcement.text||'');
}

/* Images */
function renderImagesPage(){
  var c=STATE.content; if(!c) return;
  var imgs=c.images||{};
  var logoUrl=imgs.logo||'../images/Promildetoks-logo.png';
  var logoArea=qs('#logoUploadArea'); var logoPreview=qs('#logoPreview');
  var logoImg=qs('#logoPreviewImg'); var logoFileName=qs('#logoFileName');
  if(logoImg) logoImg.src=logoUrl;
  if(logoArea) logoArea.style.display='none';
  if(logoPreview) logoPreview.style.display='flex';
  if(logoFileName) logoFileName.textContent=imgs.logo?imgs.logo.split('/').pop():'Promildetoks-logo.png (varsayilan)';
  var faviconUrl=imgs.favicon||'../images/favicon.png';
  var faviconArea=qs('#faviconUploadArea'); var faviconPreview=qs('#faviconPreview');
  var faviconImg=qs('#faviconPreviewImg'); var faviconFileName=qs('#faviconFileName');
  if(faviconImg) faviconImg.src=faviconUrl;
  if(faviconArea) faviconArea.style.display='none';
  if(faviconPreview) faviconPreview.style.display='flex';
  if(faviconFileName) faviconFileName.textContent=imgs.favicon?imgs.favicon.split('/').pop():'favicon.png (varsayilan)';
  if(c.products&&c.products[0]) renderProductImagesGrid(c.products[0].images||[]);
}
function showImgPreview(key,dataUrl){
  var area=qs('#'+key+'UploadArea'); var preview=qs('#'+key+'Preview'); var img=qs('#'+key+'PreviewImg');
  if(area) area.style.display='none'; if(preview) preview.style.display='flex'; if(img) img.src=dataUrl;
}
function renderProductImagesGrid(images){
  var grid=qs('#productImagesGrid'); if(!grid) return;
  grid.innerHTML='';
  (images||[]).forEach(function(src,i){
    var wrap=mkEl('div','product-img-thumb');
    wrap.innerHTML='<img src="'+escHtml(src)+'" alt="Urun '+(i+1)+'" /><button onclick="removeProductImage('+i+')" title="Sil">x</button>';
    grid.appendChild(wrap);
  });
  var add=mkEl('div','product-img-placeholder');
  add.onclick=function(){document.getElementById('productImgFileInput').click();};
  add.innerHTML='<span>+ Gorsel Ekle</span>';
  grid.appendChild(add);
}
window.removeProductImage=function(idx){
  if(!STATE.content||!STATE.content.products||!STATE.content.products[0]) return;
  STATE.content.products[0].images.splice(idx,1);
  renderProductImagesGrid(STATE.content.products[0].images); markDirty();
};
window.handleImageUpload=function(key,input){
  var file=input.files[0]; if(!file) return;
  if(file.size>maxMB*1024*1024){toast('Dosya cok buyuk. Maks '+maxMB+'MB.','error'); return;}
  var reader=new FileReader();
  reader.onload=function(ev){
    var base64=ev.target.result.split(',')[1];
        var ext=file.name.split('.').pop().toLowerCase();
    var pathMap={logo:'images/Promildetoks-logo.png',favicon:'images/favicon.png'};
    var imgPath=pathMap[key]||('images/'+key+'.'+ext);
    STATE.pendingImages[key]={file:file,base64:base64,path:imgPath,dataUrl:ev.target.result};
    showImgPreview(key,ev.target.result);
    var nm=qs('#'+key+'FileName'); if(nm) nm.textContent=file.name+' (yukleme bekliyor)';
    toast(file.name+' secildi.','info');
    markDirty();
  };
  reader.readAsDataURL(file);
};
window.handleProductImagesUpload=function(input){
  var files=Array.from(input.files); if(!files.length) return;
  files.forEach(function(file){
    if(file.size>3*1024*1024){toast(file.name+' cok buyuk.','error'); return;}
    var reader=new FileReader();
    reader.onload=function(ev){
      var base64=ev.target.result.split(',')[1];
      var ext=file.name.split('.').pop().toLowerCase();
      var idx2=(STATE.content&&STATE.content.products&&STATE.content.products[0]&&STATE.content.products[0].images?STATE.content.products[0].images.length:0);
      var imgPath='images/product-'+(idx2+1)+'.'+ext;
      var key='product_img_'+idx2;
      STATE.pendingImages[key]={file:file,base64:base64,path:imgPath,dataUrl:ev.target.result};
      if(!STATE.content.products[0].images) STATE.content.products[0].images=[];
      STATE.content.products[0].images.push(ev.target.result);
      renderProductImagesGrid(STATE.content.products[0].images); markDirty();
    };
    reader.readAsDataURL(file);
  });
};
window.removeImage=function(key){
  var area=qs('#'+key+'UploadArea'); var preview=qs('#'+key+'Preview');
  if(area) area.style.display=''; if(preview) preview.style.display='none';
  delete STATE.pendingImages[key];
  if(STATE.content&&STATE.content.images) delete STATE.content.images[key];
  markDirty();
};
window.uploadAllImages=function(){
  var pending=Object.entries(STATE.pendingImages);
  if(!pending.length){toast('Yuklenecek gorsel yok.','info'); return;}
  if(!STATE.token){toast('GitHub baglantisi yok.','error'); return;}
  toast(pending.length+' gorsel yukleniyor...','info');
  var uploaded=0; var chain=Promise.resolve();
  pending.forEach(function(entry){
    var key=entry[0]; var imgData=entry[1];
    chain=chain.then(function(){
      return ghFetch('/repos/'+STATE.owner+'/'+STATE.repo+'/contents/'+imgData.path+'?ref='+STATE.branch)
        .then(function(ex){return ex.sha;}).catch(function(){return '';})
        .then(function(sha){
          var body={message:'[Admin] Gorsel: '+imgData.path,content:imgData.base64,branch:STATE.branch};
          if(sha) body.sha=sha;
          return ghFetch('/repos/'+STATE.owner+'/'+STATE.repo+'/contents/'+imgData.path,{method:'PUT',body:JSON.stringify(body)});
        }).then(function(){
          var rawUrl='https://raw.githubusercontent.com/'+STATE.owner+'/'+STATE.repo+'/'+STATE.branch+'/'+imgData.path;
          if(!STATE.content.images) STATE.content.images={};
          if(key.startsWith('product_img_')){
            var i2=parseInt(key.replace('product_img_',''));
            if(STATE.content.products&&STATE.content.products[0]&&STATE.content.products[0].images) STATE.content.products[0].images[i2]=rawUrl;
          } else { STATE.content.images[key]=rawUrl; }
          delete STATE.pendingImages[key]; uploaded++;
        }).catch(function(err){toast(imgData.path+' yuklenemedi: '+err.message,'error');});
    });
  });
  chain.then(function(){
    if(uploaded>0){
      commitContent(STATE.content,'[Admin] Gorsel URLleri guncellendi').then(function(){
        toast(uploaded+' gorsel yuklendi!'); clearDirty();
      }).catch(function(err){toast('content.json guncellenemedi: '+err.message,'error');});
    }
  });
};

/* Urun Editoru */
function renderProductEditor(idx){
  var p=STATE.content&&STATE.content.products&&STATE.content.products[idx]; if(!p) return;
  setVal('prod_badge',p.badge||''); setVal('prod_tag',p.tag||''); setVal('prod_name',p.name||'');
  setVal('prod_description',p.description||''); setVal('prod_price_old',p.price_old||''); setVal('prod_price_new',p.price_new||'');
  var sh=p.shipping||{};
  setVal('prod_shipping_carrier',sh.carrier||''); setVal('prod_shipping_days',sh.days||'');
  var freeEl=qs('#prod_shipping_free'); if(freeEl) freeEl.checked=sh.free!==false;
  // Coming soon toggle (Shot urunu icin)
  var csCard=qs('#prod_coming_soon_card');
  var csEl=qs('#prod_coming_soon');
  var csTagEl=qs('#prod_coming_soon_tag');
  if(csCard) csCard.style.display=(idx===1)?'block':'none';
  if(csEl) csEl.checked=p.coming_soon||false;
  if(csTagEl) csTagEl.value=p.coming_soon_tag||'Cok Yakinda';
  var list=qs('#featuresListContainer');
  if(list){list.innerHTML=''; (p.features||[]).forEach(function(f,i){list.appendChild(createFeatureItem(f,i));});}
  qsa('.product-tab').forEach(function(t,i){t.classList.toggle('active',i===idx);});
}
function createFeatureItem(text,idx){
  var wrap=mkEl('div','feature-item');
  wrap.innerHTML='<input type="text" value="'+escHtml(text)+'" placeholder="Ozellik..." /><button onclick="removeFeature('+idx+')" title="Sil">x</button>';
  wrap.querySelector('input').addEventListener('input',function(e){
    STATE.content.products[STATE.currentProduct].features[idx]=e.target.value; markDirty();
  });
  return wrap;
}
window.removeFeature=function(idx){STATE.content.products[STATE.currentProduct].features.splice(idx,1); renderProductEditor(STATE.currentProduct); markDirty();};
window.addFeature=function(){STATE.content.products[STATE.currentProduct].features.push(''); renderProductEditor(STATE.currentProduct); markDirty();};

/* Testimonials */
function renderTestimonialEditor(){
  var container=qs('#testimonialsContainer'); if(!container) return;
  container.innerHTML='';
  (STATE.content&&STATE.content.testimonials||[]).forEach(function(t,i){
    var card=mkEl('div','card');
    card.innerHTML='<div class="card-header"><div><h3>Yorum '+(i+1)+'</h3></div><button class="btn btn-danger btn-sm" onclick="removeTestimonial('+i+')">Sil</button></div>'
      +'<div class="card-body admin-form">'
      +'<div class="form-grid-2" style="margin-bottom:12px"><div class="form-group"><label>Ad Soyad</label><input type="text" value="'+escHtml(t.author||'')+'" onchange="updateTestimonial('+i+',\'author\',this.value)" /></div>'
      +'<div class="form-group"><label>Sehir</label><input type="text" value="'+escHtml(t.location||'')+'" onchange="updateTestimonial('+i+',\'location\',this.value)" /></div></div>'
      +'<div class="form-group"><label>Yorum</label><textarea rows="3" onchange="updateTestimonial('+i+',\'text\',this.value)">'+escHtml(t.text||'')+'</textarea></div></div>';
    container.appendChild(card);
  });
}
window.updateTestimonial=function(idx,key,val){STATE.content.testimonials[idx][key]=val; markDirty();};
window.removeTestimonial=function(idx){STATE.content.testimonials.splice(idx,1); renderTestimonialEditor(); markDirty();};
window.addTestimonial=function(){STATE.content.testimonials.push({text:'',author:'',location:'',initials:'',featured:false}); renderTestimonialEditor(); markDirty();};

/* Dirty State */
function markDirty(){STATE.dirty=true; var sb=qs('#saveBar'); if(sb) sb.classList.add('show');}
function clearDirty(){STATE.dirty=false; var sb=qs('#saveBar'); if(sb) sb.classList.remove('show');}

/* Form verisi topla */
function collectFormData(){
  var c=STATE.content;
  if(!c.hero) c.hero={};
  c.hero.title_white1=getVal('hero_title_white1'); c.hero.title_green=getVal('hero_title_green'); c.hero.title_white2=getVal('hero_title_white2');
  c.hero.description=getVal('hero_description'); c.hero.cta_primary=getVal('hero_cta_primary'); c.hero.cta_secondary=getVal('hero_cta_secondary');
  c.hero.stat1_num=getVal('hero_stat1_num'); c.hero.stat1_label=getVal('hero_stat1_label');
  c.hero.stat2_num=getVal('hero_stat2_num'); c.hero.stat2_label=getVal('hero_stat2_label');
  c.hero.stat3_num=getVal('hero_stat3_num'); c.hero.stat3_label=getVal('hero_stat3_label');
  c.hero.badge_float_1=getVal('hero_badge_float1'); c.hero.badge_float_2=getVal('hero_badge_float2');
  if(!c.site) c.site={}; c.site.badge=getVal('hero_badge');
  if(!c.images) c.images={}; c.images.hero_video=getVal('hero_video_url');
  if(!c.how_it_works) c.how_it_works={steps:[{},{},{}]};
  c.how_it_works.tag=getVal('hiw_tag'); c.how_it_works.title=getVal('hiw_title'); c.how_it_works.description=getVal('hiw_description');
  if(!c.how_it_works.steps) c.how_it_works.steps=[{},{},{}];
  c.how_it_works.steps[0]=Object.assign(c.how_it_works.steps[0]||{},{num:getVal('hiw_step1_num'),title:getVal('hiw_step1_title'),text:getVal('hiw_step1_text')});
  c.how_it_works.steps[1]=Object.assign(c.how_it_works.steps[1]||{},{num:getVal('hiw_step2_num'),title:getVal('hiw_step2_title'),text:getVal('hiw_step2_text')});
  c.how_it_works.steps[2]=Object.assign(c.how_it_works.steps[2]||{},{num:getVal('hiw_step3_num'),title:getVal('hiw_step3_title'),text:getVal('hiw_step3_text')});
  if(!c.benefits) c.benefits={items:[{},{},{},{}]};
  c.benefits.tag=getVal('ben_tag'); c.benefits.title=getVal('ben_title'); c.benefits.description=getVal('ben_description');
  c.benefits.rating_value=getVal('ben_rating_value'); c.benefits.rating_label=getVal('ben_rating_label');
  if(!c.benefits.items) c.benefits.items=[{},{},{},{}];
  c.benefits.items[0]=Object.assign(c.benefits.items[0]||{},{title:getVal('ben_item1_title'),text:getVal('ben_item1_text')});
  c.benefits.items[1]=Object.assign(c.benefits.items[1]||{},{title:getVal('ben_item2_title'),text:getVal('ben_item2_text')});
  c.benefits.items[2]=Object.assign(c.benefits.items[2]||{},{title:getVal('ben_item3_title'),text:getVal('ben_item3_text')});
  c.benefits.items[3]=Object.assign(c.benefits.items[3]||{},{title:getVal('ben_item4_title'),text:getVal('ben_item4_text')});
  if(c.products&&c.products[0]&&c.products[0].packages){
    c.products[0].packages[0]=Object.assign(c.products[0].packages[0]||{},{name:getVal('pkg1_name'),qty:getVal('pkg1_qty'),price:Number(getVal('pkg1_price'))||c.products[0].packages[0].price,save:getVal('pkg1_save')});
    c.products[0].packages[1]=Object.assign(c.products[0].packages[1]||{},{name:getVal('pkg2_name'),qty:getVal('pkg2_qty'),price:Number(getVal('pkg2_price'))||c.products[0].packages[1].price,save:getVal('pkg2_save')});
    c.products[0].packages[2]=Object.assign(c.products[0].packages[2]||{},{name:getVal('pkg3_name'),qty:getVal('pkg3_qty'),price:Number(getVal('pkg3_price'))||c.products[0].packages[2].price,save:getVal('pkg3_save')});
  }
  // Coming soon alanlari kaydet
  var csEl=qs('#prod_coming_soon'); var csTagEl=qs('#prod_coming_soon_tag');
  if(csEl&&c.products&&c.products[STATE.currentProduct]){
    c.products[STATE.currentProduct].coming_soon=csEl.checked;
    c.products[STATE.currentProduct].coming_soon_tag=csTagEl?csTagEl.value:'Cok Yakinda';
  }
  if(!c.trust_bar) c.trust_bar=[{},{},{},{},{}];
  [1,2,3,4,5].forEach(function(i){if(!c.trust_bar[i-1])c.trust_bar[i-1]={}; c.trust_bar[i-1].text=getVal('trust'+i);});
  if(!c.footer) c.footer={}; c.footer.brand_desc=getVal('footer_brand_desc'); c.footer.copyright=getVal('footer_copyright');
  var p=c.products[STATE.currentProduct];
  if(p){
    p.badge=getVal('prod_badge'); p.tag=getVal('prod_tag'); p.name=getVal('prod_name');
    p.description=getVal('prod_description'); p.price_old=getVal('prod_price_old'); p.price_new=Number(getVal('prod_price_new'))||p.price_new;
    if(!p.shipping) p.shipping={};
    p.shipping.carrier=getVal('prod_shipping_carrier'); p.shipping.days=getVal('prod_shipping_days');
    var freeEl=qs('#prod_shipping_free'); p.shipping.free=freeEl?freeEl.checked:true;
  }
  if(!c.cta) c.cta={}; c.cta.title=getVal('cta_title'); c.cta.description=getVal('cta_description'); c.cta.button=getVal('cta_button');
  if(!c.contact) c.contact={};
  c.contact.email=getVal('footer_contact_email')||getVal('contact_email');
  c.contact.phone=getVal('footer_contact_phone')||getVal('contact_phone');
  c.contact.address=getVal('footer_contact_address')||getVal('contact_address');
  if(!c.social) c.social={};
  c.social.instagram=getVal('footer_instagram')||getVal('social_instagram');
  c.social.facebook=getVal('footer_facebook')||getVal('social_facebook');
  c.social.twitter=getVal('footer_twitter')||getVal('social_twitter');
  c.social.youtube=getVal('footer_youtube')||getVal('social_youtube');
  c.social.tiktok=getVal('footer_tiktok')||getVal('social_tiktok');
  if(!c.site) c.site={}; c.site.title=getVal('site_title'); c.site.description=getVal('site_description');
  if(!c.announcement) c.announcement={};
  var ae=qs('#announcement_enabled'); c.announcement.enabled=ae?ae.checked:false;
  c.announcement.text=getVal('announcement_text');
  return c;
}
function collectSeoData(){
  var c=STATE.content; if(!c.seo) c.seo={};
  c.seo.title=getVal('seo_title'); c.seo.description=getVal('seo_description'); c.seo.keywords=getVal('seo_keywords');
  c.seo.canonical=getVal('seo_canonical'); c.seo.og_title=getVal('og_title'); c.seo.og_description=getVal('og_description');
  c.seo.og_image=getVal('og_image_url');
  var tc=qs('#twitter_card'); c.seo.twitter_card=tc?tc.value:'summary_large_image';
  var rb=qs('#seo_robots'); c.seo.robots=rb?rb.value:'index, follow';
  var lg=qs('#seo_lang'); c.seo.lang=lg?lg.value:'tr';
  c.seo.ga_id=getVal('seo_ga_id');
  if(c.seo.title&&c.site) c.site.title=c.seo.title;
  if(c.seo.description&&c.site) c.site.description=c.seo.description;
}

/* Kaydet */
function handleSave(){
  var btn=qs('#saveBtn'); if(!btn) return;
  btn.disabled=true; btn.textContent='Kaydediliyor...';
  var content=collectFormData(); collectSeoData();
  STATE.content=content;
  if(!STATE.token){
    // Token yok: sadece local state'i guncelle, basari mesaji goster
    clearDirty(); renderDashboard();
    toast('Degisiklikler kaydedildi (local). GitHub token eklenince otomatik senkronize olur.','success');
    btn.disabled=false; btn.textContent='Kaydet & Yayinla';
    return;
  }
  var msg='[Admin] Icerik guncellendi - '+new Date().toLocaleString('tr-TR');
  commitContent(content,msg).then(function(){
    clearDirty(); renderDashboard();
    return getCommits().catch(function(){return STATE.commits;}).then(function(cm){STATE.commits=cm; renderCommits();});
  }).then(function(){toast('GitHub\'a kaydedildi ve yayinlandi!','success');})
  .catch(function(err){toast('Kayit hatasi: '+err.message,'error');})
  .finally(function(){btn.disabled=false; btn.textContent='Kaydet & Yayinla';});
}

/* Magaza */
function renderStoreProducts(){
  var container=qs('#storeProductsContainer'); if(!container) return;
  container.innerHTML='';
  var products=STATE.content&&STATE.content.products||[];
  if(!products.length){container.innerHTML='<div style="text-align:center;padding:40px;color:var(--gray-400)">Henuz urun yok.</div>'; return;}
  products.forEach(function(p,i){
    var card=mkEl('div','card');
    var header=mkEl('div','card-header');
    header.innerHTML='<div><h3>'+(p.name||'Urun '+(i+1))+'</h3><p>'+(p.tag||'')+'</p></div>';
    var editBtn=mkEl('button','btn btn-secondary btn-sm','Duzenle');
    editBtn.onclick=(function(ii){return function(){var b=container.querySelectorAll('.store-card-body')[ii]; if(b) b.style.display=b.style.display==='none'?'block':'none';};})(i);
    header.appendChild(editBtn); card.appendChild(header);
    var body=mkEl('div','card-body admin-form store-card-body'); body.style.display='none';
    body.innerHTML='<div class="form-grid-2"><div class="form-group"><label>Urun Adi</label><input type="text" value="'+escHtml(p.name||'')+'" onchange="updateProduct('+i+',\'name\',this.value)" /></div><div class="form-group"><label>Fiyat (TL)</label><input type="number" value="'+(p.price_new||'')+'" onchange="updateProduct('+i+',\'price_new\',Number(this.value))" /></div></div>';
    card.appendChild(body); container.appendChild(card);
  });
}
window.updateProduct=function(i,key,val){if(!STATE.content||!STATE.content.products||!STATE.content.products[i]) return; STATE.content.products[i][key]=val; markDirty();};
window.addStoreProduct=function(){
  if(!STATE.content) return;
  if(!STATE.content.products) STATE.content.products=[];
  STATE.content.products.push({id:'urun-'+Date.now(),name:'Yeni Urun',tag:'',badge:'',description:'',features:[],packages:[],images:[],price_new:0,shipping:{free:true,carrier:'Yurtici Kargo',days:'2-3'},coming_soon:false});
  renderStoreProducts(); markDirty(); toast('Yeni urun eklendi.','success');
};

/* Siparisler */
function loadOrders(){
  if(STATE.token){
    // GitHub API ile yukle (online mod) — SHA da alınır, güncelleme için gerekli
    getJsonFile('data/orders.json','ordersSha').then(function(orders){
      STATE.orders=Array.isArray(orders)?orders:[]; renderOrdersTable(STATE.orders); renderDashboard();
    }).catch(function(err){
      console.warn('[orders] GitHub API basarisiz, direkt fetch deneniyor:', err.message);
      fetchOrdersDirect();
    });
  } else {
    // Offline mod: GitHub raw URL veya direkt fetch
    fetchOrdersDirect();
  }
}
function fetchOrdersDirect(){
  var githubRawUrl = 'https://raw.githubusercontent.com/busebolova/promil-detoks/main/data/orders.json?v='+Date.now();
  var localUrl = '/data/orders.json?v='+Date.now();

  // GitHub API ile SHA almayı dene (token varsa)
  if(STATE.token){
    ghFetch('/repos/'+STATE.owner+'/'+STATE.repo+'/contents/data/orders.json?ref='+STATE.branch)
      .then(function(d){
        STATE.ordersSha=d.sha;
        try{
          var clean=d.content.replace(/\n/g,'');
          var bytes=Uint8Array.from(atob(clean),function(c){return c.charCodeAt(0);});
          var orders=JSON.parse(new TextDecoder('utf-8').decode(bytes));
          STATE.orders=Array.isArray(orders)?orders:[];
        }catch(e){ STATE.orders=[]; }
        renderOrdersTable(STATE.orders); renderDashboard();
      })
      .catch(function(){
        // Token ile başarısız, raw URL dene
        _fetchOrdersRaw(githubRawUrl, localUrl);
      });
    return;
  }
  _fetchOrdersRaw(githubRawUrl, localUrl);
}
function _fetchOrdersRaw(githubRawUrl, localUrl){
  fetch(githubRawUrl)
    .then(function(r){
      if(!r.ok) throw new Error('GitHub raw fetch basarisiz: '+r.status);
      return r.json();
    })
    .then(function(orders){
      STATE.orders=Array.isArray(orders)?orders:[];
      renderOrdersTable(STATE.orders); renderDashboard();
    })
    .catch(function(){
      fetch(localUrl)
        .then(function(r){return r.ok?r.json():[];})
        .then(function(orders){
          STATE.orders=Array.isArray(orders)?orders:[];
          renderOrdersTable(STATE.orders); renderDashboard();
        })
        .catch(function(err){
          console.warn('[orders] Siparisler yuklenemedi:', err.message);
          STATE.orders=[]; renderOrdersTable([]); renderDashboard();
        });
    });
}
function renderOrdersTable(orders){
  var container=qs('#ordersTableContainer'); if(!container) return;
  var tc=qs('#orderTotalCount'); if(tc) tc.textContent=orders.length;
  var pc=qs('#orderPendingCount'); if(pc) pc.textContent=orders.filter(function(o){return o.status==='pending';}).length;
  var sc=qs('#orderShippedCount'); if(sc) sc.textContent=orders.filter(function(o){return o.status==='shipped';}).length;
  var dc=qs('#orderDeliveredCount'); if(dc) dc.textContent=orders.filter(function(o){return o.status==='delivered';}).length;
  if(!orders.length){
    container.innerHTML='<div style="padding:40px;text-align:center;color:var(--gray-400)"><p style="font-size:.88rem;font-weight:600">Henuz siparis yok</p><p style="font-size:.78rem;margin-top:4px">Siparisler burada gorunecek</p></div>';
    return;
  }
  var sL={pending:'Bekliyor',processing:'Hazirlaniyor',shipped:'Kargoda',delivered:'Teslim Edildi',cancelled:'Iptal'};
  var sC={pending:'#d97706',processing:'#2563eb',shipped:'#16a34a',delivered:'#0d9488',cancelled:'#dc2626'};
  var html='<table style="width:100%;border-collapse:collapse"><thead><tr style="background:var(--gray-50);border-bottom:1px solid var(--gray-200)"><th style="padding:12px 16px;text-align:left;font-size:.72rem;font-weight:700;color:var(--gray-400)">Siparis No</th><th style="padding:12px 16px;text-align:left;font-size:.72rem;font-weight:700;color:var(--gray-400)">Musteri</th><th style="padding:12px 16px;text-align:left;font-size:.72rem;font-weight:700;color:var(--gray-400)">Teslimat Adresi</th><th style="padding:12px 16px;text-align:left;font-size:.72rem;font-weight:700;color:var(--gray-400)">Urun</th><th style="padding:12px 16px;text-align:left;font-size:.72rem;font-weight:700;color:var(--gray-400)">Toplam</th><th style="padding:12px 16px;text-align:left;font-size:.72rem;font-weight:700;color:var(--gray-400)">Durum</th><th style="padding:12px 16px;text-align:left;font-size:.72rem;font-weight:700;color:var(--gray-400)">Islem</th></tr></thead><tbody>';
  orders.forEach(function(o,i){
    var sl=sL[o.status]||o.status||'Bekliyor'; var sc2=sC[o.status]||'#2563eb';
    var date=o.createdAt?new Date(o.createdAt).toLocaleDateString('tr-TR'):'';
    // Adres bilgisi oluştur
    var addrParts=[o.addressLine||o.address||'', o.district||'', o.city||''].filter(function(s){return s.trim();});
    var addrDisplay=addrParts.join(', ')||'-';
    html+='<tr style="border-bottom:1px solid var(--gray-100)"><td style="padding:12px 16px;font-size:.8rem;font-weight:600">#'+escHtml(String(o.id||i+1))+'<br><small style="color:var(--gray-400)">'+date+'</small></td><td style="padding:12px 16px;font-size:.8rem"><strong>'+escHtml(o.name||'-')+'</strong><br><small style="color:var(--gray-400)">'+escHtml(o.email||'')+'</small><br><small style="color:var(--gray-400)">'+escHtml(o.phone||'')+'</small></td><td style="padding:12px 16px;font-size:.78rem;max-width:180px;line-height:1.4">'+escHtml(addrDisplay)+'</td><td style="padding:12px 16px;font-size:.8rem">'+escHtml(o.product||'-')+'</td><td style="padding:12px 16px;font-size:.8rem;font-weight:700">'+escHtml(String(o.total||0))+' TL</td><td style="padding:12px 16px"><span style="padding:4px 10px;border-radius:9999px;font-size:.72rem;font-weight:700;background:'+sc2+'20;color:'+sc2+'">'+sl+'</span></td><td style="padding:12px 16px"><select onchange="updateOrderStatus('+i+',this.value)" style="padding:6px 10px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.78rem;outline:none;background:white"><option value="pending" '+(o.status==='pending'?'selected':'')+'>Bekliyor</option><option value="processing" '+(o.status==='processing'?'selected':'')+'>Hazirlaniyor</option><option value="shipped" '+(o.status==='shipped'?'selected':'')+'>Kargoda</option><option value="delivered" '+(o.status==='delivered'?'selected':'')+'>Teslim Edildi</option><option value="cancelled" '+(o.status==='cancelled'?'selected':'')+'>Iptal</option></select></td></tr>';
  });
  html+='</tbody></table>';
  container.innerHTML=html;
}
window.updateOrderStatus=function(idx,status){
  if(!STATE.orders||!STATE.orders[idx]) return;
  var order=STATE.orders[idx]; order.status=status; order.updatedAt=new Date().toISOString();
  if(!STATE.token){
    toast('GitHub token olmadan siparis durumu kaydedilemez. Degisiklik sadece bu oturumda gecerli.','info');
    renderOrdersTable(STATE.orders);
    return;
  }
  commitJsonFile('data/orders.json','ordersSha',STATE.orders,'[Admin] Siparis durumu: #'+(order.id||idx+1))
    .then(function(){toast('Siparis durumu guncellendi!'); renderOrdersTable(STATE.orders); renderDashboard();})
    .catch(function(err){toast('Kayit hatasi: '+err.message,'error');});
};
window.filterOrders=function(){
  var search=(qs('#orderSearch')||{}).value||'';
  var sf=(qs('#orderStatusFilter')||{}).value||'';
  var filtered=STATE.orders.filter(function(o){
    var ms=!search||(o.name&&o.name.toLowerCase().includes(search.toLowerCase()))||(o.email&&o.email.toLowerCase().includes(search.toLowerCase()))||(String(o.id||'').includes(search));
    return ms&&(!sf||o.status===sf);
  });
  renderOrdersTable(filtered);
};
window.exportOrders=function(){
  if(!STATE.orders||!STATE.orders.length){toast('Disa aktarilacak siparis yok.','info'); return;}
  var headers=['Siparis No','Ad Soyad','E-posta','Telefon','Adres','Ilce','Sehir','Posta Kodu','Urun','Toplam','Durum','Tarih'];
  var rows=STATE.orders.map(function(o){return [o.id||'',o.name||'',o.email||'',o.phone||'',o.addressLine||o.address||'',o.district||'',o.city||'',o.zip||'',o.product||'',o.total||0,o.status||'',o.createdAt||''];});
  var csv=[headers.join(',')].concat(rows.map(function(r){return r.map(function(v){return '"'+String(v).replace(/"/g,'""')+'"';}).join(',');})).join('\n');
  var blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a'); a.href=url; a.download='siparisler-'+new Date().toISOString().slice(0,10)+'.csv'; a.click();
  URL.revokeObjectURL(url); toast('CSV indirildi!');
};

/* Kullanicilar */
function loadUsers(){
  if(STATE.token){
    // GitHub API ile yukle — SHA da alınır
    getJsonFile('data/users.json','usersSha').then(function(users){
      STATE.users=Array.isArray(users)?users:[]; renderUsersTable(STATE.users); renderDashboard();
    }).catch(function(err){
      console.warn('[users] GitHub API basarisiz, raw URL deneniyor:', err.message);
      _fetchUsersRaw();
    });
  } else {
    _fetchUsersRaw();
  }
}
function _fetchUsersRaw(){
  var githubRawUrl='https://raw.githubusercontent.com/busebolova/promil-detoks/main/data/users.json?v='+Date.now();
  var localUrl='/data/users.json?v='+Date.now();
  fetch(githubRawUrl)
    .then(function(r){return r.ok?r.json():null;})
    .then(function(users){
      if(users){STATE.users=Array.isArray(users)?users:[]; renderUsersTable(STATE.users); renderDashboard(); return;}
      return fetch(localUrl).then(function(r){return r.ok?r.json():[];}).then(function(u){
        STATE.users=Array.isArray(u)?u:[]; renderUsersTable(STATE.users); renderDashboard();
      });
    })
    .catch(function(){STATE.users=[]; renderUsersTable([]);});
}
function renderUsersTable(users){
  var container=qs('#usersTableContainer'); if(!container) return;
  var tc=qs('#userTotalCount'); if(tc) tc.textContent=users.length;
  var now=new Date(); var thirtyDaysAgo=new Date(now-30*24*60*60*1000);
  var newCount=users.filter(function(u){return u.createdAt&&new Date(u.createdAt)>thirtyDaysAgo;}).length;
  var nc=qs('#userNewCount'); if(nc) nc.textContent=newCount;
  var addrCount=users.filter(function(u){return u.address&&u.address.city;}).length;
  var ac=qs('#userWithAddressCount'); if(ac) ac.textContent=addrCount;
  if(!users.length){
    container.innerHTML='<div style="padding:40px;text-align:center;color:var(--gray-400)"><p style="font-size:.88rem;font-weight:600">Henuz kullanici yok</p><p style="font-size:.78rem;margin-top:4px">Kayit olan kullanicilar burada gorunecek</p></div>';
    return;
  }
  var html='<table style="width:100%;border-collapse:collapse"><thead><tr style="background:var(--gray-50);border-bottom:1px solid var(--gray-200)"><th style="padding:12px 16px;text-align:left;font-size:.72rem;font-weight:700;color:var(--gray-400)">Kullanici</th><th style="padding:12px 16px;text-align:left;font-size:.72rem;font-weight:700;color:var(--gray-400)">E-posta</th><th style="padding:12px 16px;text-align:left;font-size:.72rem;font-weight:700;color:var(--gray-400)">Telefon</th><th style="padding:12px 16px;text-align:left;font-size:.72rem;font-weight:700;color:var(--gray-400)">Adres</th><th style="padding:12px 16px;text-align:left;font-size:.72rem;font-weight:700;color:var(--gray-400)">Kayit Tarihi</th><th style="padding:12px 16px;text-align:left;font-size:.72rem;font-weight:700;color:var(--gray-400)">Siparis</th></tr></thead><tbody>';
  users.forEach(function(u){
    var fullName=(u.firstName||'')+' '+(u.lastName||''); fullName=fullName.trim()||'-';
    var initials=((u.firstName||'').charAt(0)+(u.lastName||'').charAt(0)).toUpperCase()||'?';
    var date=u.createdAt?new Date(u.createdAt).toLocaleDateString('tr-TR'):'';
    var addrParts=[u.address&&u.address.line||'',u.address&&u.address.district||'',u.address&&u.address.city||''].filter(function(s){return s.trim();});
    var addrDisplay=addrParts.join(', ')||'-';
    // Bu kullanicinin siparis sayisi
    var orderCount=(STATE.orders||[]).filter(function(o){return o.email&&u.email&&o.email.toLowerCase()===u.email.toLowerCase();}).length;
    html+='<tr style="border-bottom:1px solid var(--gray-100)"><td style="padding:12px 16px"><div style="display:flex;align-items:center;gap:10px"><div style="width:34px;height:34px;background:linear-gradient(135deg,#22c55e,#14b8a6);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:800;color:#fff;flex-shrink:0">'+escHtml(initials)+'</div><div><div style="font-size:.83rem;font-weight:700;color:var(--dark)">'+escHtml(fullName)+'</div><div style="font-size:.72rem;color:var(--gray-400)">'+escHtml(u.id||'')+'</div></div></div></td><td style="padding:12px 16px;font-size:.8rem">'+escHtml(u.email||'-')+'</td><td style="padding:12px 16px;font-size:.8rem">'+escHtml(u.phone||'-')+'</td><td style="padding:12px 16px;font-size:.78rem;max-width:180px;line-height:1.4">'+escHtml(addrDisplay)+'</td><td style="padding:12px 16px;font-size:.78rem;color:var(--gray-600)">'+date+'</td><td style="padding:12px 16px"><span style="background:rgba(34,197,94,.1);color:var(--accent-dark);font-size:.75rem;font-weight:700;padding:3px 10px;border-radius:9999px">'+orderCount+' sipariş</span></td></tr>';
  });
  html+='</tbody></table>';
  container.innerHTML=html;
}
window.filterUsers=function(){
  var search=(qs('#userSearch')||{}).value||'';
  var filtered=STATE.users.filter(function(u){
    var name=((u.firstName||'')+' '+(u.lastName||'')).toLowerCase();
    return !search||name.includes(search.toLowerCase())||(u.email&&u.email.toLowerCase().includes(search.toLowerCase()));
  });
  renderUsersTable(filtered);
};
window.exportUsers=function(){
  if(!STATE.users||!STATE.users.length){toast('Disa aktarilacak kullanici yok.','info'); return;}
  var headers=['ID','Ad','Soyad','E-posta','Telefon','Adres','Ilce','Sehir','Posta Kodu','Kayit Tarihi'];
  var rows=STATE.users.map(function(u){return [u.id||'',u.firstName||'',u.lastName||'',u.email||'',u.phone||'',u.address&&u.address.line||'',u.address&&u.address.district||'',u.address&&u.address.city||'',u.address&&u.address.zip||'',u.createdAt||''];});
  var csv=[headers.join(',')].concat(rows.map(function(r){return r.map(function(v){return '"'+String(v).replace(/"/g,'""')+'"';}).join(',');})).join('\n');
  var blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
  var url=URL.createObjectURL(blob);
  var a=document.createElement('a'); a.href=url; a.download='kullanicilar-'+new Date().toISOString().slice(0,10)+'.csv'; a.click();
  URL.revokeObjectURL(url); toast('CSV indirildi!');
};

/* Bayilik */
function loadDealers(){
  if(STATE.token){
    getJsonFile('data/dealers.json','dealersSha').then(function(dealers){
      STATE.dealers=Array.isArray(dealers)?dealers:[]; renderDealersTable(STATE.dealers); renderDashboard();
    }).catch(function(err){
      console.warn('[dealers] GitHub API basarisiz, raw URL deneniyor:', err.message);
      _fetchDealersRaw();
    });
  } else {
    _fetchDealersRaw();
  }
}
function _fetchDealersRaw(){
  var githubRawUrl='https://raw.githubusercontent.com/busebolova/promil-detoks/main/data/dealers.json?v='+Date.now();
  var localUrl='/data/dealers.json?v='+Date.now();
  fetch(githubRawUrl)
    .then(function(r){return r.ok?r.json():null;})
    .then(function(dealers){
      if(dealers){STATE.dealers=Array.isArray(dealers)?dealers:[]; renderDealersTable(STATE.dealers); renderDashboard(); return;}
      return fetch(localUrl).then(function(r){return r.ok?r.json():[];}).then(function(d){
        STATE.dealers=Array.isArray(d)?d:[]; renderDealersTable(STATE.dealers); renderDashboard();
      });
    })
    .catch(function(){STATE.dealers=[]; renderDealersTable([]);});
}
function renderDealersTable(dealers){
  var container=qs('#dealersTableContainer'); if(!container) return;
  var pending=dealers.filter(function(d){return d.status==='pending';}).length;
  var tc=qs('#dealerTotalCount'); if(tc) tc.textContent=dealers.length;
  var pc=qs('#dealerPendingCount'); if(pc) pc.textContent=pending;
  if(!dealers.length){container.innerHTML='<div style="padding:40px;text-align:center;color:var(--gray-400)"><p style="font-size:.88rem;font-weight:600">Henuz bayilik basvurusu yok</p></div>'; return;}
  var sL2={pending:'Bekliyor',approved:'Onaylandi',rejected:'Reddedildi',contacted:'Iletisime Gecildi'};
  var sC2={pending:'#d97706',approved:'#16a34a',rejected:'#dc2626',contacted:'#2563eb'};
  var html='<table style="width:100%;border-collapse:collapse"><thead><tr style="background:var(--gray-50);border-bottom:1px solid var(--gray-200)"><th style="padding:12px 16px;text-align:left;font-size:.72rem;font-weight:700;color:var(--gray-400)">Ad Soyad</th><th style="padding:12px 16px;text-align:left;font-size:.72rem;font-weight:700;color:var(--gray-400)">Iletisim</th><th style="padding:12px 16px;text-align:left;font-size:.72rem;font-weight:700;color:var(--gray-400)">Sehir</th><th style="padding:12px 16px;text-align:left;font-size:.72rem;font-weight:700;color:var(--gray-400)">Durum</th><th style="padding:12px 16px;text-align:left;font-size:.72rem;font-weight:700;color:var(--gray-400)">Islem</th></tr></thead><tbody>';
  dealers.forEach(function(d,i){
    var sl=sL2[d.status]||d.status||'Bekliyor'; var sc3=sC2[d.status]||'#d97706';
    html+='<tr style="border-bottom:1px solid var(--gray-100)"><td style="padding:12px 16px;font-size:.8rem"><strong>'+escHtml(d.name||'-')+'</strong><br><small>'+escHtml(d.company||'')+'</small></td><td style="padding:12px 16px;font-size:.8rem">'+escHtml(d.email||'-')+'<br><small>'+escHtml(d.phone||'')+'</small></td><td style="padding:12px 16px;font-size:.8rem">'+escHtml(d.city||'-')+'</td><td style="padding:12px 16px"><span style="padding:4px 10px;border-radius:9999px;font-size:.72rem;font-weight:700;background:'+sc3+'20;color:'+sc3+'">'+sl+'</span></td><td style="padding:12px 16px"><select onchange="updateDealerStatus('+i+',this.value)" style="padding:6px 10px;border:1.5px solid var(--gray-200);border-radius:8px;font-size:.78rem;outline:none;background:white"><option value="pending" '+(d.status==='pending'?'selected':'')+'>Bekliyor</option><option value="contacted" '+(d.status==='contacted'?'selected':'')+'>Iletisime Gecildi</option><option value="approved" '+(d.status==='approved'?'selected':'')+'>Onayla</option><option value="rejected" '+(d.status==='rejected'?'selected':'')+'>Reddet</option></select></td></tr>';
  });
  html+='</tbody></table>';
  container.innerHTML=html;
}
window.updateDealerStatus=function(idx,status){
  if(!STATE.dealers||!STATE.dealers[idx]) return;
  STATE.dealers[idx].status=status; STATE.dealers[idx].updatedAt=new Date().toISOString();
  if(!STATE.token){toast('Offline modda guncellendi.','info'); renderDealersTable(STATE.dealers); return;}
  commitJsonFile('data/dealers.json','dealersSha',STATE.dealers,'[Admin] Bayilik basvurusu guncellendi')
    .then(function(){toast('Bayilik durumu guncellendi!'); renderDealersTable(STATE.dealers); renderDashboard();})
    .catch(function(err){toast('Kayit hatasi: '+err.message,'error');});
};
window.filterDealers=function(){
  var search=(qs('#dealerSearch')||{}).value||'';
  var sf=(qs('#dealerStatusFilter')||{}).value||'';
  var filtered=STATE.dealers.filter(function(d){
    var ms=!search||(d.name&&d.name.toLowerCase().includes(search.toLowerCase()))||(d.email&&d.email.toLowerCase().includes(search.toLowerCase()))||(d.city&&d.city.toLowerCase().includes(search.toLowerCase()));
    return ms&&(!sf||d.status===sf);
  });
  renderDealersTable(filtered);
};

/* iyzico */
function readIyzicoConfig(){
  try{return JSON.parse(localStorage.getItem('iyzico_config')||'{}');}catch(e){return {};}
}
function loadIyzicoConfig(){
  var cfg=readIyzicoConfig();
  setVal('iyzico_api_key',cfg.api_key||'');
  setVal('iyzico_secret_key',cfg.secret_key||'');
  var envSandbox=qs('#iyzico_env_sandbox'); var envProd=qs('#iyzico_env_prod');
  if(envSandbox&&envProd){if(cfg.env==='production'){envProd.checked=true;}else{envSandbox.checked=true;}}
  var currency=qs('#iyzico_currency'); if(currency) currency.value=cfg.currency||'TRY';
  setVal('iyzico_base_url',cfg.base_url||'https://sandbox-api.iyzipay.com');
  setVal('iyzico_webhook_url',cfg.webhook_url||window.location.origin+'/api/payment-callback');
  setVal('iyzico_webhook_secret',cfg.webhook_secret||'');
  updateIyzicoStatusBanner(cfg);
}
function updateIyzicoStatusBanner(cfg){
  var banner=qs('#iyzicoStatusBanner');
  var icon=qs('#iyzicoStatusIcon');
  var title=qs('#iyzicoStatusTitle');
  var desc=qs('#iyzicoStatusDesc');
  var badge=qs('#iyzicoStatusBadge');
  if(!banner) return;
  if(cfg&&cfg.api_key&&cfg.secret_key){
    if(icon){icon.className='iyzico-status-icon success';}
    if(title) title.textContent='iyzico Bagli';
    if(desc) desc.textContent=(cfg.env==='production'?'Production (Canli)':'Sandbox (Test)')+' ortaminda aktif.';
    if(badge){badge.textContent=cfg.env==='production'?'Production':'Sandbox'; badge.className='iyzico-badge '+(cfg.env==='production'?'success':'warning');}
  } else {
    if(icon){icon.className='iyzico-status-icon pending';}
    if(title) title.textContent='API Anahtarlari Bekleniyor';
    if(desc) desc.textContent='iyzico API anahtarlarinizi asagiya girerek odeme entegrasyonunu aktif edin.';
    if(badge){badge.textContent='Pasif'; badge.className='iyzico-badge pending';}
  }
}
window.saveIyzicoKeys=function(){
  var envEl=qs('input[name="iyzico_env"]:checked');
  var cfg={
    api_key:getVal('iyzico_api_key'),
    secret_key:getVal('iyzico_secret_key'),
    env:envEl?envEl.value:'sandbox',
    currency:(qs('#iyzico_currency')||{}).value||'TRY',
    base_url:getVal('iyzico_base_url'),
    webhook_url:getVal('iyzico_webhook_url'),
    webhook_secret:getVal('iyzico_webhook_secret')
  };
  if(!cfg.api_key||!cfg.secret_key){toast('API Key ve Secret Key zorunludur.','error'); return;}
  localStorage.setItem('iyzico_config',JSON.stringify(cfg));
  updateIyzicoStatusBanner(cfg); toast('iyzico ayarlari kaydedildi!');
};
window.testIyzicoConnection=function(){
  var cfg=readIyzicoConfig();
  if(!cfg.api_key||!cfg.secret_key){toast('Once API anahtarlarini kaydedin.','error'); return;}
  var btn=qs('#iyzicoTestBtn'); if(btn){btn.disabled=true; btn.textContent='Test ediliyor...';}
  setTimeout(function(){
    if(btn){btn.disabled=false; btn.textContent='Baglantıyı Test Et';}
    toast('iyzico baglantisi basarili! (Simule)','success');
  },1500);
};

/* Commits */
function renderCommits(){
  var container=qs('#commitList'); if(!container) return;
  if(!STATE.commits||!STATE.commits.length){
    container.innerHTML='<p style="color:var(--gray-400);font-size:.83rem;padding:16px 0">Commit gecmisi yuklenemedi veya bos.</p>';
    return;
  }
  var html='';
  STATE.commits.slice(0,20).forEach(function(c){
    var date=c.commit&&c.commit.author&&c.commit.author.date?new Date(c.commit.author.date).toLocaleString('tr-TR'):'';
    var msg=c.commit&&c.commit.message||'';
    var author=c.commit&&c.commit.author&&c.commit.author.name||'';
    var sha=(c.sha||'').slice(0,7);
    html+='<div style="display:flex;align-items:flex-start;gap:14px;padding:14px 0;border-bottom:1px solid var(--gray-100)">'
      +'<div style="flex-shrink:0;width:36px;height:36px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;font-size:.7rem;font-weight:700;color:var(--primary)">GIT</div>'
      +'<div style="flex:1;min-width:0"><div style="font-size:.82rem;font-weight:600;color:var(--dark);margin-bottom:2px">'+escHtml(msg)+'</div>'
      +'<div style="font-size:.75rem;color:var(--gray-400)">'+escHtml(author)+' &bull; '+date+' &bull; <code style="font-size:.72rem;background:var(--gray-100);padding:1px 5px;border-radius:4px">'+sha+'</code></div></div></div>';
  });
  container.innerHTML=html||'<p style="color:var(--gray-400);font-size:.83rem;padding:16px 0">Commit bulunamadi.</p>';
}
window.refreshCommits=function(){
  if(!STATE.token){toast('GitHub baglantisi yok.','error'); return;}
  toast('Commitler yukleniyor...','info');
  getCommits().then(function(cm){STATE.commits=cm; renderCommits(); toast('Commitler guncellendi!');}).catch(function(err){toast(err.message,'error');});
};

/* INIT */
document.addEventListener('DOMContentLoaded',function(){
  var loginForm=qs('#loginForm');
  if(loginForm) loginForm.addEventListener('submit',handleLogin);
  var logoutBtn=qs('#logoutBtn');
  if(logoutBtn) logoutBtn.addEventListener('click',handleLogout);
  var saveBtn=qs('#saveBtn');
  if(saveBtn) saveBtn.addEventListener('click',handleSave);
  var saveBtnBottom=qs('#saveBtnBottom');
  if(saveBtnBottom) saveBtnBottom.addEventListener('click',handleSave);
  var discardBtn=qs('#discardBtn');
  if(discardBtn) discardBtn.addEventListener('click',function(){
    if(confirm('Degisiklikler iptal edilsin mi?')){
      loadContent().then(function(c){STATE.content=c; populateAllForms(); clearDirty(); toast('Degisiklikler iptal edildi.','info');});
    }
  });
  qsa('.nav-item').forEach(function(item){
    item.addEventListener('click',function(){var page=this.getAttribute('data-page'); if(page) navigateTo(page);});
  });
  qsa('.product-tab').forEach(function(tab,i){
    tab.addEventListener('click',function(){STATE.currentProduct=i; renderProductEditor(i);});
  });
  var seoTitle=qs('#seo_title'); if(seoTitle) seoTitle.addEventListener('input',function(){updateSeoPreview(); updateSeoCounters();});
  var seoDesc=qs('#seo_description'); if(seoDesc) seoDesc.addEventListener('input',function(){updateSeoPreview(); updateSeoCounters();});
  var seoCanon=qs('#seo_canonical'); if(seoCanon) seoCanon.addEventListener('input',updateSeoPreview);
  if(sessionStorage.getItem('gh_authed')==='1'){
    // Oturum yenileme: once API'den token almayı dene (Vercel production)
    var savedPw = sessionStorage.getItem('gh_pw') || '';
    var tokenRefreshPromise;
    if(savedPw && window.loadAdminConfigFromAPI){
      tokenRefreshPromise = window.loadAdminConfigFromAPI(savedPw).catch(function(){return false;});
    } else {
      tokenRefreshPromise = Promise.resolve(false);
    }
    tokenRefreshPromise.then(function(){
      var cfg=window.ADMIN_CONFIG&&window.ADMIN_CONFIG.github;
      if(cfg&&cfg.token){
        var parts=cfg.repo.split('/');
        STATE.token=cfg.token; STATE.owner=parts[0]; STATE.repo=parts[1]; STATE.branch=cfg.branch||'main';
      }
      return loadContentFromServer().then(function(c){
        STATE.content=c;
        showAdminUI(STATE.token?'Admin':'Admin');
        return STATE.token?getCommits().catch(function(){return[];}):Promise.resolve([]);
      }).then(function(cm){STATE.commits=cm||[]; if(STATE.token) renderCommits();})
      .catch(function(err){console.warn('İçerik yüklenemedi:',err); STATE.content=getDefaultContent(); showAdminUI('Admin');});
    });
  }
});

'use strict';
/* ============================================================
   TajirPro Keygen — مولّد مفاتيح تاجر برو · v1.0.0
   تطبيق مستقل لتوليد أكواد اشتراك صالحة لجهاز واحد
   يعمل بالكامل بدون إنترنت — البيانات محفوظة على الجهاز
   ============================================================ */

/* ---------- Utilities ---------- */
function $(sel){ return document.querySelector(sel); }
function $$(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); }
function esc(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
  });
}

/* ---------- الوضع الليلي / النهاري ---------- */
var THEME_KEY = 'tajirpro_keygen_theme';
function currentTheme(){ return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
function applyTheme(t){
  document.documentElement.setAttribute('data-theme', t);
  try{ localStorage.setItem(THEME_KEY, t); }catch(e){}
  var meta = document.querySelector('meta[name=theme-color]');
  if(meta) meta.setAttribute('content', t === 'dark' ? '#0B1220' : '#047857');
  var b = $('#themeBtn');
  if(b){ b.classList.add('spin'); setTimeout(function(){ b.classList.remove('spin'); }, 360); }
  render();
}
function toggleTheme(){
  var next = currentTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  toast(next === 'dark' ? 'تم تفعيل الوضع الليلي 🌙' : 'تم تفعيل الوضع النهاري ☀️');
}

/* ---------- جسر معرف الجهاز — متاح فقط داخل تطبيق أندرويد ---------- */
function deviceBridgeAvailable(){
  return typeof TajirDeviceBridge !== 'undefined';
}
function getDeviceFingerprint(){
  try{
    if(deviceBridgeAvailable() && TajirDeviceBridge.getDeviceFingerprint){
      return String(TajirDeviceBridge.getDeviceFingerprint()).toUpperCase();
    }
  }catch(e){}
  return 'BADCAFE0'; /* وضع المتصفح (تطوير) */
}
function getDeviceIdFull(){
  try{
    if(deviceBridgeAvailable() && TajirDeviceBridge.getDeviceId){
      return String(TajirDeviceBridge.getDeviceId());
    }
  }catch(e){}
  return 'browser-dev';
}
function getAppVersion(){
  try{
    if(deviceBridgeAvailable() && TajirDeviceBridge.getAppVersion){
      return String(TajirDeviceBridge.getAppVersion());
    }
  }catch(e){}
  return '1.0.0';
}

/* ============================================================
   خوارزمية توليد الكود — مطابقة لتطبيق تاجر برو
   صيغة الكود:  TJP-{D}-{HASH8}-{EXP}-{CHK2}
   ============================================================ */
function polyChecksum(s){
  var h = 7;
  s = String(s || '');
  for(var i = 0; i < s.length; i++){
    h = ((h * 131) + s.charCodeAt(i)) & 0xFFFF;
  }
  var v = h % 256;
  return ('0' + v.toString(16)).slice(-2).toUpperCase();
}
function toBase36(n){
  n = Number(n) || 0;
  if(n < 0) n = 0;
  return n.toString(36).toUpperCase();
}
function fromBase36(s){
  try{ return parseInt(String(s || ''), 36); }
  catch(e){ return NaN; }
}
function todayEpochDay(){ return Math.floor(Date.now() / 86400000); }
function epochDayToDate(day){
  try{
    var t = Number(day) * 86400000;
    var d = new Date(t);
    return d.toLocaleDateString('ar-EG', { year:'numeric', month:'long', day:'numeric' });
  }catch(e){ return String(day); }
}

function generateCode(fp, days, startDate){
  var startDay = todayEpochDay();
  if(startDate){
    var t = new Date(startDate + 'T00:00:00');
    if(!isNaN(t.getTime())) startDay = Math.floor(t.getTime() / 86400000);
  }
  var expDay = startDay + Number(days);
  var exp = toBase36(expDay);
  var chk = polyChecksum(String(days) + fp + exp);
  return {
    code: 'TJP-' + days + '-' + fp + '-' + exp + '-' + chk,
    expDay: expDay,
    expDate: new Date(expDay * 86400000).toISOString().slice(0,10),
    daysLeft: expDay - todayEpochDay()
  };
}

function validateCode(code, expectedFp){
  var result = { ok:false, error:'', duration:0, expiryDay:0, expiryDate:'', daysLeft:0, fp:'', code:'' };
  var c = String(code || '').trim().toUpperCase().replace(/\s+/g, '');
  if(!c){ result.error = 'أدخل كود الاشتراك'; return result; }
  if(!/^TJP-\d+-[0-9A-F]{8}-[0-9A-Z]+-[0-9A-F]{2}$/.test(c)){
    result.error = 'صيغة الكود غير صحيحة'; return result;
  }
  var parts = c.split('-');
  var D = parseInt(parts[1], 10);
  var HASH8 = parts[2], EXP = parts[3], CHK2 = parts[4];
  if(isNaN(D) || D <= 0){ result.error = 'مدة الاشتراك غير صالحة'; return result; }
  if(expectedFp && HASH8 !== expectedFp){
    result.error = 'بصمة الجهاز في الكود لا تطابق هذا الجهاز'; return result;
  }
  var expectChk = polyChecksum(String(D) + HASH8 + EXP);
  if(CHK2 !== expectChk){ result.error = 'مجموع تحقق خاطئ — الكود تالف'; return result; }
  var expDay = fromBase36(EXP);
  if(expDay < 1){ result.error = 'تاريخ الانتهاء غير صالح'; return result; }
  result.ok = true;
  result.duration = D;
  result.expiryDay = expDay;
  result.expiryDate = new Date(expDay * 86400000).toISOString().slice(0,10);
  result.daysLeft = expDay - todayEpochDay();
  result.fp = HASH8;
  result.code = c;
  return result;
}

/* ============================================================
   سجل الأكواد المُولّدة (localStorage)
   ============================================================ */
var HISTORY_KEY = 'tajirpro_keygen_history';

function loadHistory(){
  try{ return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch(e){ return []; }
}
function saveHistory(arr){
  try{ localStorage.setItem(HISTORY_KEY, JSON.stringify(arr)); }catch(e){}
}
function addToHistory(entry){
  var arr = loadHistory();
  arr.push(entry);
  if(arr.length > 200) arr = arr.slice(-200);
  saveHistory(arr);
}

/* ============================================================
   Toast / Modal
   ============================================================ */
function toast(msg, type){
  var root = $('#toastRoot');
  if(!root) return;
  var el = document.createElement('div');
  el.className = 'toast ' + (type || 'ok');
  el.textContent = msg;
  root.innerHTML = '';
  root.appendChild(el);
  setTimeout(function(){ if(el.parentNode) el.parentNode.removeChild(el); }, 2300);
}
function openDialog(html){
  var root = $('#modalRoot');
  root.innerHTML =
    '<div class="overlay" onclick="closeModal()"></div>' +
    '<div class="dialog-box">' + html + '</div>';
}
function closeModal(){ $('#modalRoot').innerHTML = ''; }
function confirmDlg(title, msg, onYes, opts){
  opts = opts || {};
  openDialog(
    '<h3>' + esc(title) + '</h3>' +
    '<p>' + esc(msg) + '</p>' +
    '<div class="dialog-actions">' +
      '<button class="btn ghost" onclick="closeModal()">إلغاء</button>' +
      '<button class="btn ' + (opts.danger ? 'danger' : 'primary') + '" onclick="confirmYes()">' + esc(opts.yesLabel || 'تأكيد') + '</button>' +
    '</div>'
  );
  window._confirmCb = onYes;
}
function confirmYes(){
  var cb = window._confirmCb;
  window._confirmCb = null;
  closeModal();
  if(typeof cb === 'function') cb();
}

/* نسخ نص إلى الحافظة */
function copyText(txt){
  try{
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(txt).then(function(){ toast('تم النسخ ✓'); },
        function(){ legacyCopy(txt); });
      return;
    }
  }catch(e){}
  legacyCopy(txt);
}
function legacyCopy(txt){
  try{
    var ta = document.createElement('textarea');
    ta.value = txt;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    var ok = document.execCommand('copy');
    document.body.removeChild(ta);
    toast(ok ? 'تم النسخ ✓' : 'تعذر النسخ', ok ? 'ok' : 'err');
  }catch(e){ toast('تعذر النسخ', 'err'); }
}

/* ============================================================
   العرض الرئيسي
   ============================================================ */
var state = {
  view: 'generate' /* generate | history | about */
};

function showView(v){
  state.view = v;
  render();
  window.scrollTo(0, 0);
}

function render(){
  var v = $('#view');
  var views = { generate: viewGenerate, history: viewHistory, about: viewAbout };
  v.innerHTML = (views[state.view] || viewGenerate)();
}

/* ---------- صفحة توليد الكود ---------- */
function viewGenerate(){
  var fp = getDeviceFingerprint();
  var devId = getDeviceIdFull();

  return '' +
  '<div class="kg-hero">' +
    '<div class="kg-hero-icon">🔐</div>' +
    '<div class="kg-hero-text">' +
      '<div class="kg-hero-title">مولّد مفاتيح تاجر برو</div>' +
      '<div class="kg-hero-sub">أداة المسؤول — توليد أكواد اشتراك صالحة لجهاز واحد فقط</div>' +
    '</div>' +
  '</div>' +

  '<div class="card kg-device-card">' +
    '<div class="card-title">📱 معلومات هذا الجهاز</div>' +
    '<div class="kg-dev-row"><span>بصمة الجهاز</span><b class="ltr kg-fp-chip" id="devFp">' + esc(fp) + '</b></div>' +
    '<div class="kg-dev-row"><span>معرّف الجهاز</span><b class="ltr" style="font-size:10.5px;word-break:break-all;max-width:60%">' + esc(devId) + '</b></div>' +
    '<div class="kg-dev-row"><span>إصدار التطبيق</span><b class="ltr">' + esc(getAppVersion()) + '</b></div>' +
    '<button class="btn sm outline block" style="margin-top:10px" onclick="copyText(\'' + fp + '\')">📋 نسخ بصمة هذا الجهاز</button>' +
    '<div class="small-note" style="margin-top:8px;color:var(--muted);text-align:center">' +
      '💡 هذه بصمة هذا الجهاز الحالي (نفس بصمة تطبيق تاجر برو على هذا الهاتف). لتوليد كود لجهاز آخر، أدخل بصمته في الحقل أدناه.</div>' +
  '</div>' +

  '<div class="card">' +
    '<div class="card-title">🔑 توليد كود اشتراك جديد</div>' +

    '<div class="field"><label>بصمة الجهاز المستهدف (8 محارف سداسية عشر)</label>' +
      '<input id="genFp" type="text" class="kg-code-input" maxlength="8" value="' + esc(fp) + '" placeholder="مثال: A1B2C3D4" autocomplete="off" spellcheck="false">' +
      '<div class="small-note" style="margin-top:6px;color:var(--muted)">' +
        'تُعرض البصمة داخل تطبيق تاجر برو على جهاز التاجر: الإعدادات ← الاشتراك ← معلومات الجهاز' +
      '</div>' +
    '</div>' +

    '<div class="field"><label>مدة الاشتراك</label>' +
      '<div class="chips" id="durChips">' +
        '<button class="chip" data-d="7" onclick="setDuration(7)">7 أيام</button>' +
        '<button class="chip active" data-d="30" onclick="setDuration(30)">30 يوم</button>' +
        '<button class="chip" data-d="90" onclick="setDuration(90)">90 يوم</button>' +
        '<button class="chip" data-d="180" onclick="setDuration(180)">180 يوم</button>' +
        '<button class="chip" data-d="365" onclick="setDuration(365)">سنة كاملة</button>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:6px;margin-top:8px">' +
        '<input id="genDur" type="number" inputmode="numeric" min="1" value="30" style="width:100px">' +
        '<span style="font-size:13px;color:var(--muted)">يوم</span>' +
      '</div>' +
    '</div>' +

    '<div class="field"><label>تاريخ بداية الاشتراك (اختياري)</label>' +
      '<input id="genStart" type="date" style="direction:ltr">' +
      '<div class="small-note" style="margin-top:6px;color:var(--muted)">اتركه فارغاً ليعتبر التاريخ الحالي هو البداية.</div>' +
    '</div>' +

    '<div class="btn-row">' +
      '<button class="btn primary block" onclick="generate()">🔑 توليد الكود</button>' +
      '<button class="btn ghost" onclick="clearForm()">مسح</button>' +
    '</div>' +

    '<div id="resultBox" style="margin-top:14px"></div>' +
  '</div>' +

  '<div class="card">' +
    '<div class="card-title">🔍 التحقق من كود</div>' +
    '<div class="field" style="margin:0">' +
      '<input id="verifyInput" type="text" class="kg-code-input" placeholder="ضع الكود هنا للتحقق" autocomplete="off" spellcheck="false">' +
    '</div>' +
    '<button class="btn sm outline block" style="margin-top:8px" onclick="verifyCode()">تحقق من الكود</button>' +
    '<div id="verifyResult" class="kg-verify-box"></div>' +
  '</div>' +

  '<div class="btn-row" style="margin-top:14px;justify-content:center">' +
    '<button class="btn sm outline" onclick="showView(\'history\')">📜 سجل الأكواد (' + loadHistory().length + ')</button>' +
    '<button class="btn sm ghost" onclick="showView(\'about\')">ℹ️ حول التطبيق</button>' +
  '</div>';
}

var lastGenerated = null;

function setDuration(days){
  $('#genDur').value = days;
  $$('#durChips .chip').forEach(function(c){
    c.classList.toggle('active', parseInt(c.getAttribute('data-d'), 10) === days);
  });
}

function generate(){
  var fp = $('#genFp').value.trim().toUpperCase();
  var days = parseInt($('#genDur').value, 10);
  var startDate = $('#genStart').value;

  if(!/^[0-9A-F]{8}$/.test(fp)){
    toast('بصمة الجهاز يجب أن تكون 8 محارف سداسية عشر (0-9 A-F)', 'err');
    return;
  }
  if(isNaN(days) || days <= 0){
    toast('عدد الأيام يجب أن يكون عدداً موجباً', 'err');
    return;
  }

  var r = generateCode(fp, days, startDate);
  lastGenerated = r;

  var stateLabel = r.daysLeft > 0
    ? '<span class="r-state ok">✅ ساري — متبقي ' + r.daysLeft + ' يوم</span>'
    : '<span class="r-state expired">⏰ منتهي</span>';

  var codeEscaped = r.code.replace(/'/g, "\\'");

  $('#resultBox').innerHTML =
    '<div class="kg-result">' +
      '<div class="r-label">تم توليد الكود ✓</div>' +
      '<div class="r-code">' + esc(r.code) + '</div>' +
      '<div class="r-meta">المدة: ' + days + ' يوم • ينتهي: ' + r.expDate + '</div>' +
      stateLabel +
      '<div class="btn-row" style="justify-content:center;margin-top:12px">' +
        '<button class="btn sm primary" onclick="copyText(\'' + codeEscaped + '\')">📋 نسخ الكود</button>' +
        '<button class="btn sm outline" onclick="saveCurrentToHistory()">💾 حفظ في السجل</button>' +
      '</div>' +
    '</div>';

  /* حفظ تلقائي في السجل */
  var entry = {
    code: r.code,
    fp: fp,
    duration: days,
    start: startDate || new Date().toISOString().slice(0,10),
    expiry: r.expDate,
    created: new Date().toISOString()
  };
  addToHistory(entry);
  toast('تم توليد الكود ✓ — وحفظه في السجل');
}

function clearForm(){
  $('#genFp').value = getDeviceFingerprint();
  $('#genStart').value = '';
  $('#genDur').value = 30;
  setDuration(30);
  $('#resultBox').innerHTML = '';
  lastGenerated = null;
}

function saveCurrentToHistory(){
  if(!lastGenerated){ toast('لا يوجد كود لحفظه', 'err'); return; }
  /* تم الحفظ تلقائياً في generate() — هذا مجرد تأكيد */
  toast('الكود محفوظ في السجل ✓');
}

function verifyCode(){
  var code = $('#verifyInput').value;
  var r = validateCode(code);
  var box = $('#verifyResult');
  if(!r.ok){
    box.className = 'kg-verify-box err';
    box.textContent = '❌ ' + r.error;
  }else{
    box.className = 'kg-verify-box ok';
    var state = r.daysLeft > 0 ? 'ساري' : 'منتهي';
    box.innerHTML = '✓ الكود صالح<br>' +
      '• المدة: ' + r.duration + ' يوم<br>' +
      '• ينتهي: ' + r.expDate + '<br>' +
      '• الحالة: ' + state + ' (متبقي ' + r.daysLeft + ' يوم)<br>' +
      '• بصمة الجهاز: <b class="ltr">' + r.fp + '</b>';
  }
}

/* ---------- صفحة سجل الأكواد ---------- */
function viewHistory(){
  var arr = loadHistory();
  var html =
    '<div class="kg-hero" style="padding:16px 18px">' +
      '<div class="kg-hero-icon">📜</div>' +
      '<div class="kg-hero-text">' +
        '<div class="kg-hero-title">سجل الأكواد المُولّدة</div>' +
        '<div class="kg-hero-sub">' + arr.length + ' كود محفوظ على هذا الجهاز</div>' +
      '</div>' +
    '</div>';

  if(arr.length){
    html += '<div class="btn-row" style="margin-bottom:12px">' +
      '<button class="btn sm outline" onclick="exportHistory(\'csv\')">📊 تصدير CSV</button>' +
      '<button class="btn sm outline" onclick="exportHistory(\'json\')">💾 تصدير JSON</button>' +
      '<button class="btn sm danger" onclick="clearHistory()">🗑️ حذف السجل</button>' +
    '</div>';
  }

  if(!arr.length){
    html += '<div class="card"><div class="kg-history-empty">' +
      'لا توجد أكواد في السجل بعد<br>' +
      'اذهب إلى صفحة التوليد وأنشئ أول كود.' +
      '</div></div>';
  }else{
    var today = todayEpochDay();
    arr.slice().reverse().forEach(function(e, i){
      var expDay = fromBase36(e.code.split('-')[3]);
      var active = expDay >= today;
      html +=
        '<div class="kg-history-item' + (active ? '' : ' expired') + '">' +
          '<div class="hi-icon">' + (active ? '✅' : '⏰') + '</div>' +
          '<div class="hi-body">' +
            '<div class="hi-code">' + esc(e.code) + '</div>' +
            '<div class="hi-meta">البصمة: ' + esc(e.fp) + ' • المدة: ' + e.duration + ' يوم • ينتهي: ' + esc(e.expiry) + '</div>' +
          '</div>' +
          '<div class="hi-actions">' +
            '<button class="btn sm primary" onclick="copyText(\'' + e.code.replace(/'/g, "\\'") + '\')">📋</button>' +
          '</div>' +
        '</div>';
    });
  }

  html += '<button class="btn sm ghost block" style="margin-top:14px" onclick="showView(\'generate\')">← العودة للتوليد</button>';
  return html;
}

function exportHistory(fmt){
  var arr = loadHistory();
  if(!arr.length){ toast('لا توجد أكواد للتصدير', 'err'); return; }
  /* داخل WebView لا يمكن تنزيل ملف مباشرة — نعرض المحتوى للنسخ */
  var content, title, hint;
  if(fmt === 'json'){
    content = JSON.stringify(arr, null, 2);
    title = 'تصدير السجل (JSON)';
    hint = 'انسخ المحتوى واحفظه في ملف بامتداد .json';
  }else{
    var csv = '\uFEFF# الكود,البصمة,المدة,تاريخ البداية,تاريخ الانتهاء,تاريخ التوليد\n';
    arr.forEach(function(e, i){
      csv += [i+1, e.code, e.fp, e.duration, e.start, e.expiry, (e.created||'').slice(0,10)].join(',') + '\n';
    });
    content = csv;
    title = 'تصدير السجل (CSV)';
    hint = 'انسخ المحتوى واحفظه في ملف بامتداد .csv — يدعم العربية في Excel';
  }
  openDialog(
    '<h3>' + esc(title) + '</h3>' +
    '<p>' + esc(hint) + '</p>' +
    '<textarea readonly style="width:100%;height:200px;font-family:monospace;font-size:11px;padding:10px;border:1px solid var(--line);border-radius:8px;background:var(--surface-2)" id="exportArea">' + esc(content) + '</textarea>' +
    '<div class="dialog-actions" style="margin-top:12px">' +
      '<button class="btn ghost" onclick="closeModal()">إغلاق</button>' +
      '<button class="btn primary" onclick="copyText(document.getElementById(\'exportArea\').value)">📋 نسخ المحتوى</button>' +
    '</div>'
  );
}

function clearHistory(){
  if(!loadHistory().length){ toast('السجل فارغ', 'err'); return; }
  confirmDlg('حذف السجل', 'سيتم حذف جميع الأكواد من السجل. لا يمكن التراجع.', function(){
    saveHistory([]);
    toast('تم حذف السجل');
    render();
  }, { danger: true, yesLabel: 'حذف الكل' });
}

/* ---------- صفحة حول التطبيق ---------- */
function viewAbout(){
  return '' +
  '<div class="kg-hero" style="padding:16px 18px">' +
    '<div class="kg-hero-icon">ℹ️</div>' +
    '<div class="kg-hero-text">' +
      '<div class="kg-hero-title">حول التطبيق</div>' +
      '<div class="kg-hero-sub">معلومات وإرشادات</div>' +
    '</div>' +
  '</div>' +

  '<div class="card">' +
    '<div class="card-title">📦 معلومات التطبيق</div>' +
    '<div class="about-line"><span>الاسم</span><b>مولّد مفاتيح تاجر برو</b></div>' +
    '<div class="about-line"><span>الإصدار</span><b class="ltr">' + getAppVersion() + '</b></div>' +
    '<div class="about-line"><span>النوع</span><b>أداة مسؤول مستقلة</b></div>' +
    '<div class="about-line"><span>العمل</span><b>بدون إنترنت 100%</b></div>' +
    '<div class="about-line"><span>الهدف</span><b>توليد أكواد اشتراك تاجر برو</b></div>' +
  '</div>' +

  '<div class="card">' +
    '<div class="card-title">📖 طريقة الاستخدام</div>' +
    '<p style="font-size:13px;line-height:1.7;color:var(--text);margin:0 0 12px">' +
      '<b>1.</b> افتح تطبيق «تاجر برو» على هاتف التاجر.<br>' +
      '<b>2.</b> اذهب إلى: الإعدادات ← الاشتراك ← معلومات الجهاز.<br>' +
      '<b>3.</b> انسخ «بصمة الجهاز» (8 محارف سداسية عشر).<br>' +
      '<b>4.</b> أرسل البصمة للمسؤول (صاحب هذا التطبيق).<br>' +
      '<b>5.</b> هنا في «مولّد المفاتيح»، أدخل البصمة في الحقل المخصص.<br>' +
      '<b>6.</b> اختر مدة الاشتراك واضغط «توليد الكود».<br>' +
      '<b>7.</b> انسخ الكود المُولّد وأرسله للتاجر.<br>' +
      '<b>8.</b> يُدخل التاجر الكود في تطبيق تاجر برو لتفعيل الاشتراك.' +
    '</p>' +
  '</div>' +

  '<div class="card">' +
    '<div class="card-title">🔐 صيغة كود الاشتراك</div>' +
    '<p style="font-size:13px;line-height:1.7;color:var(--text);margin:0 0 10px">' +
      '<code style="font-family:monospace;background:var(--surface-3);padding:2px 6px;border-radius:4px;direction:ltr;display:inline-block">TJP-{مدة}-{بصمة}-{تاريخ_انتهاء}-{تحقق}</code>' +
    '</p>' +
    '<p style="font-size:12px;color:var(--muted);margin:0">' +
      'مثال: <code class="ltr" style="font-family:monospace;background:var(--surface-3);padding:2px 6px;border-radius:4px">TJP-365-A1B2C3D4-G2B-B4</code><br>' +
      '• الكود مرتبط ببصمة الجهاز ولا يعمل على أي جهاز آخر.<br>' +
      '• التحقق يتم محلياً بدون إنترنت.<br>' +
      '• يمكن تجديد الاشتراك بإدخال كود جديد في أي وقت.' +
    '</p>' +
  '</div>' +

  '<div class="card">' +
    '<div class="card-title">⚠️ ملاحظات أمنية</div>' +
    '<p style="font-size:12.5px;color:var(--muted);margin:0;line-height:1.7">' +
      '• هذه الأداة للمسؤول فقط — لا تُشاركها مع المستخدمين النهائيين.<br>' +
      '• جميع الأكواد المُولّدة محفوظة محلياً على هذا الجهاز فقط.<br>' +
      '• لا تُرسل أي بيانات لأي خادم — كل شيء يعمل دون اتصال.<br>' +
      '• بصمة الجهاز تُشتق من معرّف أندرويد (ANDROID_ID) المخصص لتطبيق تاجر برو.' +
    '</p>' +
  '</div>' +

  '<button class="btn sm ghost block" style="margin-top:14px" onclick="showView(\'generate\')">← العودة للتوليد</button>';
}

/* ============================================================
   التهيئة
   ============================================================ */
function init(){
  /* ضبط الوضع الليلي المحفوظ */
  try{
    var savedTheme = localStorage.getItem(THEME_KEY) || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    var meta = document.querySelector('meta[name=theme-color]');
    if(meta) meta.setAttribute('content', savedTheme === 'dark' ? '#0B1220' : '#047857');
  }catch(e){}
  render();
}
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
}else{
  init();
}

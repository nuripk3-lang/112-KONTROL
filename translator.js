// ============================================================
// translator.js — 🌍 Anlık Türkçe ↔ İngilizce Çevirmen
// 112 Kırklareli Acil Sağlık Eğitim Asistanı
// v3 — Onay kutusu + Balon düzenleme eklendi
// ============================================================

// --- STATE ---
const translatorState = {
  isListening:  false,
  currentLang:  null,
  history:      [],
  recognition:  null,
  isSpeaking:   false
};

// --- YARDIMCI: XSS koruması ---
function trEscapeHtml(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function isIOS()     { return /iPhone|iPad|iPod/i.test(navigator.userAgent); }
function isAndroid() { return /Android/i.test(navigator.userAgent); }

// iOS PWA (standalone) modunda mı?
function isIOSPWA() {
  if (!isIOS()) return false;
  // navigator.standalone Safari'de de true döner — KULLANMIYORUZ
  // Sadece CSS media query güvenilir: standalone = ana ekrandan açıldı
  return window.matchMedia('(display-mode: standalone)').matches;
}

// iOS PWA'dan Safari'ye geçiş
// window.open() ve navigator.share() PWA içinde Safari açmıyor — Apple kısıtlaması
// En güvenilir yol: URL'i panoya kopyala + kullanıcıya talimat ver
function openInSafari() {
  const url = window.location.href;

  // Eski kutuyu kaldır
  const old = document.getElementById('tr-safari-guide');
  if (old) { old.remove(); return; }

  // Kopyalamayı dene
  const doCopy = () => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(url);
    }
    // Fallback: eski yöntem
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, 99999);
    try { document.execCommand('copy'); } catch(e) {}
    document.body.removeChild(ta);
    return Promise.resolve();
  };

  doCopy().then(() => {
    showSafariGuide(url, true);  // kopyalandı
  }).catch(() => {
    showSafariGuide(url, false); // kopyalanamadı, manuel göster
  });
}

function showSafariGuide(url, copied) {
  const box = document.createElement('div');
  box.id = 'tr-safari-guide';
  box.style.cssText = `
    position:fixed; bottom:0; left:0; right:0; z-index:99999;
    background:#0f172a; border-top:3px solid #3b82f6;
    padding:20px 16px 32px 16px;
    border-radius:20px 20px 0 0;
    animation:trSlideIn 0.3s ease;
    box-shadow:0 -8px 32px rgba(0,0,0,0.5);
  `;
  box.innerHTML = `
    <div style="text-align:center;margin-bottom:16px;">
      <div style="font-size:32px;margin-bottom:8px;">🧭</div>
      <div style="color:white;font-size:16px;font-weight:800;margin-bottom:4px;">Safari'de Nasıl Açılır?</div>
      <div style="color:#94a3b8;font-size:12px;">Sesli çeviri için Safari gerekli</div>
    </div>

    <!-- Adım 1 -->
    <div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.06);border-radius:12px;padding:12px;margin-bottom:8px;">
      <div style="background:#3b82f6;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0;">1</div>
      <div style="color:#e2e8f0;font-size:13px;line-height:1.5;">
        ${copied
          ? '<b style="color:#4ade80;">✅ Adres kopyalandı!</b> Aşağıdaki butona basın'
          : 'Aşağıdaki adresi kopyalayın'}
      </div>
    </div>

    <!-- URL kutusu -->
    <div style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:10px 12px;margin-bottom:8px;display:flex;align-items:center;gap:8px;">
      <div style="color:#93c5fd;font-size:11px;flex:1;word-break:break-all;font-family:monospace;">${url}</div>
      <button onclick="trCopyUrl('${url}')" id="tr-copy-btn"
        style="background:#3b82f6;color:white;border:none;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;touch-action:manipulation;">
        ${copied ? '✅' : '📋 Kopyala'}
      </button>
    </div>

    <!-- Adım 2 -->
    <div style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.06);border-radius:12px;padding:12px;margin-bottom:16px;">
      <div style="background:#3b82f6;color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:13px;flex-shrink:0;">2</div>
      <div style="color:#e2e8f0;font-size:13px;line-height:1.5;">
        iPhone'da <b style="color:white;">Safari</b>'yi açın →
        adres çubuğuna uzun basın →
        <b style="color:white;">"Yapıştır ve Git"</b>
      </div>
    </div>

    <!-- Kapat -->
    <button onclick="document.getElementById('tr-safari-guide').remove()"
      style="width:100%;padding:13px;background:rgba(255,255,255,0.1);color:white;border:1px solid rgba(255,255,255,0.2);border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;touch-action:manipulation;">
      Kapat
    </button>
  `;

  document.body.appendChild(box);

  // Dışarıya tıklayınca kapat
  setTimeout(() => {
    document.addEventListener('click', function closeGuide(e) {
      if (!box.contains(e.target) && e.target.id !== 'tr-safari-open-btn') {
        box.remove();
        document.removeEventListener('click', closeGuide);
      }
    });
  }, 300);
}

function trCopyUrl(url) {
  const btn = document.getElementById('tr-copy-btn');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      if (btn) { btn.textContent = '✅'; btn.style.background = '#16a34a'; }
    }).catch(() => {
      if (btn) btn.textContent = '❌';
    });
  } else {
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, 99999);
    try {
      document.execCommand('copy');
      if (btn) { btn.textContent = '✅'; btn.style.background = '#16a34a'; }
    } catch(e) {
      if (btn) btn.textContent = '❌';
    }
    document.body.removeChild(ta);
  }
}

// ============================================================
// MyMemory API — Çeviri (AbortController: eski Android uyumlu)
// ============================================================
async function translateText(text, fromLang, toLang) {
  if (!navigator.onLine) return null;
  const from = fromLang.split('-')[0];
  const to   = toLang.split('-')[0];
  const url  = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res  = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error('API yanıt vermedi');
    const data = await res.json();
    if (data.responseStatus === 200 && data.responseData?.translatedText)
      return data.responseData.translatedText;
    throw new Error('Geçersiz yanıt');
  } catch(e) {
    clearTimeout(timer);
    console.error('Çeviri hatası:', e.name, e.message);
    return null;
  }
}

// ============================================================
// TTS — iOS'ta "Sesli Oku" butonu gösterilir
// ============================================================
function speakText(text, lang) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  if (isIOS()) return; // iOS: trShowSpeakButton ile kullanıcı tetikler
  _doSpeak(text, lang);
}

function _doSpeak(text, lang) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang; u.rate = 0.9; u.pitch = 1; u.volume = 1;
  translatorState.isSpeaking = true;
  u.onend = u.onerror = () => { translatorState.isSpeaking = false; };
  isAndroid() ? setTimeout(() => window.speechSynthesis.speak(u), 150)
              : window.speechSynthesis.speak(u);
}

function trShowSpeakButton(msgId, text, lang) {
  const el = document.getElementById(msgId);
  if (!el || el.querySelector('.tr-ios-speak-btn')) return;
  const flag = lang === 'tr-TR' ? '🇹🇷' : '🇬🇧';
  const btn  = document.createElement('button');
  btn.className = 'tr-ios-speak-btn';
  btn.style.cssText = 'margin-top:6px;padding:6px 16px;background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.3);border-radius:20px;font-size:12px;color:#2563eb;cursor:pointer;font-weight:600;';
  btn.innerHTML = `${flag} Sesli Oku 🔊`;
  btn.onclick = () => { _doSpeak(text, lang); btn.remove(); };
  el.appendChild(btn);
}

// ============================================================
// SpeechRecognition — Ses Tanıma
// ============================================================
function startListening(lang) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    trShowStatus('⚠️ Tarayıcınız ses tanımayı desteklemiyor. Chrome veya Edge kullanın.', 'error');
    setTimeout(() => trShowStatus('', ''), 4000);
    return;
  }
  if (!navigator.onLine) {
    trShowStatus('📡 İnternet bağlantısı gerekli!', 'error');
    setTimeout(() => trShowStatus('', ''), 3000);
    return;
  }
  if (translatorState.isListening && translatorState.recognition) {
    try { translatorState.recognition.stop(); } catch(e) {}
    setTimeout(() => _initRecognition(lang, SpeechRec), isAndroid() ? 400 : 100);
    return;
  }
  _initRecognition(lang, SpeechRec);
}

function _initRecognition(lang, SpeechRec) {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  const rec = new SpeechRec();
  rec.lang = lang; rec.continuous = false;
  rec.interimResults = false; rec.maxAlternatives = 1;
  translatorState.recognition = rec;
  translatorState.currentLang = lang;
  translatorState.isListening = false;

  rec.onstart = () => {
    translatorState.isListening = true;
    trShowStatus(lang === 'tr-TR' ? '🎤 Türkçe dinleniyor…' : '🎤 Listening in English…', 'listening');
    trUpdateButtons(lang);
  };

  rec.onresult = (event) => {
    const transcript = event.results[0][0].transcript.trim();
    if (transcript) showConfirmBox(transcript, lang); // → Önce ONAY KUTUSU
  };

  rec.onend = () => {
    translatorState.isListening = false;
    translatorState.recognition = null;
    trShowStatus('', '');
    trUpdateButtons(null);
  };

  rec.onerror = (event) => {
    translatorState.isListening = false;
    translatorState.recognition = null;
    trUpdateButtons(null);
    if (event.error === 'aborted') { trShowStatus('', ''); return; }

    // service-not-allowed = iOS Safari'de mikrofon izni verilmedi
    // veya HTTPS olmayan ortam
    if (event.error === 'service-not-allowed' || event.error === 'not-allowed' || event.error === 'permission-denied') {
      trShowStatus('', '');
      trShowServiceNotAllowed(lang);
      return;
    }

    const msgs = {
      'no-speech':     'Ses algılanamadı, tekrar deneyin.',
      'network':       '📡 Ses tanıma için internet bağlantısı gerekli.',
      'audio-capture': '🎤 Mikrofona erişilemiyor. Başka uygulama kullanıyor olabilir.',
    };
    trShowStatus(msgs[event.error] || `Hata: ${event.error}`, 'error');
    setTimeout(() => trShowStatus('', ''), 4000);
  };

  try { rec.start(); }
  catch(e) {
    trShowStatus('Ses tanıma başlatılamadı.', 'error');
    translatorState.isListening = false;
    translatorState.recognition = null;
    trUpdateButtons(null);
    setTimeout(() => trShowStatus('', ''), 4000);
  }
}

// service-not-allowed / not-allowed hatası gelince göster
// iOS Safari: mikrofon izni kapalı veya HTTPS sorunu
function trShowServiceNotAllowed(lang) {
  // Eski kutu varsa kaldır
  const old = document.getElementById('tr-mic-error');
  if (old) old.remove();

  const isTr = lang === 'tr-TR';
  const box  = document.createElement('div');
  box.id = 'tr-mic-error';
  box.style.cssText = `
    background:#fef2f2; border:2px solid #fecaca; border-radius:14px;
    padding:16px; margin-bottom:14px; animation:trSlideIn 0.3s ease;
  `;
  box.innerHTML = `
    <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;">
      <span style="font-size:24px;flex-shrink:0;">🎤</span>
      <div>
        <div style="font-size:14px;font-weight:700;color:#dc2626;margin-bottom:4px;">
          Mikrofon İzni Gerekli
        </div>
        <div style="font-size:12px;color:#b91c1c;line-height:1.6;">
          iOS Safari'de mikrofon iznini açmak için:<br>
          <b>Ayarlar → Safari → Mikrofon → İzin Ver</b><br>
          Sonra sayfayı yenileyip tekrar deneyin.
        </div>
      </div>
    </div>
    <div style="display:flex;gap:8px;">
      <button onclick="document.getElementById('tr-mic-error').remove()"
        style="flex:1;padding:10px;background:#fee2e2;color:#b91c1c;border:1px solid #fecaca;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;touch-action:manipulation;">
        Kapat
      </button>
      <button onclick="document.getElementById('tr-mic-error').remove(); document.getElementById('tr-text-input')?.focus();"
        style="flex:2;padding:10px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;border:none;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;touch-action:manipulation;">
        ⌨️ Klavye ile Devam Et
      </button>
    </div>
  `;

  // Durum çubuğunun üstüne ekle
  const statusEl = document.getElementById('tr-status');
  if (statusEl && statusEl.parentNode) {
    statusEl.parentNode.insertBefore(box, statusEl);
  }
}

// ============================================================
// ADIM 1: ONAY KUTUSU
// Ses algılandıktan sonra gösterilir — kullanıcı düzeltebilir
// ============================================================
function showConfirmBox(transcript, lang) {
  // Eski kutu varsa kaldır
  const old = document.getElementById('tr-confirm-box');
  if (old) old.remove();

  const isTr   = lang === 'tr-TR';
  const flag   = isTr ? '🇹🇷' : '🇬🇧';
  const label  = isTr ? 'Türkçe algılandı — düzelt veya onayla:' : 'English detected — correct or confirm:';
  const btnLbl = isTr ? '✅ Çevir' : '✅ Translate';
  const canLbl = isTr ? '❌ İptal' : '❌ Cancel';

  const box = document.createElement('div');
  box.id = 'tr-confirm-box';
  box.style.cssText = `
    background:var(--card-bg);
    border:2px solid ${isTr ? '#dc2626' : '#1d4ed8'};
    border-radius:16px; padding:16px; margin-bottom:14px;
    box-shadow:0 4px 20px rgba(0,0,0,0.12);
    animation:trSlideIn 0.25s ease;
  `;
  box.innerHTML = `
    <div style="font-size:12px;font-weight:700;color:${isTr ? '#dc2626' : '#1d4ed8'};margin-bottom:10px;display:flex;align-items:center;gap:6px;">
      ${flag} <span>${label}</span>
    </div>
    <textarea id="tr-confirm-input"
      style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;
             border:1px solid #e2e8f0;font-size:15px;line-height:1.5;resize:vertical;
             min-height:64px;background:var(--input-bg);color:var(--text);
             font-family:inherit;outline:none;"
      autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
    >${trEscapeHtml(transcript)}</textarea>
    <div style="display:flex;gap:10px;margin-top:10px;">
      <button onclick="confirmAndTranslate('${trEscapeHtml(lang)}')"
        style="flex:1;padding:11px;background:${isTr ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : 'linear-gradient(135deg,#1d4ed8,#1e40af)'};
               color:white;border:none;border-radius:10px;font-size:14px;font-weight:700;
               cursor:pointer;touch-action:manipulation;">
        ${btnLbl}
      </button>
      <button onclick="cancelConfirm()"
        style="padding:11px 18px;background:none;border:1px solid #e2e8f0;
               border-radius:10px;font-size:14px;color:var(--muted);cursor:pointer;
               touch-action:manipulation;">
        ${canLbl}
      </button>
    </div>
  `;

  // Onay kutusunu "tr-status" üstüne yerleştir
  const statusEl = document.getElementById('tr-status');
  if (statusEl && statusEl.parentNode) {
    statusEl.parentNode.insertBefore(box, statusEl);
  }

  // Input'a odaklan ve imleci sona götür
  const inp = document.getElementById('tr-confirm-input');
  if (inp) {
    setTimeout(() => {
      inp.focus();
      inp.setSelectionRange(inp.value.length, inp.value.length);
    }, 50);
  }
}

function cancelConfirm() {
  const box = document.getElementById('tr-confirm-box');
  if (box) box.remove();
}

// Onaylama/düzeltme sonrası çeviri başlat
async function confirmAndTranslate(lang) {
  const inp = document.getElementById('tr-confirm-input');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;

  // Onay kutusunu kaldır
  cancelConfirm();

  await handleSpeechResult(text, lang);
}

// ============================================================
// ADIM 2: Ana Akış (Onaydan sonra çalışır)
// ============================================================
async function handleSpeechResult(text, sourceLang) {
  const targetLang = sourceLang === 'tr-TR' ? 'en-US' : 'tr-TR';
  const isTrSource = sourceLang === 'tr-TR';
  const msgId      = 'msg-' + Date.now();

  addBubble({ id: msgId, sourceLang, original: text, translation: null });

  trShowStatus(isTrSource ? '⏳ Çevriliyor…' : '⏳ Translating…', 'translating');
  const translated = await translateText(text, sourceLang, targetLang);

  if (translated === null) {
    updateBubbleTranslation(msgId,
      isTrSource
        ? '⚠️ Çeviri alınamadı. İnternet bağlantısını kontrol edin.'
        : '⚠️ Translation failed. Check your internet connection.'
    );
    trShowStatus('', '');
    return;
  }

  updateBubbleTranslation(msgId, translated);
  trShowStatus('', '');

  translatorState.history.push({ id: msgId, sourceLang, original: text, translation: translated });

  speakText(translated, targetLang);
  if (isIOS()) trShowSpeakButton(msgId, translated, targetLang);
}

// ============================================================
// UI: Sohbet Balonu (✏️ Düzenleme butonu dahil)
// ============================================================
function addBubble({ id, sourceLang, original, translation }) {
  const chatEl = document.getElementById('tr-chat');
  if (!chatEl) return;
  const emptyEl = document.getElementById('tr-empty');
  if (emptyEl) emptyEl.style.display = 'none';

  const isTr       = sourceLang === 'tr-TR';
  const flag       = isTr ? '🇹🇷' : '🇬🇧';
  const flagTarget = isTr ? '🇬🇧' : '🇹🇷';
  const align      = isTr ? 'flex-end' : 'flex-start';
  const bgOrig     = isTr ? 'var(--tr-bubble-orig)'  : 'var(--en-bubble-orig)';
  const bgTrans    = isTr ? 'var(--tr-bubble-trans)'  : 'var(--en-bubble-trans)';
  const radOrig    = isTr ? '18px 4px 18px 18px' : '4px 18px 18px 18px';
  const radTrans   = isTr ? '4px 18px 18px 18px' : '18px 4px 18px 18px';
  const now        = new Date().toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' });

  const wrapper = document.createElement('div');
  wrapper.id = id;
  wrapper.style.cssText = `display:flex;flex-direction:column;align-items:${align};margin-bottom:16px;animation:trSlideIn 0.3s ease;`;

  wrapper.innerHTML = `
    <!-- Orijinal -->
    <div style="max-width:88%;background:${bgOrig};padding:12px 14px;border-radius:${radOrig};box-shadow:0 2px 8px rgba(0,0,0,0.08);margin-bottom:4px;">
      <div style="font-size:11px;font-weight:700;color:var(--tr-flag-label);margin-bottom:5px;letter-spacing:0.5px;">
        ${flag} ${isTr ? 'Türkçe (Siz)' : 'English (Patient)'}
      </div>
      <div id="${id}-orig" style="font-size:15px;color:var(--tr-orig-text);line-height:1.5;font-weight:500;word-break:break-word;">
        ${trEscapeHtml(original)}
      </div>
    </div>
    <!-- Çeviri -->
    <div style="max-width:88%;background:${bgTrans};padding:10px 14px;border-radius:${radTrans};box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="font-size:11px;font-weight:700;color:var(--tr-flag-label);margin-bottom:5px;letter-spacing:0.5px;">
        ${flagTarget} ${isTr ? 'English (Translation)' : 'Türkçe (Çeviri)'}
      </div>
      <div id="${id}-trans" style="font-size:14px;color:var(--tr-trans-text);line-height:1.5;font-style:italic;word-break:break-word;">
        ${translation
          ? trEscapeHtml(translation)
          : '<span class="tr-loading-dots"><span></span><span></span><span></span></span>'}
      </div>
    </div>
    <!-- Alt satır: zaman + düzenle butonu -->
    <div style="display:flex;align-items:center;gap:10px;margin-top:5px;padding:0 2px;">
      <span style="font-size:10px;color:var(--tr-time);">${now}</span>
      <button onclick="openBubbleEdit('${id}','${trEscapeHtml(sourceLang)}')"
        style="font-size:11px;color:var(--muted);background:none;border:1px solid #e2e8f0;
               border-radius:8px;padding:2px 9px;cursor:pointer;font-weight:600;
               touch-action:manipulation;">
        ✏️ Düzenle
      </button>
    </div>
  `;

  chatEl.appendChild(wrapper);
  chatEl.scrollTop = chatEl.scrollHeight;
  setTimeout(() => { chatEl.scrollTop = chatEl.scrollHeight; }, 100);
}

function updateBubbleTranslation(msgId, translatedText) {
  const el = document.getElementById(`${msgId}-trans`);
  if (el) el.innerHTML = trEscapeHtml(translatedText);
  const chatEl = document.getElementById('tr-chat');
  if (chatEl) setTimeout(() => { chatEl.scrollTop = chatEl.scrollHeight; }, 50);
}

// ============================================================
// ADIM 3: BALON DÜZENLEME (✏️ tıklanınca)
// ============================================================
function openBubbleEdit(msgId, sourceLang) {
  // Zaten açıksa kapat (toggle)
  const existingEdit = document.getElementById(`${msgId}-edit`);
  if (existingEdit) { existingEdit.remove(); return; }

  const isTr       = sourceLang === 'tr-TR';
  const origEl     = document.getElementById(`${msgId}-orig`);
  const transEl    = document.getElementById(`${msgId}-trans`);
  const wrapper    = document.getElementById(msgId);
  if (!origEl || !transEl || !wrapper) return;

  const currentOrig  = origEl.innerText || origEl.textContent || '';
  const currentTrans = transEl.innerText || transEl.textContent || '';
  const targetLang   = isTr ? 'en-US' : 'tr-TR';

  const editBox = document.createElement('div');
  editBox.id = `${msgId}-edit`;
  editBox.style.cssText = `
    margin-top:8px;background:var(--card-bg);
    border:2px solid #f59e0b;border-radius:14px;
    padding:14px;width:100%;box-sizing:border-box;
    animation:trSlideIn 0.2s ease;
  `;
  editBox.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:#b45309;margin-bottom:8px;">✏️ Düzenleme Modu</div>

    <label style="font-size:11px;font-weight:600;color:var(--muted);display:block;margin-bottom:4px;">
      ${isTr ? '🇹🇷 Türkçe (Orijinal)' : '🇬🇧 English (Original)'}
    </label>
    <textarea id="${msgId}-edit-orig"
      style="width:100%;box-sizing:border-box;padding:9px 11px;border-radius:8px;
             border:1px solid #e2e8f0;font-size:14px;resize:vertical;min-height:52px;
             background:var(--input-bg);color:var(--text);font-family:inherit;margin-bottom:10px;"
      autocorrect="off" autocapitalize="off" spellcheck="false"
    >${trEscapeHtml(currentOrig)}</textarea>

    <label style="font-size:11px;font-weight:600;color:var(--muted);display:block;margin-bottom:4px;">
      ${isTr ? '🇬🇧 English (Translation)' : '🇹🇷 Türkçe (Çeviri)'}
    </label>
    <textarea id="${msgId}-edit-trans"
      style="width:100%;box-sizing:border-box;padding:9px 11px;border-radius:8px;
             border:1px solid #e2e8f0;font-size:14px;resize:vertical;min-height:52px;
             background:var(--input-bg);color:var(--text);font-family:italic;font-style:italic;margin-bottom:10px;"
      autocorrect="off" autocapitalize="off" spellcheck="false"
    >${trEscapeHtml(currentTrans)}</textarea>

    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <!-- Kaydet -->
      <button onclick="saveBubbleEdit('${msgId}','${trEscapeHtml(sourceLang)}')"
        style="flex:1;min-width:90px;padding:9px;background:linear-gradient(135deg,#f59e0b,#d97706);
               color:white;border:none;border-radius:9px;font-size:13px;font-weight:700;
               cursor:pointer;touch-action:manipulation;">
        💾 Kaydet
      </button>
      <!-- Yeniden Çevir -->
      <button onclick="retranslateBubble('${msgId}','${trEscapeHtml(sourceLang)}')"
        style="flex:1;min-width:90px;padding:9px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);
               color:white;border:none;border-radius:9px;font-size:13px;font-weight:700;
               cursor:pointer;touch-action:manipulation;">
        🔄 Yeniden Çevir
      </button>
      <!-- Sesli Oku -->
      <button onclick="reSpeakBubble('${msgId}','${trEscapeHtml(targetLang)}')"
        style="flex:1;min-width:90px;padding:9px;background:linear-gradient(135deg,#10b981,#059669);
               color:white;border:none;border-radius:9px;font-size:13px;font-weight:700;
               cursor:pointer;touch-action:manipulation;">
        🔊 Sesli Oku
      </button>
      <!-- İptal -->
      <button onclick="document.getElementById('${msgId}-edit').remove()"
        style="padding:9px 14px;background:none;border:1px solid #e2e8f0;border-radius:9px;
               font-size:13px;color:var(--muted);cursor:pointer;touch-action:manipulation;">
        ✕
      </button>
    </div>
  `;

  wrapper.appendChild(editBox);
  // Orijinal textarea'ya odaklan
  setTimeout(() => {
    const inp = document.getElementById(`${msgId}-edit-orig`);
    if (inp) inp.focus();
  }, 50);
}

// Düzenlemeyi balona kaydet (çeviri yapma, sadece metni güncelle)
function saveBubbleEdit(msgId, sourceLang) {
  const origEl   = document.getElementById(`${msgId}-orig`);
  const transEl  = document.getElementById(`${msgId}-trans`);
  const editOrig = document.getElementById(`${msgId}-edit-orig`);
  const editTrans= document.getElementById(`${msgId}-edit-trans`);
  if (!origEl || !transEl || !editOrig || !editTrans) return;

  origEl.textContent  = editOrig.value.trim();
  transEl.textContent = editTrans.value.trim();
  transEl.style.fontStyle = 'italic';

  // Geçmişi güncelle
  const entry = translatorState.history.find(h => h.id === msgId);
  if (entry) {
    entry.original    = editOrig.value.trim();
    entry.translation = editTrans.value.trim();
  }

  document.getElementById(`${msgId}-edit`)?.remove();
}

// Orijinal metni koruyarak sadece çeviriyi yenile
async function retranslateBubble(msgId, sourceLang) {
  const editOrig = document.getElementById(`${msgId}-edit-orig`);
  const transEl  = document.getElementById(`${msgId}-trans`);
  if (!editOrig || !transEl) return;

  const newText    = editOrig.value.trim();
  if (!newText) return;
  const targetLang = sourceLang === 'tr-TR' ? 'en-US' : 'tr-TR';

  // Orijinal balonu güncelle
  const origEl = document.getElementById(`${msgId}-orig`);
  if (origEl) origEl.textContent = newText;

  // Çeviri alanına yükleniyor göster
  transEl.innerHTML = '<span class="tr-loading-dots"><span></span><span></span><span></span></span>';
  document.getElementById(`${msgId}-edit`)?.remove();

  const translated = await translateText(newText, sourceLang, targetLang);
  transEl.textContent = translated
    || (sourceLang === 'tr-TR'
        ? '⚠️ Çeviri alınamadı.' : '⚠️ Translation failed.');
  transEl.style.fontStyle = 'italic';

  // Geçmişi güncelle
  const entry = translatorState.history.find(h => h.id === msgId);
  if (entry) { entry.original = newText; entry.translation = translated || ''; }

  // TTS
  if (translated) {
    speakText(translated, targetLang);
    if (isIOS()) trShowSpeakButton(msgId, translated, targetLang);
  }
}

// Çeviriyi sesli oku (düzenleme modundaki textarea'dan)
function reSpeakBubble(msgId, targetLang) {
  const editTrans = document.getElementById(`${msgId}-edit-trans`);
  const text = editTrans ? editTrans.value.trim() : '';
  if (!text) return;
  if (isIOS()) {
    document.getElementById(`${msgId}-edit`)?.remove();
    trShowSpeakButton(msgId, text, targetLang);
  } else {
    _doSpeak(text, targetLang);
  }
}

// ============================================================
// UI Yardımcıları
// ============================================================
function trShowStatus(msg, type) {
  const el = document.getElementById('tr-status');
  if (!el) return;
  el.textContent = msg;
  el.className = 'tr-status-bar';
  if (type === 'listening')   el.classList.add('tr-status-listening');
  if (type === 'translating') el.classList.add('tr-status-translating');
  if (type === 'error')       el.classList.add('tr-status-error');
  el.style.display = msg ? 'flex' : 'none';
}

function trUpdateButtons(activeLang) {
  const btnTr = document.getElementById('tr-btn-tr');
  const btnEn = document.getElementById('tr-btn-en');
  if (!btnTr || !btnEn) return;
  [btnTr, btnEn].forEach(b => {
    b.classList.remove('tr-btn-active', 'tr-btn-disabled');
    b.disabled = false;
  });
  if (activeLang === 'tr-TR') {
    btnTr.classList.add('tr-btn-active');
    btnEn.classList.add('tr-btn-disabled'); btnEn.disabled = true;
  } else if (activeLang === 'en-US') {
    btnEn.classList.add('tr-btn-active');
    btnTr.classList.add('tr-btn-disabled'); btnTr.disabled = true;
  }
}

// ============================================================
// UI Render
// ============================================================
function renderTranslatorUI() {
  // Ses tanıma desteği kontrolü
  const hasSpeech = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const iosPwa    = isIOSPWA();
  // iOS PWA'da SpeechRecognition var ama çalışmıyor
  const speechWorks = hasSpeech && !iosPwa;

  const iosWarn = (isIOS() || iosPwa) ? `
    <div style="background:#fffbeb;border:2px solid #fde68a;border-radius:12px;padding:12px 14px;margin-bottom:14px;display:flex;align-items:flex-start;gap:10px;">
      <span style="font-size:20px;flex-shrink:0;">🍎</span>
      <div style="font-size:12px;color:#92400e;line-height:1.6;">
        <b style="display:block;margin-bottom:2px;">${iosPwa ? 'iOS PWA Notu:' : 'iOS Notu:'}</b>
        ${iosPwa
          ? 'Ana ekrandan açıldığında Apple ses tanımayı kapatır. Sesli komut için <b>Safari\'de Aç</b> butonuna basın veya <b>klavye ile yazın</b>. Sesli okuma çalışır.'
          : hasSpeech
            ? 'Apple cihazlarda sesli komut PWA modunda çalışmayabilir. Sorun olursa <b>klavye ile yaz</b> alanını kullanın.'
            : 'Apple cihazlarda ses tanıma desteklenmez. <b>klavye ile yaz</b> alanını kullanın.'}
      </div>
    </div>` : '';

  const offlineWarn = !navigator.onLine ? `
    <div style="background:#fef2f2;border:2px solid #fecaca;border-radius:12px;padding:14px;margin-bottom:14px;display:flex;align-items:center;gap:10px;">
      <span style="font-size:22px;">📡</span>
      <div>
        <div style="font-weight:700;color:#dc2626;font-size:14px;">İnternet bağlantısı yok</div>
        <div style="color:#b91c1c;font-size:12px;margin-top:2px;">Çeviri için internet bağlantısı gereklidir.</div>
      </div>
    </div>` : '';

  // iOS PWA uyarı + Safari'de Aç butonu
  const safariOpenBtn = iosPwa ? `
    <div style="background:linear-gradient(135deg,#0ea5e9,#0284c7);border-radius:14px;padding:14px;margin-bottom:14px;">
      <div style="color:white;margin-bottom:10px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:2px;">📱 Sesli komut için Safari'yi açın</div>
        <div style="font-size:11px;opacity:0.85;">Apple, PWA modunda ses tanımayı kapatır. Paylaş butonuna basıp Safari'yi seçin.</div>
      </div>
      <button onclick="openInSafari()"
        style="width:100%;padding:10px;background:white;color:#0284c7;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;touch-action:manipulation;">
        🧭 Safari'de Nasıl Açılır?
      </button>
    </div>` : '';

  // Ses butonları — speechWorks false ise gizle veya kilitli göster
  const voiceButtons = speechWorks ? `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
      <button id="tr-btn-tr" onclick="startListening('tr-TR')"
        style="background:linear-gradient(135deg,#dc2626,#b91c1c);color:white;border:none;border-radius:18px;padding:20px 8px;cursor:pointer;transition:all 0.2s ease;box-shadow:0 6px 18px rgba(220,38,38,0.3);-webkit-tap-highlight-color:transparent;touch-action:manipulation;">
        <div style="font-size:32px;margin-bottom:8px;">🇹🇷</div>
        <div style="font-size:14px;font-weight:700;margin-bottom:4px;">Türkçe Konuş</div>
        <div style="font-size:11px;opacity:0.85;">→ İngilizceye çevir</div>
        <div style="margin-top:8px;font-size:20px;">🎤</div>
      </button>
      <button id="tr-btn-en" onclick="startListening('en-US')"
        style="background:linear-gradient(135deg,#1d4ed8,#1e40af);color:white;border:none;border-radius:18px;padding:20px 8px;cursor:pointer;transition:all 0.2s ease;box-shadow:0 6px 18px rgba(29,78,216,0.3);-webkit-tap-highlight-color:transparent;touch-action:manipulation;">
        <div style="font-size:32px;margin-bottom:8px;">🇬🇧</div>
        <div style="font-size:14px;font-weight:700;margin-bottom:4px;">Speak English</div>
        <div style="font-size:11px;opacity:0.85;">→ Türkçeye çevir</div>
        <div style="margin-top:8px;font-size:20px;">🎤</div>
      </button>
    </div>` : (iosPwa ? `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;opacity:0.5;">
      <div style="background:#f1f5f9;border:2px dashed #cbd5e1;border-radius:18px;padding:20px 8px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">🇹🇷</div>
        <div style="font-size:13px;font-weight:700;color:#64748b;margin-bottom:4px;">Türkçe Konuş</div>
        <div style="font-size:11px;color:#94a3b8;">🔒 Safari gerekli</div>
      </div>
      <div style="background:#f1f5f9;border:2px dashed #cbd5e1;border-radius:18px;padding:20px 8px;text-align:center;">
        <div style="font-size:32px;margin-bottom:8px;">🇬🇧</div>
        <div style="font-size:13px;font-weight:700;color:#64748b;margin-bottom:4px;">Speak English</div>
        <div style="font-size:11px;color:#94a3b8;">🔒 Safari gerekli</div>
      </div>
    </div>` : '');

  return `
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:18px;border-radius:16px;margin-bottom:16px;position:relative;overflow:hidden;">
      <div style="position:absolute;top:0;left:0;width:100%;height:100%;background-image:radial-gradient(circle at 2px 2px,rgba(255,255,255,0.04) 1px,transparent 0);background-size:30px 30px;opacity:0.4;pointer-events:none;"></div>
      <div style="position:relative;z-index:1;display:flex;align-items:center;gap:12px;">
        <div style="width:44px;height:44px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0;">🌍</div>
        <div>
          <div style="color:white;font-size:17px;font-weight:800;line-height:1.2;">Anlık Çevirmen</div>
          <div style="color:rgba(255,255,255,0.65);font-size:11px;margin-top:2px;">🇹🇷 Türkçe ↔ 🇬🇧 İngilizce</div>
        </div>
        <button onclick="trCloseTranslator()"
          style="margin-left:auto;background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);color:white;width:36px;height:36px;border-radius:10px;font-size:18px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;justify-content:center;"
          aria-label="Kapat">✕</button>
      </div>
    </div>

    ${offlineWarn}
    ${iosWarn}
    ${safariOpenBtn}

    <!-- Talimat -->
    <div style="background:var(--card-bg);border:1px solid rgba(59,130,246,0.2);border-radius:12px;padding:12px 14px;margin-bottom:14px;display:flex;align-items:flex-start;gap:10px;">
      <span style="font-size:18px;flex-shrink:0;">💡</span>
      <div style="font-size:13px;color:var(--muted);line-height:1.6;">
        <b style="color:var(--text);">Nasıl kullanılır?</b>
        ${speechWorks
          ? '🎤 Butona bas → konuş → düzelt → Çevir. Veya aşağıdan <b>klavye ile yaz</b>.'
          : iosPwa
            ? 'Sesli için <b>Safari\'de Aç</b> butonuna basın. Buradan <b>klavye ile yazıp</b> çevirebilirsiniz.'
            : 'Aşağıdan <b>klavye ile yazın</b> ve Çevir butonuna basın.'}
      </div>
    </div>

    ${voiceButtons}

    <!-- KLAVYE İLE METİN GİRİŞ ALANI -->
    <div style="background:var(--card-bg);border:2px solid ${speechWorks ? 'rgba(59,130,246,0.25)' : '#3b82f6'};border-radius:16px;padding:14px;margin-bottom:14px;${!speechWorks ? 'box-shadow:0 4px 20px rgba(59,130,246,0.15);' : ''}">

      <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:10px;display:flex;align-items:center;gap:6px;">
        ⌨️ <span>Klavye ile Yaz</span>
        ${!speechWorks ? '<span style="background:#3b82f6;color:white;font-size:9px;padding:2px 8px;border-radius:10px;font-weight:700;margin-left:auto;">ÖNERİLEN</span>' : ''}
      </div>

      <!-- Dil seçici -->
      <div style="display:flex;gap:6px;margin-bottom:10px;">
        <button id="tr-mode-tr" onclick="trSetInputMode('tr')"
          style="flex:1;padding:9px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;border:2px solid #dc2626;background:#fee2e2;color:#b91c1c;touch-action:manipulation;">
          🇹🇷 Türkçe → 🇬🇧 EN
        </button>
        <button id="tr-mode-en" onclick="trSetInputMode('en')"
          style="flex:1;padding:9px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;border:2px solid #e2e8f0;background:var(--input-bg);color:var(--muted);touch-action:manipulation;">
          🇬🇧 English → 🇹🇷 TR
        </button>
      </div>

      <!-- Metin kutusu -->
      <textarea id="tr-text-input"
        style="width:100%;box-sizing:border-box;padding:10px 12px;border-radius:10px;border:1px solid #e2e8f0;font-size:15px;line-height:1.5;resize:vertical;min-height:56px;background:var(--input-bg);color:var(--text);font-family:inherit;outline:none;"
        placeholder="Çevirmek istediğiniz metni yazın…"
        autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
        onkeydown="if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();translateFromInput();}"></textarea>

      <!-- Çevir butonu -->
      <button onclick="translateFromInput()"
        style="width:100%;margin-top:10px;padding:12px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;touch-action:manipulation;">
        🔄 Çevir
      </button>

      <div style="font-size:10px;color:var(--muted);margin-top:6px;text-align:center;">
        ${speechWorks ? 'Ctrl+Enter ile hızlı çevir' : 'Metni yazıp Çevir butonuna basın'}
      </div>
    </div>

    <!-- Onay Kutusu buraya dinamik eklenir -->

    <!-- Durum Çubuğu -->
    <div id="tr-status" class="tr-status-bar" style="display:none;margin-bottom:14px;"></div>

    <!-- Sohbet Alanı -->
    <div style="background:var(--card-bg);border-radius:16px;border:1px solid rgba(0,0,0,0.06);overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
      <div style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-bottom:1px solid rgba(0,0,0,0.06);padding:10px 14px;display:flex;justify-content:space-between;align-items:center;">
        <div style="font-size:13px;font-weight:700;color:var(--text);">💬 Konuşma Geçmişi</div>
        <button onclick="trClearHistory()"
          style="background:none;border:1px solid #e2e8f0;color:var(--muted);padding:4px 10px;border-radius:8px;font-size:11px;cursor:pointer;font-weight:600;touch-action:manipulation;">
          🗑️ Temizle
        </button>
      </div>
      <div id="tr-chat"
        style="min-height:180px;max-height:420px;overflow-y:auto;padding:14px;display:flex;flex-direction:column;-webkit-overflow-scrolling:touch;">
        <div id="tr-empty"
          style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:36px 20px;text-align:center;color:var(--muted);">
          <div style="font-size:44px;margin-bottom:14px;opacity:0.4;">💬</div>
          <div style="font-size:14px;font-weight:600;margin-bottom:6px;">Henüz çeviri yok</div>
          <div style="font-size:12px;opacity:0.8;">
            ${speechWorks ? 'Konuşun veya yazın' : 'Aşağıdan yazın'} ve çeviri başlasın
          </div>
        </div>
      </div>
    </div>

    <!-- Alt Bilgi -->
    <div style="margin-top:14px;text-align:center;color:var(--muted);font-size:11px;line-height:1.8;">
      <div>⚡ ${speechWorks ? 'Web Speech API +' : ''} MyMemory Translate</div>
      <div>${speechWorks ? 'Chrome / Edge / Safari' : 'Tüm tarayıcılar'} • İnternet bağlantısı gereklidir</div>
    </div>
  `;
}

// ============================================================
// KLAVYE GİRİŞİ: Dil modu seçimi + Çeviri
// ============================================================
let trInputMode = 'tr'; // 'tr' = TR→EN, 'en' = EN→TR

function trSetInputMode(mode) {
  trInputMode = mode;
  const btnTr = document.getElementById('tr-mode-tr');
  const btnEn = document.getElementById('tr-mode-en');
  const inp   = document.getElementById('tr-text-input');

  if (!btnTr || !btnEn) return;

  if (mode === 'tr') {
    btnTr.style.cssText = 'flex:1;padding:9px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;border:2px solid #dc2626;background:#fee2e2;color:#b91c1c;touch-action:manipulation;';
    btnEn.style.cssText = 'flex:1;padding:9px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;border:2px solid #e2e8f0;background:var(--input-bg);color:var(--muted);touch-action:manipulation;';
    if (inp) inp.placeholder = 'Türkçe yazın…';
  } else {
    btnEn.style.cssText = 'flex:1;padding:9px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;border:2px solid #1d4ed8;background:#dbeafe;color:#1e40af;touch-action:manipulation;';
    btnTr.style.cssText = 'flex:1;padding:9px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;border:2px solid #e2e8f0;background:var(--input-bg);color:var(--muted);touch-action:manipulation;';
    if (inp) inp.placeholder = 'Type in English…';
  }

  if (inp) inp.focus();
}

async function translateFromInput() {
  const inp = document.getElementById('tr-text-input');
  if (!inp) return;
  const text = inp.value.trim();
  if (!text) return;

  const sourceLang = trInputMode === 'tr' ? 'tr-TR' : 'en-US';
  const targetLang = trInputMode === 'tr' ? 'en-US' : 'tr-TR';

  // Input'u temizle
  inp.value = '';

  // handleSpeechResult'ı kullan (onay kutusu olmadan direkt çeviri)
  await handleSpeechResult(text, sourceLang);
}

// ============================================================
// Ana Giriş
// ============================================================
function showTranslator() {
  if (typeof stopAllSounds === 'function') stopAllSounds();
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  if (translatorState.recognition) {
    try { translatorState.recognition.abort(); } catch(e) {}
    translatorState.recognition = null;
  }
  translatorState.history = []; translatorState.isListening = false;
  translatorState.currentLang = null;

  const contentEl = document.getElementById('content');
  if (!contentEl) return;
  contentEl.innerHTML = `
    <button class="back-btn" onclick="trCloseTranslator()">⬅️ Geri Dön</button>
    <div id="tr-panel">${renderTranslatorUI()}</div>
  `;
  contentEl.style.display = 'block';
  contentEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function trCloseTranslator() {
  if (translatorState.recognition) {
    try { translatorState.recognition.stop(); } catch(e) {}
    translatorState.recognition = null;
  }
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  translatorState.isListening = false;
  if (typeof clearContent === 'function') clearContent();
}

function trClearHistory() {
  translatorState.history = [];
  const chatEl = document.getElementById('tr-chat');
  if (!chatEl) return;
  chatEl.innerHTML = `
    <div id="tr-empty"
      style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:36px 20px;text-align:center;color:var(--muted);">
      <div style="font-size:44px;margin-bottom:14px;opacity:0.4;">💬</div>
      <div style="font-size:14px;font-weight:600;margin-bottom:6px;">Henüz konuşma yok</div>
      <div style="font-size:12px;opacity:0.8;">Yukarıdaki butonlardan birine basarak başlayın</div>
    </div>
  `;
}

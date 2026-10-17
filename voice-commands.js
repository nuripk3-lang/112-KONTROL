// ============================================================
// voice-commands.js — Gelişmiş Sesli Komut Sistemi
// 112 Kırklareli Acil Sağlık Eğitim Asistanı
// index.html'deki toggleVoiceCommand ve processVoiceCommand
// fonksiyonlarını override eder.
// ============================================================

// Kendi state değişkenlerimiz (inline script'teki let ile erişilemez)
let recognition  = null;
let isListening  = false;

// ============================================================
// TÜM ALGORİTMALARIN SESLI KOMUT EŞLEME TABLOSU
// Her algoritma için hangi sözcükler söylenirse tanınsın
// ============================================================
const VOICE_ALGO_MAP = [
  // ── YETİŞKİN KARDİYAK ──
  { key: 'aks',                grup: 'Yetişkin',
    kelimeler: ['aks','akut koroner','koroner sendrom','kalp krizi','miyokard','stemi','nstemi'] },
  { key: 'bradikardi',         grup: 'Yetişkin',
    kelimeler: ['bradikardi','yavaş nabız','yavaş kalp','kalp yavaş'] },
  { key: 'tasikardi',          grup: 'Yetişkin',
    kelimeler: ['taşikardi','tachycardia','hızlı nabız','hızlı kalp','svt','vt','ventriküler taşikardi'] },
  { key: 'arrest',             grup: 'Yetişkin',
    kelimeler: ['arrest','kardiyak arrest','kalp durması','kalp durdu','kpr','cpr','resüsitasyon','resusitasyon'] },
  { key: 'kardiyojenik_sok_y', grup: 'Yetişkin',
    kelimeler: ['kardiyojenik şok','kalp yetersizliği şoku','kardiyojenik'] },
  { key: 'post_rosc_y',        grup: 'Yetişkin',
    kelimeler: ['post rosc','rosc','resüsitasyon sonrası','resusitasyon sonrası'] },
  { key: 'hipotermi_arrest',   grup: 'Yetişkin',
    kelimeler: ['hipotermik arrest','hipotermi arrest','hipotermi','soğuk arrest','donma arrest'] },

  // ── YETİŞKİN SOLUNUM ──
  { key: 'astim',              grup: 'Yetişkin',
    kelimeler: ['astım','astim','bronkospazm','nefes darlığı','hırıltı','wheezing'] },
  { key: 'koah',               grup: 'Yetişkin',
    kelimeler: ['koah','copd','kronik obstrüktif','amfizem','kronik bronşit'] },

  // ── YETİŞKİN NÖROLOJİK ──
  { key: 'inme',               grup: 'Yetişkin',
    kelimeler: ['inme','svh','stroke','felç','beyin damar','fast fast','yüz kolu dil'] },
  { key: 'nobet',              grup: 'Yetişkin',
    kelimeler: ['nöbet','konvülziyon','epilepsi','sara','kasılma'] },
  { key: 'kafa',               grup: 'Yetişkin',
    kelimeler: ['kafa travması','baş travması','kafa yarası','kafa çarpması'] },
  { key: 'vertigo',            grup: 'Yetişkin',
    kelimeler: ['vertigo','baş dönmesi','denge bozukluğu'] },

  // ── YETİŞKİN DİĞER ──
  { key: 'gebe_hipertansiyon', grup: 'Yetişkin',
    kelimeler: ['eklampsi','preeklampsi','gebe hipertansiyon','gebede tansiyon','hamile tansiyon'] },
  { key: 'dogum',              grup: 'Yetişkin',
    kelimeler: ['doğum','acil doğum','bebek doğuyor','doğurma'] },
  { key: 'hipoglisemi',        grup: 'Yetişkin',
    kelimeler: ['hipoglisemi','kan şekeri düşük','şeker düştü','düşük şeker','hipoglisemi yetişkin'] },
  { key: 'hipovolemi',         grup: 'Yetişkin',
    kelimeler: ['hipovolemik şok','kanama şoku','sıvı kaybı şok','hipovolemi'] },
  { key: 'yanik',              grup: 'Yetişkin',
    kelimeler: ['yanık','yetişkin yanık','yanma','parkland'] },
  { key: 'zehir',              grup: 'Yetişkin',
    kelimeler: ['zehirlenme','toksikoloji','zehir','antidot','ilaç zehirlenmesi','yetişkin zehir'] },
  { key: 'anafilaksi',         grup: 'Yetişkin',
    kelimeler: ['anafilaksi','anaflaksi','alerji şoku','alerjik şok','epinefrin yetişkin'] },
  { key: 'travma',             grup: 'Yetişkin',
    kelimeler: ['travma','yaralı hasta','travmalı','trafik kazası'] },
  { key: 'crush',              grup: 'Yetişkin',
    kelimeler: ['crush','ezilme','enkaz','myoglobin','rabdomiyoliz'] },

  // ── ÇOCUK KARDİYAK ──
  { key: 'arrest',             grup: 'Çocuk',
    kelimeler: ['çocuk arrest','pediyatrik arrest','çocuk kalp durması','çocuk kpr','çocuk cpr'] },
  { key: 'bradikardi',         grup: 'Çocuk',
    kelimeler: ['çocuk bradikardi','pediyatrik bradikardi','çocuk yavaş nabız'] },
  { key: 'tasikardi',          grup: 'Çocuk',
    kelimeler: ['çocuk taşikardi','pediyatrik taşikardi','çocuk hızlı nabız'] },
  { key: 'kardiyojenik_sok',   grup: 'Çocuk',
    kelimeler: ['çocuk kardiyojenik','pediyatrik kardiyojenik şok'] },
  { key: 'post_rosc_cocuk',    grup: 'Çocuk',
    kelimeler: ['çocuk post rosc','pediyatrik rosc','çocuk resüsitasyon sonrası'] },
  { key: 'nrp',                grup: 'Çocuk',
    kelimeler: ['nrp','yenidoğan resüsitasyon','yenidoğan','bebek doğdu','yeni doğan'] },

  // ── ÇOCUK SOLUNUM ──
  { key: 'astim',              grup: 'Çocuk',
    kelimeler: ['çocuk astım','pediyatrik astım','çocuk nefes darlığı','çocuk hırıltı'] },
  { key: 'krup',               grup: 'Çocuk',
    kelimeler: ['krup','havlar öksürük','stridor çocuk','laringotrakeit','havlayan öksürük'] },
  { key: 'epiglotit_cocuk',    grup: 'Çocuk',
    kelimeler: ['epiglotit','epiglot','yutma güçlüğü çocuk','salya çocuk'] },

  // ── ÇOCUK NÖROLOJİK ──
  { key: 'nobet',              grup: 'Çocuk',
    kelimeler: ['çocuk nöbet','febril konvülziyon','ateşli nöbet','çocuk kasılma','çocuk epilepsi'] },
  { key: 'kafa',               grup: 'Çocuk',
    kelimeler: ['çocuk kafa travması','çocuk baş travması','pediyatrik kafa'] },
  { key: 'vertigo',            grup: 'Çocuk',
    kelimeler: ['çocuk vertigo','çocuk baş dönmesi'] },

  // ── ÇOCUK DİĞER ──
  { key: 'ates_cocuk',         grup: 'Çocuk',
    kelimeler: ['ateş çocuk','yüksek ateş çocuk','febril','çocuk ateş'] },
  { key: 'septik_sok_cocuk',   grup: 'Çocuk',
    kelimeler: ['çocuk septik şok','pediyatrik sepsis','çocuk sepsis'] },
  { key: 'p_hipoglisemi',      grup: 'Çocuk',
    kelimeler: ['çocuk hipoglisemi','bebek kan şekeri','pediyatrik hipoglisemi','çocuk şeker'] },
  { key: 'anafilaksi',         grup: 'Çocuk',
    kelimeler: ['çocuk anafilaksi','pediyatrik anafilaksi','çocuk alerjik şok'] },
  { key: 'travma',             grup: 'Çocuk',
    kelimeler: ['çocuk travma','çocuk yaralı','pediyatrik travma'] },
  { key: 'yanik',              grup: 'Çocuk',
    kelimeler: ['çocuk yanık','pediyatrik yanık','bebek yanık'] },
  { key: 'zehir',              grup: 'Çocuk',
    kelimeler: ['çocuk zehirlenme','pediyatrik zehir','bebek zehir'] },
  { key: 'crush',              grup: 'Çocuk',
    kelimeler: ['çocuk crush','çocuk ezilme'] },
];

// ── Menü / Navigasyon Komutları ──
const VOICE_NAV_MAP = [
  { komut: () => showGroup('yetiskin'),  kelimeler: ['yetişkin menü','yetişkin algoritma','yetişkin hasta','yetişkinler'] },
  { komut: () => showGroup('cocuk'),     kelimeler: ['çocuk menü','çocuk algoritma','çocuk hasta','çocuklar','pediyatri'] },
  { komut: () => showChildCalc(),        kelimeler: ['doz hesapla','doz hesaplama','çocuk dozu','ilaç dozu','kilo hesapla'] },
  { komut: () => showGroup('ilaclar'),   kelimeler: ['ilaç tablosu','ilaçlar','ilac','hazırlama tablosu'] },
  { komut: () => showQuizGame(),         kelimeler: ['quiz','soru','oyun','test'] },
  { komut: () => showProcedures(),       kelimeler: ['uygulama','prosedür','video','prosedürler'] },
  { komut: () => showTranslator(),       kelimeler: ['çevirmen','tercüman','çeviri','translate'] },
  { komut: () => clearContent(),         kelimeler: ['geri','ana sayfa','anasayfa','geri dön','kapat'] },
  { komut: () => { document.getElementById('searchInput')?.focus(); }, kelimeler: ['arama','ara','search'] },
  { komut: () => toggleTheme(),          kelimeler: ['karanlık mod','gece modu','tema değiştir','tema'] },
];

// ============================================================
// Ana eşleştirme fonksiyonu
// Daha esnek: tam eşleşme + substring + normalize
// ============================================================
function vcNormalize(str) {
  return str
    .toLowerCase()
    .replace(/[îı]/g, 'i')
    .replace(/[öo]/g, 'o')   // ö → o (konuşmada kaybolabilir)
    .replace(/[üu]/g, 'u')
    .replace(/[şs]/g, 's')
    .replace(/[çc]/g, 'c')
    .replace(/[ğg]/g, 'g')
    .replace(/[âa]/g, 'a')
    .replace(/[ûu]/g, 'u')
    .trim();
}

function vcMatch(command, kelimeler) {
  const cmd = vcNormalize(command);
  return kelimeler.some(k => cmd.includes(vcNormalize(k)));
}

// ============================================================
// Override: processVoiceCommand
// Bu fonksiyon index.html'deki aynı isimli fonksiyonun yerine geçer
// ============================================================
function processVoiceCommand(command) {
  console.log('🎤 Sesli komut alındı:', command);

  const cmd = command.toLowerCase().trim();

  // 1) Algoritma eşleştirme — en uzun eşleşmeyi önceliklendir
  let enIyiEslesme = null;
  let enUzunEslesen = 0;

  for (const entry of VOICE_ALGO_MAP) {
    for (const kelime of entry.kelimeler) {
      if (vcMatch(cmd, [kelime]) && kelime.length > enUzunEslesen) {
        enUzunEslesen = kelime.length;
        enIyiEslesme = entry;
      }
    }
  }

  if (enIyiEslesme) {
    const mesaj = `${enIyiEslesme.grup}: ${enIyiEslesme.key.replace(/_/g,' ')} açılıyor…`;
    showVoiceIndicator(mesaj, false);
    console.log('✅ Algoritma eşleşti:', enIyiEslesme);
    setTimeout(() => {
      // Grubu göster
      if (enIyiEslesme.grup === 'Yetişkin') showGroup('yetiskin');
      else showGroup('cocuk');
      // Algoritma sayfasını aç
      setTimeout(() => {
        showAlgo(enIyiEslesme.key, enIyiEslesme.grup);
        hideVoiceIndicator();
      }, 300);
    }, 400);
    return;
  }

  // 2) Navigasyon komutları
  for (const nav of VOICE_NAV_MAP) {
    if (vcMatch(cmd, nav.kelimeler)) {
      const etiket = nav.kelimeler[0];
      showVoiceIndicator(`${etiket} açılıyor…`, false);
      setTimeout(() => {
        try { nav.komut(); } catch(e) { console.error('Komut hatası:', e); }
        hideVoiceIndicator();
      }, 400);
      return;
    }
  }

  // 3) Tanınamadı — ne söylendiğini göster
  console.warn('⚠️ Tanınamayan komut:', command);
  showVoiceIndicator(`"${command}" — anlaşılamadı, tekrar deneyin.`, true);
  setTimeout(hideVoiceIndicator, 3000);
}

// ============================================================
// Override: toggleVoiceCommand
// Mobil uyumlu, her seferinde temiz başlatma
// ============================================================
function toggleVoiceCommand() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

  // iOS PWA kontrolü — navigator.standalone Safari'de de true döner, güvenilir değil
  const iosPwa = (/iPhone|iPad|iPod/i.test(navigator.userAgent))
    && window.matchMedia('(display-mode: standalone)').matches;

  if (iosPwa) {
    showVoiceIndicator('🍎 PWA modunda ses tanıma çalışmıyor. Safari\'de açın.', true);
    setTimeout(hideVoiceIndicator, 4000);
    return;
  }

  if (!SpeechRec) {
    alert('Tarayıcınız sesli komutu desteklemiyor. Chrome veya Edge kullanın.');
    return;
  }

  // Zaten dinliyorsa durdur
  if (isListening) {
    if (recognition) {
      try { recognition.stop(); } catch(e) {}
    }
    return;
  }

  // Mobilde aynı instance yeniden kullanılınca "already started" hatası çıkar.
  // Her seferinde yeni bir instance oluştur.
  recognition = new SpeechRec();
  recognition.lang            = 'tr-TR';
  recognition.continuous      = false;
  recognition.interimResults  = false;
  recognition.maxAlternatives = 3; // 3 alternatif → daha iyi eşleştirme

  recognition.onstart = function() {
    isListening = true;
    const btn = document.getElementById('voiceBtn');
    if (btn) {
      btn.style.background = 'rgba(220, 38, 38, 0.85)';
      btn.style.transform  = 'scale(1.15)';
      btn.innerHTML        = '🔴';
    }
    showVoiceIndicator('🎤 Dinliyorum… Komut söyleyin', false);
  };

  recognition.onresult = function(event) {
    // maxAlternatives: en iyi 3 aday arasından eşleşen varsa onu kullan
    let bestTranscript = '';
    let bestScore = -1;

    for (let i = 0; i < event.results[0].length; i++) {
      const alt        = event.results[0][i];
      const transcript = alt.transcript.toLowerCase().trim();
      const confidence = alt.confidence || 0;

      // Önce VOICE_ALGO_MAP'te eşleşiyor mu?
      let eslesiyorMu = false;
      for (const entry of VOICE_ALGO_MAP) {
        if (vcMatch(transcript, entry.kelimeler)) { eslesiyorMu = true; break; }
      }
      if (!eslesiyorMu) {
        for (const nav of VOICE_NAV_MAP) {
          if (vcMatch(transcript, nav.kelimeler)) { eslesiyorMu = true; break; }
        }
      }

      // Eşleşen aday varsa ve güven skoru daha yüksekse bunu seç
      if (eslesiyorMu && confidence > bestScore) {
        bestScore      = confidence;
        bestTranscript = transcript;
      }

      // İlk aday en iyi olabilir (confidence = 0 olan da)
      if (i === 0 && bestTranscript === '') {
        bestTranscript = transcript;
      }
    }

    console.log('🎤 Seçilen transkript:', bestTranscript);
    processVoiceCommand(bestTranscript);
  };

  recognition.onend = function() {
    isListening = false;
    const btn = document.getElementById('voiceBtn');
    if (btn) {
      btn.style.background = 'rgba(220, 38, 38, 0.15)';
      btn.style.transform  = 'scale(1)';
      btn.innerHTML        = '🎤';
    }
    hideVoiceIndicator();
  };

  recognition.onerror = function(event) {
    isListening = false;
    const btn = document.getElementById('voiceBtn');
    if (btn) {
      btn.style.background = 'rgba(220, 38, 38, 0.15)';
      btn.style.transform  = 'scale(1)';
      btn.innerHTML        = '🎤';
    }

    if (event.error === 'aborted') { hideVoiceIndicator(); return; }

    const mesajlar = {
      'no-speech':         '🔇 Ses algılanamadı, tekrar deneyin.',
      'not-allowed':       '⚠️ Mikrofon izni gerekli!',
      'permission-denied': '⚠️ Mikrofon izni reddedildi.',
      'network':           '📡 İnternet bağlantısı gerekli.',
      'audio-capture':     '🎤 Mikrofona erişilemiyor.',
      'service-not-allowed':'⚠️ Ses tanıma servisi kullanılamıyor.'
    };
    const msg = mesajlar[event.error] || `Hata: ${event.error}`;
    showVoiceIndicator(msg, true);
    setTimeout(hideVoiceIndicator, 3500);
  };

  try {
    recognition.start();
    console.log('🎤 SpeechRecognition başlatıldı, lang: tr-TR');
  } catch(e) {
    console.error('recognition.start() hatası:', e);
    showVoiceIndicator('Ses tanıma başlatılamadı.', true);
    setTimeout(hideVoiceIndicator, 3000);
  }
}

// ============================================================
// Yardımcı: Komut Listesini Konsola Yaz (debug için)
// ============================================================
window._vcListKomutlar = function() {
  console.group('📋 Sesli Komutlar — Algoritma Listesi');
  VOICE_ALGO_MAP.forEach(e => {
    console.log(`[${e.grup}] ${e.key}: ${e.kelimeler.join(' | ')}`);
  });
  console.groupEnd();
  console.group('📋 Sesli Komutlar — Navigasyon');
  VOICE_NAV_MAP.forEach(n => {
    console.log(n.kelimeler.join(' | '));
  });
  console.groupEnd();
};

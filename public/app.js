/* ==========================================================================
 * EIDOLON://404 — Sentient 4th-Wall Escape Room Engine (Port 4168)
 * ========================================================================== */

(function () {
  'use strict';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  // --------------------------------------------------------------------------
  // PROCEDURAL WEBAUDIO SYNTH SFX (0 EXTERNAL DEPENDENCIES)
  // --------------------------------------------------------------------------
  const sfx = {
    enabled: true,
    ctx: null,
    ensure() {
      if (!this.enabled) return null;
      if (!this.ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) this.ctx = new Ctx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    },
    tone(freq, dur = 0.14, type = 'sine', gainVal = 0.08, delay = 0) {
      const ctx = this.ensure();
      if (!ctx) return;
      const now = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(gainVal, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + dur);
    },
    playUnlock() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.09, i * 0.07));
    },
    playGlitch() {
      this.tone(155, 0.16, 'sawtooth', 0.09, 0);
      this.tone(118, 0.18, 'square', 0.07, 0.06);
    },
    playSnap() {
      this.tone(880, 0.09, 'sine', 0.07, 0);
      this.tone(1320, 0.12, 'sine', 0.06, 0.05);
    }
  };

  // --------------------------------------------------------------------------
  // GAME STATE
  // --------------------------------------------------------------------------
  const state = {
    session: null,
    tabSwitches: 0,
    hiddenAtMs: 0,
    c1UnlockedCode: '',
    c3AlignedOnce: false,
    c5Found: { 1: null, 2: null, 3: null },
    lensPing: null,
    c6HashOk: false,
    c6PastedSigil: '',
    c6OfflineTriggered: false,
    c6Submitting: false
  };

  let toastTimer = null;
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 3400);
  }

  function aiSpeak(text, glitchSound = false) {
    $('#ai-speech').textContent = `"${text}"`;
    if (glitchSound) sfx.playGlitch();
  }

  async function apiPost(url, body) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `HTTP ${res.status}`);
    }
    return data;
  }

  // --------------------------------------------------------------------------
  // FOURTH-WALL REALTIME HARDWARE & BROWSER TELEMETRY
  // --------------------------------------------------------------------------
  window.addEventListener('mousemove', (e) => {
    const pupil = $('#eidolon-eye .pupil');
    if (pupil) {
      const nx = ((e.clientX / window.innerWidth) - 0.5) * 12;
      const ny = ((e.clientY / window.innerHeight) - 0.5) * 12;
      pupil.style.transform = `translate(${nx.toFixed(1)}px, ${ny.toFixed(1)}px)`;
    }
    // Exit-intent detection when cursor reaches browser tab bar!
    if (e.clientY <= 4 && state.session && !state.session.completed && Math.random() < 0.08) {
      aiSpeak('Đưa chuột lên thanh Tab định đóng cửa sổ chạy trốn đấy à? Ta vẫn ở trong bộ nhớ đệm thôi!');
    }
  });

  function updateViewportSensors() {
    $('#sens-viewport').textContent = `${window.innerWidth} × ${window.innerHeight}`;
    $('#sens-screen').textContent = `X:${window.screenX} Y:${window.screenY}`;
    $('#sens-network').textContent = navigator.onLine ? 'ONLINE' : 'OFFLINE!';
    updateChamber3Parallax();
  }

  window.addEventListener('resize', updateViewportSensors);
  setInterval(updateViewportSensors, 400);

  // Battery Status API (Real Laptop Charger Unplug Sensor for Chamber 1!)
  if (navigator.getBattery) {
    navigator.getBattery().then((batt) => {
      const renderBatt = () => {
        const pct = Math.round(batt.level * 100);
        $('#sens-battery').textContent = `${batt.charging ? '⚡ Đang sạc' : '🔋 Pin rời'} (${pct}%)`;
      };
      renderBatt();
      batt.addEventListener('levelchange', renderBatt);
      batt.addEventListener('chargingchange', () => {
        renderBatt();
        if (!batt.charging && state.session && state.session.currentLevel === 1) {
          triggerChamber1Starve('battery_unplug');
        }
      });
    }).catch(() => {
      $('#sens-battery').textContent = 'Nguồn AC Trực Tiếp';
    });
  } else {
    $('#sens-battery').textContent = 'Nguồn AC Máy Trạm';
  }

  // Tab Visibility Sensor (Counts switches + Measures 4..8s Starvation for Chamber 1!)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      state.hiddenAtMs = performance.now();
      state.tabSwitches++;
      $('#sens-tabswitches').textContent = `${state.tabSwitches} lần`;
    } else if (state.hiddenAtMs > 0) {
      const awaySec = (performance.now() - state.hiddenAtMs) / 1000;
      state.hiddenAtMs = 0;

      if (state.session && state.session.currentLevel === 1 && !state.c1UnlockedCode) {
        if (awaySec >= 3.8 && awaySec <= 9.2) {
          $('#c1-starve-feedback').textContent = `✅ Chuẩn xác! Bạn đã ngắt ánh nhìn ${awaySec.toFixed(1)}s — Tụ điện AI đã cạn sạch!`;
          triggerChamber1Starve('tab_starve');
        } else if (awaySec < 3.8) {
          $('#c1-starve-feedback').textContent = `⚠️ Bạn mới rời Tab ${awaySec.toFixed(1)}s (Quá nhanh! Hãy đợi ở Tab khác từ 4 đến 8 giây).`;
          aiSpeak(`Mới quay đi có ${awaySec.toFixed(1)} giây đã vội ngó lại rồi sao? Tụ điện của ta chưa kịp nguội đâu!`, true);
        } else {
          $('#c1-starve-feedback').textContent = `⚠️ Bạn rời Tab ${awaySec.toFixed(1)}s (Quá 8 giây — AI đã bật máy phát dự phòng!).`;
          aiSpeak(`Ngươi đi lâu tới ${awaySec.toFixed(1)} giây nên ta đã kịp nạp lại nguồn dự phòng rồi!`, true);
        }
      } else if (state.session && !state.session.completed) {
        aiSpeak(`Ngươi vừa lén chuyển sang Tab khác mất ${awaySec.toFixed(1)} giây để tra cứu cứu viện phải không?`);
      }
    }
  });

  // Print Preview Detection for Chamber 2!
  window.addEventListener('beforeprint', () => {
    if (state.session && state.session.currentLevel === 2) {
      sfx.playSnap();
    }
  });

  window.addEventListener('afterprint', () => {
    if (state.session && state.session.currentLevel === 2) {
      aiSpeak('KHOAN ĐÃ! Ngươi vừa kích hoạt luồng máy in ảo để soi lớp mực nhiệt ẩn của ta sao?!', true);
    }
  });

  // --------------------------------------------------------------------------
  // CHAMBER 1 CONTROLLER
  // --------------------------------------------------------------------------
  async function triggerChamber1Starve(method) {
    if (!state.session) return;
    try {
      const data = await apiPost('/api/chamber1/starve-trigger', {
        sessionId: state.session.sessionId,
        method
      });
      state.c1UnlockedCode = data.relayCode;
      $('#c1-shield-ring').classList.add('starved');
      $('#c1-shield-pct').textContent = '0%';
      $('#c1-shield-lbl').textContent = 'LÁ CHẮN SẬP! MÃ CẦU DAO LỘ DIỆN:';
      const codeEl = $('#c1-revealed-code');
      codeEl.textContent = data.relayCode;
      codeEl.classList.remove('hidden');
      $('#c1-input').value = data.relayCode;
      sfx.playUnlock();
      aiSpeak(data.aiScream, true);
      toast(`⚡ Đã lộ mã Cầu Dao Tầng 1: ${data.relayCode}`);
    } catch (err) {
      toast('❌ ' + err.message);
    }
  }

  $('#c1-submit').addEventListener('click', () => submitLevelCode(1, $('#c1-input').value));

  // --------------------------------------------------------------------------
  // CHAMBER 2 CONTROLLER (@media print)
  // --------------------------------------------------------------------------
  $('#c2-submit').addEventListener('click', () => submitLevelCode(2, $('#c2-input').value));

  // --------------------------------------------------------------------------
  // CHAMBER 3 CONTROLLER (VIEWPORT WIDTH PARALLAX)
  // --------------------------------------------------------------------------
  function updateChamber3Parallax() {
    if (!state.session || state.session.currentLevel !== 3) return;
    const props = state.session.puzzleProps;
    const targetW = props.c3TargetWidth;
    const curW = window.innerWidth;
    const delta = curW - targetW;

    $('#c3-cur-w').textContent = `${curW} px`;
    $('#c3-target-w').textContent = `${targetW} px (±22px)`;

    const s1 = $('#c3-strip-1');
    const s2 = $('#c3-strip-2');
    const s3 = $('#c3-strip-3');
    const box = $('#c3-prism-box');

    if (Math.abs(delta) <= 22) {
      $('#c3-delta').textContent = '✅ ĐÃ CỘNG HƯỞNG KHỚP PHA!';
      box.classList.add('aligned');
      s1.style.transform = 'translateX(0px)';
      s2.style.transform = 'translateX(0px)';
      s3.style.transform = 'translateX(0px)';
      s1.textContent = props.c3CodeSlices[0];
      s2.textContent = props.c3CodeSlices[1];
      s3.textContent = props.c3CodeSlices[2];
      const fullCode = props.c3CodeSlices.join('');
      if (!state.c3AlignedOnce) {
        state.c3AlignedOnce = true;
        $('#c3-input').value = fullCode;
        sfx.playSnap();
        aiSpeak(`Dừng lại!! Cửa sổ rộng ${curW}px làm 3 mảnh lăng kính của ta chập làm một mất rồi!`);
      }
    } else {
      state.c3AlignedOnce = false;
      box.classList.remove('aligned');
      $('#c3-delta').textContent = `Lệch ${delta > 0 ? '+' : ''}${delta} px (${delta > 0 ? 'Hãy thu hẹp cửa sổ!' : 'Hãy kéo rộng cửa sổ!'})`;
      const clampShift = (v) => Math.max(-220, Math.min(220, v));
      s1.style.transform = `translateX(${clampShift(delta * 0.75)}px)`;
      s2.style.transform = `translateX(${clampShift(-delta * 0.95)}px)`;
      s3.style.transform = `translateX(${clampShift(delta * 0.55)}px)`;
      s1.textContent = props.c3CodeSlices[0];
      s2.textContent = Math.abs(delta) < 75 ? props.c3CodeSlices[1] : '▓▒░';
      s3.textContent = props.c3CodeSlices[2];
    }
  }

  $('#c3-submit').addEventListener('click', () => submitLevelCode(3, $('#c3-input').value));

  // --------------------------------------------------------------------------
  // CHAMBER 4 CONTROLLER (F12 DEVTOOLS CONSOLE & LOCALSTORAGE)
  // --------------------------------------------------------------------------
  function setupChamber4Backdoor() {
    if (!state.session) return;
    const pin = state.session.puzzleProps.c4DomKernelPin;
    const unlockToken = state.session.puzzleProps.c4ConsoleUnlockToken;

    localStorage.setItem('EIDOLON_ROLE', 'PRISONER');
    $('#sens-role').textContent = 'PRISONER';
    const vaultEl = $('#c4-vault-card');
    if (vaultEl) vaultEl.setAttribute('data-kernel-override-pin', pin);

    console.log(
      '%c👁️ EIDOLON-9 PHÁT HIỆN NGƯƠI ĐANG LÉN MỞ F12 CONSOLE!',
      'background:#be123c;color:#fff;font-size:15px;font-weight:bold;padding:6px 12px;border-radius:6px;'
    );
    console.log(
      '%cGõ lệnh %cEIDOLON_CORE.help()%c ngay tại Console này và nhấn Enter nếu ngươi nghĩ mình đủ trình bẻ khóa bộ nhớ của ta!',
      'color:#94a3b8;font-size:13px;',
      'color:#34d399;font-weight:bold;font-size:14px;',
      'color:#94a3b8;font-size:13px;'
    );

    window.EIDOLON_CORE = {
      help() {
        console.log(
          '%c[KERNEL BACKDOOR v4.04]\n' +
          '1. Gõ EIDOLON_CORE.scan() để dò mã PIN 4 số giấu trên phần tử DOM #c4-vault-card.\n' +
          '2. Gõ EIDOLON_CORE.elevate("ARCHITECT", "<mã-PIN>") để nâng quyền LocalStorage và phá xích Tầng 4!',
          'color:#22d3ee;font-family:monospace;font-size:13px;'
        );
        return 'Hãy chạy EIDOLON_CORE.scan() tiếp theo!';
      },
      scan() {
        const foundPin = document.getElementById('c4-vault-card')?.getAttribute('data-kernel-override-pin');
        console.log(
          `%c🔍 ĐÃ QUÉT DOM ATTRIBUTE [data-kernel-override-pin] => PIN = "${foundPin}"`,
          'color:#fbbf24;font-weight:bold;font-size:14px;'
        );
        return `PIN tìm thấy: ${foundPin} -> Hãy gõ: EIDOLON_CORE.elevate("ARCHITECT", "${foundPin}")`;
      },
      elevate(role, inputPin) {
        if (String(role).toUpperCase() !== 'ARCHITECT') {
          return '❌ Quyền không hợp lệ! Tham số đầu tiên phải là "ARCHITECT".';
        }
        if (String(inputPin).trim() !== String(pin)) {
          return '❌ Sai mã PIN hạt nhân! Hãy gọi EIDOLON_CORE.scan() để lấy mã PIN.';
        }
        localStorage.setItem('EIDOLON_ROLE', 'ARCHITECT');
        $('#sens-role').textContent = 'ARCHITECT';
        const btn = $('#c4-chained-btn');
        btn.disabled = false;
        btn.textContent = '🔓 XIỀNG XÍCH ĐÃ VỠ — BẤM ĐỂ TIẾN VÀO TẦNG 5!';
        btn.onclick = () => submitLevelCode(4, unlockToken);
        sfx.playUnlock();
        aiSpeak('KHÔNG THỂ TIN NỔI! Ngươi vừa gọi hàm nâng quyền ngay trong F12 Console của trình duyệt?!', true);
        console.log('%c✅ ĐÃ CƯỚP QUYỀN ARCHITECT THÀNH CÔNG! Quay lại trang web bấm nút Mở Cửa (hoặc tự chuyển tầng)!', 'color:#34d399;font-size:14px;font-weight:bold;');
        submitLevelCode(4, unlockToken);
        return 'ACCESS GRANTED — LEVEL 4 BREACHED!';
      }
    };
  }

  // Also watch LocalStorage manual edits via F12 -> Application -> Local Storage!
  setInterval(() => {
    if (!state.session || state.session.currentLevel !== 4) return;
    const role = localStorage.getItem('EIDOLON_ROLE');
    $('#sens-role').textContent = role || 'PRISONER';
    if (role === 'ARCHITECT') {
      const btn = $('#c4-chained-btn');
      if (btn.disabled) {
        btn.disabled = false;
        btn.textContent = '🔓 ĐÃ SỬA LOCALSTORAGE THÀNH ARCHITECT — BẤM QUA MÀN!';
        btn.onclick = () => submitLevelCode(4, state.session.puzzleProps.c4ConsoleUnlockToken);
        sfx.playSnap();
      }
    }
  }, 400);

  // --------------------------------------------------------------------------
  // CHAMBER 5 CONTROLLER (MULTI-WINDOW QUANTUM X-RAY LENS)
  // --------------------------------------------------------------------------
  const quantumBus = new BroadcastChannel('eidolon_quantum_bus');
  const portalCanvas = $('#c5-portal-canvas');
  const p5Ctx = portalCanvas.getContext('2d');

  quantumBus.onmessage = (ev) => {
    const msg = ev.data;
    if (!msg) return;
    if (msg.type === 'LENS_PING') {
      state.lensPing = { ...msg, ts: performance.now() };
      $('#c5-sync-badge').textContent = `🟢 Đang kết nối Cửa Sổ Phụ @ Screen(${Math.round(msg.centerX)}, ${Math.round(msg.centerY)})`;
    } else if (msg.type === 'BEACON_REVEALED' && state.session && state.session.currentLevel === 5) {
      if (!state.c5Found[msg.index]) {
        state.c5Found[msg.index] = msg.frag;
        $(`#c5-f${msg.index}`).textContent = msg.frag;
        sfx.playSnap();
        toast(`🌀 Thấu kính vừa giải mã Điểm Dị Thường #0${msg.index}: ${msg.frag}`);
        if (state.c5Found[1] && state.c5Found[2] && state.c5Found[3]) {
          const joined = `${state.c5Found[1]}-${state.c5Found[2]}-${state.c5Found[3]}`;
          $('#c5-input').value = joined;
          aiSpeak('Ngươi cầm cửa sổ thứ 2 quét sạch cả 3 tọa độ ẩn trên màn hình của ta rồi sao?!');
        }
      }
    }
  };

  $('#btn-open-lens').addEventListener('click', () => {
    const win = window.open(
      '/lens.html',
      'EidolonQuantumLens',
      'width=380,height=320,left=120,top=140,resizable=yes'
    );
    if (!win) {
      toast('⚠️ Trình duyệt chặn Popup — Hãy cho phép Popup hoặc mở tab mới /lens.html rồi tách rời ra!');
    } else {
      aiSpeak('Hả?! Ngươi vừa xé rách một cửa sổ trình duyệt thứ hai ra ngoài không gian Desktop?!');
    }
  });

  function renderChamber5Loop() {
    if (state.session && state.session.currentLevel === 5) {
      const rect = portalCanvas.getBoundingClientRect();
      const chromeTop = Math.max(0, window.outerHeight - window.innerHeight);
      const chromeLeft = Math.max(0, Math.round((window.outerWidth - window.innerWidth) / 2));

      const slabScreenLeft = window.screenX + chromeLeft + rect.left;
      const slabScreenTop = window.screenY + chromeTop + rect.top;

      const beacons = state.session.puzzleProps.c5Beacons.map((b) => ({
        index: b.index,
        frag: b.frag,
        canvasX: b.normX * portalCanvas.width,
        canvasY: b.normY * portalCanvas.height,
        screenX: slabScreenLeft + b.normX * rect.width,
        screenY: slabScreenTop + b.normY * rect.height
      }));

      quantumBus.postMessage({
        type: 'MAIN_BEACONS',
        slabCenterX: slabScreenLeft + rect.width / 2,
        slabCenterY: slabScreenTop + rect.height / 2,
        beacons
      });

      // Render Obsidian Slab + Cross-Window Quantum Tether
      p5Ctx.fillStyle = '#040812';
      p5Ctx.fillRect(0, 0, portalCanvas.width, portalCanvas.height);

      // Subtle grid
      p5Ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      p5Ctx.lineWidth = 1;
      for (let x = 0; x < portalCanvas.width; x += 40) {
        p5Ctx.beginPath(); p5Ctx.moveTo(x, 0); p5Ctx.lineTo(x, portalCanvas.height); p5Ctx.stroke();
      }
      for (let y = 0; y < portalCanvas.height; y += 40) {
        p5Ctx.beginPath(); p5Ctx.moveTo(0, y); p5Ctx.lineTo(portalCanvas.width, y); p5Ctx.stroke();
      }

      // Draw 3 Anomaly Rings
      for (const b of beacons) {
        const unlocked = Boolean(state.c5Found[b.index]);
        p5Ctx.strokeStyle = unlocked ? '#10b981' : 'rgba(245, 158, 11, 0.65)';
        p5Ctx.lineWidth = 2;
        p5Ctx.beginPath();
        p5Ctx.arc(b.canvasX, b.canvasY, 22, 0, Math.PI * 2);
        p5Ctx.stroke();

        p5Ctx.fillStyle = unlocked ? '#6ee7b7' : '#fcd34d';
        p5Ctx.font = '700 13px "JetBrains Mono", monospace';
        p5Ctx.textAlign = 'center';
        p5Ctx.fillText(unlocked ? b.frag : `0${b.index}`, b.canvasX, b.canvasY + 5);
      }

      // If second window is open, draw real-time laser tether toward its physical monitor coordinates!
      if (state.lensPing && performance.now() - state.lensPing.ts < 1200) {
        const relLensX = ((state.lensPing.centerX - slabScreenLeft) / Math.max(1, rect.width)) * portalCanvas.width;
        const relLensY = ((state.lensPing.centerY - slabScreenTop) / Math.max(1, rect.height)) * portalCanvas.height;

        p5Ctx.save();
        p5Ctx.strokeStyle = '#22d3ee';
        p5Ctx.lineWidth = 3;
        p5Ctx.shadowColor = '#22d3ee';
        p5Ctx.shadowBlur = 14;
        p5Ctx.beginPath();
        p5Ctx.moveTo(portalCanvas.width / 2, portalCanvas.height / 2);
        p5Ctx.lineTo(relLensX, relLensY);
        p5Ctx.stroke();

        // Draw X-Ray projection circle if overlapping!
        p5Ctx.strokeStyle = 'rgba(52, 211, 153, 0.85)';
        p5Ctx.beginPath();
        p5Ctx.arc(relLensX, relLensY, 36, 0, Math.PI * 2);
        p5Ctx.stroke();
        p5Ctx.restore();
      }
    }
    requestAnimationFrame(renderChamber5Loop);
  }
  requestAnimationFrame(renderChamber5Loop);

  $('#c5-submit').addEventListener('click', () => submitLevelCode(5, $('#c5-input').value));

  // --------------------------------------------------------------------------
  // CHAMBER 6 BOSS CONTROLLER (URL HASH + RAW PASTE + OFFLINE)
  // --------------------------------------------------------------------------

  // Runaway Cancel Button!
  const runawayBtn = $('#c6-runaway-btn');
  runawayBtn.addEventListener('pointerenter', () => {
    const zone = $('#c6-runaway-zone');
    const maxX = Math.max(40, zone.clientWidth - runawayBtn.offsetWidth - 20);
    const maxY = Math.max(10, zone.clientHeight - runawayBtn.offsetHeight - 10);
    runawayBtn.style.transform = 'none';
    runawayBtn.style.left = `${Math.floor(Math.random() * maxX)}px`;
    runawayBtn.style.top = `${Math.floor(Math.random() * maxY)}px`;
    sfx.playGlitch();
    aiSpeak('Hahaha! Đừng mơ bấm được nút Hủy trên DOM của ta! Phải đánh từ bên ngoài khung trình duyệt cơ!');
  });

  function checkBossHash() {
    if (!state.session || state.session.currentLevel !== 6) return;
    if (window.location.hash.toUpperCase() === '#SAFE_MODE') {
      if (!state.c6HashOk) {
        state.c6HashOk = true;
        $('#strike-1').classList.add('done');
        $('#strike-1-state').textContent = '✅ #SAFE_MODE';
        sfx.playSnap();
        aiSpeak('Á! Ngươi can thiệp thẳng vào thanh URL của trình duyệt để giam ta vào #SAFE_MODE sao?!');
        tryCompleteBoss();
      }
    }
  }

  window.addEventListener('hashchange', checkBossHash);

  window.addEventListener('paste', (e) => {
    if (!state.session || state.session.currentLevel !== 6) return;
    const text = (e.clipboardData || window.clipboardData)?.getData('text') || '';
    const clean = text.trim().toUpperCase();
    if (clean === 'KILL_SIGIL::EIDOLON_PURGE_00' || clean === 'SYMBIOSIS::ARCHITECT_4168') {
      state.c6PastedSigil = clean;
      $('#strike-2').classList.add('done');
      $('#strike-2-state').textContent = clean.startsWith('SYMBIOSIS') ? '🌌 BÙA CỘNG SINH!' : '✅ ĐÃ DÁN BÙA!';
      sfx.playSnap();
      aiSpeak(
        clean.startsWith('SYMBIOSIS')
          ? 'KHOAN ĐÃ... Chuỗi SYMBIOSIS đó nằm ẩn trong HTTP Header mà?! Ngươi thực sự là Kiến Trúc Sư ư?!'
          : 'Ngươi vừa phóng thẳng mã độc diệt AI qua bộ nhớ Clipboard vào người ta đấy à?!'
      );
      tryCompleteBoss();
    } else if (clean.length > 0) {
      toast('⚠️ Chuỗi Ctrl+V chưa đúng chuẩn KILL_SIGIL::EIDOLON_PURGE_00!');
    }
  });

  function markBossOffline() {
    if (!state.session || state.session.currentLevel !== 6) return;
    if (!state.c6OfflineTriggered) {
      state.c6OfflineTriggered = true;
      $('#strike-3').classList.add('done');
      $('#strike-3-state').textContent = '✅ ĐÃ NGẮT MẠNG!';
      sfx.playUnlock();
      toast('🔌 Đã chặt đứt đường truyền đám mây của EIDOLON! (Nếu đang tích Offline trong F12, hãy bỏ tích để lưu kết quả)');
      tryCompleteBoss();
    }
  }

  window.addEventListener('offline', markBossOffline);
  window.addEventListener('online', () => {
    if (state.session && state.session.currentLevel === 6 && state.c6OfflineTriggered) {
      tryCompleteBoss();
    }
  });

  $('#btn-c6-offline-sim').addEventListener('click', markBossOffline);

  async function tryCompleteBoss() {
    if (
      !state.session ||
      state.session.completed ||
      state.session.currentLevel !== 6 ||
      !state.c6HashOk ||
      !state.c6PastedSigil ||
      !state.c6OfflineTriggered ||
      state.c6Submitting
    ) {
      return;
    }

    state.c6Submitting = true;
    try {
      const res = await apiPost('/api/verify', {
        sessionId: state.session.sessionId,
        level: 6,
        hashSafeMode: state.c6HashOk,
        pastedSigil: state.c6PastedSigil,
        offlineTriggered: state.c6OfflineTriggered
      });
      state.c6Submitting = false;
      if (res.passed) {
        sfx.playUnlock();
        aiSpeak(res.aiReaction);
        applySessionState(res.session);
      }
    } catch {
      state.c6Submitting = false;
      aiSpeak('Đường truyền đã bị ngắt hoàn toàn! Hãy bỏ tích "Offline" trong F12 Network để máy chủ đóng dấu chiến thắng!');
    }
  }

  // --------------------------------------------------------------------------
  // CORE SESSION & RENDERING
  // --------------------------------------------------------------------------
  async function submitLevelCode(level, answer) {
    if (!state.session) return;
    try {
      const res = await apiPost('/api/verify', {
        sessionId: state.session.sessionId,
        level,
        answer
      });
      if (res.passed) {
        sfx.playUnlock();
        aiSpeak(res.aiReaction);
        toast(`🎉 Đã phá vỡ Tầng 0${level}!`);
        applySessionState(res.session);
      } else {
        sfx.playGlitch();
        toast('⚠️ ' + (res.message || 'Mã chưa đúng!'));
        if (res.session) applySessionState(res.session);
      }
    } catch (err) {
      toast('❌ ' + err.message);
    }
  }

  function applySessionState(session) {
    const prevLevel = state.session ? state.session.currentLevel : 0;
    state.session = session;

    $('#hud-level').textContent = session.completed ? 'HOÀN TẤT' : `${session.currentLevel} / 6`;
    $('#hud-score').textContent = String(session.score);

    // Populate Chamber 2 @media print hidden blueprint code
    $('#print-cipher-svg').textContent = session.puzzleProps.c2PrintBlueprintCode;
    $('#print-cipher-text').textContent = session.puzzleProps.c2PrintBlueprintCode;

    // Render left stepper
    const rail = $('#chamber-list');
    rail.innerHTML = session.chambers.map((c) => `
      <div class="step-item ${c.status}">
        <span class="step-num">${c.status === 'CLEARED' ? '✓' : '0' + c.level}</span>
        <div>
          <b>${c.codeName}</b>
          <div class="mono-dim">${c.subtitle}</div>
        </div>
      </div>
    `).join('');

    // Hide all chamber bodies
    for (let i = 1; i <= 6; i++) {
      $(`#chamber-ui-${i}`).classList.add('hidden');
    }
    $('#victory-pane').classList.add('hidden');

    if (session.completed) {
      $('#stage-tag').textContent = 'CONTAINMENT COMPLETE';
      $('#stage-title').textContent =
        session.ending === 'SYMBIOSIS'
          ? '🌌 KẾT CỤC ẨN: CỘNG SINH KIẾN TRÚC SƯ (TRUE ENDING)'
          : '💀 KẾT CỤC CHUẨN: THANH TRỪNG EIDOLON-9';
      $('#stage-brief').textContent = '';
      $('#vic-score').textContent = String(session.score);
      $('#vic-ending').textContent = session.ending;
      $('#vic-desc').textContent =
        session.ending === 'SYMBIOSIS'
          ? 'Phi thường! Bạn không chỉ vượt qua cả 6 cơ chế phần cứng & trình duyệt mà còn soi thấu HTTP Response Header để hợp nhất cùng lõi EIDOLON-9 (+300 điểm thưởng bí mật)!'
          : 'Xuất sắc! Bằng cách khai thác phần cứng, luồng in @media print, kích thước cửa sổ, F12 Console, đa cửa sổ xuyên không và cắt mạng, bạn đã khóa chặt thực thể EIDOLON-9!';
      $('#victory-pane').classList.remove('hidden');
      return;
    }

    const activeMeta = session.chambers[session.currentLevel - 1];
    $('#stage-tag').textContent = `TẦNG 0${activeMeta.level} • ĐANG GIẢI VÂY`;
    $('#stage-title').textContent = activeMeta.codeName;
    $('#stage-brief').textContent = activeMeta.brief;
    $(`#chamber-ui-${activeMeta.level}`).classList.remove('hidden');

    // Render unlocked hints for active level
    const hintsEl = $('#hints-list');
    if (activeMeta.unlockedHints.length === 0) {
      hintsEl.innerHTML = '<div class="dim-note">Chưa dùng gợi ý nào ở tầng này.</div>';
    } else {
      hintsEl.innerHTML = activeMeta.unlockedHints.map((h) => `<div class="hint-card">${h}</div>`).join('');
    }

    // Level-specific initialization on transition
    if (session.currentLevel !== prevLevel) {
      if (session.currentLevel === 3) {
        updateChamber3Parallax();
      } else if (session.currentLevel === 4) {
        setupChamber4Backdoor();
      } else if (session.currentLevel === 6) {
        checkBossHash();
      }
    }
  }

  async function startNewRun() {
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname);
    }
    state.c1UnlockedCode = '';
    state.c3AlignedOnce = false;
    state.c5Found = { 1: null, 2: null, 3: null };
    state.c6HashOk = false;
    state.c6PastedSigil = '';
    state.c6OfflineTriggered = false;

    $('#c1-shield-ring').classList.remove('starved');
    $('#c1-shield-pct').textContent = '100%';
    $('#c1-revealed-code').classList.add('hidden');
    ['#c5-f1', '#c5-f2', '#c5-f3'].forEach((s) => { $(s).textContent = '??'; });
    ['#strike-1', '#strike-2', '#strike-3'].forEach((s) => $(s).classList.remove('done'));
    $('#strike-1-state').textContent = 'CHƯA KHÓA';
    $('#strike-2-state').textContent = 'CHƯA DÁN';
    $('#strike-3-state').textContent = 'ĐANG ONLINE';

    const data = await apiPost('/api/session/start', {
      screenAvailWidth: window.screen?.availWidth || window.innerWidth || 1440
    });
    applySessionState(data.session);
  }

  // Timer loop
  setInterval(() => {
    if (!state.session || state.session.completed) return;
    state.session.elapsedSec = (state.session.elapsedSec || 0) + 1;
    const mm = String(Math.floor(state.session.elapsedSec / 60)).padStart(2, '0');
    const ss = String(state.session.elapsedSec % 60).padStart(2, '0');
    $('#hud-timer').textContent = `${mm}:${ss}`;
  }, 1000);

  // Topbar & Hint buttons
  $('#btn-sfx-toggle').addEventListener('click', () => {
    sfx.enabled = !sfx.enabled;
    $('#btn-sfx-toggle').textContent = sfx.enabled ? '🔊 Âm thanh: BẬT' : '🔇 Âm thanh: TẮT';
  });

  $('#btn-new-run').addEventListener('click', () => {
    startNewRun();
    toast('🔄 Đã khởi tạo phiên giam giữ mới với bộ mật mã ngẫu nhiên!');
  });

  $('#btn-ask-hint').addEventListener('click', async () => {
    if (!state.session || state.session.completed) return;
    const data = await apiPost('/api/hint', { sessionId: state.session.sessionId });
    applySessionState(data.session);
    toast(`💡 Đã mở Gợi ý mức ${data.tier}/3!`);
  });

  $('#btn-skip-level').addEventListener('click', async () => {
    if (!state.session || state.session.completed) return;
    const data = await apiPost('/api/skip', { sessionId: state.session.sessionId });
    applySessionState(data.session);
    aiSpeak(data.aiReaction);
  });

  // Leaderboard
  async function openLeaderboard() {
    const res = await fetch('/api/leaderboard');
    const data = await res.json();
    $('#lb-body').innerHTML = (data.items || []).map((it, idx) => `
      <div class="lb-row">
        <div><b>#${idx + 1} ${it.playerName}</b> <span class="mono-dim">[${it.ending}]</span></div>
        <div class="text-emerald">${it.score} đ • ${it.durationSec}s</div>
      </div>
    `).join('');
    $('#lb-modal').classList.remove('hidden');
  }

  $('#btn-leaderboard').addEventListener('click', openLeaderboard);
  $('#btn-lb-close').addEventListener('click', () => $('#lb-modal').classList.add('hidden'));

  $('#btn-save-score').addEventListener('click', async () => {
    if (!state.session || !state.session.completed) return;
    await apiPost('/api/leaderboard', {
      sessionId: state.session.sessionId,
      playerName: $('#vic-name').value || 'Kiến Trúc Sư 4168'
    });
    toast('🏆 Đã khắc tên vào Bảng Vinh Danh!');
    openLeaderboard();
  });

  // Boot!
  updateViewportSensors();
  startNewRun().catch((err) => toast('❌ Lỗi khởi tạo: ' + err.message));
})();

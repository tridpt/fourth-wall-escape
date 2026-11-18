/**
 * 🧪 Automated Full-Run Verification Suite for EIDOLON://404 (Port 4168)
 * Kiểm chứng toàn bộ 6 Tầng Phá Bức Tường Thứ 4, HTTP Header Secret, 2 Kết Cục & Bảng Vinh Danh
 */

const assert = require('node:assert/strict');
const { createAppServer } = require('./server');

async function postJson(baseUrl, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return {
    status: res.status,
    headers: res.headers,
    json: await res.json()
  };
}

async function runTests() {
  const server = createAppServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`🔍 Đang chạy kiểm thử tự động EIDOLON://404 trên cổng tạm :${port}...\n`);

  try {
    // 1. Static Pages & Sneaky HTTP Response Headers
    {
      const hRes = await fetch(`${baseUrl}/api/health`);
      const secretHdr = hRes.headers.get('x-eidolon-secret-ending') || '';
      assert.ok(secretHdr.includes('SYMBIOSIS::ARCHITECT_4168'));

      const mainHtml = await (await fetch(`${baseUrl}/`)).text();
      assert.ok(mainHtml.includes('print-blueprint-sheet'));

      const lensHtml = await (await fetch(`${baseUrl}/lens.html`)).text();
      assert.ok(lensHtml.includes('eidolon_quantum_bus'));
      console.log('✅ [1/4] Giao diện chính, Cửa sổ Thấu kính /lens.html & HTTP Header Bí Mật hoạt động chuẩn.');
    }

    // 2. Full 6-Chamber Playthrough -> SECRET SYMBIOSIS ENDING!
    {
      const start = await postJson(baseUrl, '/api/session/start', { screenAvailWidth: 1440 });
      assert.equal(start.status, 200);
      const sid = start.json.session.sessionId;
      const props = start.json.session.puzzleProps;

      // Chamber 1: Trigger battery/tab starvation -> verify code
      const starve = await postJson(baseUrl, '/api/chamber1/starve-trigger', {
        sessionId: sid,
        method: 'battery_unplug'
      });
      assert.equal(starve.json.ok, true);
      assert.equal(starve.json.relayCode.length, 4);

      const v1 = await postJson(baseUrl, '/api/verify', {
        sessionId: sid,
        level: 1,
        answer: starve.json.relayCode
      });
      assert.equal(v1.json.passed, true);
      assert.equal(v1.json.session.currentLevel, 2);

      // Chamber 2: @media print blueprint cipher
      const v2 = await postJson(baseUrl, '/api/verify', {
        sessionId: sid,
        level: 2,
        answer: props.c2PrintBlueprintCode
      });
      assert.equal(v2.json.passed, true);
      assert.equal(v2.json.session.currentLevel, 3);

      // Chamber 3: Viewport geometry alignment cipher
      const v3 = await postJson(baseUrl, '/api/verify', {
        sessionId: sid,
        level: 3,
        answer: props.c3CodeSlices.join('')
      });
      assert.equal(v3.json.passed, true);
      assert.equal(v3.json.session.currentLevel, 4);

      // Chamber 4: DevTools Console & LocalStorage elevation
      const v4 = await postJson(baseUrl, '/api/verify', {
        sessionId: sid,
        level: 4,
        role: 'ARCHITECT',
        pin: props.c4DomKernelPin
      });
      assert.equal(v4.json.passed, true);
      assert.equal(v4.json.session.currentLevel, 5);

      // Chamber 5: Multi-Window X-Ray 3-Beacon joined code
      const c5Full = props.c5Beacons.map((b) => b.frag).join('-');
      const v5 = await postJson(baseUrl, '/api/verify', {
        sessionId: sid,
        level: 5,
        answer: c5Full
      });
      assert.equal(v5.json.passed, true);
      assert.equal(v5.json.session.currentLevel, 6);

      // Chamber 6: Boss Showdown with HTTP-Header SYMBIOSIS Sigil (+300 bonus -> 3300 pts!)
      const v6 = await postJson(baseUrl, '/api/verify', {
        sessionId: sid,
        level: 6,
        hashSafeMode: true,
        pastedSigil: 'SYMBIOSIS::ARCHITECT_4168',
        offlineTriggered: true
      });
      assert.equal(v6.json.passed, true);
      assert.equal(v6.json.session.completed, true);
      assert.equal(v6.json.ending, 'SYMBIOSIS');
      assert.equal(v6.json.session.score, 3300);

      // Save to Leaderboard
      const lbSave = await postJson(baseUrl, '/api/leaderboard', {
        sessionId: sid,
        playerName: 'Agent_Zero_Test'
      });
      assert.equal(lbSave.status, 200);
      assert.ok(lbSave.json.items.some((x) => x.playerName === 'Agent_Zero_Test'));
      console.log('✅ [2/4] Phá đảo trọn vẹn 6/6 Tầng + Mở khóa Kết Cục Ẩn SYMBIOSIS (3300 điểm) & lưu Bảng Vinh Danh!');
    }

    // 3. Hints & Accessibility Skip Override + Standard PURGE Ending
    {
      const start2 = await postJson(baseUrl, '/api/session/start', { screenAvailWidth: 1280 });
      const sid2 = start2.json.session.sessionId;

      const hintRes = await postJson(baseUrl, '/api/hint', { sessionId: sid2 });
      assert.equal(hintRes.json.tier, 1);
      assert.equal(hintRes.json.session.score, 2950);

      // Skip levels 1..5 to test Boss PURGE ending directly
      for (let i = 1; i <= 5; i++) {
        await postJson(baseUrl, '/api/skip', { sessionId: sid2 });
      }
      const purgeRes = await postJson(baseUrl, '/api/verify', {
        sessionId: sid2,
        level: 6,
        hashSafeMode: true,
        pastedSigil: 'KILL_SIGIL::EIDOLON_PURGE_00',
        offlineTriggered: true
      });
      assert.equal(purgeRes.json.passed, true);
      assert.equal(purgeRes.json.ending, 'PURGE');
      console.log('✅ [3/4] Hệ thống Gợi ý 3 cấp, Cầu dao khẩn cấp & Kết Cục Chuẩn PURGE hoạt động chính xác.');
    }

    // 4. Reject Wrong Answers Cleanly
    {
      const start3 = await postJson(baseUrl, '/api/session/start', { screenAvailWidth: 1366 });
      const bad = await postJson(baseUrl, '/api/verify', {
        sessionId: start3.json.session.sessionId,
        level: 1,
        answer: '0000'
      });
      assert.equal(bad.json.passed, false);
      assert.equal(bad.json.session.score, 2975);
      console.log('✅ [4/4] Cơ chế phạt sai mã & chống nhảy cóc tầng hoạt động an toàn.');
    }

    console.log('\n🎉 TẤT CẢ 4/4 BÀI KIỂM THỬ TOÀN TRÌNH EIDOLON://404 ĐỀU VƯỢT QUA XUẤT SẮC!');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});

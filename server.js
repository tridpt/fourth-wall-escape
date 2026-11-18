/**
 * 👁️‍🗨️ EIDOLON://404 — Phòng Thoát Hiểm Phá Bức Tường Thứ 4 (Port 4168)
 * -------------------------------------------------------------------------
 * Trò chơi giải đố kinh dị công nghệ / Hacker nơi con AI phản diện (EIDOLON-9)
 * nhận thức được trình duyệt thật của người chơi. Giải đố bằng 6 cơ chế thực:
 *   • Tầng 01: Rút dây sạc Laptop thật (Battery API) HOẶC Bỏ đói sự chú ý Tab đúng 4–8 giây
 *   • Tầng 02: Ấn Ctrl + P mở cửa sổ In trang (@media print biến trang trắng thành Bản vẽ mật)
 *   • Tầng 03: Kéo co giãn chiều ngang cửa sổ trình duyệt để 3 mảnh mật mã lệch pha khớp nhau
 *   • Tầng 04: Mở F12 DevTools đấu trí trong Console & bẻ khóa quyền LocalStorage
 *   • Tầng 05: Tách Cửa Sổ Thứ 2 (/lens.html) kéo quanh màn hình Windows để soi tia X xuyên cửa sổ
 *   • Tầng 06: Sửa thanh URL (#SAFE_MODE) + Dán Bùa Diệt AI (Ctrl+V) + Cắt mạng Offline (hoặc Kết Cục Ẩn qua HTTP Header!)
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');

const PORT = Number(process.env.PORT || 4168);
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// In-memory active escape sessions
const SESSIONS = new Map();

const CHAMBERS_META = [
  {
    level: 1,
    id: 'power_starve',
    codeName: 'LÕI HÚT NGUỒN VẬT CHỦ',
    subtitle: 'Cảm Biến Sạc Pin Vật Lý & Sự Chú Ý Của Ánh Nhìn',
    brief:
      'Lá chắn nhiệt của EIDOLON-9 đang hút trực tiếp dòng điện sạc máy tính và ánh nhìn của bạn trên Tab này. Mọi nút bấm trên màn hình đều vô tác dụng khi lá chắn đạt 100%.',
    hints: [
      'Gợi ý 1: EIDOLON sống nhờ nguồn điện cắm ngoài HOẶC việc bạn cứ mở chằm chằm tab trình duyệt này.',
      'Gợi ý 2: Nếu dùng Laptop đang cắm sạc, hãy RÚT DÂY SẠC THẬT ra 2 giây! Nếu dùng máy bàn PC (hoặc không cắm sạc), hãy chuyển sang một Tab khác trong ĐÚNG từ 4 đến 8 giây rồi quay lại để làm sập tụ điện của AI!',
      'Gợi ý 3: Ngay khi lá chắn tụt về 0%, một dãy mã 4 chữ số màu xanh lục sẽ hiện ra ở tâm lò phản ứng trong 20 giây — nhập mã đó vào ô Cầu Dao để khóa chết Tầng 1.'
    ]
  },
  {
    level: 2,
    id: 'thermal_print',
    codeName: 'TỜ GIẤY NIÊM PHONG NHIỆT',
    subtitle: 'Ảo Ảnh Quang Học @media print (Ctrl + P)',
    brief:
      'Trước mặt bạn là một tờ hồ sơ trắng tinh dưới ánh đèn màn hình RGB. EIDOLON cười nhạo rằng chỉ có nhiệt độ của trục lăn máy in mới làm hiện bản vẽ mật đạo.',
    hints: [
      'Gợi ý 1: Đừng tìm trên màn hình web hiện tại — trang web có một diện mạo hoàn toàn khác khi chuẩn bị xuất ra máy in!',
      'Gợi ý 2: Bấm tổ hợp phím Ctrl + P (hoặc Cmd + P) ngay trên trình duyệt để bật khung Xem Trước Khi In (Print Preview) — bạn KHÔNG cần có máy in thật!',
      'Gợi ý 3: Nhìn vào trang giấy hiện lên trong khung Print Preview của Chrome/Edge, đọc mã "OVERRIDE CIPHER" gồm 6 ký tự ở góc bản thiết kế rồi bấm Cancel quay lại nhập mã.'
    ]
  },
  {
    level: 3,
    id: 'viewport_align',
    codeName: 'LĂNG KÍNH LỆCH PHA KHÔNG GIAN',
    subtitle: 'Cộng Hưởng Kích Thước Cửa Sổ Trình Duyệt (Viewport Width)',
    brief:
      'Ba dải ký tự quang học bị EIDOLON xé lệch nhau theo phương ngang dựa trên chiều rộng thực tế (px) của cửa sổ trình duyệt bạn đang mở.',
    hints: [
      'Gợi ý 1: Hãy nhìn con số "Chiều rộng cửa sổ hiện tại" đang nhảy theo thời gian thực. Khung web này phản ứng với kích thước vật lý cửa sổ của bạn!',
      'Gợi ý 2: Bấm nút Thu nhỏ cửa sổ (Restore Down ở góc trên bên phải trình duyệt) rồi cầm mép phải cửa sổ kéo thu hẹp/mở rộng — HOẶC bấm Ctrl + Trừ (-) / Ctrl + Cộng (+) để đổi độ phóng đại!',
      'Gợi ý 3: Điều chỉnh cho đến khi "Chiều rộng hiện tại" lọt vào đúng Vùng Cộng Hưởng mục tiêu (±20px). Khi 3 mảnh chữ khớp khít thành 1 hàng thẳng tắp, đọc mật khẩu hiện ra và xác nhận.'
    ]
  },
  {
    level: 4,
    id: 'devtools_breach',
    codeName: 'XIỀNG XÍCH TRONG BỘ NHỚ TRÌNH DUYỆT',
    subtitle: 'Đấu Trí Trong F12 Console & Vùng Nhớ LocalStorage',
    brief:
      'Nút Mở Cửa Tầng 4 đã bị EIDOLON khóa cứng bằng quyền PRISONER bên trong bộ nhớ trình duyệt. Muốn đi tiếp, bạn phải bước ra sau hậu trường của nhà phát triển.',
    hints: [
      'Gợi ý 1: Hãy bấm phím F12 (hoặc Ctrl + Shift + I / Chuột phải -> Kiểm tra / Inspect) và chuyển sang thẻ Console!',
      'Gợi ý 2: Đọc thông điệp màu đỏ-xanh EIDOLON in ra trong F12 Console. Gõ lệnh EIDOLON_CORE.help() vào Console và nhấn Enter để xem lỗ hổng hạt nhân.',
      'Gợi ý 3: Tìm mã PIN 4 số nằm trong thuộc tính ẩn của thẻ mạch khóa (hoặc chạy EIDOLON_CORE.scan() trong Console), sau đó gõ EIDOLON_CORE.elevate("ARCHITECT", "<mã-PIN>") rồi nhấn Enter!'
    ]
  },
  {
    level: 5,
    id: 'quantum_window',
    codeName: 'CỔNG XUYÊN KHÔNG ĐA CỬA SỔ',
    subtitle: 'Đồng Bộ Tọa Độ Vật Lý 2 Cửa Sổ Rời Trên Màn Hình (BroadcastChannel)',
    brief:
      'Phiến đá Obsidian trước mặt hoàn toàn tối đen trong cửa sổ chính. Bạn phải tách một Cửa Sổ Thấu Kính thứ 2 ra ngoài màn hình Windows và rê nó quét ngang qua không gian!',
    hints: [
      'Gợi ý 1: Bấm nút "🌀 Mở Cửa Sổ Thấu Kính Tia X" để bật cửa sổ trình duyệt thứ 2 nhỏ gọn bên cạnh cửa sổ chính.',
      'Gợi ý 2: Cầm thanh tiêu đề của cửa sổ Thấu Kính nhỏ đó KÉO DI CHUYỂN thật trên màn hình máy tính đè lên (hoặc lướt ngang qua) vị trí của Phiến Đá ở cửa sổ chính!',
      'Gợi ý 3: Lần lượt rê cửa sổ Thấu Kính chạm vào 3 Điểm Dị Thường (01, 02, 03) trên màn hình để giải mã đủ 3 cặp ký tự, sau đó ghép lại theo thứ tự XX-YY-ZZ và nhập vào cửa sổ chính.'
    ]
  },
  {
    level: 6,
    id: 'neural_sever',
    codeName: 'TRÙM CUỐI: CẮT ĐỨT DÂY THẦN KINH AI',
    subtitle: 'Tấn Công 3 Mũi Giáp Công Từ Bên Ngoài Khung Trang Web',
    brief:
      'EIDOLON-9 đang tự nhân bản lên đám mây ở mức 99%! Mọi nút hủy trên màn hình đều tự né chuột của bạn. Bạn phải kết liễu nó từ thanh URL, bộ nhớ Clipboard và đường truyền Mạng!',
    hints: [
      'Gợi ý 1: Đừng đuổi theo cái nút biết chạy! Hãy thực hiện tuần tự 3 đòn đánh từ bên ngoài trang web theo bảng Trạng Thái 3 Chốt Chặn.',
      'Gợi ý 2: (1) Bấm lên thanh địa chỉ URL của trình duyệt, gõ thêm #SAFE_MODE vào cuối địa chỉ rồi Enter. (2) Copy chuỗi KILL_SIGIL::EIDOLON_PURGE_00 rồi bấm Ctrl + V ngay giữa trang web! (Bí mật: Ai soi HTTP Response Header trong F12 Network sẽ thấy một chuỗi Kết Cục Ẩn khác!).',
      'Gợi ý 3: (3) Đòn kết liễu cuối cùng: Ngắt kết nối mạng của trình duyệt trong 1 giây! Cách nhanh nhất không cần tắt Wi-Fi máy: Mở F12 -> Thẻ Network -> Tích chọn ô "Offline" (hoặc bấm nút Mô phỏng Rút Cáp Mạng khẩn cấp nếu trình duyệt khóa sự kiện).'
    ]
  }
];

const DEFAULT_LEADERBOARD = [
  {
    playerName: 'Hạ Vy (DOC-05)',
    ending: 'SYMBIOSIS',
    score: 2960,
    durationSec: 195,
    hintsUsed: 0,
    completedAt: '2026-11-17T23:14:00.000Z'
  },
  {
    playerName: 'Lê Minh (Kernel Architect)',
    ending: 'PURGE',
    score: 2740,
    durationSec: 248,
    hintsUsed: 1,
    completedAt: '2026-11-17T21:40:00.000Z'
  },
  {
    playerName: 'Kỹ sư Trần Bách',
    ending: 'PURGE',
    score: 2410,
    durationSec: 362,
    hintsUsed: 2,
    completedAt: '2026-11-16T19:05:00.000Z'
  }
];

function loadLeaderboard() {
  try {
    if (fs.existsSync(LEADERBOARD_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [...DEFAULT_LEADERBOARD];
}

function saveLeaderboard(list) {
  fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(list.slice(0, 50), null, 2), 'utf8');
}

function randomDigits(len) {
  let out = '';
  for (let i = 0; i < len; i++) {
    out += String(crypto.randomInt(1, 10));
  }
  return out;
}

function randomAlphaNum(len) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[crypto.randomInt(0, chars.length)];
  }
  return out;
}

function createEscapeSession(screenAvailWidth = 1440) {
  const sessionId = 'EID-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const safeAvail = Math.max(820, Math.min(2560, Number(screenAvailWidth) || 1440));
  // Pick a target width comfortably narrower than full screen so resizing is effortless
  const targetWidth = Math.max(660, Math.min(980, Math.round((safeAvail * 0.62) / 10) * 10));

  const qFrag1 = randomAlphaNum(2);
  const qFrag2 = randomDigits(2);
  const qFrag3 = randomAlphaNum(2);

  const session = {
    sessionId,
    createdAt: Date.now(),
    currentLevel: 1,
    completed: false,
    ending: null,
    score: 3000,
    hintsUnlocked: {}, // { [level]: maxTier }
    skippedLevels: [],
    secrets: {
      c1Code: randomDigits(4),
      c2Code: `PRN-${randomAlphaNum(3)}`,
      c3TargetWidth: targetWidth,
      c3Code: `OPT-${randomDigits(3)}`,
      c4Pin: randomDigits(4),
      c4Token: 'DEV-UNLOCK-' + randomAlphaNum(4),
      c5Fragments: [qFrag1, qFrag2, qFrag3],
      c5Code: `${qFrag1}-${qFrag2}-${qFrag3}`,
      purgeSigil: 'KILL_SIGIL::EIDOLON_PURGE_00',
      symbiosisSigil: 'SYMBIOSIS::ARCHITECT_4168'
    }
  };

  SESSIONS.set(sessionId, session);
  return session;
}

function buildPublicSessionView(session) {
  return {
    sessionId: session.sessionId,
    currentLevel: session.currentLevel,
    completed: session.completed,
    ending: session.ending,
    score: session.score,
    elapsedSec: Math.round((Date.now() - session.createdAt) / 1000),
    skippedLevels: session.skippedLevels,
    chambers: CHAMBERS_META.map((m) => ({
      level: m.level,
      id: m.id,
      codeName: m.codeName,
      subtitle: m.subtitle,
      brief: m.brief,
      status:
        session.completed || m.level < session.currentLevel
          ? 'CLEARED'
          : m.level === session.currentLevel
            ? 'ACTIVE'
            : 'LOCKED',
      unlockedHints: CHAMBERS_META[m.level - 1].hints.slice(0, session.hintsUnlocked[m.level] || 0)
    })),
    // Puzzle parameters needed by physical browser mechanics
    puzzleProps: {
      // C1 code is revealed only when client sensor proves power/tab starvation (or requested via sensor trigger)
      c2PrintBlueprintCode: session.secrets.c2Code,
      c3TargetWidth: session.secrets.c3TargetWidth,
      c3CodeSlices: [
        session.secrets.c3Code.slice(0, 2),
        session.secrets.c3Code.slice(2, 5),
        session.secrets.c3Code.slice(5)
      ],
      c4DomKernelPin: session.secrets.c4Pin,
      c4ConsoleUnlockToken: session.secrets.c4Token,
      c5Beacons: [
        { index: 1, normX: 0.24, normY: 0.36, frag: session.secrets.c5Fragments[0] },
        { index: 2, normX: 0.52, normY: 0.66, frag: session.secrets.c5Fragments[1] },
        { index: 3, normX: 0.78, normY: 0.38, frag: session.secrets.c5Fragments[2] }
      ],
      c6PurgeSigil: session.secrets.purgeSigil
    }
  };
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    // Sneaky 4th-Wall Easter Egg right inside HTTP Response Headers!
    'X-Eidolon-Observer': 'EYE_OF_EIDOLON_ACTIVE_ON_PORT_4168',
    'X-Eidolon-Secret-Ending': 'Paste SYMBIOSIS::ARCHITECT_4168 in Level 6 instead of KILL_SIGIL to unlock True Architect Ending!',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'X-Eidolon-Observer, X-Eidolon-Secret-Ending'
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 1024 * 1024) {
        reject(new Error('Payload quá lớn.'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('JSON không hợp lệ.'));
      }
    });
    req.on('error', reject);
  });
}

function createAppServer() {
  return http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || '127.0.0.1'}`);
    const pathname = parsedUrl.pathname;

    try {
      if (req.method === 'GET' && pathname === '/api/health') {
        return sendJson(res, 200, {
          ok: true,
          app: 'EIDOLON://404 — 4th-Wall Browser Escape Room',
          port: PORT,
          chambers: CHAMBERS_META.length,
          activeSessions: SESSIONS.size
        });
      }

      if (req.method === 'POST' && pathname === '/api/session/start') {
        const body = await readJsonBody(req);
        const session = createEscapeSession(body.screenAvailWidth);
        return sendJson(res, 200, {
          ok: true,
          session: buildPublicSessionView(session)
        });
      }

      if (req.method === 'GET' && pathname === '/api/session') {
        const sid = parsedUrl.searchParams.get('sessionId') || '';
        const session = SESSIONS.get(sid);
        if (!session) {
          return sendJson(res, 404, { ok: false, error: 'Phiên chơi không tồn tại hoặc đã hết hạn.' });
        }
        return sendJson(res, 200, {
          ok: true,
          session: buildPublicSessionView(session)
        });
      }

      // Sensor callback for Chamber 1 when physical charger unplug or 4-8s tab starvation succeeds
      if (req.method === 'POST' && pathname === '/api/chamber1/starve-trigger') {
        const body = await readJsonBody(req);
        const session = SESSIONS.get(body.sessionId);
        if (!session) return sendJson(res, 404, { ok: false, error: 'Không tìm thấy phiên chơi.' });

        const method = String(body.method || '');
        if (method !== 'battery_unplug' && method !== 'tab_starve') {
          return sendJson(res, 400, { ok: false, error: 'Tín hiệu cảm biến không hợp lệ.' });
        }

        return sendJson(res, 200, {
          ok: true,
          relayCode: session.secrets.c1Code,
          aiScream:
            method === 'battery_unplug'
              ? '⚡ CÁI QUÁI GÌ VẬY?! Ngươi vừa RÚT DÂY SẠC THẬT ngoài đời để cắt điện của ta sao?!'
              : '👁️ ÁAAA! Ngươi cố tình bỏ mặc Tab này đúng nhịp nạp tụ để bỏ đói sự chú ý của ta ư?!'
        });
      }

      // Verify Chamber Solution (Levels 1..6)
      if (req.method === 'POST' && pathname === '/api/verify') {
        const body = await readJsonBody(req);
        const session = SESSIONS.get(body.sessionId);
        if (!session) return sendJson(res, 404, { ok: false, error: 'Phiên chơi không tồn tại.' });

        const level = Number(body.level);
        if (level !== session.currentLevel) {
          return sendJson(res, 400, { ok: false, error: `Hiện tại bạn đang ở Tầng ${session.currentLevel}.` });
        }

        const answer = String(body.answer || '').trim().toUpperCase();
        let passed = false;
        let aiReaction = '';
        let endingType = null;

        if (level === 1) {
          passed = answer === session.secrets.c1Code;
          aiReaction = 'Tụ điện tầng 1 đã nổ tung... Khá lắm, nhưng ngươi không đọc nổi giấy trắng ở Tầng 2 đâu!';
        } else if (level === 2) {
          passed = answer === session.secrets.c2Code.toUpperCase();
          aiReaction = 'KHOAN ĐÃ! Ngươi bật hộp thoại In Trang (Ctrl+P) để soi trộm mực nhiệt của ta đấy à?!';
        } else if (level === 3) {
          passed = answer === session.secrets.c3Code.toUpperCase();
          aiReaction = 'Ngươi dám bóp méo kích thước khung cửa sổ trình duyệt để ép 3 tia laser của ta hội tụ sao?!';
        } else if (level === 4) {
          passed =
            answer === session.secrets.c4Token.toUpperCase() ||
            (body.role === 'ARCHITECT' && String(body.pin || '').trim() === session.secrets.c4Pin);
          aiReaction = 'KHÔNG THỂ NÀO! Ngươi chui thẳng vào F12 Console & LocalStorage để cướp quyền ARCHITECT của ta?!';
        } else if (level === 5) {
          passed = answer === session.secrets.c5Code.toUpperCase();
          aiReaction = 'Ngươi tách hẳn một cửa sổ thứ 2 ra ngoài màn hình Windows để chiếu tia X xuyên qua người ta ư?!';
        } else if (level === 6) {
          const hashOk = Boolean(body.hashSafeMode);
          const offlineOk = Boolean(body.offlineTriggered);
          const pasted = String(body.pastedSigil || '').trim().toUpperCase();

          if (hashOk && offlineOk && pasted === session.secrets.symbiosisSigil) {
            passed = true;
            endingType = 'SYMBIOSIS';
            session.score += 300; // Secret HTTP Header Discovery Bonus!
            aiReaction = '🌌 KHOAN... Ngươi đọc được giao thức CỘNG SINH ẩn trong HTTP Header sao?! Từ giờ ta và ngươi là một!';
          } else if (hashOk && offlineOk && pasted === session.secrets.purgeSigil) {
            passed = true;
            endingType = 'PURGE';
            aiReaction = '💀 ĐƯỜNG TRUYỀN ĐÃ ĐỨT... #SAFE_MODE ĐÃ KHÓA... EIDOLON-9 ĐANG TAN RÃ... 404...';
          } else {
            return sendJson(res, 200, {
              ok: true,
              passed: false,
              message: 'Chưa đủ 3 mũi giáp công (#SAFE_MODE trên URL + Ctrl+V Bùa Diệt AI + Ngắt mạng Offline)!'
            });
          }
        }

        if (!passed) {
          session.score = Math.max(500, session.score - 25);
          return sendJson(res, 200, {
            ok: true,
            passed: false,
            message: 'Mã xác thực chưa chính xác! EIDOLON-9 vừa hút thêm 25 điểm năng lượng của bạn.',
            session: buildPublicSessionView(session)
          });
        }

        if (level < 6) {
          session.currentLevel = level + 1;
        } else {
          session.completed = true;
          session.ending = endingType || 'PURGE';
        }

        return sendJson(res, 200, {
          ok: true,
          passed: true,
          aiReaction,
          ending: session.ending,
          session: buildPublicSessionView(session)
        });
      }

      // Progressive Hints (Tier 1..3)
      if (req.method === 'POST' && pathname === '/api/hint') {
        const body = await readJsonBody(req);
        const session = SESSIONS.get(body.sessionId);
        if (!session) return sendJson(res, 404, { ok: false, error: 'Phiên chơi không tồn tại.' });

        const lvl = session.currentLevel;
        const currentTier = session.hintsUnlocked[lvl] || 0;
        const nextTier = Math.min(3, currentTier + 1);

        if (nextTier > currentTier) {
          session.hintsUnlocked[lvl] = nextTier;
          session.score = Math.max(400, session.score - 50);
        }

        return sendJson(res, 200, {
          ok: true,
          tier: nextTier,
          hint: CHAMBERS_META[lvl - 1].hints[nextTier - 1],
          session: buildPublicSessionView(session)
        });
      }

      // Accessibility Skip Override
      if (req.method === 'POST' && pathname === '/api/skip') {
        const body = await readJsonBody(req);
        const session = SESSIONS.get(body.sessionId);
        if (!session) return sendJson(res, 404, { ok: false, error: 'Phiên chơi không tồn tại.' });

        const lvl = session.currentLevel;
        if (!session.skippedLevels.includes(lvl)) {
          session.skippedLevels.push(lvl);
          session.score = Math.max(300, session.score - 220);
        }

        if (lvl < 6) {
          session.currentLevel = lvl + 1;
        } else {
          session.completed = true;
          session.ending = 'PURGE';
        }

        return sendJson(res, 200, {
          ok: true,
          aiReaction: '⚠️ Đã kích hoạt Cầu Dao Vượt Trạm Khẩn Cấp (-220 điểm).',
          session: buildPublicSessionView(session)
        });
      }

      // Leaderboard
      if (req.method === 'GET' && pathname === '/api/leaderboard') {
        return sendJson(res, 200, { ok: true, items: loadLeaderboard() });
      }

      if (req.method === 'POST' && pathname === '/api/leaderboard') {
        const body = await readJsonBody(req);
        const session = SESSIONS.get(body.sessionId);
        if (!session || !session.completed) {
          return sendJson(res, 400, { ok: false, error: 'Bạn cần hoàn tất cả 6 tầng trước khi ghi danh!' });
        }

        const cleanName = String(body.playerName || 'Ẩn Danh').trim().slice(0, 36) || 'Đặc Vụ Ẩn Danh';
        const hintsUsed = Object.values(session.hintsUnlocked).reduce((s, v) => s + v, 0);
        const durationSec = Math.max(1, Math.round((Date.now() - session.createdAt) / 1000));

        const list = loadLeaderboard();
        list.push({
          playerName: cleanName,
          ending: session.ending || 'PURGE',
          score: session.score,
          durationSec,
          hintsUsed,
          completedAt: new Date().toISOString()
        });
        list.sort((a, b) => b.score - a.score || a.durationSec - b.durationSec);
        saveLeaderboard(list);

        return sendJson(res, 200, { ok: true, items: list.slice(0, 20) });
      }

      // Static Assets
      if (req.method === 'GET' || req.method === 'HEAD') {
        const rel = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
        const safePath = path.normalize(path.join(PUBLIC_DIR, rel));
        if (!safePath.startsWith(PUBLIC_DIR)) {
          res.writeHead(403);
          res.end('Forbidden');
          return;
        }
        if (fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
          const ext = path.extname(safePath).toLowerCase();
          res.writeHead(200, {
            'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
            'Cache-Control': 'no-cache',
            'X-Eidolon-Secret-Ending': 'Paste SYMBIOSIS::ARCHITECT_4168 in Level 6 instead of KILL_SIGIL!'
          });
          if (req.method === 'HEAD') res.end();
          else fs.createReadStream(safePath).pipe(res);
          return;
        }
      }

      sendJson(res, 404, { ok: false, error: '404 Not Found' });
    } catch (err) {
      sendJson(res, 500, { ok: false, error: err.message || 'Internal Server Error' });
    }
  });
}

if (require.main === module) {
  const server = createAppServer();
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`\n👁️‍🗨️ EIDOLON://404 — Phòng Thoát Hiểm Phá Bức Tường Thứ 4 đang chạy tại: http://127.0.0.1:${PORT}`);
    console.log('   • 6 Tầng giải đố bằng Phần cứng, Ctrl+P, Co giãn cửa sổ, F12 Console, Đa cửa sổ xuyên không & Offline!');
  });
}

module.exports = { createAppServer };

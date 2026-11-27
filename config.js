// Cấu hình mặc định. Trang quản lý (admin.html) ghi đè vào localStorage.

// Sprite chuẩn 16 khung của ChatGPT: lưới 4x4, hàng 1-2 = 8 khung di chuyển, hàng 3-4 = 8 khung tấn công.
// foot / head đo bằng máy (phần trống dưới chân / trên đầu trong ô).
const S16 = (file, drawW, foot, head, fps = 12) => ({
  src: 'assets/' + file, cols: 4, rows: 4, frames: 16, fps, drawW, mask: false,
  walk: [0, 1, 2, 3, 4, 5, 6, 7], attack: [8, 9, 10, 11, 12, 13, 14, 15], foot, head,
});

window.DEFAULT_CONFIG = {
  // Luật spawn mặc định: khi một phe chưa có ai tặng quà, phe đó tự ra vài lính lẻ tẻ
  defaultSpawn: { enabled: false, intervalSec: 6, perTeam: 2, unit: 'linh' }, // đã tắt: không tự sinh quân, chỉ có quân khi người xem tương tác

  // Mỗi quà TikTok -> một nhân vật riêng, gọi cho PHE mà người tặng đã chọn (bình luận 1 = Xanh, 4 = Đỏ).
  // tiktokName: tên quà đúng như TikTok gửi (tiếng Anh). Giá xu là ước lượng theo bậc, TikTok đổi theo vùng: sửa trong trang quản lý.
  // Mỗi quà thuộc một CẤP (1..6) theo giá xu; quà gọi nhân vật cấp đó của PHE mà người tặng đã chọn (xem roster).
  gifts: [
    // --- Cấp 1 · Thường (1 xu) ---
    { id: 'rose',      name: 'Hoa hồng',      tiktokName: 'Rose',           coins: 1,     tier: 1, count: 2 },
    { id: 'tiktok',    name: 'TikTok',        tiktokName: 'TikTok',         coins: 1,     tier: 1, count: 2 },
    { id: 'gg',        name: 'GG',            tiktokName: 'GG',             coins: 1,     tier: 1, count: 2 },
    { id: 'icecream',  name: 'Kem ốc quế',    tiktokName: 'Ice Cream Cone', coins: 1,     tier: 1, count: 3 },
    { id: 'finger',    name: 'Tim ngón tay',  tiktokName: 'Finger Heart',   coins: 1,     tier: 1, count: 3 },
    // --- Cấp 2 · Hiếm (5 xu) ---
    { id: 'handheart', name: 'Tim bàn tay',   tiktokName: 'Hand Heart',     coins: 5,     tier: 2, count: 1 },
    { id: 'loveyou',   name: 'Love You',      tiktokName: 'Love You',       coins: 5,     tier: 2, count: 1 },
    { id: 'butterfly', name: 'Bươm bướm',     tiktokName: 'Butterfly',      coins: 5,     tier: 2, count: 1 },
    { id: 'crown',     name: 'Vương miện',    tiktokName: 'Little Crown',   coins: 5,     tier: 2, count: 1 },
    { id: 'bottle',    name: 'Bình ước',      tiktokName: 'Wishing Bottle', coins: 5,     tier: 2, count: 1 },
    // --- Cấp 3 · Tinh anh (10 xu) ---
    { id: 'perfume',   name: 'Nước hoa',      tiktokName: 'Perfume',        coins: 10,    tier: 3, count: 1 },
    { id: 'donut',     name: 'Bánh vòng',     tiktokName: 'Doughnut',       coins: 10,    tier: 3, count: 1 },
    { id: 'cap',       name: 'Mũ lưỡi trai',  tiktokName: 'Cap',            coins: 10,    tier: 3, count: 1 },
    { id: 'crane',     name: 'Hạc giấy',      tiktokName: 'Paper Crane',    coins: 10,    tier: 3, count: 1 },
    { id: 'rosa',      name: 'Hoa Rosa',      tiktokName: 'Rosa',           coins: 10,    tier: 3, count: 1, random: true },
    // --- Quà quay may theo xu: mỗi mốc mở vòng quay 18 nhân vật trong 10 giây ---
    { id: 'tea',       name: 'Trà',            tiktokName: 'Tea',            coins: 50,    tier: 3, count: 1, random: true },
    { id: 'confetti',  name: 'Pháo giấy',      tiktokName: 'Confetti',       coins: 100,   tier: 4, count: 1, random: true },
    // --- Cấp 4 · Sử thi (99 xu) ---
    { id: 'garland',   name: 'Vòng hoa',      tiktokName: 'Garland',        coins: 99,    tier: 4, count: 1 },
    { id: 'mic',       name: 'Micro hát',     tiktokName: 'Singing Mic',    coins: 99,    tier: 4, count: 1 },
    { id: 'concert',   name: 'Đêm nhạc',      tiktokName: 'Concert',        coins: 99,    tier: 4, count: 1 },
    { id: 'star',      name: 'Ngôi sao',      tiktokName: 'Star',           coins: 99,    tier: 4, count: 1 },
    // --- Cấp 5 · Huyền thoại (1000 xu): có cảnh giáng thế ---
    { id: 'galaxy',    name: 'Thiên hà',      tiktokName: 'Galaxy',         coins: 1000,  tier: 5, count: 1 },
    { id: 'fire',      name: 'Pháo hoa',      tiktokName: 'Fireworks',      coins: 1088,  tier: 5, count: 1 },
    // --- Cấp 6 · Thần thoại (Sư tử): siêu lớn, cảnh giáng thế riêng ---
    { id: 'lion',      name: 'Sư tử',         tiktokName: 'Lion',           coins: 29999, tier: 6, count: 1 },
  ],

  // Phân cấp sức mạnh: mỗi cấp có một nhân vật cho từng phe, hai phe KHÔNG trùng nhau.
  roster: {
    xanh: [null, 'bachHo', 'kimQuy', 'bachTuong', 'kyLan', 'phuongHoang', 'thanhLong'],
    do:   [null, 'ngoCong', 'xaTinh', 'nguTinh', 'mocTinh', 'hoTinh', 'hacGiao'],
  },
  tierNames: ['Lính', 'Thường', 'Hiếm', 'Tinh anh', 'Sử thi', 'Huyền thoại', 'Thần thoại'],

  // Tim: mỗi mốc gọi một quân thường, luân phiên theo danh sách của phe.
  hearts: { threshold: 100, units: { xanh: ['linh', 'khienMay', 'daNem', 'ySi', 'songKiem', 'traucon', 'kyBinh'], do: ['linh'] }, count: 3 }, // đủ 100 tim gọi một tiểu đội quân thường theo phe

  // Bình luận: "1" = phe xanh, "4" = phe đỏ. Người vào phe được gọi 1 lính mang tên mình (có hồi chiêu)
  commentJoin: { '1': 'xanh', '4': 'do' },
  joinSpawn: { xanh: 'linh', do: 'linh', count: 3, cooldownSec: 15 },

  // Quay may: mỗi quà có xác suất "quay" ra nhân vật ngẫu nhiên thay vì nhân vật cố định.
  // base = tỉ lệ gốc của 7 bậc (0..6). Số xu càng cao thì tỉ lệ ra bậc cao càng lớn: trọng số cấp c = base[c-1] * m^(c-1), m = 1 + k * log10(1 + xu).
  gacha: { enabled: true, chance: 0.3, base: [40, 26, 16, 10, 6, 2], minion: 35, k: 0.9 }, // minion = tổng trọng số lính thường; xu cao làm tăng dần tỷ lệ cấp mạnh

  // Câu "ngông" nhân vật hô lên khi được gọi, theo bậc (chọn ngẫu nhiên)
  quotes: {
    low: ['Xung phong!', 'Vì quê hương!', 'Tiến lên anh em!', 'Giữ vững trận tuyến!', 'Có ta đây!', 'Giặc ở đâu, ra đây!'],
    mid: ['Kẻ nào dám cản đường ta?', 'Hôm nay đòi lại giang sơn!', 'Chưa đủ tuổi để thắng ta đâu!', 'Đứng yên mà nhận lấy đòn!', 'Ta đến, giặc đi!'],
    high: ['Trời đất còn phải nghe ta!', 'Quỳ xuống mà nhìn bản lĩnh của ta!', 'Một mình ta đủ san bằng thành!', 'Bách quân hãy run sợ!', 'Ai là đối thủ của ta?'],
    god: ['Ta là thần tướng — thiên hạ vô địch!', 'Gầm lên! Bách quân phải khuất phục!', 'Sấm chớp là tiếng thở của ta!', 'Hôm nay trời đất đổi chủ!'],
  },

  // Đơn vị. cd = số bước logic (60 bước/giây) giữa hai đòn.
  // tier 0..6: bậc sức mạnh theo giá xu (càng cao càng nhiều máu, sát thương, to hơn, nhiều hiệu ứng, có chiêu cuối).
  // sprite: walk / attack = chỉ số khung dùng khi đi và khi đánh; foot / head = phần trống dưới chân / trên đầu trong ô
  // projectile: bắn đạn bay tới mục tiêu; splash/splashMax/splashRatio: bán kính, số mục tiêu tối đa và hệ số sát thương lan;
  // taunt: địch ưu tiên đánh; heal: hồi máu đồng minh xung quanh (máu/giây); hook: kéo địch lại gần
  // skill: tên chiêu cuối (xem game.js); skillCd: bước hồi chiêu
  units: {
    // ---------- Bậc 0: 1 xu ----------
    linh:     { label: 'Lính giáo', labelDo: 'Quỷ lùn cầm giáo', tier: 0, hp: 40, speed: 0.55, range: 24, dmg: 5, cd: 40, size: 12, shape: 'circle',
                sprite: { src: 'assets/linh-giao-16.png', cols: 4, rows: 4, frames: 16, fps: 12, drawW: 60, mask: false,
                          walk: [0, 1, 2, 3, 4, 5, 6, 7], attack: [8, 9, 10, 11, 12, 13, 14, 15], foot: 0.089, head: 0.121 },
                spriteDo: S16('quy-lun-16.png', 72, 0.09, 0.39) },
    cung:     { label: 'Cung thủ', labelDo: 'Yêu binh cung thủ', tier: 0, hp: 26, speed: 0.45, range: 130, dmg: 6, cd: 70, size: 12, shape: 'triangle', projectile: 'arrow', shotFrame: 2,
                sprite: { src: 'assets/cung-thu-sprite.png', cols: 4, rows: 2, frames: 8, fps: 8, drawW: 72, mask: false, foot: 0.077, head: 0.305 },
                spriteDo: { src: 'assets/cung-thu-do-sprite.png', cols: 4, rows: 2, frames: 8, fps: 8, drawW: 72, mask: false, foot: 0.09, head: 0.298 } },
    khienMay: { label: 'Lính khiên mây', labelDo: 'Quỷ lùn khiên', tier: 0, fx: 'bash', hp: 90, speed: 0.45, range: 22, dmg: 3, cd: 50, size: 12, shield: true,
                sprite: S16('khien-may-16.png', 62, 0.073, 0.243) },
    daNem:    { label: 'Đồng tử ném đá', labelDo: 'Quỷ đá ném sỏi', tier: 0, hp: 30, speed: 0.55, range: 110, dmg: 4, cd: 60, size: 11, projectile: 'stone', shotFrame: 4,
                sprite: S16('da-nem-16.png', 58, 0.061, 0.252) },
    traucon:  { label: 'Bé chăn trâu', labelDo: 'Tiểu yêu chăn trâu', tier: 0, hp: 110, speed: 0.75, range: 26, dmg: 9, cd: 55, size: 15,
                sprite: S16('trau-con-16.png', 80, 0.096, 0.163) },
    kyBinh:   { label: 'Dân binh cưỡi ngựa', labelDo: 'Kỵ binh yêu', tier: 0, fx: 'slash', hp: 80, speed: 1.1, range: 30, dmg: 10, cd: 45, size: 15, shape: 'diamond',
                sprite: { src: 'assets/ky-binh-sprite.png', cols: 4, rows: 2, frames: 8, fps: 10, drawW: 92, mask: false, foot: 0.093, head: 0.176 },
                spriteDo: { src: 'assets/ky-binh-do-sprite.png', cols: 4, rows: 2, frames: 8, fps: 10, drawW: 92, mask: false, foot: 0.093, head: 0.178 } },

    // ---------- Bậc 1: 5 xu ----------
    ySi:        { label: 'Nữ y sĩ', labelDo: 'Yêu y sĩ', tier: 0, hp: 45, speed: 0.5, range: 80, dmg: 2, cd: 80, size: 12, heal: 5,
                  sprite: S16('y-si-16.png', 68, 0.048, 0.262) },
    songKiem:   { label: 'Song kiếm nữ hiệp', labelDo: 'Nữ kiếm yêu', tier: 0, fx: 'slash', hp: 70, speed: 0.9, range: 24, dmg: 7, cd: 28, size: 12,
                  sprite: S16('song-kiem-16.png', 64, 0.083, 0.211, 14) },
    tienBuom:   { label: 'Tiên bướm', tier: 1, fx: 'flutter', amb: 'butterfly', hp: 35, speed: 0.6, range: 120, dmg: 6, cd: 55, size: 12, projectile: 'magic' },
    thanhGiong: { label: 'Thánh Gióng nhí', tier: 1, fx: 'fire', amb: 'ember', hp: 170, speed: 0.8, range: 30, dmg: 14, cd: 50, size: 16 },
    thayPhap:   { label: 'Thầy pháp bùa', tier: 1, fx: 'runes', hp: 45, speed: 0.45, range: 120, dmg: 10, cd: 85, size: 12, projectile: 'fireball', splash: 30, splashMax: 3, splashRatio: 0.4 },

    // ---------- Bậc 2: 10 xu ----------
    voiChien:   { label: 'Voi chiến', tier: 2, fx: 'stomp', amb: 'dust', hp: 340, speed: 0.32, range: 34, dmg: 13, cd: 70, size: 24, splash: 35, splashMax: 4, splashRatio: 0.5, skill: 'charge', skillCd: 600,
                 sprite: S16('bach-tuong-ky-tuong-16.png', 112, 0.055, 0.055, 10) },
    hoTuong:    { label: 'Hổ tướng', tier: 2, fx: 'claw', hp: 260, speed: 0.6, range: 30, dmg: 16, cd: 45, size: 20 },
    phaoThan:   { label: 'Pháo thần công', tier: 2, fx: 'blast', hp: 120, speed: 0.3, range: 170, dmg: 18, cd: 140, size: 18, projectile: 'cannon', splash: 45, splashMax: 4, splashRatio: 0.5 },
    hacGiay:    { label: 'Hạc giấy khổng lồ', tier: 2, fx: 'flutter', amb: 'paper', hp: 140, speed: 0.7, range: 100, dmg: 9, cd: 60, size: 18, projectile: 'magic' },

    // ---------- Bậc 3: 99 xu, tướng có chiêu cuối ----------
    nhenRoi:  { label: 'Nhện Rối Mặt Nạ', tier: 3, fx: 'web', hp: 360, speed: 0.32, range: 32, dmg: 9, cd: 58, size: 24, shape: 'square', taunt: true,
                skill: 'webnet', skillCd: 540,
                sprite: { src: 'assets/nhen-roi-sprite.png', cols: 4, rows: 2, frames: 8, fps: 8, drawW: 104, mask: false, foot: 0.111, head: 0.165 } },
    kinhNgu:  { label: 'Kình Ngư Chuông', tier: 3, hp: 300, speed: 0.35, range: 90, dmg: 6, cd: 70, heal: 8, size: 20, shape: 'circle',
                skill: 'healwave', skillCd: 480,
                sprite: { src: 'assets/kinh-ngu-sprite.png', cols: 4, rows: 2, frames: 8, fps: 8, drawW: 92, mask: false, foot: 0.147, head: 0.244 } },
    baVa:     { label: 'Bà Vá Bóng', tier: 3, fx: 'thread', hp: 300, speed: 0.3, range: 70, dmg: 10, cd: 70, size: 20, shape: 'circle', hook: true,
                skill: 'threads', skillCd: 520,
                sprite: { src: 'assets/ba-va-tuong-solo-sprite.png', cols: 4, rows: 2, frames: 8, fps: 8, drawW: 76, mask: false, clean: true,
                          walk: [0, 7], attack: [1, 2, 3, 4, 5, 6], foot: 0.063, head: 0.14 } },
    tuongOc:  { label: 'Tướng Thành Ốc', tier: 3, fx: 'stomp', amb: 'dust', hp: 420, speed: 0.22, range: 36, dmg: 16, cd: 60, size: 24, shape: 'square', shield: true,
                skill: 'wall', skillCd: 560,
                sprite: { src: 'assets/thanh-oc-sprite.png', cols: 3, rows: 2, frames: 6, fps: 6, drawW: 112,
                          walk: [0], attack: [1, 2, 3, 4, 5], foot: 0.129, head: 0.092 } },

    // ---------- Bậc 5: từ 1000 xu, thần tướng ----------
    trongSam: { label: 'Vua Trống Sấm', tier: 5, fx: 'lightning', amb: 'spark', hp: 480, speed: 0.25, range: 50, dmg: 24, cd: 80, splash: 55, splashMax: 5, splashRatio: 0.45, size: 24, shape: 'square',
                skill: 'shock', skillCd: 420, intro: 'Thiên Hà',
                sprite: { src: 'assets/trong-sam-sprite.png', cols: 4, rows: 2, frames: 8, fps: 8, drawW: 104, mask: false, foot: 0.084, head: 0.095 } },
    cuuVi:    { label: 'Cửu Vĩ Đèn Lồng', tier: 5, fx: 'blast', amb: 'ember', hp: 300, speed: 0.55, range: 140, dmg: 16, cd: 75, size: 22, shape: 'diamond',
                projectile: 'fireball', splash: 30, splashMax: 3, splashRatio: 0.4, shotFrame: 4, skill: 'barrage', skillCd: 420, intro: 'Pháo Hoa',
                sprite: S16('cuu-vi-16.png', 112, 0.141, 0.08, 10) },

    // ================= PHÂN CẤP THẦN THÚ (Xanh) và YÊU TINH (Đỏ) =================
    // proxy: tạm mượn sprite của nhân vật khác cho tới khi có tranh riêng do ChatGPT vẽ.
    // ---------- Phe Xanh: thần thú Việt ----------
    bachHo:      { label: 'Bạch Hổ', tier: 1, fx: 'claw', hp: 70, speed: 0.9, range: 26, dmg: 9, cd: 40, size: 14, splash: 28, splashMax: 2, splashRatio: 0.5, sprite: S16('bach-ho-16.png', 80, 0.09, 0.40) },
    kimQuy:      { label: 'Kim Quy', tier: 2, fx: 'bash', hp: 320, speed: 0.32, range: 30, dmg: 9, cd: 60, size: 20, shield: true, taunt: true,
                   skill: 'wall', skillCd: 540, skillName: 'KIM QUY HỘ THÀNH', sprite: S16('kim-quy-16.png', 100, 0.09, 0.42) },
    bachTuong:   { label: 'Bạch Tượng Thần Tướng', tier: 3, fx: 'stomp', amb: 'dust', hp: 340, speed: 0.35, range: 34, dmg: 14, cd: 65, size: 24, splash: 42, splashMax: 4, splashRatio: 0.55, quote: ['Trận tuyến này, ta sẽ mở đường!'],
                   skill: 'charge', skillCd: 600, skillName: 'VOI TRẮNG XUNG TRẬN', sprite: S16('bach-tuong-ky-tuong-16.png', 118, 0.055, 0.055, 10) },
    kyLan:       { label: 'Kỳ Lân', tier: 4, fx: 'fire', amb: 'ember', hp: 360, speed: 0.55, range: 110, dmg: 15, cd: 70, size: 22, projectile: 'fireball', splash: 30, splashMax: 3, splashRatio: 0.4, quote: ['Lành dữ do ta định, tà khí lui đi!'],
                   skill: 'healwave', skillCd: 480, skillName: 'KỲ LÂN ĐẠI PHÚC', sprite: S16('ky-lan-16.png', 106, 0.10, 0.30) },
    phuongHoang: { label: 'Phượng Hoàng', tier: 5, fx: 'blast', amb: 'ember', hp: 300, speed: 0.6, range: 150, dmg: 16, cd: 70, size: 24, projectile: 'fireball', splash: 30, splashMax: 3, splashRatio: 0.4, shotFrame: 4, quote: ['Thiên hỏa giáng xuống, bóng tối tan đi!'],
                   skill: 'phoenixRain', skillCd: 420, skillName: 'PHƯỢNG HOÀNG THIÊN HỎA', sprite: S16('phuong-hoang-16.png', 120, 0.10, 0.25) },
    thanhLong:   { label: 'Thanh Long', tier: 6, fx: 'lightning', amb: 'spark', hp: 900, speed: 0.4, range: 90, dmg: 38, cd: 60, size: 32, splash: 60, splashMax: 6, splashRatio: 0.5, quote: ['Sấm dậy núi sông, nghe lệnh ta!'],
                   skill: 'dragonLightning', skillCd: 360, skillName: 'THANH LONG LÔI VŨ', sprite: S16('thanh-long-16.png', 140, 0.10, 0.25) },
    // ---------- Phe Đỏ: yêu tinh ----------
    ngoCong:     { label: 'Ngô Công Tinh', tier: 1, fx: 'slash', hp: 65, speed: 0.85, range: 24, dmg: 9, cd: 40, size: 14, splash: 24, splashMax: 2, splashRatio: 0.45, spriteDo: S16('ngo-cong-16.png', 85, 0.10, 0.30) },
    xaTinh:      { label: 'Xà Tinh', tier: 2, fx: 'web', hp: 320, speed: 0.32, range: 28, dmg: 9, cd: 60, size: 22, splash: 36, splashMax: 3, splashRatio: 0.5, taunt: true,
                   skill: 'webnet', skillCd: 540, skillName: 'XÀ TINH QUẤN THÂN', spriteDo: S16('xa-tinh-16.png', 100, 0.10, 0.30) },
    nguTinh:     { label: 'Ngư Tinh', tier: 3, fx: 'runes', hp: 340, speed: 0.38, range: 90, dmg: 12, cd: 70, size: 22, projectile: 'magic',
                   skill: 'abyssalWave', skillCd: 600, skillName: 'NGƯ TINH THỦY TRIỀU', proxy: 'kinhNgu' },
    mocTinh:     { label: 'Mộc Tinh', tier: 4, fx: 'thread', hp: 360, speed: 0.3, range: 40, dmg: 14, cd: 68, size: 26, hook: true, quote: ['Rễ sâu đã bén, các ngươi đừng hòng thoát!'],
                   skill: 'threads', skillCd: 600, skillName: 'MỘC TINH TRÓI RỄ', sprite: S16('moc-tinh-16.png', 115, 0.10, 0.20) },
    hoTinh:      { label: 'Hồ Tinh', tier: 5, fx: 'blast', amb: 'ember', hp: 300, speed: 0.6, range: 150, dmg: 16, cd: 70, size: 24, projectile: 'fireball', splash: 30, splashMax: 3, splashRatio: 0.4, shotFrame: 4, quote: ['Chín bóng hồ ly, chẳng biết đâu là ta!'],
                   skill: 'foxfire', skillCd: 420, skillName: 'HỒ TINH CỬU ẢNH',
                   sprite: S16('cuu-vi-16.png', 112, 0.141, 0.08, 10) },
    hacGiao:     { label: 'Hắc Giao', tier: 6, fx: 'lightning', amb: 'spark', hp: 900, speed: 0.4, range: 90, dmg: 38, cd: 60, size: 32, splash: 60, splashMax: 6, splashRatio: 0.5, quote: ['Hắc triều dâng! Không kẻ nào thoát!'],
                   skill: 'blackTide', skillCd: 360, skillName: 'HẮC GIAO HẮC TRIỀU', spriteDo: S16('hac-giao-16.png', 140, 0.10, 0.25) },

    // ---------- Bậc 6: Sư tử, siêu lớn ----------
    kimLan:   { label: 'Kim Lân Vương', tier: 6, fx: 'blast', amb: 'ember', hp: 900, speed: 0.35, range: 70, dmg: 40, cd: 60, size: 30, shape: 'circle', splash: 70, splashMax: 8, splashRatio: 0.4,
                skill: 'roar', skillCd: 360, intro: 'Sư Tử' },
    thanhGiongTuong: { label: 'Thánh Gióng', labelDo: 'Quỷ Kỵ Tướng', tier: 4, fx: 'slash', hp: 420, speed: 0.82, range: 36, dmg: 20, cd: 52, size: 28, splash: 36, splashMax: 3, splashRatio: 0.5,
                  skill: 'cavalryCharge', skillCd: 480, skillName: 'THÁNH GIÓNG XUNG PHONG', intro: 'Chiến Mã', quote: ['Ngựa sắt tung vó, quân thù tan tác!'], sprite: S16('thanh-giong-16.png', 134, 0.04, 0.03, 10) },
    yeuTru: { label: 'Yêu Trư', tier: 2, fx: 'stomp', amb: 'dust', hp: 340, speed: 0.38, range: 32, dmg: 12, cd: 66, size: 22, splash: 34, splashMax: 3, splashRatio: 0.45, taunt: true,
              skill: 'tuskCharge', skillCd: 540, skillName: 'YÊU TRƯ HÚC TRẬN', spriteDo: S16('yeu-tru-16.png', 112, 0.06, 0.07, 10) },
  },

  teams: {
    xanh: { label: 'Xanh', color: '#38bdf8', name: 'THẦN THÚ' },
    do:   { label: 'Đỏ',   color: '#f43f5e', name: 'YÊU TINH' },
  },
};

window.loadConfig = function () {
  const D = window.DEFAULT_CONFIG;
  try {
    const saved = JSON.parse(localStorage.getItem('tkgame-config') || 'null');
    if (!saved) return JSON.parse(JSON.stringify(D));
    const beforeRosterV3 = Number(saved.schemaVersion) < 3;
    // Đơn vị luôn lấy theo bản mặc định mới nhất (sprite, kỹ năng); chỉ giữ chỉ số người dùng đã chỉnh
    const units = JSON.parse(JSON.stringify(D.units));
    for (const [k, u] of Object.entries(saved.units || {})) {
      if (!units[k]) continue;
      for (const f of ['hp', 'speed', 'range', 'dmg']) if (typeof u[f] === 'number') units[k][f] = u[f];
    }
    saved.units = units;
    // Migrate legacy saves while preserving edits made with the tier-based editor.
    if (saved.schemaVersion >= 2 && Array.isArray(saved.gifts)) {
      saved.gifts = saved.gifts.filter(g => Number.isInteger(g.tier) && g.tier >= 1 && g.tier <= 6 && g.id);
      const defaultIds = new Set(D.gifts.map(g => g.id));
      const savedById = new Map(saved.gifts.map(g => [g.id, g]));
      saved.gifts = D.gifts.map(g => Object.assign({}, g, savedById.get(g.id) || {}))
        .concat(saved.gifts.filter(g => !defaultIds.has(g.id)));
    } else {
      saved.gifts = JSON.parse(JSON.stringify(D.gifts));
      saved.defaultSpawn = Object.assign({}, D.defaultSpawn, { enabled: false });
    }
    saved.schemaVersion = 3;
    saved.roster = D.roster; saved.tierNames = D.tierNames;
    saved.hearts = Object.assign({}, D.hearts, saved.hearts || {});
    // Các cấu hình cũ chưa có nút chỉnh số quân; chuyển mặc định một quân sang tiểu đội mới.
    if (saved.hearts.count === 1) saved.hearts.count = D.hearts.count;
    if (beforeRosterV3 && Number(saved.hearts.count) === 2) saved.hearts.count = D.hearts.count;
    for (const team of ['xanh', 'do']) { const pool = saved.hearts.units?.[team]; if (!Array.isArray(pool) || !pool.length || pool.some(k => !units[k] || units[k].tier !== 0)) { saved.hearts.units = JSON.parse(JSON.stringify(D.hearts.units)); break; } }
    saved.joinSpawn = Object.assign({}, D.joinSpawn, saved.joinSpawn || {});
    if (beforeRosterV3 && Number(saved.joinSpawn.count) === 2) saved.joinSpawn.count = D.joinSpawn.count;
    for (const team of ['xanh', 'do']) if (!units[saved.joinSpawn[team]]) saved.joinSpawn[team] = D.joinSpawn[team];
    saved.gacha = Object.assign({}, D.gacha, saved.gacha);
    saved.quotes = D.quotes;
    saved.teams = D.teams;
    if (!units[saved.defaultSpawn.unit]) saved.defaultSpawn.unit = 'linh';
    return saved;
  } catch (e) {
    return JSON.parse(JSON.stringify(D));
  }
};

window.saveConfig = function (cfg) {
  cfg.schemaVersion = 3;
  localStorage.setItem('tkgame-config', JSON.stringify(cfg));
};

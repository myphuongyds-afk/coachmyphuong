// ═══════════════════════════════════════════════════════════════
//  ⚙️  CẤU HÌNH — chỉnh tại đây, không cần sửa code bên dưới
// ═══════════════════════════════════════════════════════════════
const CONFIG = {
  SHEET_NAME:   'Trang tính1',       // Tên sheet (tab) trong Google Sheets
  SEPAY_TOKEN:  'NHAP_TOKEN_SEPAY', // Token bí mật — dán vào URL webhook của SePay
  ORDER_PREFIX: 'BDH',              // Tiền tố mã đơn hàng (Bản Đồ Hạnh Phúc)
};

// Tên cột — phải khớp chính xác với tiêu đề dòng 1 của Sheet
const COL = {
  TIME_REG:   'Thời gian',
  ORDER_ID:   'Mã Đơn',
  NAME:       'Name',
  PHONE:      'Phone',
  EMAIL:      'Email',
  STATUS:     'Status',
  WHY:        'Why',
  PAY_STATUS: 'Trạng Thái',
  AMOUNT:     'Số Tiền',
  TRANS_ID:   'Mã Giao Dịch',
  TIME_PAY:   'Thời gian thanh toán',
};


// ═══════════════════════════════════════════════════════════════
//  doGet — Luồng 1: Đăng ký đơn & Kiểm tra trạng thái
// ═══════════════════════════════════════════════════════════════
function doGet(e) {
  try {
    const action = (e.parameter.action || '').toLowerCase();
    if (action === 'register') return handleRegister(e.parameter);
    if (action === 'check')    return handleCheck(e.parameter.orderId);
    return jsonOut({ error: 'Unknown action' });
  } catch (err) {
    return jsonOut({ error: err.message });
  }
}

// Luồng 1A: Khách điền form → ghi vào Sheet → trả về Mã Đơn
function handleRegister(params) {
  const sheet   = getSheet();
  const headers = getHeaders(sheet);
  const orderId = generateOrderId();

  const rowData = {
    [COL.TIME_REG]:   new Date(),
    [COL.ORDER_ID]:   orderId,
    [COL.NAME]:       params.Name   || '',
    [COL.PHONE]:      params.Phone  || '',
    [COL.EMAIL]:      params.Email  || '',
    [COL.STATUS]:     params.Status || '',
    [COL.WHY]:        params.Why    || '',
    [COL.PAY_STATUS]: 'Chờ thanh toán ⏳',
    [COL.AMOUNT]:     '',
    [COL.TRANS_ID]:   '',
    [COL.TIME_PAY]:   '',
  };

  sheet.appendRow(headers.map(h => (h in rowData ? rowData[h] : '')));
  return jsonOut({ success: true, orderId: orderId });
}

// Luồng 1B: Landing page hỏi → kiểm tra trạng thái đơn
function handleCheck(orderId) {
  if (!orderId) return jsonOut({ paid: false, error: 'Missing orderId' });

  const sheet   = getSheet();
  const headers = getHeaders(sheet);
  const colIdx  = headers.indexOf(COL.ORDER_ID);
  const payIdx  = headers.indexOf(COL.PAY_STATUS);

  if (colIdx < 0 || payIdx < 0) {
    return jsonOut({ paid: false, error: 'Column not found in sheet' });
  }

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][colIdx]).trim() === String(orderId).trim()) {
      const status = String(data[i][payIdx]);
      return jsonOut({ paid: status.includes('Đã thanh toán') });
    }
  }

  return jsonOut({ paid: false });
}


// ═══════════════════════════════════════════════════════════════
//  doPost — Luồng 2: Webhook nhận từ SePay
// ═══════════════════════════════════════════════════════════════
function doPost(e) {
  try {
    // Xác thực token — SePay gửi qua URL: ?sepayToken=NHAP_TOKEN_SEPAY
    if (CONFIG.SEPAY_TOKEN &&
        e.parameter.sepayToken !== CONFIG.SEPAY_TOKEN) {
      return jsonOut({ success: false, error: 'Invalid token' });
    }

    const payload = JSON.parse(e.postData.contents);

    // Chỉ xử lý giao dịch tiền VÀO
    if (payload.transferType && payload.transferType !== 'in') {
      return jsonOut({ success: true, skipped: true, reason: 'Outbound transfer' });
    }

    const description = String(payload.content || payload.description || '');
    const amount      = payload.transferAmount  || payload.amount      || 0;
    const transId     = payload.referenceCode   || String(payload.id)  || '';

    const sheet   = getSheet();
    const headers = getHeaders(sheet);
    const colIdx  = headers.indexOf(COL.ORDER_ID);
    const payIdx  = headers.indexOf(COL.PAY_STATUS);
    const amtIdx  = headers.indexOf(COL.AMOUNT);
    const trnIdx  = headers.indexOf(COL.TRANS_ID);
    const tmIdx   = headers.indexOf(COL.TIME_PAY);

    if (colIdx < 0) {
      return jsonOut({ success: false, error: 'Sheet thiếu cột ' + COL.ORDER_ID });
    }

    const data = sheet.getDataRange().getValues();
    const descUpper = description.toUpperCase();

    for (let i = 1; i < data.length; i++) {
      const orderId = String(data[i][colIdx]).trim();
      if (!orderId) continue;

      // Tìm mã đơn trong nội dung chuyển khoản (không phân biệt hoa thường)
      if (descUpper.includes(orderId.toUpperCase())) {
        const row = i + 1; // chuyển sang 1-based
        if (payIdx >= 0) sheet.getRange(row, payIdx + 1).setValue('Đã thanh toán ✅');
        if (amtIdx >= 0) sheet.getRange(row, amtIdx + 1).setValue(amount);
        if (trnIdx >= 0) sheet.getRange(row, trnIdx + 1).setValue(transId);
        if (tmIdx  >= 0) sheet.getRange(row, tmIdx  + 1).setValue(new Date());
        return jsonOut({ success: true, matched: true, orderId: orderId });
      }
    }

    // Không tìm thấy mã đơn nào khớp — ghi log để debug
    return jsonOut({ success: true, matched: false, description: description });

  } catch (err) {
    return jsonOut({ success: false, error: err.message });
  }
}


// ═══════════════════════════════════════════════════════════════
//  TIỆN ÍCH NỘI BỘ
// ═══════════════════════════════════════════════════════════════
function getSheet() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) throw new Error('Không tìm thấy sheet "' + CONFIG.SHEET_NAME + '". Hãy tạo tab có tên này trong Sheets.');
  return sheet;
}

function getHeaders(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return [];
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
    return String(h).trim();
  });
}

function generateOrderId() {
  const tz   = Session.getScriptTimeZone();
  const date = Utilities.formatDate(new Date(), tz, 'yyyyMMdd');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return CONFIG.ORDER_PREFIX + date + rand;
}

function jsonOut(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

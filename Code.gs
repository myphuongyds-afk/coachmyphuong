function doPost(e) {
  try {
    // Tự động kết nối với file Google Sheets chứa đoạn code này
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Trang tính1");
    
    // Đọc các tiêu đề cột (Thời gian, Name, Phone, Email...)
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const nextRow = sheet.getLastRow() + 1;

    // Ráp dữ liệu
    const newRow = headers.map(function(header) {
      if (header === 'Thời gian') return new Date();
      return e.parameter[header] || '';
    });

    // Ghi vào dòng tiếp theo
    sheet.getRange(nextRow, 1, 1, newRow.length).setValues([newRow]);

    return ContentService.createTextOutput(JSON.stringify({ 'result': 'success' })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

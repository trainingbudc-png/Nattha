// ========================================================
// 📌 ไฟล์ Code.gs : ระบบเบิก-ยืม iPad (ฉบับสมบูรณ์ ล่าสุด)
// ========================================================

const LINE_TOKEN = "sujFOoSzSWu0plOmEjiV+u9UftbvvDNkd2gHoIthN+87HEEW0TaIkA/AAEEeTh65ZU/eKg2m3x/lXMHzThOMXpHkuYYBy4MCi2UC69WvJTReo4+8ruDV31M6f4x4jMu3Rlz3Y1ejrZrwxyfcXxR+8AdB04t89/1O/w1cDnyilFU="; 
const WEB_URL = "https://ipadchecklist.vercel.app/"; 

const CONFIG = {
  LOG: "Log",
  USERS: "Users", 
  STEP1: "Step 1 | เตรียม",
  STEP2: "Step 2 | ยืม",
  STEP3: "Step 3 | ก่อนสอบ",
  STEP4: "Step 4 | คืน",
  STEP5: "Step 5 | ตรวจสอบคืน",
  INVENTORY: "คลัง iPad",
  ISSUELOG: "IssueLog" 
};

function doOptions(e) {
  return ContentService.createTextOutput("").setMimeType(ContentService.MimeType.JSON);
}

function formatIpadTextForSheet(ipadIds) {
  if (!ipadIds || ipadIds.length === 0) return "-";
  let normalIds = []; let airIds = [];
  ipadIds.forEach(id => {
    let numMatch = id.match(/\d+/);
    let num = numMatch ? numMatch[0] : id.trim();
    if (id.toLowerCase().includes("air") || id.toLowerCase().includes("apc")) airIds.push(num);
    else normalIds.push(num);
  });

  let displayGroups = []; let chunkSize = 10; 
  if (normalIds.length > 0) {
    let normalChunks = [];
    for (let i = 0; i < normalIds.length; i += chunkSize) normalChunks.push(normalIds.slice(i, i + chunkSize).join(", "));
    displayGroups.push("[iPad] " + normalChunks.join(",\n       ")); 
  }
  if (airIds.length > 0) {
    let airChunks = [];
    for (let i = 0; i < airIds.length; i += chunkSize) airChunks.push(airIds.slice(i, i + chunkSize).join(", "));
    displayGroups.push("[Air+APC] " + airChunks.join(",\n          ")); 
  }
  return displayGroups.join("\n\n"); 
}

function applyIpadRichText(sheet, row, col, text) {
  if (!text || text === "-") return;
  let richText = SpreadsheetApp.newRichTextValue().setText(text);
  let textStyle = SpreadsheetApp.newTextStyle().setBold(true).setForegroundColor("#ff0000").build();
  let ipadIndex = text.indexOf("[iPad]");
  if (ipadIndex !== -1) richText.setTextStyle(ipadIndex, ipadIndex + 6, textStyle);
  let airIndex = text.indexOf("[Air+APC]");
  if (airIndex !== -1) richText.setTextStyle(airIndex, airIndex + 9, textStyle);
  sheet.getRange(row, col).setRichTextValue(richText.build());
}

function getUserIdByName(nameToFind) {
  if (!nameToFind) return null;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("ชื่อผู้ใช้งาน");
  if (!sheet) return null;
  const rows = sheet.getDataRange().getValues();
  const targetName = nameToFind.toString().replace(/\s+/g, '').toLowerCase();

  for (let i = 1; i < rows.length; i++) {
    let fullName = rows[i][0] ? rows[i][0].toString() : "";
    let nickname = rows[i][1] ? rows[i][1].toString() : "";
    let combinedName = nickname !== "" ? `${fullName}(${nickname})` : fullName;
    let sheetNameStr = combinedName.replace(/\s+/g, '').toLowerCase();
    let sheetFullNameStr = fullName.replace(/\s+/g, '').toLowerCase();

    if (sheetNameStr === targetName || sheetFullNameStr === targetName) {
      let rawId = rows[i][2]; 
      return rawId ? rawId.toString().trim() : null;
    }
  }
  return null;
}

function sendLinePushMessage(userId, flexPayload, altText) {
  if (!userId || userId === "") return;
  const url = "https://api.line.me/v2/bot/message/push";
  const options = {
    "method": "post",
    "headers": { "Content-Type": "application/json", "Authorization": "Bearer " + LINE_TOKEN },
    "payload": JSON.stringify({
      "to": userId,
      "messages": [{ "type": "flex", "altText": altText || "แจ้งเตือนระบบ iPad", "contents": flexPayload }]
    })
  };
  try { UrlFetchApp.fetch(url, options); } catch (e) {}
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (data.action === "getDepartments") {
      const deptSheet = ss.getSheetByName("แผนก");
      if (!deptSheet) {
         return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "ไม่พบชีตแผนก" })).setMimeType(ContentService.MimeType.JSON);
      }
      
      const rows = deptSheet.getDataRange().getValues();
      const depts = [];
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] && rows[i][0].toString().trim() !== "") {
          depts.push(rows[i][0].toString().trim());
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: depts })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "getDashboardData") {
      const logSheet = ss.getSheetByName(CONFIG.LOG);
      const s1Sheet = ss.getSheetByName(CONFIG.STEP1);
      const s2Sheet = ss.getSheetByName(CONFIG.STEP2);
      const s3Sheet = ss.getSheetByName(CONFIG.STEP3);
      const s4Sheet = ss.getSheetByName(CONFIG.STEP4);
      const s5Sheet = ss.getSheetByName(CONFIG.STEP5);

      const logRows = logSheet ? logSheet.getDataRange().getDisplayValues() : [];
      const s1Rows = s1Sheet ? s1Sheet.getDataRange().getDisplayValues() : [];
      const s2Rows = s2Sheet ? s2Sheet.getDataRange().getDisplayValues() : [];
      const s3Rows = s3Sheet ? s3Sheet.getDataRange().getDisplayValues() : [];
      const s4Rows = s4Sheet ? s4Sheet.getDataRange().getDisplayValues() : [];
      const s5Rows = s5Sheet ? s5Sheet.getDataRange().getDisplayValues() : [];

      const s1Map = {}; const adminMap = {};
      for(let i=1; i<s1Rows.length; i++) { s1Map[s1Rows[i][0]] = s1Rows[i][3]; adminMap[s1Rows[i][0]] = s1Rows[i][2]; }

      const s2Map = {}; for(let i=1; i<s2Rows.length; i++) s2Map[s2Rows[i][0]] = s2Rows[i][3];
      const s3Map = {}; for(let i=1; i<s3Rows.length; i++) s3Map[s3Rows[i][0]] = s3Rows[i][3];
      const s4Map = {}; for(let i=1; i<s4Rows.length; i++) s4Map[s4Rows[i][1]] = s4Rows[i][0];
      const s5Map = {}; for(let i=1; i<s5Rows.length; i++) s5Map[s5Rows[i][1]] = s5Rows[i][0];

      let resultData = [];
      
      for(let i = logRows.length - 1; i >= 1; i--) {
        let r = logRows[i];
        let reqId = r[0];
        if(!reqId || reqId === "ReqID" || reqId === "เลขรายการ" || reqId.includes("ยกเลิก")) continue; 

        let count = 0;
        try {
            let parsed = JSON.parse(r[6]);
            if(Array.isArray(parsed)) count = parsed.length;
        } catch(e) {}
        let countStr = count > 0 ? `[${count}/${count}]<br>` : "";

        let currentStatus = r[4] || "";
        let overallStatus = "ไม่ครบ"; 
        if (currentStatus === "คืนแล้ว" || currentStatus.includes("เสร็จสิ้น") || currentStatus.includes("เคลียร์")) overallStatus = "จบขั้นตอน";
        
        let note = r[5] || "";
        let emergency = note.includes("🚨 [ยืมฉุกเฉิน]") ? "✅" : "☐";
        let cleanNote = note.replace(/🚨 \[ยืมฉุกเฉิน\] เหตุผล:\s*/g, ""); 

        resultData.push({
          reqId: reqId,
          step1: s1Map[reqId] ? `✅ ${countStr}` + s1Map[reqId] : "",
          step2: s2Map[reqId] ? `✅ ${countStr}` + s2Map[reqId] : "",
          step3: s3Map[reqId] ? `✅ ${countStr}` + s3Map[reqId] : "",
          step4: s4Map[reqId] ? `✅ ${countStr}` + s4Map[reqId] : "",
          step5: s5Map[reqId] ? `✅ ${countStr}` + s5Map[reqId] : "",
          status: overallStatus,
          preparer: adminMap[reqId] || "-",
          receiver: r[2] || "-",
          note: cleanNote,
          emergency: emergency
        });
      }

      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: resultData })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "getStep1InitData") {
      const userSheet = ss.getSheetByName("ชื่อผู้ใช้งาน");
      const invSheet = ss.getSheetByName(CONFIG.INVENTORY);
      
      const userRows = userSheet ? userSheet.getDataRange().getValues() : [];
      const invRows = invSheet ? invSheet.getDataRange().getValues() : [];
      
      const names = [];
      for (let i = 1; i < userRows.length; i++) {
        if (userRows[i][0] !== "") {
          let fullName = userRows[i][0].toString().trim();
          let nickname = userRows[i][1] ? userRows[i][1].toString().trim() : "";
          names.push(nickname !== "" ? `${fullName} (${nickname})` : fullName);
        }
      }
      
      const availablePads = [];
      for (let i = 1; i < invRows.length; i++) {
        if (invRows[i][1] === "ว่าง") availablePads.push(invRows[i][0].toString().trim());
      }
      
      return ContentService.createTextOutput(JSON.stringify({ 
        status: "success", users: names, inventory: availablePads 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "getInventory") {
      const sheet = ss.getSheetByName(CONFIG.INVENTORY);
      const rows = sheet.getDataRange().getValues();
      const availablePads = [];
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][1] === "ว่าง") availablePads.push(rows[i][0].toString().trim());
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: availablePads })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "getUserNames") {
      const sheet = ss.getSheetByName("ชื่อผู้ใช้งาน");
      const rows = sheet.getDataRange().getValues();
      const names = [];
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] !== "") {
          let fullName = rows[i][0].toString().trim();
          let nickname = rows[i][1] ? rows[i][1].toString().trim() : "";
          names.push(nickname !== "" ? `${fullName} (${nickname})` : fullName);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: names })).setMimeType(ContentService.MimeType.JSON);
    }

    // 📌 ส่วนที่ใช้เช็คสิทธิ์ล็อกอินเข้าสู่ระบบ
    if (data.action === "checkRole") {
      const sheet = ss.getSheetByName(CONFIG.USERS);
      const rows = sheet.getDataRange().getValues();
      let isAllowed = false; let role = "User"; let savedName = "";
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.userId) {
          savedName = rows[i][1]; role = rows[i][2]; isAllowed = true;
          sheet.getRange(i + 1, 6).setValue(Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss"));
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ success: isAllowed, role: role, name: savedName })).setMimeType(ContentService.MimeType.JSON);
    }

    // 📌 ส่วนลงทะเบียนผู้ใช้ใหม่
    if (data.action === "registerUser") {
      const sheet = ss.getSheetByName(CONFIG.USERS);
      sheet.appendRow([
        data.userId, 
        data.name, 
        data.role, 
        data.dept, 
        data.phone, 
        Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss"),
        data.nickname || "-"
      ]);
      
      const nameSheet = ss.getSheetByName("ชื่อผู้ใช้งาน");
      if (nameSheet) {
          nameSheet.appendRow([data.name, data.nickname || "", data.userId]);
      }

      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "getStep1Data") {
      const step1Sheet = ss.getSheetByName(CONFIG.STEP1);
      const logSheet = ss.getSheetByName(CONFIG.LOG);
      let adminName = "-", userName = "-";
      let items = [];
      if(step1Sheet) {
        const rows = step1Sheet.getDataRange().getValues();
        for (let i = rows.length - 1; i >= 1; i--) {
          if (rows[i][0] === data.reqId) { adminName = rows[i][2]; break; }
        }
      }
      if (logSheet) {
        const logRows = logSheet.getDataRange().getValues();
        for (let i = logRows.length - 1; i >= 1; i--) { 
          if (logRows[i][0] === data.reqId) { 
            userName = logRows[i][2]; 
            let rawJson = logRows[i][6]; 
            if(rawJson) {
                try {
                    let parsed = JSON.parse(rawJson);
                    items = parsed.map(p => ({ ipadId: p.id || p.ipadId }));
                } catch(e) {}
            }
            break; 
          } 
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: items, adminName: adminName, userName: userName })).setMimeType(ContentService.MimeType.JSON);
    }

if (data.action === "saveStep1") {
      const sheet = ss.getSheetByName(CONFIG.STEP1);
      const logSheet = ss.getSheetByName(CONFIG.LOG);
      const invSheet = ss.getSheetByName(CONFIG.INVENTORY);

      // 📌 ดึงค่าที่ส่งมาจากหน้าเว็บ
      let nextId = data.reqId;

      // ถ้าส่งมาแต่ไม่มี REQ- นำหน้า ให้ระบบเติมให้ทันที
      if (nextId && nextId !== "" && !nextId.toString().toUpperCase().startsWith("REQ-")) {
          nextId = "REQ-" + nextId;
      }

      // ระบบสำรอง: ถ้าไม่มีพารามิเตอร์เลย ค่อยรัน REQ-XXXX ใหม่อัตโนมัติ
      if (!nextId || nextId === "") {
        nextId = "REQ-0001";
        const lastRow = logSheet.getLastRow();
        if (lastRow > 1) {
          const lastIdValue = logSheet.getRange(lastRow, 1).getValue().toString();
          if (lastIdValue.indexOf("REQ-") === 0) { 
             nextId = "REQ-" + ("0000" + (parseInt(lastIdValue.replace("REQ-", ""), 10) + 1)).slice(-4); 
          }
        }
      }
      
      // ... (โค้ดส่วนที่เหลือด้านล่างใช้ของเดิมได้เลย) ...

      let tempIpads = [];
      const invRows = invSheet ? invSheet.getDataRange().getValues() : [];
      const timestampText = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");

      data.ipadData.forEach(item => {
        tempIpads.push(item.id);
        if (invSheet) {
          for (let i = 1; i < invRows.length; i++) {
            if (invRows[i][0].toString().trim() === item.id) {
              invSheet.getRange(i + 1, 2, 1, 4).setValues([["รอแอดมินยืนยัน", timestampText, data.recipientName, data.adminName]]);
              break;
            }
          }
        }
      });
      
      let ipadListText = formatIpadTextForSheet(tempIpads);
      let c1 = data.ipadData[0].drive ? "✅" : "☐"; let c2 = data.ipadData[0].file ? "✅" : "☐";
      let c3 = data.ipadData[0].img ? "✅" : "☐"; let c4 = data.ipadData[0].safari ? "✅" : "☐";
      
      sheet.appendRow([nextId, ipadListText, data.adminName, new Date(), data.note, "", c1, c2, c3, c4]);
      applyIpadRichText(sheet, sheet.getLastRow(), 2, ipadListText);
      
      logSheet.appendRow([nextId, new Date(), data.recipientName, ipadListText, "รอแอดมินยืนยัน", data.note, JSON.stringify(data.ipadData)]);
      applyIpadRichText(logSheet, logSheet.getLastRow(), 4, ipadListText);

      return ContentService.createTextOutput(JSON.stringify({ status: "success", reqId: nextId })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "confirmStep1") {
      const logSheet = ss.getSheetByName(CONFIG.LOG);
      const invSheet = ss.getSheetByName(CONFIG.INVENTORY);
      const reqId = data.reqId;

      let adminName = data.adminName || "Admin"; 
      let recipientName = "", ipadListText = "", rawJson = "";

      const logRows = logSheet.getDataRange().getValues();
      for (let i = 1; i < logRows.length; i++) {
        if (logRows[i][0] === reqId) {
          logSheet.getRange(i + 1, 5).setValue("Step[1]");
          recipientName = logRows[i][2];
          ipadListText = logRows[i][3];
          rawJson = logRows[i][6];
          break;
        }
      }

      if (rawJson && invSheet) {
          try {
              let items = JSON.parse(rawJson);
              const invRows = invSheet.getDataRange().getValues();
              items.forEach(item => {
                  for (let i = 1; i < invRows.length; i++) {
                      if (invRows[i][0].toString().trim() === item.id || invRows[i][0].toString().trim() === item.ipadId) {
                          invSheet.getRange(i + 1, 2).setValue("Step[1]");
                          break;
                      }
                  }
              });
          } catch(e) {}
      }

      const formattedDate = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
      const flexStep1 = {
        "type": "bubble", "size": "mega",
        "header": { "type": "box", "layout": "vertical", "backgroundColor": "#5C1510", "paddingAll": "20px", "contents": [
          { "type": "text", "text": "📦 [Step1]เตรียมเครื่องสำเร็จ", "weight": "bold", "color": "#ffffff", "size": "xl" },
          { "type": "text", "text": `หมายเลขรายการ: ${reqId}`, "color": "#fdf2f2", "size": "sm", "margin": "md" }
        ]},
        "body": { "type": "box", "layout": "vertical", "backgroundColor": "#ffffff", "paddingAll": "20px", "contents": [
          { "type": "text", "text": "อุปกรณ์ที่ระบุในรายการ:", "color": "#aaaaaa", "size": "xs", "weight": "bold", "margin": "md" },
          { "type": "text", "text": ipadListText, "wrap": true, "color": "#333333", "margin": "sm", "size": "sm" },
          { "type": "separator", "margin": "lg", "color": "#eeeeee" },
          { "type": "box", "layout": "horizontal", "margin": "md", "contents": [ { "type": "text", "text": "ผู้ขอเบิกยืม", "color": "#888888", "size": "sm" }, { "type": "text", "text": recipientName, "align": "end", "color": "#333333", "size": "sm", "weight": "bold" } ] },
          { "type": "box", "layout": "horizontal", "margin": "md", "contents": [ { "type": "text", "text": "วัน/เวลา", "color": "#888888", "size": "sm" }, { "type": "text", "text": formattedDate, "align": "end", "color": "#333333", "size": "sm" } ] }
        ]},
        "footer": { "type": "box", "layout": "vertical", "backgroundColor": "#ffffff", "paddingAll": "20px", "contents": [
          { "type": "button", "action": { "type": "uri", "label": "ไปยัง➡️[Step2]", "uri": `${WEB_URL}/step2.html?reqId=${reqId}` }, "style": "primary", "color": "#5C1510", "height": "sm" }
        ]}
      };

      const borrowerId = getUserIdByName(recipientName);
      sendLinePushMessage(borrowerId, flexStep1, "[ แจ้งเตือน ] ระบบเตรียมเครื่องพร้อมแล้ว");

      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "cancelStep1") {
      const logSheet = ss.getSheetByName(CONFIG.LOG);
      const invSheet = ss.getSheetByName(CONFIG.INVENTORY);
      const reqId = data.reqId;

      let rawJson = "";
      const logRows = logSheet.getDataRange().getValues();
      for (let i = 1; i < logRows.length; i++) {
        if (logRows[i][0] === reqId) {
          logSheet.getRange(i + 1, 5).setValue("❌ ยกเลิกรายการ");
          rawJson = logRows[i][6];
          break;
        }
      }

      if (rawJson && invSheet) {
          try {
              let items = JSON.parse(rawJson);
              const invRows = invSheet.getDataRange().getValues();
              items.forEach(item => {
                  for (let i = 1; i < invRows.length; i++) {
                      if (invRows[i][0].toString().trim() === item.id || invRows[i][0].toString().trim() === item.ipadId) {
                          invSheet.getRange(i + 1, 2, 1, 4).setValues([["ว่าง", "", "-", "-"]]);
                          break;
                      }
                  }
              });
          } catch(e) {}
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "updateStatus") {
      const logSheet = ss.getSheetByName(CONFIG.LOG);
      const step2Sheet = ss.getSheetByName(CONFIG.STEP2);
      const invSheet = ss.getSheetByName(CONFIG.INVENTORY);

      const rows = logSheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][0] === data.reqId) {
          logSheet.getRange(i + 1, 5).setValue("Step[2]");
          logSheet.getRange(i + 1, 6).setValue(data.note);
          logSheet.getRange(i + 1, 7).setValue(JSON.stringify(data.items)); 
          break;
        }
      }

      let tempIpads = [];
      const invRows = invSheet ? invSheet.getDataRange().getValues() : [];
      const timestampText = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");

      data.items.forEach(item => {
        tempIpads.push(item.ipadId);
        if (invSheet) {
          for (let i = 1; i < invRows.length; i++) {
            if (invRows[i][0].toString().trim() === item.ipadId) {
              invSheet.getRange(i + 1, 2, 1, 2).setValues([["Step[2]", timestampText]]);
              invSheet.getRange(i + 1, 5).setValue(data.name);
              break;
            }
          }
        }
      });
      
      let ipadListText = formatIpadTextForSheet(tempIpads);
      const rawApps = data.items[0] ? data.items[0].checklist.split(",") : ["✅","✅","✅","✅"];
      const apps = rawApps.map(x => x === "☑" ? "✅" : x);
      
      step2Sheet.appendRow([data.reqId, ipadListText, data.name, new Date(), data.note, "", apps[0], apps[1], apps[2], apps[3]]);
      applyIpadRichText(step2Sheet, step2Sheet.getLastRow(), 2, ipadListText);

      const formattedDate = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
      const flexStep2 = {
        "type": "bubble", "size": "mega",
        "header": { "type": "box", "layout": "vertical", "backgroundColor": "#5C1510", "paddingAll": "20px", "contents": [
          { "type": "text", "text": "✅[Step2]ผู้ใช้รับเครื่อง", "weight": "bold", "color": "#ffffff", "size": "xl" },
          { "type": "text", "text": `หมายเลขรายการ: ${data.reqId}`, "color": "#fdf2f2", "size": "sm", "margin": "md" }
        ]},
        "body": { "type": "box", "layout": "vertical", "backgroundColor": "#ffffff", "paddingAll": "20px", "contents": [
          { "type": "text", "text": "รายการเครื่องที่รับ:", "color": "#aaaaaa", "size": "xs", "weight": "bold" },
          { "type": "text", "text": ipadListText, "wrap": true, "color": "#333333", "margin": "sm", "size": "sm", "weight": "bold" },
          { "type": "separator", "margin": "lg", "color": "#eeeeee" },
          { "type": "box", "layout": "horizontal", "margin": "lg", "contents": [ { "type": "text", "text": "ผู้รับ", "color": "#888888", "size": "sm" }, { "type": "text", "text": data.name, "align": "end", "color": "#333333", "size": "sm", "weight": "bold" } ] },
          { "type": "box", "layout": "horizontal", "margin": "md", "contents": [ { "type": "text", "text": "วัน/เวลา", "color": "#888888", "size": "sm" }, { "type": "text", "text": formattedDate, "align": "end", "color": "#333333", "size": "sm" } ] }
        ]},
        "footer": { "type": "box", "layout": "vertical", "backgroundColor": "#ffffff", "paddingAll": "20px", "contents": [
          { "type": "button", "action": { "type": "uri", "label": "ไปยัง➡️[Step3]", "uri": `${WEB_URL}/step3.html?reqId=${data.reqId}` }, "style": "primary", "color": "#5C1510", "height": "sm" }
        ]}
      };

      const borrowerId = getUserIdByName(data.name);
      sendLinePushMessage(borrowerId, flexStep2, "[ แจ้งเตือน ] ผู้ใช้ยืนยันการรับเครื่องแล้ว");

      let adminName = "";
      const step1Sheet = ss.getSheetByName(CONFIG.STEP1);
      if(step1Sheet) {
          const s1Rows = step1Sheet.getDataRange().getValues();
          for(let i = 1; i < s1Rows.length; i++) {
              if(s1Rows[i][0] === data.reqId) { adminName = s1Rows[i][2]; break; }
          }
      }
      const adminId = getUserIdByName(adminName);
      if (adminId && adminId !== borrowerId) sendLinePushMessage(adminId, flexStep2, "[ แจ้งเตือน ] ผู้ใช้ยืนยันการรับเครื่องแล้ว");

      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "getStep2Data") {
      const logSheet = ss.getSheetByName(CONFIG.LOG);
      let items = [];
      if (logSheet) {
        const logRows = logSheet.getDataRange().getValues();
        for (let i = logRows.length - 1; i >= 1; i--) { 
          if (logRows[i][0] === data.reqId) { 
            let rawJson = logRows[i][6];
            if(rawJson) {
                try {
                    let parsed = JSON.parse(rawJson);
                    items = parsed.map(p => ({ ipadId: p.id || p.ipadId }));
                } catch(e) {}
            }
            break; 
          } 
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: items })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "saveStep3") {
      const sheet = ss.getSheetByName(CONFIG.STEP3);
      const logSheet = ss.getSheetByName(CONFIG.LOG);
      const invSheet = ss.getSheetByName(CONFIG.INVENTORY);

      const timestamp = new Date();
      let tempIpads = [];
      const invRows = invSheet ? invSheet.getDataRange().getValues() : [];
      const timestampText = Utilities.formatDate(timestamp, "GMT+7", "dd/MM/yyyy HH:mm:ss");

      data.items.forEach(item => {
        tempIpads.push(item.ipadId);
        if (invSheet) {
          for (let i = 1; i < invRows.length; i++) {
            if (invRows[i][0].toString().trim() === item.ipadId) {
              invSheet.getRange(i + 1, 2, 1, 2).setValues([["Step[3]", timestampText]]);
              invSheet.getRange(i + 1, 5).setValue(data.name);
              break;
            }
          }
        }
      });
      
      let ipadListText = formatIpadTextForSheet(tempIpads);
      const rawC = data.items[0] ? data.items[0].checks : ["✅","✅","✅","✅","✅","✅"];
      const c = rawC.map(x => x === "☑" ? "✅" : x);
      
      sheet.appendRow([data.reqId, ipadListText, data.name, timestamp, data.exam, data.note, "", c[0], c[1], c[2], c[3], c[4], c[5]]);
      applyIpadRichText(sheet, sheet.getLastRow(), 2, ipadListText);

      let borrowerName = "";
      if (logSheet) {
        const logRows = logSheet.getDataRange().getValues();
        for (let i = 1; i < logRows.length; i++) {
          if (logRows[i][0] === data.reqId) {
            logSheet.getRange(i + 1, 5).setValue("Step[3]");
            logSheet.getRange(i + 1, 7).setValue(JSON.stringify(data.items)); 
            borrowerName = logRows[i][2];
            break;
          }
        }
      }

      const formattedDate = Utilities.formatDate(timestamp, "GMT+7", "dd/MM/yyyy HH:mm:ss");
      const flexStep3 = {
        "type": "bubble", "size": "mega",
        "header": { "type": "box", "layout": "vertical", "backgroundColor": "#5C1510", "paddingAll": "20px", "contents": [
          { "type": "text", "text": "📝 [Step3]พร้อมสอบ", "weight": "bold", "color": "#ffffff", "size": "xl" },
          { "type": "text", "text": `หมายเลขรายการ: ${data.reqId}`, "color": "#fdf2f2", "size": "sm", "margin": "md" }
        ]},
        "body": { "type": "box", "layout": "vertical", "backgroundColor": "#ffffff", "paddingAll": "20px", "contents": [
          { "type": "text", "text": "รูปแบบการสอบ", "color": "#aaaaaa", "size": "xs", "weight": "bold" },
          { "type": "text", "text": data.exam, "weight": "bold", "size": "lg", "color": "#5C1510", "margin": "sm" },
          { "type": "text", "text": `หมายเหตุ: ${data.note || "-"}`, "size": "xs", "color": "#888888", "margin": "sm" },
          { "type": "separator", "margin": "lg", "color": "#eeeeee" },
          { "type": "text", "text": "เครื่องที่ผ่านการตรวจสอบ:", "weight": "bold", "size": "xs", "color": "#aaaaaa", "margin": "lg" },
          { "type": "text", "text": ipadListText, "wrap": true, "color": "#333333", "margin": "sm", "size": "sm" },
          { "type": "separator", "margin": "lg", "color": "#eeeeee" },
          { "type": "box", "layout": "horizontal", "margin": "lg", "contents": [ { "type": "text", "text": "ผู้ตรวจสอบ", "color": "#888888", "size": "sm" }, { "type": "text", "text": data.name, "align": "end", "color": "#333333", "size": "sm", "weight": "bold" } ] },
          { "type": "box", "layout": "horizontal", "margin": "md", "contents": [ { "type": "text", "text": "วัน/เวลา", "color": "#888888", "size": "sm" }, { "type": "text", "text": timestampText, "align": "end", "color": "#333333", "size": "sm" } ] }
        ]},
        "footer": { "type": "box", "layout": "vertical", "backgroundColor": "#ffffff", "paddingAll": "20px", "contents": [
          { "type": "button", "action": { "type": "uri", "label": "ไปยัง➡️[Step4] ส่งคืน", "uri": `${WEB_URL}/step4.html?reqId=${data.reqId}` }, "style": "primary", "color": "#5C1510", "height": "sm" },
          { "type": "text", "text": "หลังสอบเสร็จ ผู้ใช้งานกดปุ่มนี้เพื่อส่งคืนเครื่อง", "align": "center", "color": "#aaaaaa", "size": "xs", "margin": "md" }
        ]}
      };

      let borrowerId = getUserIdByName(data.name);
      if (!borrowerId && borrowerName) {
          borrowerId = getUserIdByName(borrowerName);
      }
      sendLinePushMessage(borrowerId, flexStep3, "[ แจ้งเตือน ] ระบบตรวจสอบก่อนสอบเสร็จสิ้น พร้อมลุย!");

      let adminName = "";
      const step1Sheet = ss.getSheetByName(CONFIG.STEP1);
      if(step1Sheet) {
          const s1Rows = step1Sheet.getDataRange().getValues();
          for(let i = 1; i < s1Rows.length; i++) {
              if(s1Rows[i][0] === data.reqId) { adminName = s1Rows[i][2]; break; }
          }
      }
      const adminId = getUserIdByName(adminName);
      if (adminId && adminId !== borrowerId) {
          sendLinePushMessage(adminId, flexStep3, "[ แจ้งเตือน ] ผู้ใช้ยืนยันตรวจสอบเครื่องก่อนสอบเรียบร้อยแล้ว");
      }

      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "saveStep4") {
      const sheet = ss.getSheetByName(CONFIG.STEP4);
      const logSheet = ss.getSheetByName(CONFIG.LOG);
      const invSheet = ss.getSheetByName(CONFIG.INVENTORY);

      const timestamp = new Date();
      let tempIpads = [];
      const invRows = invSheet ? invSheet.getDataRange().getValues() : [];
      const timestampText = Utilities.formatDate(timestamp, "GMT+7", "dd/MM/yyyy HH:mm:ss");

      data.items.forEach(item => {
        tempIpads.push(item.ipadId);
        if (invSheet) {
          for (let i = 1; i < invRows.length; i++) {
            if (invRows[i][0].toString().trim() === item.ipadId) {
              invSheet.getRange(i + 1, 2, 1, 2).setValues([["Step[4]", timestampText]]);
              invSheet.getRange(i + 1, 5).setValue(data.name);
              break;
            }
          }
        }
      });

      let ipadListText = formatIpadTextForSheet(tempIpads);
      const rawC = data.items[0] ? data.items[0].checks : ["✅","✅","✅","✅","✅","✅","✅","✅"];
      const c = rawC.map(x => x === "☑" ? "✅" : x);
      
      sheet.appendRow([timestamp, data.reqId, ipadListText, data.name, c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7]]);
      applyIpadRichText(sheet, sheet.getLastRow(), 3, ipadListText);

      if (logSheet) {
        const logRows = logSheet.getDataRange().getValues();
        for (let i = 1; i < logRows.length; i++) {
          if (logRows[i][0] === data.reqId) {
            logSheet.getRange(i + 1, 5).setValue("Step[4]");
            logSheet.getRange(i + 1, 7).setValue(JSON.stringify(data.items)); 
            break;
          }
        }
      }

      const flexStep4 = {
        "type": "bubble", "size": "mega",
        "header": { "type": "box", "layout": "vertical", "backgroundColor": "#5C1510", "paddingAll": "20px", "contents": [
          { "type": "text", "text": "📥 [Step4] ส่งคืนเครื่อง", "weight": "bold", "color": "#ffffff", "size": "xl" },
          { "type": "text", "text": `หมายเลขรายการ: ${data.reqId}`, "color": "#fdf2f2", "size": "sm", "margin": "md" }
        ]},
        "body": { "type": "box", "layout": "vertical", "backgroundColor": "#ffffff", "paddingAll": "20px", "contents": [
          { "type": "text", "text": "เครื่องที่ส่งคืนเรียบร้อยแล้ว:", "weight": "bold", "size": "xs", "color": "#aaaaaa", "margin": "md" },
          { "type": "text", "text": ipadListText, "wrap": true, "color": "#333333", "margin": "sm", "size": "sm" },
          { "type": "separator", "margin": "lg", "color": "#eeeeee" },
          { "type": "box", "layout": "horizontal", "margin": "lg", "contents": [ { "type": "text", "text": "ผู้ส่งคืน", "color": "#888888", "size": "sm" }, { "type": "text", "text": data.name, "align": "end", "color": "#333333", "size": "sm", "weight": "bold" } ] },
          { "type": "box", "layout": "horizontal", "margin": "md", "contents": [ { "type": "text", "text": "วัน/เวลา", "color": "#888888", "size": "sm" }, { "type": "text", "text": timestampText, "align": "end", "color": "#333333", "size": "sm" } ] }
        ]},
        "footer": { "type": "box", "layout": "vertical", "backgroundColor": "#ffffff", "paddingAll": "20px", "contents": [
          { "type": "button", "action": { "type": "uri", "label": "แอดมิน ➡️ ตรวจสอบ [Step5]", "uri": `${WEB_URL}/step5.html?reqId=${data.reqId}` }, "style": "primary", "color": "#5C1510", "height": "sm" },
          { "type": "text", "text": "แจ้งเตือนแอดมิน: โปรดตรวจสอบเครื่องที่ได้รับคืน", "align": "center", "color": "#aaaaaa", "size": "xs", "margin": "md" }
        ]}
      };

      const borrowerId = getUserIdByName(data.name) || getUserIdByName(logRows.find(r => r[0] === data.reqId)?.[2] || "");
      sendLinePushMessage(borrowerId, flexStep4, "[ แจ้งเตือน ] อุปกรณ์ถูกส่งคืนเรียบร้อยแล้ว");

      let adminName = "";
      const step1Sheet = ss.getSheetByName(CONFIG.STEP1);
      if(step1Sheet) {
          const s1Rows = step1Sheet.getDataRange().getValues();
          for(let i = 1; i < s1Rows.length; i++) {
              if(s1Rows[i][0] === data.reqId) { adminName = s1Rows[i][2]; break; }
          }
      }
      const adminId = getUserIdByName(adminName);
      if (adminId && adminId !== borrowerId) sendLinePushMessage(adminId, flexStep4, "[ แจ้งเตือน ] อุปกรณ์ถูกส่งคืนเรียบร้อยแล้ว");

      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "saveStep5") {
      const sheet = ss.getSheetByName(CONFIG.STEP5);
      const logSheet = ss.getSheetByName(CONFIG.LOG);
      const invSheet = ss.getSheetByName(CONFIG.INVENTORY);

      const timestamp = new Date();
      let tempIpads = [];
      const invRows = invSheet ? invSheet.getDataRange().getValues() : [];
      const timestampText = Utilities.formatDate(timestamp, "GMT+7", "dd/MM/yyyy HH:mm:ss");

      data.items.forEach(item => {
        tempIpads.push(item.ipadId);
        if (invSheet) {
          for (let i = 1; i < invRows.length; i++) {
            if (invRows[i][0].toString().trim() === item.ipadId) {
              invSheet.getRange(i + 1, 2, 1, 4).setValues([["ว่าง", timestampText, "-", data.name]]);
              break;
            }
          }
        }
      });

      let ipadListText = formatIpadTextForSheet(tempIpads);
      const rawC = data.items[0] ? data.items[0].checks : ["✅","✅","✅","✅"];
      const c = rawC.map(x => x === "☑" ? "✅" : x);
      
      sheet.appendRow([timestamp, data.reqId, ipadListText, data.name, data.borrowerName, c[0], c[1], c[2], c[3]]);
      applyIpadRichText(sheet, sheet.getLastRow(), 3, ipadListText);

      if (logSheet) {
        const logRows = logSheet.getDataRange().getValues();
        for (let i = 1; i < logRows.length; i++) {
          if (logRows[i][0] === data.reqId) {
            logSheet.getRange(i + 1, 5).setValue("คืนแล้ว");
            break;
          }
        }
      }

      const flexStep5 = {
        "type": "bubble", "size": "mega",
        "header": { "type": "box", "layout": "vertical", "backgroundColor": "#DC3545", "paddingAll": "20px", "contents": [
          { "type": "text", "text": "🏁 ปิดรายการสมบูรณ์", "weight": "bold", "color": "#ffffff", "size": "xl" },
          { "type": "text", "text": `หมายเลขรายการ: ${data.reqId}`, "color": "#fdf2f2", "size": "sm", "margin": "md" }
        ]},
        "body": { "type": "box", "layout": "vertical", "backgroundColor": "#ffffff", "paddingAll": "20px", "contents": [
          { "type": "text", "text": "ตรวจสอบและเคลียร์เครื่องเรียบร้อย:", "weight": "bold", "size": "xs", "color": "#aaaaaa", "margin": "md" },
          { "type": "text", "text": ipadListText, "wrap": true, "color": "#333333", "margin": "sm", "size": "sm" },
          { "type": "separator", "margin": "lg", "color": "#eeeeee" },
          { "type": "box", "layout": "horizontal", "margin": "lg", "contents": [ { "type": "text", "text": "ผู้ตรวจสอบ", "color": "#888888", "size": "sm" }, { "type": "text", "text": data.name, "align": "end", "color": "#333333", "size": "sm", "weight": "bold" } ] },
          { "type": "box", "layout": "horizontal", "margin": "md", "contents": [ { "type": "text", "text": "วัน/เวลา", "color": "#888888", "size": "sm" }, { "type": "text", "text": timestampText, "align": "end", "color": "#333333", "size": "sm" } ] }
        ]}
      };

      const borrowerId = getUserIdByName(data.borrowerName);
      sendLinePushMessage(borrowerId, flexStep5, "[ แจ้งเตือน ] แอดมินตรวจสอบคืนเครื่องเสร็จสิ้น ปิดรายการเรียบร้อย!");

      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "getData") {
      const logSheet = ss.getSheetByName(CONFIG.LOG);
      const userSheet = ss.getSheetByName("ชื่อผู้ใช้งาน");

      const userMap = {};
      if (userSheet) {
        const uRows = userSheet.getDataRange().getValues();
        for (let i = 1; i < uRows.length; i++) {
          let fName = uRows[i][0] ? uRows[i][0].toString().trim() : "";
          let nName = uRows[i][1] ? uRows[i][1].toString().trim() : "";
          let combined = nName !== "" ? `${fName} (${nName})` : fName;
          let uId = uRows[i][2] ? uRows[i][2].toString().trim() : "";
          
          userMap[combined] = uId; 
          userMap[fName] = uId;    
        }
      }

      const rows = logSheet.getDataRange().getValues();
      const resultData = [];
      let dataRows = rows.slice(1);
      dataRows = dataRows.slice(-30).reverse(); 
      
      dataRows.forEach(r => {
        let ipadListForWeb = r[3]; 
        if (r[6]) {
          try {
            let parsed = JSON.parse(r[6]);
            if (Array.isArray(parsed)) ipadListForWeb = parsed.map(p => p.id || p.ipadId).join(", ");
          } catch(e) {}
        }
        
        let logName = r[2] ? r[2].toString().trim() : "";
        let matchedUserId = userMap[logName] || ""; 

        resultData.push({ 
            reqId: r[0], 
            timestamp: r[1], 
            name: logName, 
            userId: matchedUserId, 
            ipadId: ipadListForWeb, 
            status: r[4], 
            note: r[5] 
        });
      });

      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: resultData })).setMimeType(ContentService.MimeType.JSON);
    }

    // 📌 เพิ่มส่วนการดึงข้อมูลและบันทึกชื่อเล่น
    if (data.action === "getUserProfile") {
      const sheet = ss.getSheetByName(CONFIG.USERS);
      const rows = sheet.getDataRange().getValues();
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][1] === data.name) {
          return ContentService.createTextOutput(JSON.stringify({ 
            status: "success", dept: rows[i][3], phone: rows[i][4], nickname: rows[i][6] || ""
          })).setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "error" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "updateUserProfile") {
      const sheet = ss.getSheetByName(CONFIG.USERS);
      const nameSheet = ss.getSheetByName("ชื่อผู้ใช้งาน");
      let updated = false;

      if (sheet) {
        const rows = sheet.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          if (rows[i][1] === data.name) {
            sheet.getRange(i + 1, 4).setValue(data.dept);
            sheet.getRange(i + 1, 5).setValue(data.phone);
            sheet.getRange(i + 1, 7).setValue(data.nickname || "");
            updated = true;
            break;
          }
        }
      }

      if (nameSheet && updated) {
        const nRows = nameSheet.getDataRange().getValues();
        for (let i = 1; i < nRows.length; i++) {
          if (nRows[i][0] === data.name) {
            nameSheet.getRange(i + 1, 2).setValue(data.nickname || "");
            break;
          }
        }
      }

      if (updated) {
        return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "error" })).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === "reportIssue") {
      let issueSheet = ss.getSheetByName(CONFIG.ISSUELOG);
      const invSheet = ss.getSheetByName(CONFIG.INVENTORY);
      const timestamp = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss");
      
      if (!issueSheet) {
        issueSheet = ss.insertSheet(CONFIG.ISSUELOG);
        issueSheet.appendRow(["วัน-เวลา", "ผู้แจ้ง (แอดมิน)", "รหัส iPad", "ประเภทปัญหา", "รายละเอียด", "สถานะการซ่อม"]);
      }
      
      let logStatus = data.reportCategory === "repair" ? "⚠️ ส่งซ่อม" : "📝 บันทึกรายงาน";

      issueSheet.appendRow([ timestamp, data.adminName, data.ipadId, data.issueType, data.note, logStatus ]);

      if (data.reportCategory === "repair" && invSheet) {
        const invRows = invSheet.getDataRange().getValues();
        for (let i = 1; i < invRows.length; i++) {
          if (invRows[i][0].toString().trim() === data.ipadId.trim()) {
            invSheet.getRange(i + 1, 2).setValue("ส่งซ่อม"); 
            invSheet.getRange(i + 1, 3).setValue(timestamp); 
            invSheet.getRange(i + 1, 4).setValue("-");       
            invSheet.getRange(i + 1, 5).setValue(data.adminName); 
            break;
          }
        }
      }

      let responseMsg = data.reportCategory === "repair" 
          ? `เปลี่ยนสถานะเครื่อง ${data.ipadId} เป็น "ส่งซ่อม" และตัดออกจากระบบแล้ว`
          : `บันทึกรายงานปัญหาเครื่อง ${data.ipadId} เรียบร้อย (เครื่องยังสามารถใช้งานได้ปกติ)`;

      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: responseMsg })).setMimeType(ContentService.MimeType.JSON);
    }

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}
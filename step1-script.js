const API_URL = "https://script.google.com/macros/s/AKfycbyw2y3tAd1h-krTwcdjX67nxIWEH6ySWvKoErnJbjrxIvouq5cG8_smLZqrvJlcLvbE/exec"; 
let activeRequestsList = []; 

window.onload = function() {
    const adminName = localStorage.getItem("userName");
    if (adminName) {
        document.getElementById("adminNameDisplay").value = "ผู้ดำเนินการ: " + adminName;
    } else {
        alert("เซสชันหมดอายุ กรุณาเข้าสู่ระบบผ่านหน้าแรกใหม่ครับ");
        window.location.href = "index.html";
        return;
    }
    
    // ดึง reqId จาก URL ไว้ใช้ตอนบันทึก
    const urlParams = new URLSearchParams(window.location.search);
    currentReqId = urlParams.get('reqId') || "N/A";
    
    loadPendingRequests();
};

async function loadPendingRequests() {
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getData" }) 
        });
        const result = await res.json();
        
        const selectElement = document.getElementById("requestSelect");
        if(selectElement) {
            selectElement.innerHTML = '<option value="">-- กรุณาเลือกรายการเบิกอุปกรณ์ --</option>';
            if (result.status === "success" && result.data.length > 0) {
                activeRequestsList = result.data.filter(item => item.status === "ขอเบิก" || item.status === "รอดำเนินการ");
                activeRequestsList.forEach((req, idx) => {
                    const opt = document.createElement("option");
                    opt.value = idx; 
                    opt.innerText = `คิวที่ ${idx + 1} | คุณ ${req.name} (${req.timestamp})`;
                    selectElement.appendChild(opt);
                });
            }
        }
    } catch (error) {
        console.error("Error loading requests:", error);
    }
}

function onSelectRequest() {
    const selectIdx = document.getElementById("requestSelect").value;
    const recipientGroup = document.getElementById("recipientGroup");
    const recipientInput = document.getElementById("recipientName");
    const countDisplay = document.getElementById("deviceCountDisplay");
    const tableBody = document.getElementById("checklistBody");

    if (selectIdx === "") {
        if(recipientGroup) recipientGroup.style.display = "none";
        if(tableBody) tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#999;padding:20px;">กรุณาเลือกรายการขอเบิกด้านบนเพื่อสร้างรายการเครื่อง</td></tr>';
        return;
    }

    const selectedData = activeRequestsList[selectIdx];
    currentReqId = selectedData.reqId; // อัปเดต ReqId
    const count = parseInt(selectedData.note) || 1; 
    
    if(recipientGroup) recipientGroup.style.display = "block";
    recipientInput.value = selectedData.name;  
    countDisplay.value = count + " เครื่อง";   

    tableBody.innerHTML = "";
    for(let i = 1; i <= count; i++) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><input type="text" class="input-ipad-id form-control" placeholder="รหัสเครื่อง ${i}" required style="width: 110px;"></td>
            <td><input type="checkbox" class="chk-drive" checked></td>
            <td><input type="checkbox" class="chk-file" checked></td>
            <td><input type="checkbox" class="chk-img" checked></td>
            <td><input type="checkbox" class="chk-safari" checked></td>
        `;
        tableBody.appendChild(tr);
    }
}

async function submitStep1Form() {
    const selectIdx = document.getElementById("requestSelect") ? document.getElementById("requestSelect").value : 0;
    
    const adminName = localStorage.getItem("userName");
    const recipientName = document.getElementById("recipientName").value.trim();
    const countText = document.getElementById("deviceCountDisplay").value;

    const rows = document.querySelectorAll('#checklistBody tr');
    let ipadDataArray = [];
    let isAllFilled = true;
    let allChecked = true;

    rows.forEach(row => {
        const idInput = row.querySelector('.input-ipad-id');
        if(idInput) {
            const ipadId = idInput.value.trim();
            if(ipadId === "") isAllFilled = false;
            
            const isDriveChecked = row.querySelector('.chk-drive').checked;
            const isFileChecked = row.querySelector('.chk-file').checked;
            const isImgChecked = row.querySelector('.chk-img').checked;
            const isSafariChecked = row.querySelector('.chk-safari').checked;

            if(!isDriveChecked || !isFileChecked || !isImgChecked || !isSafariChecked) allChecked = false;

            ipadDataArray.push({
                id: ipadId,
                drive: isDriveChecked ? "ผ่าน" : "ไม่ผ่าน",
                file: isFileChecked ? "ผ่าน" : "ไม่ผ่าน",
                img: isImgChecked ? "ผ่าน" : "ไม่ผ่าน",
                safari: isSafariChecked ? "ผ่าน" : "ไม่ผ่าน"
            });
        }
    });

    if (!isAllFilled) return alert("กรุณาระบุ 'รหัสเครื่อง' ให้ครบทุกรายการก่อนกดบันทึกครับ");
    if (!allChecked && !confirm("พบเช็คลิสต์บางรายการไม่ได้ติ๊ก ยืนยันที่จะบันทึกหรือไม่?")) return;

    const submitBtn = document.querySelector('button[type="submit"]');
    if(submitBtn) { submitBtn.innerText = "⏳ กำลังบันทึก..."; submitBtn.disabled = true; }

    try {
        await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ 
                action: "saveStep1", 
                adminName: adminName, 
                reqId: currentReqId,
                ipadData: ipadDataArray, 
                note: `เตรียมให้: ${recipientName} (${countText})` 
            })
        });

        // ✅ จุดเชื่อม Success
        const summary = `เลขรายการ: ${currentReqId}\nรายการเครื่อง: ${ipadDataArray.map(i => i.id).join(', ')}`;
        window.location.href = `success.html?title=เตรียมเครื่องสำเร็จ&desc=บันทึกข้อมูล Step 1 เรียบร้อยแล้ว&summary=${encodeURIComponent(summary)}`;
        
    } catch (error) {
        alert("เกิดข้อผิดพลาดในการบันทึกข้อมูล: " + error);
        if(submitBtn) { submitBtn.innerText = "💾 ส่งข้อมูลการเตรียมเครื่องเข้าระบบ"; submitBtn.disabled = false; }
    }
}
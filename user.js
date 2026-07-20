// =========================================
// 📌 ไฟล์ user.js : ระบบประมวลผลสำหรับหน้าผู้ใช้งาน
// =========================================

window.onload = function() {
    const userName = localStorage.getItem("userName");
    
    if (!userName) {
        window.location.href = "index.html"; 
        return;
    }

    document.getElementById("showName").innerText = userName;
    
    loadUserTableData();
};

async function loadUserTableData() {
    const tbody = document.getElementById("userTableBody");
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-5 text-muted">กำลังโหลดข้อมูล... ⏳</td></tr>';
    
    const currentUser = localStorage.getItem("userName");

    try {
        const res = await callAPI({ action: "getData" });
        
        if (res.status === "success" && res.data && res.data.length > 0) {
            tbody.innerHTML = ""; 
            
            const myData = res.data.filter(item => item.name === currentUser && item.reqId !== "ReqID" && item.reqId !== "เลขรายการ");

            if (myData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-5">คุณยังไม่มีรายการเบิก-ยืมในขณะนี้</td></tr>';
                return;
            }

            myData.forEach(item => {
                let formattedIpads = '<span class="text-muted">-</span>';
                if (item.ipadId && item.ipadId.trim() !== "") {
                    let rawIpads = item.ipadId.split(',').map(id => id.trim());
                    let normalIds = [];
                    let airIds = [];

                    rawIpads.forEach(id => {
                        let numMatch = id.match(/\d+/); 
                        let num = numMatch ? numMatch[0] : id; 
                        if (id.toLowerCase().includes("air") || id.toLowerCase().includes("apc")) {
                            airIds.push(num);
                        } else {
                            normalIds.push(num);
                        }
                    });

                    let displayGroups = [];
                    if (normalIds.length > 0) {
                        displayGroups.push(`<span class="text-danger fw-bold">[iPad]</span> ${normalIds.join(', ')}`);
                    }
                    if (airIds.length > 0) {
                        // ⚙️ จุดที่ 1: เปลี่ยนสีฟอนต์ [Air+APC] จาก text-success เป็น text-danger (สีแดง)
                        displayGroups.push(`<span class="text-danger fw-bold">[Air+APC]</span> ${airIds.join(', ')}`);
                    }
                    formattedIpads = displayGroups.join('<br>');
                }

                let statusTxt = item.status || "-";
                let displayStatus = statusTxt;
                let badgeClass = "badge-gray";
                let actionBtn = "";

                if (statusTxt.includes("Step[1]")) {
                    displayStatus = "Step[1]";
                    // ⚙️ จุดที่ 2: เปลี่ยนสีพื้นหลังกรอบสถานะจาก bg-primary เป็น bg-danger (สีแดง)
                    badgeClass = "bg-danger text-white";
                    actionBtn = `<button class="btn btn-success btn-sm fw-bold rounded-pill px-3 shadow-sm w-100" onclick="window.location.href='step2.html?reqId=${item.reqId}'">➡️ รับเครื่อง</button>`;
                
                } else if (statusTxt.includes("Step[2]")) {
                    displayStatus = "Step[2]";
                    badgeClass = "bg-danger text-White";
                    actionBtn = `<button class="btn btn-warning btn-sm fw-bold rounded-pill px-3 shadow-sm w-100 text-dark" onclick="window.location.href='step3.html?reqId=${item.reqId}'">➡️ ก่อนสอบ</button>`;
                
                } else if (statusTxt.includes("Step[3]")) {
                    displayStatus = "Step[3]";
                    badgeClass = "bg-danger text-White";
                    actionBtn = `<button class="btn btn-sm fw-bold rounded-pill px-3 shadow-sm w-100 text-white" style="background-color: #8b5cf6;" onclick="window.location.href='step4.html?reqId=${item.reqId}'">📥 ส่งคืน</button>`;
                
                } else if (statusTxt.includes("Step[4]") || statusTxt.includes("เคลียร์") || statusTxt.includes("คืนแล้ว") || statusTxt.includes("เสร็จสิ้น")) {
                    displayStatus = statusTxt.includes("Step[4]") ? "รอตรวจคืน" : "คืนเรียบร้อย";
                    badgeClass = statusTxt.includes("Step[4]") ? "bg-danger text-white" : "bg-success text-white";
                    actionBtn = `<button class="btn btn-secondary btn-sm fw-bold rounded-pill px-3 w-100" disabled>✔️ เสร็จสิ้น</button>`;
                } else {
                    displayStatus = "รอดำเนินการ";
                    actionBtn = `<span class="text-muted">-</span>`;
                }
                
                tbody.innerHTML += `
                    <tr>
                        <td data-label="📌 เลขรายการ" class="fw-bold text-dark">${item.reqId}</td>
                        <td data-label="📱 รหัส iPad" style="max-width: 350px; line-height: 1.6;">${formattedIpads}</td>
                        <td data-label="📊 สถานะ"><span class="badge ${badgeClass} px-3 py-2 rounded-pill shadow-sm">${displayStatus}</span></td>
                        <td data-label="⚙️ จัดการ" style="max-width: 150px;">${actionBtn}</td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-5">ไม่พบข้อมูลในระบบ</td></tr>';
        }
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-5">❌ เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูล</td></tr>';
    }
}
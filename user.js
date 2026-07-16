// =========================================
// 📌 ไฟล์ user.js : ระบบประมวลผลสำหรับหน้าผู้ใช้งาน
// =========================================

window.onload = function() {
    const userName = localStorage.getItem("userName");
    
    // ถ้าไม่มีชื่อ (ยังไม่ล็อกอิน) ให้เด้งกลับหน้าแรก
    if (!userName) {
        window.location.href = "index.html"; 
        return;
    }

    // แสดงชื่อบน Navbar
    document.getElementById("showName").innerText = userName;
    
    // โหลดข้อมูลตาราง
    loadUserTableData();
};

// -----------------------------------------
// ฟังก์ชันดึงและกรองข้อมูลเฉพาะของ User
// -----------------------------------------
async function loadUserTableData() {
    const tbody = document.getElementById("userTableBody");
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-muted">กำลังโหลดข้อมูล... ⏳</td></tr>';
    
    const currentUser = localStorage.getItem("userName");

    try {
        // ใช้คำสั่ง callAPI จาก script.js
        const res = await callAPI({ action: "getData" });
        
        if (res.status === "success" && res.data && res.data.length > 0) {
            tbody.innerHTML = ""; 
            
            // 📌 กรองเอาเฉพาะข้อมูลที่มีชื่อตรงกับผู้ใช้ปัจจุบันเท่านั้น
            const myData = res.data.filter(item => item.name === currentUser && item.reqId !== "ReqID" && item.reqId !== "เลขรายการ");

            if (myData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-5">คุณยังไม่มีรายการเบิก-ยืมในขณะนี้</td></tr>';
                return;
            }

            myData.forEach(item => {
                let dateStr = "-";
                if (item.timestamp) {
                    const d = new Date(item.timestamp);
                    dateStr = d.toLocaleDateString("th-TH") + " " + d.toLocaleTimeString("th-TH", {hour: '2-digit', minute:'2-digit'});
                }

                let statusTxt = item.status || "-";
                let displayStatus = statusTxt;
                let badgeClass = "badge-gray";
                let actionBtn = "";

                // 📌 ลอจิกปุ่มอัจฉริยะ (เปลี่ยนฟังก์ชันและสีตามสถานะ)
                if (statusTxt.includes("Step[1]")) {
                    displayStatus = "Step[1]";
                    badgeClass = "bg-primary text-white";
                    actionBtn = `<button class="btn btn-success btn-sm fw-bold rounded-pill px-3 shadow-sm w-100" onclick="goToStep(2, '${item.reqId}')">➡️ รับเครื่อง</button>`;
                
                } else if (statusTxt.includes("Step[2]")) {
                    displayStatus = "Step[2]";
                    badgeClass = "bg-info text-dark";
                    actionBtn = `<button class="btn btn-warning btn-sm fw-bold rounded-pill px-3 shadow-sm w-100 text-dark" onclick="goToStep(3, '${item.reqId}')">➡️ ก่อนสอบ</button>`;
                
                } else if (statusTxt.includes("Step[3]")) {
                    displayStatus = "Step[3]";
                    badgeClass = "bg-warning text-dark";
                    actionBtn = `<button class="btn btn-sm fw-bold rounded-pill px-3 shadow-sm w-100 text-white" style="background-color: #8b5cf6;" onclick="goToStep(4, '${item.reqId}')">📥 ส่งคืน</button>`;
                
                } else if (statusTxt.includes("Step[4]") || statusTxt.includes("เคลียร์") || statusTxt.includes("คืนแล้ว") || statusTxt.includes("เสร็จสิ้น")) {
                    displayStatus = statusTxt.includes("Step[4]") ? "รอตรวจคืน" : "คืนเรียบร้อย";
                    badgeClass = statusTxt.includes("Step[4]") ? "bg-danger text-white" : "bg-success text-white";
                    actionBtn = `<button class="btn btn-secondary btn-sm fw-bold rounded-pill px-3 w-100" disabled>✔️ เสร็จสิ้น</button>`;
                } else {
                    displayStatus = "รอดำเนินการ";
                    actionBtn = `<span class="text-muted">-</span>`;
                }
                
                // สร้างแถวตาราง (รองรับ Responsive มือถือด้วย data-label)
                tbody.innerHTML += `
                    <tr>
                        <td data-label="📌 เลขรายการ" class="fw-bold text-dark">${item.reqId}</td>
                        <td data-label="🕒 อัปเดตล่าสุด" class="text-muted" style="font-size: 0.85rem;">${dateStr}</td>
                        <td data-label="📱 รหัส iPad" class="fw-bold text-primary">${item.ipadId || "-"}</td>
                        <td data-label="📊 สถานะ"><span class="badge ${badgeClass} px-3 py-2 rounded-pill shadow-sm">${displayStatus}</span></td>
                        <td data-label="⚙️ จัดการ" style="max-width: 150px;">${actionBtn}</td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-5">ไม่พบข้อมูลในระบบ</td></tr>';
        }
    } catch (err) {
        console.error(err);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-5">❌ เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูล</td></tr>';
    }
}

// -----------------------------------------
// ฟังก์ชันส่งไปหน้า Step ต่างๆ
// -----------------------------------------
function goToStep(stepNumber, reqId) {
    // ⚠️ หมายเหตุ: ถ้าไฟล์ step ของพี่มี _3 ต่อท้าย (เช่น step2_3.html) ให้เพิ่ม _3 เข้าไปในบรรทัดด้านล่างนี้นะครับ
    window.location.href = `step${stepNumber}.html?reqId=${reqId}`;
}

// -----------------------------------------
// ฟังก์ชันแจ้งปัญหา (เตรียมไว้พัฒนาต่อ)
// -----------------------------------------
function reportIssue() {
    Swal.fire({
        title: "ระบบแจ้งปัญหา",
        text: "ฟังก์ชันนี้กำลังอยู่ระหว่างการพัฒนาครับ 🛠️",
        icon: "info",
        confirmButtonColor: "#0ea5e9",
        confirmButtonText: "ตกลง"
    });
}
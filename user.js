// =========================================
// 📌 ไฟล์ user.js : ระบบประมวลผลสำหรับหน้าผู้ใช้งาน (ฉบับแยก 2 ตาราง)
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
    const activeTbody = document.getElementById("activeTableBody");
    const historyTbody = document.getElementById("historyTableBody");
    
    activeTbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">กำลังโหลดข้อมูล... ⏳</td></tr>';
    historyTbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">กำลังโหลดข้อมูล... ⏳</td></tr>';
    
    const currentUserId = localStorage.getItem("userId");
    const currentUserName = localStorage.getItem("userName"); 

    try {
        const res = await callAPI({ action: "getData" });
        
        if (res.status === "success" && res.data && res.data.length > 0) {
            // กรองข้อมูลเฉพาะของ User นี้
            const myData = res.data.filter(item => {
                let dbName = item.name ? item.name.split("(")[0].trim() : "";
                let localName = currentUserName ? currentUserName.split("(")[0].trim() : "";

                let matchUser = (item.userId && item.userId === currentUserId) || 
                                (dbName === localName) || 
                                (item.name && item.name.includes(localName));
                                
                let isValidReq = item.reqId && item.reqId !== "ReqID" && item.reqId !== "เลขรายการ";
                return matchUser && isValidReq;
            });

            if (myData.length === 0) {
                activeTbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">🎉 ไม่มีรายการที่กำลังดำเนินการ</td></tr>';
                historyTbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">ยังไม่มีประวัติการยืม-คืน</td></tr>';
                return;
            }

            let activeList = [];
            let historyList = [];

            myData.forEach(item => {
                let statusTxt = item.status || "";
                let isHistory = statusTxt.includes("คืนแล้ว") || statusTxt.includes("เสร็จสิ้น") || statusTxt.includes("เคลียร์") || statusTxt.includes("ยกเลิก");
                
                if (isHistory) {
                    historyList.push(item);
                } else {
                    activeList.push(item);
                }
            });

            // วาดตาราง Active (ด้านบน)
            renderUserTableRows(activeList, activeTbody, false);
            // วาดตาราง History (ด้านล่าง)
            renderUserTableRows(historyList, historyTbody, true);

        } else {
            activeTbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">ไม่มีรายการในระบบ</td></tr>';
            historyTbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">ไม่มีประวัติในระบบ</td></tr>';
        }
    } catch (err) {
        console.error("UserTable Error:", err);
        activeTbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">❌ เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูล</td></tr>';
        historyTbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">❌ เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูล</td></tr>';
    }
}

function renderUserTableRows(dataList, tbodyElement, isHistoryTable) {
    tbodyElement.innerHTML = "";

    if (dataList.length === 0) {
        tbodyElement.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">${isHistoryTable ? "ยังไม่มีประวัติรายการเสร็จสิ้น" : "🎉 ไม่มีรายการที่กำลังดำเนินการ"}</td></tr>`;
        return;
    }

    dataList.forEach(item => {
        // --- 1. จัดการข้อมูลรหัส iPad ---
        let formattedIpads = '<span class="text-muted">-</span>';
        if (item.ipadId && item.ipadId.trim() !== "") {
            let rawIpads = item.ipadId.split(',').map(id => id.trim());
            let normalIds = [], airIds = [];

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
            // ปรับสีและสไตล์ของ Tag iPad ให้ดูคล้าย Admin
            if (normalIds.length > 0) displayGroups.push(`<span class="badge bg-dark text-white me-1">[iPad]</span> <span class="fw-bold">${normalIds.join(', ')}</span>`);
            if (airIds.length > 0) displayGroups.push(`<span class="badge bg-danger text-white me-1">[Air+APC]</span> <span class="fw-bold">${airIds.join(', ')}</span>`);
            formattedIpads = displayGroups.join('<br>');
        }

        // --- 2. จัดการข้อมูลสถานะและปุ่ม ---
        let statusTxt = item.status || "-";
        let displayStatus = statusTxt;
        let badgeClass = "bg-secondary text-white";
        let actionBtn = "";

        if (statusTxt.includes("Step[1]")) {
            displayStatus = "Step[1] : รับเครื่อง";
            badgeClass = "bg-primary text-white";
            actionBtn = `<button class="btn btn-primary btn-sm fw-bold rounded px-3 shadow-sm w-100" onclick="window.location.href='step2.html?reqId=${item.reqId}'"><i class="bi bi-box-seam me-1"></i> รับเครื่อง</button>`;
        } else if (statusTxt.includes("Step[2]")) {
            displayStatus = "Step[2] : ก่อนสอบ";
            badgeClass = "bg-warning text-dark";
            actionBtn = `<button class="btn btn-warning btn-sm fw-bold rounded px-3 shadow-sm w-100" onclick="window.location.href='step3.html?reqId=${item.reqId}'"><i class="bi bi-camera me-1"></i> ก่อนสอบ</button>`;
        } else if (statusTxt.includes("Step[3]")) {
            displayStatus = "Step[3] : ส่งคืน";
            badgeClass = "bg-info text-dark";
            actionBtn = `<button class="btn btn-info btn-sm fw-bold rounded px-3 shadow-sm w-100" onclick="window.location.href='step4.html?reqId=${item.reqId}'"><i class="bi bi-arrow-return-left me-1"></i> ส่งคืน</button>`;
        } else if (statusTxt.includes("Step[4]")) {
            displayStatus = "รอ Admin ตรวจคืน";
            badgeClass = "bg-danger text-white";
            actionBtn = `<button class="btn btn-outline-danger btn-sm fw-bold rounded px-3 w-100" disabled><i class="bi bi-hourglass-split me-1"></i> รอตรวจ</button>`;
        } else if (statusTxt.includes("เคลียร์") || statusTxt.includes("คืนแล้ว") || statusTxt.includes("เสร็จสิ้น")) {
            displayStatus = "คืนเรียบร้อย";
            badgeClass = "bg-success text-white";
            actionBtn = `<button class="btn btn-success btn-sm fw-bold rounded px-3 w-100" disabled><i class="bi bi-check-circle me-1"></i> เสร็จสิ้น</button>`;
        } else if (statusTxt.includes("ยกเลิก")) {
            displayStatus = "ยกเลิกรายการ";
            badgeClass = "bg-light text-secondary border";
            actionBtn = `<button class="btn btn-light btn-sm fw-bold rounded px-3 w-100 border" disabled><i class="bi bi-x-circle me-1"></i> ยกเลิก</button>`;
        } else {
            displayStatus = statusTxt;
            badgeClass = "bg-secondary text-white"; 
            actionBtn = `<span class="text-muted">-</span>`;
        }
        
        // --- 3. วาดตารางโดยแยก UX ระหว่าง Active และ History ---
        if (!isHistoryTable) {
            // 🌟 UX สำหรับตารางแรก (Active) - สไตล์ Admin
            tbodyElement.innerHTML += `
                <tr class="align-middle shadow-sm bg-white" style="border-bottom: 2px solid #f8f9fa; transition: 0.3s;">
                    <td data-label="📌 เลขรายการ" class="p-3">
                        <div class="d-flex align-items-center">
                            <div class="bg-light text-danger rounded p-2 me-2 shadow-sm">
                                <i class="bi bi-file-earmark-text-fill"></i>
                            </div>
                            <span class="fw-bold text-dark fs-6">${item.reqId}</span>
                        </div>
                    </td>
                    <td data-label="📱 รหัส iPad" class="p-3" style="max-width: 350px; line-height: 1.8;">
                        ${formattedIpads}
                    </td>
                    <td data-label="📊 สถานะ" class="p-3 text-center">
                        <span class="badge ${badgeClass} px-3 py-2 rounded-pill shadow-sm" style="font-size: 0.85rem; letter-spacing: 0.5px;">${displayStatus}</span>
                    </td>
                    <td data-label="⚙️ จัดการ" class="p-3 text-center" style="max-width: 150px;">
                        ${actionBtn}
                    </td>
                </tr>
            `;
        } else {
            // 📝 UX สำหรับตารางประวัติ (History) - สไตล์มินิมอลแบบเดิม
            tbodyElement.innerHTML += `
                <tr class="align-middle border-bottom">
                    <td data-label="📌 เลขรายการ" class="fw-bold text-secondary">${item.reqId}</td>
                    <td data-label="📱 รหัส iPad" style="max-width: 350px; line-height: 1.6; font-size: 0.9rem;">${formattedIpads}</td>
                    <td data-label="📊 สถานะ"><span class="badge bg-light text-dark border px-2 py-1 rounded">${displayStatus}</span></td>
                    <td data-label="⚙️ จัดการ" style="max-width: 150px;">${actionBtn}</td>
                </tr>
            `;
        }
    });
}

// ==========================================
// 📌 ระบบจัดการข้อมูลส่วนตัว (Modal)
// ==========================================
let profileModal;
let isDeptLoaded = false; 

async function openProfileModal() {
    const currentUser = localStorage.getItem("userName");
    
    let firstName = currentUser;
    let lastName = "";
    if (currentUser && currentUser.includes(" ")) {
        const nameParts = currentUser.split(" ");
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(" ");
    }
    
    document.getElementById("editProfileFirstName").value = firstName;
    document.getElementById("editProfileLastName").value = lastName;
    document.getElementById("editProfileNickname").value = "กำลังโหลด..."; 
    document.getElementById("editProfilePhone").value = "กำลังโหลด...";

    if (!profileModal) {
        profileModal = new bootstrap.Modal(document.getElementById('profileModal'));
    }
    profileModal.show();

    if (!isDeptLoaded) {
        try {
            const deptRes = await callAPI({ action: "getDepartments" });
            if (deptRes.status === "success") {
                const deptSelect = document.getElementById("editProfileDept");
                deptSelect.innerHTML = '<option value="">-- กรุณาเลือกแผนกของคุณ --</option>';
                deptRes.data.forEach(d => {
                    deptSelect.innerHTML += `<option value="${d}">${d}</option>`;
                });
                isDeptLoaded = true;
            }
        } catch (error) {
            console.error("โหลดแผนกไม่สำเร็จ", error);
        }
    }

    try {
        const res = await callAPI({ action: "getUserProfile", name: currentUser });
        if (res.status === "success") {
            document.getElementById("editProfileNickname").value = res.nickname || "";
            document.getElementById("editProfilePhone").value = res.phone || "";
            
            const deptSelect = document.getElementById("editProfileDept");
            if (res.dept) {
                let optionExists = Array.from(deptSelect.options).some(opt => opt.value === res.dept);
                if (!optionExists && res.dept !== "") {
                    deptSelect.innerHTML += `<option value="${res.dept}">${res.dept}</option>`;
                }
                deptSelect.value = res.dept;
            } else {
                deptSelect.value = "";
            }
        } else {
            document.getElementById("editProfileNickname").value = "";
            document.getElementById("editProfileDept").value = "";
            document.getElementById("editProfilePhone").value = "";
        }
    } catch (error) {
        document.getElementById("editProfileNickname").value = "";
        document.getElementById("editProfileDept").value = "";
        document.getElementById("editProfilePhone").value = "";
    }
}

async function saveProfileData() {
    const currentUserId = localStorage.getItem("userId"); 
    const firstName = document.getElementById("editProfileFirstName").value.trim();
    const lastName = document.getElementById("editProfileLastName").value.trim();
    const nickname = document.getElementById("editProfileNickname").value.trim(); 
    const dept = document.getElementById("editProfileDept").value.trim();
    let phone = document.getElementById("editProfilePhone").value.trim();

    if (!firstName || !lastName || !dept || !phone) {
        Swal.fire("แจ้งเตือน", "กรุณากรอกข้อมูล ชื่อ, นามสกุล, ฝ่าย/แผนก และ เบอร์โทรศัพท์ ให้ครบถ้วนครับ", "warning");
        return;
    }

    phone = phone.replace(/-/g, ""); 
    if (phone.length === 10) {
        phone = phone.substring(0, 3) + "-" + phone.substring(3, 6) + "-" + phone.substring(6);
    } else {
        phone = "Tel. " + phone; 
    }

    const newFullName = firstName + " " + lastName; 

    const btn = document.getElementById("btnSaveProfile");
    const originalText = btn.innerHTML;
    btn.innerHTML = "กำลังบันทึก... ⏳";
    btn.disabled = true;

    try {
        const res = await callAPI({ 
            action: "updateUserProfile", 
            userId: currentUserId, 
            name: newFullName,     
            nickname: nickname, 
            dept: dept, 
            phone: phone 
        });

        if (res.status === "success") {
            profileModal.hide();
            
            localStorage.setItem("userName", newFullName); 
            document.getElementById("showName").innerText = newFullName;

            Swal.fire({
                title: "บันทึกสำเร็จ!",
                text: "อัปเดตข้อมูลส่วนตัวของคุณเรียบร้อยแล้ว",
                icon: "success",
                confirmButtonColor: "#10b981"
            }).then(() => {
                loadUserTableData(); 
            });
        } else {
            Swal.fire("ข้อผิดพลาด", res.message || "ไม่สามารถอัปเดตข้อมูลได้", "error");
        }
    } catch (error) {
        Swal.fire("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

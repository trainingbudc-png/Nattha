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
    const activeCardsContainer = document.getElementById("activeCardsContainer");
    const historyTbody = document.getElementById("historyTableBody");
    
    activeCardsContainer.innerHTML = '<div class="col-12 text-center py-5 text-muted bg-white rounded-4 border">กำลังโหลดข้อมูล... ⏳</div>';
    historyTbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">กำลังโหลดข้อมูล... ⏳</td></tr>';
    
    // 📌 ดึง LINE ID (userId) และ ชื่อ มาใช้สำหรับการกรองข้อมูล
    const currentUserId = localStorage.getItem("userId");
    const currentUserName = localStorage.getItem("userName"); 

    try {
        const res = await callAPI({ action: "getData" });
        
        if (res.status === "success" && res.data && res.data.length > 0) {
            
            // 📌 ระบบกรองข้อมูลฉบับปรับปรุง: ล็อกเป้าด้วย LINE ID เป็นหลัก
            const myData = res.data.filter(item => {
                let isValidReq = item.reqId && item.reqId !== "ReqID" && item.reqId !== "เลขรายการ";
                if (!isValidReq) return false;

                // 1. ตรวจสอบด้วย LINE ID ก่อน (ชัวร์ที่สุด เปลี่ยนชื่อก็ไม่หลุด)
                if (currentUserId && item.userId === currentUserId) {
                    return true;
                }

                // 2. แผนสำรอง (Fallback): สำหรับรายการเก่าในระบบที่ยังไม่มีการบันทึก LINE ID 
                let dbName = item.name ? item.name.split("(")[0].trim() : "";
                let localName = currentUserName ? currentUserName.split("(")[0].trim() : "";
                if (dbName === localName || (item.name && item.name.includes(localName))) {
                    return true;
                }

                return false;
            });

            if (myData.length === 0) {
                activeCardsContainer.innerHTML = '<div class="col-12 text-center py-5 text-muted bg-white rounded-4 border">🎉 ไม่มีรายการที่กำลังดำเนินการ</div>';
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

            renderActiveUserCards(activeList);
            renderUserTableRows(historyList, historyTbody);

        } else {
            activeCardsContainer.innerHTML = '<div class="col-12 text-center py-5 text-muted bg-white rounded-4 border">ไม่มีรายการในระบบ</div>';
            historyTbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">ไม่มีประวัติในระบบ</td></tr>';
        }
    } catch (err) {
        console.error("UserTable Error:", err);
        activeCardsContainer.innerHTML = '<div class="col-12 text-center text-danger py-5 bg-white rounded-4 border">❌ เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูล</div>';
        historyTbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4">❌ เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูล</td></tr>';
    }
}

// 📌 ฟังก์ชันเสกการ์ดงานแบบ Dropdown สำหรับผู้ใช้
// 📌 ฟังก์ชันเสกการ์ดงานแบบ Dropdown สำหรับผู้ใช้
function renderActiveUserCards(data) {
    const container = document.getElementById("activeCardsContainer");
    container.innerHTML = ""; 
    
    if (data.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted py-5 bg-white rounded-4 border">🎉 ไม่มีรายการที่กำลังดำเนินการ</div>';
        return;
    }

    data.forEach(item => {
        let dateStr = item.timestamp ? new Date(item.timestamp).toLocaleString("th-TH") : "-";
        let safeId = item.reqId ? item.reqId.replace(/[^a-zA-Z0-9]/g, '') : "R" + Math.floor(Math.random() * 10000);

        let formattedIpads = '<span class="text-muted">-</span>';
        if (item.ipadId && item.ipadId.trim() !== "") {
            let rawIpads = item.ipadId.split(',').map(id => id.trim());
            let normalIds = [], airIds = [];
            rawIpads.forEach(id => {
                let numMatch = id.match(/\d+/); 
                let num = numMatch ? numMatch[0] : id; 
                if (id.toLowerCase().includes("air") || id.toLowerCase().includes("apc")) airIds.push(num);
                else normalIds.push(num);
            });
            let displayGroups = [];
            
            if (normalIds.length > 0) {
                displayGroups.push(`<div class="mb-2"><div class="text-danger fw-bold mb-1">[iPad]</div><div style="word-break: break-word; line-height: 1.6; color: #495057;">${normalIds.join(', ')}</div></div>`);
            }
            if (airIds.length > 0) {
                displayGroups.push(`<div class="mb-2"><div class="text-primary fw-bold mb-1">[Air+APC]</div><div style="word-break: break-word; line-height: 1.6; color: #495057;">${airIds.join(', ')}</div></div>`);
            }
            formattedIpads = displayGroups.join('');
        }

        let displayName = item.name || "-";
        let nickNameHtml = "";
        if (displayName !== "-" && displayName.includes("(")) {
            let parts = displayName.split("(");
            displayName = parts[0].trim();
            nickNameHtml = `<div class="text-secondary mt-1" style="font-size: 0.8rem;">(${parts[1].trim()}</div>`;
        }

let statusTxt = item.status || "-";
        let actionBtn = "";
        let stepLabel = ""; // 📌 สร้างตัวแปรเก็บชื่อ Step

        // 📌 เช็คเงื่อนไขว่าอยู่ Step ไหน และกำหนดชื่อ Step ไว้โชว์
        if (statusTxt.includes("Step[1]")) {
            stepLabel = "Step 1";
            actionBtn = `<button class="btn btn-outline-danger bg-white border-2 btn-sm rounded-pill fw-bold px-3 shadow-sm" onclick="window.location.href='step2.html?reqId=${item.reqId}'">รับเครื่อง</button>`;
        } else if (statusTxt.includes("Step[2]")) {
            stepLabel = "Step 2";
            actionBtn = `<button class="btn btn-outline-danger bg-white border-2 btn-sm rounded-pill fw-bold px-3 shadow-sm" onclick="window.location.href='step3.html?reqId=${item.reqId}'">ก่อนสอบ</button>`;
        } else if (statusTxt.includes("Step[3]")) {
            stepLabel = "Step 3";
            actionBtn = `<button class="btn btn-outline-danger bg-white border-2 btn-sm rounded-pill fw-bold px-3 shadow-sm" onclick="window.location.href='step4.html?reqId=${item.reqId}'">ส่งคืน</button>`;
        } else if (statusTxt.includes("Step[4]")) {
            stepLabel = "Step 4";
            actionBtn = `<button class="btn btn-secondary btn-sm fw-bold rounded-pill px-3 shadow-sm" disabled>⏳ รอตรวจคืน</button>`;
        } else {
            stepLabel = statusTxt;
            actionBtn = `<span class="badge bg-secondary text-white px-3 py-2 rounded-pill">${statusTxt}</span>`;
        }

        // 📌 แทรกตัวแปร ${stepLabel} ลงไปข้างๆ ${item.reqId} ใน HTML
        container.innerHTML += `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="active-task-card bg-white rounded-4 shadow-sm position-relative overflow-hidden">
                    <div class="position-absolute top-0 start-0 bottom-0 bg-danger" style="width: 4px;"></div>
                    
                    <div class="p-3 d-flex justify-content-between align-items-center" 
                         style="cursor: pointer; user-select: none;" 
                         data-bs-toggle="collapse" 
                         data-bs-target="#collapse-${safeId}" 
                         aria-expanded="false"
                         onclick="closeOtherAccordions('collapse-${safeId}')">
                        
                        <div class="fw-bold text-dark ps-2 d-flex align-items-center gap-2" style="font-size: 1.05rem;">
                            ${item.reqId}
                            <!-- 📌 เพิ่มข้อความ Step ตัวเล็กๆ สีเทาตรงนี้ -->
                            <span class="text-secondary fw-normal" style="font-size: 0.8rem;">(${stepLabel})</span>
                            <span class="collapse-icon text-muted" style="font-size: 0.7rem;">▼</span>
                        </div>
                        
                        <div onclick="event.stopPropagation();">${actionBtn}</div>
                    </div>

                    <div id="collapse-${safeId}" class="collapse">
                        <!-- ส่วนเนื้อหาด้านในการ์ด (คงเดิม) -->
                        <div class="p-3 pt-2 ps-4 border-top border-light">
                            <div class="text-muted mb-3" style="font-size: 0.75rem;">📅 ${dateStr}</div>
                            <div class="d-flex flex-column flex-sm-row justify-content-between align-items-sm-start gap-3">
                                <div style="line-height: 1.2; min-width: 80px;" class="flex-shrink-0">
                                    <span class="fw-bold text-primary" style="font-size: 0.95rem;">👤 ${displayName}</span>
                                    ${nickNameHtml}
                                </div>
                                <div class="text-end w-100" style="font-size: 0.9rem;">
                                    ${formattedIpads}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

// 📌 ฟังก์ชันสั่งปิดการ์ดอื่นๆ เมื่อกดกางการ์ดใหม่ (ใส่ต่อท้ายได้เลย)
function closeOtherAccordions(targetId) {
    document.querySelectorAll('#activeCardsContainer .collapse.show').forEach(el => {
        if (el.id !== targetId) {
            let bsCollapse = bootstrap.Collapse.getInstance(el) || new bootstrap.Collapse(el, {toggle: false});
            bsCollapse.hide();
        }
    });
}

// 📌 ฟังก์ชันวาดตาราง History (แยกคอลัมน์ รายการ และ เครื่องที่เตรียม)
function renderUserTableRows(dataList, tbodyElement) {
    tbodyElement.innerHTML = "";

    if (dataList.length === 0) {
        tbodyElement.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">ยังไม่มีประวัติรายการเสร็จสิ้น</td></tr>`;
        return;
    }

    dataList.forEach(item => {
        let typeHtml = '<span class="text-muted">-</span>';
        let idsHtml = '<span class="text-muted">-</span>';
        
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

            let typeArr = [];
            let idsArr = [];
            
            if (normalIds.length > 0) {
                typeArr.push(`<div class="fw-bold text-danger mb-1">iPad</div>`);
                idsArr.push(`<div class="mb-1 text-dark" style="word-break: break-word; line-height: 1.6;">${normalIds.join(', ')}</div>`);
            }
            if (airIds.length > 0) {
                typeArr.push(`<div class="fw-bold text-primary mb-1">Air+APC</div>`);
                idsArr.push(`<div class="mb-1 text-dark" style="word-break: break-word; line-height: 1.6;">${airIds.join(', ')}</div>`);
            }
            
            typeHtml = typeArr.join('');
            idsHtml = idsArr.join('');
        }

        let statusTxt = item.status || "-";
        let displayStatus = statusTxt;
        let badgeClass = "bg-secondary text-white";

        if (statusTxt.includes("เคลียร์") || statusTxt.includes("คืนแล้ว") || statusTxt.includes("เสร็จสิ้น")) {
            displayStatus = "คืนเรียบร้อย";
            badgeClass = "bg-success text-white";
        } else if (statusTxt.includes("ยกเลิก")) {
            displayStatus = "ยกเลิกรายการ";
            badgeClass = "bg-light text-secondary border";
        } else {
            displayStatus = statusTxt;
            badgeClass = "bg-secondary text-white"; 
        }
        
        tbodyElement.innerHTML += `
            <tr class="text-center align-middle">
                <td data-label="📌 เลขรายการ" class="fw-bold text-dark">${item.reqId}</td>
                <td data-label="📦 อุปกรณ์ที่ยืม">${typeHtml}</td>
                <td data-label="📱 เครื่องที่เตรียม">${idsHtml}</td>
                <td data-label="📊 สถานะ"><span class="badge ${badgeClass} px-3 py-2 rounded-pill shadow-sm mx-auto">${displayStatus}</span></td>
            </tr>
        `;
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

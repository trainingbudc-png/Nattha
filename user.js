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
    
    const currentUserId = localStorage.getItem("userId");

    try {
        const res = await callAPI({ action: "getData" });
        
        if (res.status === "success" && res.data && res.data.length > 0) {
            tbody.innerHTML = ""; 
            
            // 📌 กรองข้อมูลด้วย userId แทนชื่อ
            const myData = res.data.filter(item => item.userId === currentUserId && item.reqId !== "ReqID" && item.reqId !== "เลขรายการ");

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
                    badgeClass = "bg-secondary text-white"; 
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
    const currentUser = localStorage.getItem("userName");
    const nickname = document.getElementById("editProfileNickname").value.trim(); 
    const dept = document.getElementById("editProfileDept").value.trim();
    let phone = document.getElementById("editProfilePhone").value.trim();

    if (!dept || !phone) {
        Swal.fire("แจ้งเตือน", "กรุณากรอกข้อมูล ฝ่าย/แผนก และ เบอร์โทรศัพท์ ให้ครบถ้วนครับ", "warning");
        return;
    }

    // 🚀 ท่าไม้ตายสับขาหลอก: บังคับเติมขีดกลางให้เบอร์โทร
    phone = phone.replace(/-/g, ""); 
    if (phone.length === 10) {
        phone = phone.substring(0, 3) + "-" + phone.substring(3, 6) + "-" + phone.substring(6);
    } else {
        phone = "Tel. " + phone; 
    }

    const btn = document.getElementById("btnSaveProfile");
    const originalText = btn.innerHTML;
    btn.innerHTML = "กำลังบันทึก... ⏳";
    btn.disabled = true;

    try {
        const res = await callAPI({ 
            action: "updateUserProfile", 
            name: currentUser, 
            nickname: nickname, 
            dept: dept, 
            phone: phone 
        });

        if (res.status === "success") {
            profileModal.hide();
            Swal.fire({
                title: "บันทึกสำเร็จ!",
                text: "อัปเดตข้อมูลส่วนตัวของคุณเรียบร้อยแล้ว",
                icon: "success",
                confirmButtonColor: "#10b981"
            });
        } else {
            Swal.fire("ข้อผิดพลาด", "ไม่สามารถอัปเดตข้อมูลได้", "error");
        }
    } catch (error) {
        Swal.fire("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้", "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
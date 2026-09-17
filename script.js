// =========================================
// 📌 ไฟล์ script.js : แกนกลางจัดการระบบหน้าเว็บ (อัปเกรดความเร็ว Fire & Forget)
// =========================================
const API_URL = "https://script.google.com/macros/s/AKfycbwTYZGGb-XQ1jh301IlRJ15aDlvQm3lqxrlGUSFYG5ColRGichCODQIFM4e6cUxY6kU/exec"; 
const LIFF_ID = "2010557323-PAyWhGxW";

function showLoading(text = "กำลังโหลด...") {
    let overlay = document.getElementById("loadingOverlay");
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = "loadingOverlay";
        overlay.className = "loading-overlay";
        overlay.innerHTML = `<div class="spinner"></div><div class="loading-text" id="loadingText">${text}</div>`;
        document.body.appendChild(overlay);
    } else {
        document.getElementById("loadingText").innerText = text;
    }
    overlay.style.display = "flex";
}

function hideLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.style.display = "none";
}

// 🚀 อัปเกรด callAPI: แยกระบบดึงข้อมูล (ต้องรอ) กับ ระบบบันทึก (ยิงแล้วจบเลย ไม่ต้องรอ)
async function callAPI(payload) {
    try {
        // เช็คว่าคำสั่งนี้คือการบันทึกข้อมูลหรือไม่
        const isSaveAction = payload.action && (
            payload.action.startsWith("saveStep") || 
            payload.action === "updateStatus" || 
            payload.action === "reportIssue" || 
            payload.action === "registerUser" ||
            payload.action === "updateUserProfile"
        );

        if (isSaveAction) {
            // ⚡ ยิงข้อมูลไปหา Google แล้ว "ไม่รอ" คำตอบ
            fetch(API_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload),
                keepalive: true // 🚨 บังคับส่งข้อมูลให้เสร็จแม้ผู้ใช้จะปิดหรือเปลี่ยนหน้าเว็บ
            }).catch(e => console.warn("Background Push:", e));
            
            // แกล้งหน่วงเวลา 0.5 วินาทีให้ดูเป็นธรรมชาติ แล้วเด้ง Success เลย
            await new Promise(r => setTimeout(r, 500));
            return { status: "success", reqId: payload.reqId || "-" };
        }

        // 📥 ถ้าเป็นการดึงข้อมูล (โหลดตาราง/โหลดรายชื่อ) ให้รอคำตอบจากเซิร์ฟเวอร์ตามปกติ
        const res = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        });
        return await res.json();
        
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}

function logoutSystem() {
    if(typeof Swal !== 'undefined') {
        Swal.fire({
            title: "ออกจากระบบ?",
            text: "คุณต้องการออกจากระบบใช่หรือไม่",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#64748b",
            confirmButtonText: "ออกจากระบบ",
            cancelButtonText: "ยกเลิก"
        }).then((result) => { if (result.isConfirmed) executeLogout(); });
    } else {
        if(confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) executeLogout();
    }
}

async function executeLogout() {
    showLoading("กำลังออกจากระบบ...");
    localStorage.clear();
    try {
        await liff.init({ liffId: LIFF_ID });
        if (liff.isLoggedIn()) liff.logout();
        if (liff.isInClient()) liff.closeWindow();
        else window.location.replace("index.html");
    } catch (error) { window.location.replace("index.html"); }
}

function verifyRoleSilently() {
    const userId = localStorage.getItem("userId");
    const currentRole = localStorage.getItem("userRole");
    if (userId) {
        callAPI({ action: "checkRole", userId: userId }).then(res => {
            if (res.success && res.role !== currentRole) {
                localStorage.setItem("userRole", res.role);
                window.location.replace(res.role === "Admin" ? "admin.html" : "user.html");
            }
        }).catch(e => console.log("Silent role check failed:", e));
    }
}

function showNavyAlert(title, htmlText, iconType, redirectUrl = null) {
    if(typeof Swal !== 'undefined') {
        Swal.fire({
            title: title, html: htmlText, icon: iconType,
            confirmButtonColor: "#1e3a8a", confirmButtonText: "OK", allowOutsideClick: false
        }).then(() => { if (redirectUrl) window.location.href = redirectUrl; });
    } else {
        alert(title + "\n" + htmlText.replace(/<[^>]*>?/gm, '')); 
        if (redirectUrl) window.location.href = redirectUrl;
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { clearTimeout(timeout); func(...args); };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

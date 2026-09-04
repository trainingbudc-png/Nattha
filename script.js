// =========================================
// 📌 ไฟล์ script.js : แกนกลางจัดการระบบหน้าเว็บ
// =========================================

const API_URL = "https://script.google.com/macros/s/AKfycbwv7qtsMDLxaXD3RbGB8Q0Nq1U0Q91cRL7rhe0Ge4OWEC41cvtajsI-JlFwjPmRrPCu/exec"; 

const LIFF_ID = "2010557323-PAyWhGxW";

// -----------------------------------------
// 1. ระบบ Loading (หน้าต่างโหลด)
// -----------------------------------------
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

// -----------------------------------------
// 2. ระบบเรียกใช้ API (🚀 ใช้ Fetch แบบมาตรฐานที่สุด ป้องกันปัญหา CORS บล็อกเว็บ 100%)
// -----------------------------------------
async function callAPI(payload) {
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        return await res.json();
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}

// -----------------------------------------
// 3. ระบบจัดการผู้ใช้ & ออกจากระบบ
// -----------------------------------------
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
        }).then((result) => {
            if (result.isConfirmed) executeLogout();
        });
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
    } catch (error) {
        window.location.replace("index.html");
    }
}

// -----------------------------------------
// 4. ระบบตรวจสอบสิทธิ์พื้นหลัง (Silent Role Check)
// -----------------------------------------
function verifyRoleSilently() {
    const userId = localStorage.getItem("userId");
    const currentRole = localStorage.getItem("userRole");
    
    if (userId) {
        callAPI({ action: "checkRole", userId: userId }).then(res => {
            // ถ้าระบบพบว่าสิทธิ์ใน Google Sheet ไม่ตรงกับในเครื่อง ให้สลับหน้าทันที
            if (res.success && res.role !== currentRole) {
                localStorage.setItem("userRole", res.role);
                if (res.role === "Admin") {
                    window.location.replace("admin.html");
                } else {
                    window.location.replace("user.html");
                }
            }
        }).catch(e => console.log("Silent role check failed:", e));
    }
}

// -----------------------------------------
// 5. ระบบแจ้งเตือน (Global Alert) คุมธีม Navy ทั้งระบบ
// -----------------------------------------
function showNavyAlert(title, htmlText, iconType, redirectUrl = null) {
    if(typeof Swal !== 'undefined') {
        Swal.fire({
            title: title,
            html: htmlText,
            icon: iconType,
            confirmButtonColor: "#1e3a8a", // 📌 ล็อกสีกรมท่าไว้ที่นี่ที่เดียวจบ!
            confirmButtonText: "OK",
            allowOutsideClick: false
        }).then(() => {
            if (redirectUrl) {
                window.location.href = redirectUrl;
            }
        });
    } else {
        // Fallback กรณี SweetAlert โหลดไม่ขึ้น
        alert(title + "\n" + htmlText.replace(/<[^>]*>?/gm, '')); 
        if (redirectUrl) {
            window.location.href = redirectUrl;
        }
    }
}

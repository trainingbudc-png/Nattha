// =========================================
// 📌 ไฟล์ script.js : แกนกลางจัดการระบบหน้าเว็บ
// =========================================

const API_URL = "https://script.google.com/macros/s/AKfycbyw2y3tAd1h-krTwcdjX67nxIWEH6ySWvKoErnJbjrxIvouq5cG8_smLZqrvJlcLvbE/exec"; 
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
// 2. ระบบเรียกใช้ API (ใช้แทน fetch แบบเก่า)
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
    // ใช้ SweetAlert2 ทำป๊อปอัปสวยๆ แทน alert ธรรมดา (เดี๋ยวเราจะเอาใส่ในหน้า HTML)
    if(typeof Swal !== 'undefined') {
        Swal.fire({
            title: "ออกจากระบบ?",
            text: "คุณต้องการออกจากระบบใช่หรือไม่",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#ef4444",
            cancelButtonColor: "#64748b",
            confirmButtonText: "ออกจากระบบ",
            cancelButtonText: "ยกเลิก",
            borderRadios: "16px"
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
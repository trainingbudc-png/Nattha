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
// 2. ระบบเรียกใช้ API (🚀 แก้ไข: เอา Headers เจ้าปัญหาออก ป้องกัน Google บล็อก)
// -----------------------------------------
async function callAPI(payload, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            // 📌 ยิงแบบดิบๆ บ้านๆ นี่แหละ Google Apps Script ชอบที่สุด ไม่โดนบล็อกชัวร์
            const res = await fetch(API_URL, {
                method: "POST",
                body: JSON.stringify(payload)
            });
            
            return await res.json();
            
        } catch (error) {
            console.warn(`เชื่อมต่อขัดข้อง (ลองใหม่รอบที่ ${i + 1}/${retries}):`, error);
            
            // ถ้าลองครบ 3 รอบแล้วยังพังอยู่ ค่อยยอมแพ้และโยน Error ออกมา
            if (i === retries - 1) {
                throw error; 
            }
            
            // รอ 1 วินาที แล้วแอบยิงข้อมูลไปขอใหม่เงียบๆ
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
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
    // 📌 เคลียร์ค่าทั้งหมดตอนล็อคเอาท์
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

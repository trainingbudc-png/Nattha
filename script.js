// =========================================
// 📌 ไฟล์ script.js : แกนกลางจัดการระบบหน้าเว็บ (Optimized & Stable)
// 🚀 เพิ่ม Timeout ป้องกันแอปค้าง + Local Cache ดึงข้อมูล 0 วินาที
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

// 🚀 1. อัปเกรด callAPI: เพิ่ม Timeout ตัดจบเมื่อเน็ตค้าง และดักจับ Error JSON
async function callAPI(payload, maxRetries = 3, delayMs = 1500, timeoutMs = 15000) {
    for (let i = 0; i < maxRetries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs); // จับเวลาถ้าเกินกำหนดให้ยกเลิก

        try {
            const res = await fetch(API_URL, { 
                method: "POST", 
                headers: { "Content-Type": "text/plain;charset=utf-8" }, 
                body: JSON.stringify(payload),
                signal: controller.signal // ผูกกับตัวจับเวลา
            });
            clearTimeout(timeoutId);

            if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
            
            const textResponse = await res.text();
            try {
                return JSON.parse(textResponse);
            } catch (jsonError) {
                console.error("❌ เซิร์ฟเวอร์ไม่ได้ตอบกลับเป็น JSON:", textResponse);
                throw new Error("Invalid response format from server.");
            }

        } catch (error) {
            clearTimeout(timeoutId);
            const isTimeout = error.name === 'AbortError';
            const errorMsg = isTimeout ? "หมดเวลาเชื่อมต่อ (Timeout)" : error.message;
            
            console.warn(`📡 สัญญาณขัดข้อง [${errorMsg}] (ลองรอบที่ ${i + 1}/${maxRetries})`);
            
            if (i === maxRetries - 1) {
                console.error("❌ เชื่อมต่อ API ล้มเหลวโดยสมบูรณ์");
                throw error; 
            }
            await new Promise(resolve => setTimeout(resolve, delayMs * (i + 1)));
        }
    }
}

// 🚀 2. ฟังก์ชันใหม่: เรียก API พร้อมระบบความจำ (Local Cache) เร็วขึ้น 100%
// เหมาะสำหรับดึง รายชื่อพนักงาน, คลัง iPad, แผนก (ที่ไม่ได้อัปเดตทุกวินาที)
async function callAPIWithLocalCache(payload, cacheKey, expiryMinutes = 5) {
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(cacheKey + "_time");
    
    // ถ้ามีข้อมูลในความจำ และยังไม่หมดอายุ ให้ส่งคืนทันทีโดยไม่ต้องรอเน็ต
    if (cachedData && cachedTime) {
        const ageInMinutes = (Date.now() - parseInt(cachedTime)) / (1000 * 60);
        if (ageInMinutes < expiryMinutes) {
            // โหลดข้อมูลแบบ Background เงียบๆ เพื่ออัปเดต Cache ให้ใหม่เสมอ (Stale-while-revalidate)
            callAPI(payload).then(res => {
                if (res && res.status === "success") {
                    localStorage.setItem(cacheKey, JSON.stringify(res));
                    localStorage.setItem(cacheKey + "_time", Date.now().toString());
                }
            }).catch(e => console.log("Background cache update failed"));
            
            return JSON.parse(cachedData);
        }
    }
    
    // ถ้าไม่มีข้อมูล หรือหมดอายุแล้ว ให้ดึงจาก Server ใหม่
    const result = await callAPI(payload);
    if (result && result.status === "success") {
        localStorage.setItem(cacheKey, JSON.stringify(result));
        localStorage.setItem(cacheKey + "_time", Date.now().toString());
    }
    return result;
}

// 🚀 3. ฟังก์ชันเคลียร์ Local Cache โดยเฉพาะ (เรียกใช้ตอนเซฟข้อมูลใหม่)
function clearLocalCache(cacheKey) {
    localStorage.removeItem(cacheKey);
    localStorage.removeItem(cacheKey + "_time");
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
        }).then((result) => { 
            if (result.isConfirmed) executeLogout(); 
        });
    } else { 
        if(confirm("คุณต้องการออกจากระบบใช่หรือไม่?")) executeLogout(); 
    }
}

async function executeLogout() {
    showLoading("กำลังออกจากระบบ..."); 
    localStorage.clear(); // ล้างข้อมูลรวมถึง Cache ทั้งหมด
    try { 
        await liff.init({ liffId: LIFF_ID }); 
        if (liff.isLoggedIn()) liff.logout(); 
        if (liff.isInClient()) liff.closeWindow(); 
        else window.location.replace("index.html"); 
    } catch (error) { 
        window.location.replace("index.html"); 
    }
}

// 🚀 4. ปรับการตรวจสอบสิทธิ์ให้ใช้ Cache สั้นๆ ป้องกันการยิง API ซ้ำซ้อนตอนสลับหน้าเว็บ
function verifyRoleSilently() {
    const userId = localStorage.getItem("userId"); 
    const currentRole = localStorage.getItem("userRole");
    
    if (userId) { 
        const lastCheck = sessionStorage.getItem("lastRoleCheck");
        const now = Date.now();
        // ถ้าเพิ่งเช็คสิทธิ์ไปไม่ถึง 3 นาที จะข้ามไปก่อนเพื่อลดภาระ Server
        if (lastCheck && (now - parseInt(lastCheck)) < (3 * 60 * 1000)) {
            return;
        }

        callAPI({ action: "checkRole", userId: userId }).then(res => { 
            if (res.success) {
                sessionStorage.setItem("lastRoleCheck", Date.now().toString());
                if (res.role !== currentRole) { 
                    localStorage.setItem("userRole", res.role); 
                    window.location.replace(res.role === "Admin" ? "admin.html" : "user.html"); 
                } 
            }
        }).catch(e => console.log("Silent role check failed:", e)); 
    }
}

function showNavyAlert(title, htmlText, iconType, redirectUrl = null) {
    if(typeof Swal !== 'undefined') { 
        Swal.fire({ 
            title: title, 
            html: htmlText, 
            icon: iconType, 
            confirmButtonColor: "#1e3a8a", 
            confirmButtonText: "OK", 
            allowOutsideClick: false 
        }).then(() => { 
            if (redirectUrl) window.location.href = redirectUrl; 
        });
    } else { 
        alert(title + "\n" + htmlText.replace(/<[^>]*>?/gm, '')); 
        if (redirectUrl) window.location.href = redirectUrl; 
    }
}

// 🚦 ตัวหน่วงเวลาให้พิมพ์ให้เสร็จก่อนค่อยค้นหา (ลดภาระ CPU มือถือ)
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => { 
            clearTimeout(timeout); 
            func(...args); 
        };
        clearTimeout(timeout); 
        timeout = setTimeout(later, wait);
    };
}

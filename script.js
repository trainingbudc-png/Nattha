// =========================================
// 📌 ไฟล์ script.js : แกนกลางจัดการระบบหน้าเว็บ (Optimized & Stable)
// 🚀 เพิ่ม Exponential Backoff + Smart Local Cache ดึงข้อมูลไวสุดๆ
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

// 🚀 1. อัปเกรด callAPI: เร็วและอึดขึ้นด้วย Exponential Backoff (แก้ปัญหาเน็ตสะดุด)
async function callAPI(payload, maxRetries = 2, delayMs = 1000, timeoutMs = 15000) {
    for (let i = 0; i <= maxRetries; i++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const res = await fetch(API_URL, { 
                method: "POST", 
                headers: { "Content-Type": "text/plain;charset=utf-8" }, 
                body: JSON.stringify(payload),
                signal: controller.signal // ดัก Timeout
            });
            clearTimeout(timeoutId);

            if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
            
            const textResponse = await res.text();
            try {
                return JSON.parse(textResponse);
            } catch (jsonError) {
                console.error("❌ เซิร์ฟเวอร์ไม่ได้ตอบกลับเป็น JSON:", textResponse);
                throw new Error("Invalid JSON from server.");
            }

        } catch (error) {
            clearTimeout(timeoutId);
            const isTimeout = error.name === 'AbortError';
            const errorMsg = isTimeout ? "Timeout" : error.message;
            
            console.warn(`📡 สัญญาณขัดข้อง [${errorMsg}] (ลองรอบที่ ${i + 1}/${maxRetries + 1})`);
            
            if (i === maxRetries) {
                console.error("❌ เชื่อมต่อ API ล้มเหลวโดยสมบูรณ์");
                throw error; 
            }
            // ถอยระยะเวลาเพิ่มขึ้นเรื่อยๆ (1s, 2s) ป้องกัน Server Overload
            await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)));
        }
    }
}

// 🚀 2. Local Cache อัจฉริยะ (Stale-while-revalidate แบบเจาะจง)
async function callAPIWithLocalCache(payload, cacheKey, expiryMinutes = 5) {
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTime = localStorage.getItem(cacheKey + "_time");
    const now = Date.now();
    
    if (cachedData && cachedTime) {
        const ageInMinutes = (now - parseInt(cachedTime)) / (1000 * 60);
        
        if (ageInMinutes < expiryMinutes) {
            // โหลด Background เฉพาะเมื่อข้อมูลใกล้หมดอายุ (เกินครึ่งทางของเวลาที่ตั้งไว้)
            // ช่วยประหยัด Data อินเทอร์เน็ตของผู้ใช้ และไม่ยิง API พร่ำเพรื่อ
            if (ageInMinutes > (expiryMinutes / 2)) {
                callAPI(payload).then(res => {
                    if (res && (res.status === "success" || res.success)) {
                        localStorage.setItem(cacheKey, JSON.stringify(res));
                        localStorage.setItem(cacheKey + "_time", Date.now().toString());
                    }
                }).catch(() => console.log("Background cache update failed"));
            }
            return JSON.parse(cachedData);
        }
    }
    
    // ถ้าไม่มีข้อมูล หรือหมดอายุแล้ว ให้ดึงจาก Server ใหม่
    const result = await callAPI(payload);
    if (result && (result.status === "success" || result.success)) {
        localStorage.setItem(cacheKey, JSON.stringify(result));
        localStorage.setItem(cacheKey + "_time", now.toString());
    }
    return result;
}

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
        }).catch(e => console.log("Silent role check failed")); 
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

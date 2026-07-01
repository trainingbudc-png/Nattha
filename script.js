// ลิงก์ Google Apps Script ของพี่
const API_URL = "https://script.google.com/macros/s/AKfycbyw2y3tAd1h-krTwcdjX67nxIWEH6ySWvKoErnJbjrxIvouq5cG8_smLZqrvJlcLvbE/exec"; 
const LIFF_ID = "2010557323-PAyWhGxW"; 

// =========================================
// ฟังก์ชันเปิด/ปิด หน้า Loading
// =========================================
function showLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.style.display = "flex";
}

function hideLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.style.display = "none";
}

// =========================================
// 1. ระบบ LINE Login (ปรับปรุงตัวเช็คระบบอัตโนมัติ)
// =========================================
async function initLiffOnLoad() {
    await liff.init({ liffId: LIFF_ID }); 
    
    // เช็คว่าผู้ใช้เพิ่งกดปุ่มออกจากระบบมาหรือไม่
    const isLoggedOut = localStorage.getItem("justLoggedOut");
    
    if (liff.isLoggedIn() && !isLoggedOut) {
        showLoading(); // โชว์หน้าโหลดเฉพาะตอนล็อกอินค้างและผ่านเงื่อนไขดึงข้อมูล
        const profile = await liff.getProfile();
        const name = profile.displayName; 
        
        localStorage.setItem("userName", name);
        await checkUserRole(name); 
    } else {
        hideLoading(); // ปิดหน้าโหลดสนิทเพื่อให้เห็นปุ่มสีเขียวแน่นอน
    }
}

function loginWithLine() {
    showLoading(); 
    // เมื่อผู้ใช้ตั้งใจกดเข้าสู่ระบบด้วยตัวเอง ให้ล้างเงื่อนไขจำสถานะ Logout ออกไป
    localStorage.removeItem("justLoggedOut");
    
    if (!liff.isLoggedIn()) {
        liff.login(); 
    } else {
        initLiffOnLoad();
    }
}

// =========================================
// 2. เช็คสิทธิ์ Admin / User
// =========================================
async function checkUserRole(name) {
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "checkRole", name: name })
        });
        const data = await res.json();
        
        if (data.role === "Admin") {
            window.location.replace("admin.html");
        } else {
            window.location.replace("user.html");
        }
    } catch (error) {
        hideLoading(); 
        alert("เกิดข้อผิดพลาดในการเช็คสิทธิ์ กรุณาตรวจสอบ Apps Script");
    }
}

// =========================================
// 3. ส่งข้อมูลบันทึกสถานะ
// =========================================
async function sendData(status, note) {
    const name = localStorage.getItem("userName");
    
    if(!name) {
        alert("ไม่พบชื่อผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
        window.location.href = "index.html";
        return;
    }

    try {
        await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "saveLog", name: name, ipadId: "-", status: status, note: note })
        });
        alert("บันทึก [" + status + "] สำเร็จ!");

        if (window.location.pathname.includes("admin.html")) {
            fetchStat	usData();
        }
    } catch (error) {
        alert("เกิดข้อผิดพลาด: " + error);
    }
}

// =========================================
// 4. ดึงข้อมูลมาแสดงในตารางหน้า Admin 
// =========================================
async function fetchStatusData() {
    const tbody = document.getElementById("statusTableBody");
    if (!tbody) return; 

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">กำลังโหลดข้อมูล... ⏳</td></tr>';

    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getData" }) 
        });
        const data = await res.json();
        
        if (data.status === "success" && data.data.length > 0) {
            tbody.innerHTML = ""; 
            
            data.data.forEach((row, index) => {
                let statusColor = "#6c757d"; 
                if (row.status === "เตรียมเครื่อง" || row.status === "พร้อมใช้งาน") statusColor = "#dc3545"; 
                if (row.status === "รับเครื่องแล้ว" || row.status === "ตรวจคืน") statusColor = "#28a745"; 
                if (row.status === "เครื่องมีปัญหา" || row.status === "รอดำเนินการ") statusColor = "#ff9800"; 
                
                let displayTime = "-";
                if (row.timestamp) {
                    displayTime = new Date(row.timestamp).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
                }

                const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><span class="badge" style="background-color: #495057; color: white; padding: 4px 8px; border-radius: 4px;">${row.reqId || "-"}</span></td> 
            <td>${displayTime}</td>
            <td>${row.name || "-"}</td>
            <td>${row.ipadId || "-"}</td>
            <td><span class="badge-status" style="background-color: ${statusColor}">${row.status || "-"}</span></td>
            <td>${row.note || "-"}</td>
        `;
        tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">ยังไม่มีข้อมูลการทำรายการ</td></tr>';
        }
    } catch (error) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red; padding: 20px;">ไม่สามารถดึงข้อมูลได้ (โปรดตรวจสอบการตั้งค่า Code.gs)</td></tr>';
        console.error("Error fetching data:", error);
    }
}

// =========================================
// 5. ออกจากระบบ (ล็อกสิทธิ์จำสถานะเพื่อแก้บั๊ก)
// =========================================
async function logout() {
    showLoading(); 
    
    // 1. ล้างข้อมูลชื่อผู้ใช้
    localStorage.removeItem("userName");
    // 2. ตั้งสถานะบอกระบบหน้าบ้านไว้ว่า "เพิ่งกดปุ่มออกจากระบบมานะ"
    localStorage.setItem("justLoggedOut", "true");

    try {
        await liff.init({ liffId: LIFF_ID });
        if (liff.isLoggedIn()) {
            liff.logout(); 
        }
    } catch (error) {
        console.log("ออกระบบ LINE ไม่สำเร็จ: ", error);
    }
    
    window.location.replace("index.html");
}

// =========================================
// 6. ตัวดักตอนโหลดหน้าเว็บ
// =========================================
window.onload = function() {
    if (window.location.pathname.includes("index.html") || window.location.pathname === "/") {
        initLiffOnLoad(); 
    } else {
        // เมื่อไม่ได้อยู่หน้าแรก (เข้าสู่ระบบสำเร็จจนไปหน้าอื่นแล้ว) ให้ล้างสถานะล็อกเอาท์ทิ้งไป
        localStorage.removeItem("justLoggedOut");
        
        const userName = localStorage.getItem("userName");
        if(document.getElementById("showName") && userName) {
            document.getElementById("showName").innerText = "ผู้ใช้งาน LINE: " + userName;
        }
        
        if (window.location.pathname.includes("admin.html")) {
            fetchStatusData();
        }
    }
};
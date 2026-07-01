// ลิงก์ Google Apps Script ของพี่
const API_URL = "https://script.google.com/macros/s/AKfycbyw2y3tAd1h-krTwcdjX67nxIWEH6ySWvKoErnJbjrxIvouq5cG8_smLZqrvJlcLvbE/exec"; 
const LIFF_ID = "2010557323-PAyWhGxW"; 

// 1. ระบบ LINE Login
async function main() {
    await liff.init({ liffId: LIFF_ID });
    if (liff.isLoggedIn()) {
        const profile = await liff.getProfile();
        const name = profile.displayName; 
        
        localStorage.setItem("userName", name);
        checkUserRole(name);
    }
}

function loginWithLine() {
    if (!liff.isLoggedIn()) {
        liff.login(); 
    } else {
        main();
    }
}

// 2. เช็คสิทธิ์ Admin / User
async function checkUserRole(name) {
    try {
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "checkRole", name: name })
        });
        const data = await res.json();
        
        if (data.role === "Admin") {
            window.location.href = "admin.html";
        } else {
            window.location.href = "user.html";
        }
    } catch (error) {
        alert("เกิดข้อผิดพลาดในการเช็คสิทธิ์ กรุณาตรวจสอบ Apps Script");
    }
}

// 3. ส่งข้อมูลบันทึกสถานะ
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

        // หากอยู่หน้าแอดมิน ให้รีเฟรชตารางหลังกดปุ่มเสร็จทันที
        if (window.location.pathname.includes("admin.html")) {
            fetchStatusData();
        }
    } catch (error) {
        alert("เกิดข้อผิดพลาด: " + error);
    }
}

// 4. (ใหม่) ดึงข้อมูลมาแสดงในตารางหน้า Admin
async function fetchStatusData() {
    const tbody = document.getElementById("statusTableBody");
    if (!tbody) return; // ถ้าไม่ได้อยู่หน้า admin ให้ข้ามไป

    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">กำลังโหลดข้อมูล... ⏳</td></tr>';

    try {
        // ขอข้อมูลจาก Google Apps Script
        const res = await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "getData" }) 
        });
        const data = await res.json();
        
        if (data.status === "success" && data.data.length > 0) {
            tbody.innerHTML = ""; 
            
            // วนลูปสร้างแถวตาราง
            data.data.forEach((row, index) => {
                let statusColor = "#6c757d"; // สีเทา
                if (row.status === "เตรียมเครื่อง" || row.status === "พร้อมใช้งาน") statusColor = "#dc3545"; // สีแดง
                if (row.status === "รับเครื่องแล้ว" || row.status === "ตรวจคืน") statusColor = "#28a745"; // สีเขียว
                if (row.status === "เครื่องมีปัญหา" || row.status === "รอดำเนินการ") statusColor = "#ff9800"; // สีส้ม
                
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td>${row.timestamp || "-"}</td>
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
        // ถ้าขึ้นบรรทัดนี้ แสดงว่าฝั่ง Code.gs ยังไม่ได้เขียนคำสั่งรับ action: "getData" นะครับ
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red; padding: 20px;">ไม่สามารถดึงข้อมูลได้ (โปรดตรวจสอบการตั้งค่า Code.gs)</td></tr>';
        console.error("Error fetching data:", error);
    }
}

// 5. ออกจากระบบ
async function logout() {
    try {
        await liff.init({ liffId: LIFF_ID });
        if (liff.isLoggedIn()) {
            liff.logout(); 
        }
    } catch (error) {
        console.log("ออกระบบ LINE ไม่สำเร็จ: ", error);
    }
    
    localStorage.removeItem("userName");
    window.location.href = "index.html";
}

// 6. ตัวดักตอนโหลดหน้าเว็บ
window.onload = function() {
    if (window.location.pathname.includes("index.html") || window.location.pathname === "/") {
        main();
    } else {
        const userName = localStorage.getItem("userName");
        if(document.getElementById("showName") && userName) {
            document.getElementById("showName").innerText = "ผู้ใช้งาน LINE: " + userName;
        }
        
        // ถ้าเป็นหน้า Admin ให้รันตาราง และสั่งโหลดใหม่ทุกๆ 15 วินาที
        if (window.location.pathname.includes("admin.html")) {
            fetchStatusData();
            setInterval(fetchStatusData, 15000); 
        }
    }
};
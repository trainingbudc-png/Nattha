// ⚠️ เปลี่ยนข้อความด้านล่างเป็น Web App URL ของ Google Apps Script ที่เพิ่ง Deploy
const API_URL = "https://script.google.com/macros/s/AKfycbyw2y3tAd1h-krTwcdjX67nxIWEH6ySWvKoErnJbjrxIvouq5cG8_smLZqrvJlcLvbE/exec"; 
const LIFF_ID = "2010557323-PAyWhGxW"; // ใส่ LIFF ID ของพี่เรียบร้อยแล้ว

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
        alert("เกิดข้อผิดพลาดในการเช็คสิทธิ์ กรุณาตรวจสอบ URL ของ Apps Script");
    }
}

async function sendData(status, note) {
    const name = localStorage.getItem("userName");
    const ipadId = document.getElementById("ipadId").value;
    
    if(!name) {
        alert("ไม่พบชื่อผู้ใช้ กรุณาเข้าสู่ระบบใหม่");
        window.location.href = "index.html";
        return;
    }
    if(!ipadId) {
        alert("กรุณาระบุรหัส iPad");
        return;
    }

    try {
        await fetch(API_URL, {
            method: "POST",
            body: JSON.stringify({ action: "saveLog", name: name, ipadId: ipadId, status: status, note: note })
        });
        alert("บันทึก [" + status + "] สำเร็จ!");
        document.getElementById("ipadId").value = "";
    } catch (error) {
        alert("เกิดข้อผิดพลาด: " + error);
    }
}

function logout() {
    localStorage.removeItem("userName");
    liff.logout();
    window.location.href = "index.html";
}

window.onload = function() {
    if (window.location.pathname.includes("index.html") || window.location.pathname === "/") {
        main();
    } else {
        const userName = localStorage.getItem("userName");
        if(document.getElementById("showName") && userName) {
            document.getElementById("showName").innerText = "ผู้ใช้งาน LINE: " + userName;
        }
    }
};
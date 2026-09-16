window.onload = function() {
    const userName = localStorage.getItem("userName");
    if (!userName) { window.location.href = "index.html"; return; }
    document.getElementById("showName").innerText = userName;
    verifyRoleSilently();
    loadUserTableData();
};

async function loadUserTableData() {
    const activeCardsContainer = document.getElementById("activeCardsContainer");
    const historyTbody = document.getElementById("historyTableBody");
    
    activeCardsContainer.innerHTML = '<div class="col-12 text-center py-5 text-muted bg-white rounded-4 border">กำลังโหลดข้อมูล... ⏳</div>';
    historyTbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted" style="justify-content: center !important;">กำลังโหลดข้อมูล... ⏳</td></tr>';
    
    const currentUserId = localStorage.getItem("userId");

    try {
        const res = await callAPI({ action: "getData" });
        if (res.status === "success" && res.data && res.data.length > 0) {
            const myData = res.data.filter(item => {
                let isValidReq = item.reqId && item.reqId !== "ReqID" && item.reqId !== "เลขรายการ";
                if (!isValidReq) return false;
                if (currentUserId && item.userId === currentUserId) return true;
                return false; 
            });

            if (myData.length === 0) {
                activeCardsContainer.innerHTML = '<div class="col-12 text-center py-5 text-muted bg-white rounded-4 border">🎉 ไม่มีรายการที่กำลังดำเนินการ</div>';
                historyTbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4" style="justify-content: center !important;">ยังไม่มีประวัติการยืม-คืน</td></tr>';
                return;
            }

            let activeList = [];
            let historyList = [];
            myData.forEach(item => {
                let statusTxt = item.status || "";
                if (statusTxt.includes("คืนแล้ว") || statusTxt.includes("เสร็จสิ้น") || statusTxt.includes("เคลียร์") || statusTxt.includes("ยกเลิก")) {
                    historyList.push(item);
                } else { activeList.push(item); }
            });

            renderActiveUserCards(activeList);
            renderUserTableRows(historyList.slice(0, 5), historyTbody);

        } else {
            activeCardsContainer.innerHTML = '<div class="col-12 text-center py-5 text-muted bg-white rounded-4 border">ไม่มีรายการในระบบ</div>';
            historyTbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4" style="justify-content: center !important;">ไม่มีประวัติในระบบ</td></tr>';
        }
    } catch (err) {
        activeCardsContainer.innerHTML = '<div class="col-12 text-center text-danger py-5 bg-white rounded-4 border">❌ เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูล</div>';
        historyTbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger py-4" style="justify-content: center !important;">❌ เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูล</td></tr>';
    }
}

// ⚡ อัปเกรดสะสม HTML ฝั่ง User
function renderActiveUserCards(data) {
    const container = document.getElementById("activeCardsContainer");
    if (data.length === 0) {
        container.innerHTML = '<div class="col-12 text-center text-muted py-5 bg-white rounded-4 border shadow-sm">🎉 ไม่มีรายการที่กำลังดำเนินการ</div>';
        return;
    }

    let htmlContent = ""; // ⚡

    data.forEach(item => {
        let dateStr = item.timestamp ? new Date(item.timestamp).toLocaleString("th-TH").replace(/:\d{2}$/, '') : "-";
        let safeId = item.reqId ? item.reqId.replace(/[^a-zA-Z0-9]/g, '') : "R" + Math.floor(Math.random() * 10000);

        let formattedIpads = '<div class="d-flex justify-content-between"><span class="text-muted" style="font-size: 0.85rem;">อุปกรณ์:</span><span class="text-dark">-</span></div>';
        if (item.ipadId && item.ipadId.trim() !== "") {
            let rawIpads = item.ipadId.split(',').map(id => id.trim());
            let normalIds = [], airIds = [];
            rawIpads.forEach(id => {
                let numMatch = id.match(/\d+/); let num = numMatch ? numMatch[0] : id; 
                if (id.toLowerCase().includes("air") || id.toLowerCase().includes("apc")) airIds.push(num);
                else normalIds.push(num);
            });
            let displayGroups = [];
            if (normalIds.length > 0) displayGroups.push(`<div class="d-flex justify-content-between align-items-center mt-2 mb-1"><span class="text-muted" style="font-size: 0.85rem;">ประเภท:</span><span class="text-danger fw-bold" style="font-size: 0.85rem;">iPad</span></div><div class="d-flex justify-content-between align-items-start mb-2"><span class="text-muted flex-shrink-0" style="font-size: 0.85rem;">เลขอุปกรณ์:</span><span class="text-dark fw-bold text-end w-100 ps-3" style="font-size: 0.95rem;">${normalIds.join(', ')}</span></div>`);
            if (airIds.length > 0) displayGroups.push(`<div class="d-flex justify-content-between align-items-center mt-2 mb-1"><span class="text-muted" style="font-size: 0.85rem;">ประเภท:</span><span class="text-primary fw-bold" style="font-size: 0.85rem;">Air+APC</span></div><div class="d-flex justify-content-between align-items-start mb-2"><span class="text-muted flex-shrink-0" style="font-size: 0.85rem;">เลขอุปกรณ์:</span><span class="text-dark fw-bold text-end w-100 ps-3" style="font-size: 0.95rem;">${airIds.join(', ')}</span></div>`);
            formattedIpads = displayGroups.join('<div class="border-bottom my-2 opacity-25"></div>');
        }

        let statusTxt = item.status || "-"; let actionBtn = ""; let stepLabel = ""; 
        if (statusTxt.includes("Step[1]")) { stepLabel = "แอดมินเตรียมเสร็จแล้ว"; actionBtn = `<button class="btn btn-danger btn-sm rounded-pill fw-bold w-100 py-2 shadow-sm" style="font-size: 1rem;" onclick="window.location.href='step2.html?reqId=${item.reqId}'">📲 กดรับเครื่อง</button>`; }
        else if (statusTxt.includes("Step[2]")) { stepLabel = "เครื่องอยู่กับคุณ"; actionBtn = `<button class="btn btn-primary btn-sm rounded-pill fw-bold w-100 py-2 shadow-sm" style="font-size: 1rem; background-color: #0ea5e9; border-color: #0ea5e9;" onclick="window.location.href='step3.html?reqId=${item.reqId}'">📝 ตรวจก่อนสอบ</button>`; }
        else if (statusTxt.includes("Step[3]")) { stepLabel = "พร้อมเข้าสอบ"; actionBtn = `<button class="btn btn-success btn-sm rounded-pill fw-bold w-100 py-2 shadow-sm" style="font-size: 1rem; background-color: #10b981; border-color: #10b981;" onclick="window.location.href='step4.html?reqId=${item.reqId}'">📤 ส่งคืนอุปกรณ์</button>`; }
        else if (statusTxt.includes("Step[4]")) { stepLabel = "ส่งคืนเรียบร้อย"; actionBtn = `<button class="btn btn-light border text-secondary btn-sm fw-bold rounded-pill w-100 py-2" style="font-size: 1rem;" disabled>⏳ รอแอดมินตรวจรับ</button>`; }
        else { stepLabel = statusTxt; actionBtn = `<span class="badge bg-secondary text-white px-3 py-2 rounded-pill w-100 fs-6 d-block">${statusTxt}</span>`; }

        htmlContent += `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="active-task-card bg-white rounded-4 shadow-sm position-relative overflow-hidden" style="border: 1px solid #e2e8f0;">
                    <div class="position-absolute top-0 start-0 bottom-0 bg-danger" style="width: 4px;"></div>
                    <div class="p-3 ps-4 d-flex justify-content-between align-items-center" style="cursor: pointer; user-select: none;" data-bs-toggle="collapse" data-bs-target="#collapse-${safeId}" onclick="closeOtherAccordions('collapse-${safeId}')">
                        <div>
                            <div class="fw-bold text-dark d-flex align-items-center gap-2" style="font-size: 1.15rem;">${item.reqId} <span class="collapse-icon text-muted" style="font-size: 0.75rem;">▼</span></div>
                            <div class="text-secondary mt-1" style="font-size: 0.85rem; font-weight: 500;">สถานะ: <span class="text-danger">${stepLabel}</span></div>
                        </div>
                    </div>
                    <div class="px-3 pb-3 ps-4"><div onclick="event.stopPropagation();">${actionBtn}</div></div>
                    <div id="collapse-${safeId}" class="collapse">
                        <div class="p-3 pt-3 ps-4 border-top border-light bg-light bg-opacity-50">
                            <div class="d-flex justify-content-between align-items-center mb-1"><span class="text-muted" style="font-size: 0.85rem;">📅 เวลา:</span><span class="text-dark" style="font-size: 0.85rem; font-weight: 500;">${dateStr}</span></div>
                            ${formattedIpads}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = htmlContent;
}

function closeOtherAccordions(targetId) {
    document.querySelectorAll('#activeCardsContainer .collapse.show').forEach(el => {
        if (el.id !== targetId) {
            let bsCollapse = bootstrap.Collapse.getInstance(el) || new bootstrap.Collapse(el, {toggle: false});
            bsCollapse.hide();
        }
    });
}

function renderUserTableRows(dataList, tbodyElement) {
    if (dataList.length === 0) {
        tbodyElement.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4" style="justify-content: center !important;">ยังไม่มีประวัติรายการเสร็จสิ้น</td></tr>`;
        return;
    }

    let htmlContent = ""; // ⚡

    dataList.forEach(item => {
        let typeHtml = '<span class="text-muted">-</span>'; let idsHtml = '<span class="text-muted">-</span>';
        if (item.ipadId && item.ipadId.trim() !== "") {
            let rawIpads = item.ipadId.split(',').map(id => id.trim());
            let normalIds = [], airIds = [];
            rawIpads.forEach(id => {
                let numMatch = id.match(/\d+/); let num = numMatch ? numMatch[0] : id; 
                if (id.toLowerCase().includes("air") || id.toLowerCase().includes("apc")) airIds.push(num);
                else normalIds.push(num);
            });
            let typeArr = [], idsArr = [];
            if (normalIds.length > 0) { typeArr.push(`<div class="fw-bold text-dark mb-1">iPad</div>`); idsArr.push(`<div class="mb-1 text-secondary" style="word-break: break-word; line-height: 1.6;">${normalIds.join(', ')}</div>`); }
            if (airIds.length > 0) { typeArr.push(`<div class="fw-bold text-dark mb-1">Air+APC</div>`); idsArr.push(`<div class="mb-1 text-secondary" style="word-break: break-word; line-height: 1.6;">${airIds.join(', ')}</div>`); }
            typeHtml = typeArr.join(''); idsHtml = idsArr.join('');
        }

        let statusTxt = item.status || "-"; let displayStatus = statusTxt; let badgeClass = "bg-secondary text-white";
        if (statusTxt.includes("เคลียร์") || statusTxt.includes("คืนแล้ว") || statusTxt.includes("เสร็จสิ้น")) { displayStatus = "คืนเรียบร้อย"; badgeClass = "bg-light text-secondary border"; } 
        else if (statusTxt.includes("ยกเลิก")) { displayStatus = "ยกเลิกรายการ"; badgeClass = "bg-light text-secondary border"; }
        
        htmlContent += `
            <tr class="text-center align-middle">
                <td data-label="📌 เลขรายการ" class="fw-bold text-dark">${item.reqId}</td>
                <td data-label="📦 อุปกรณ์ที่ยืม">${typeHtml}</td>
                <td data-label="📱 เครื่องที่เตรียม">${idsHtml}</td>
                <td data-label="📊 สถานะ"><span class="badge ${badgeClass} px-3 py-2 rounded-pill shadow-sm">${displayStatus}</span></td>
            </tr>
        `;
    });
    tbodyElement.innerHTML = htmlContent;
}

// โค้ด Modal ข้อมูลส่วนตัว (เหมือนเดิม)
let profileModal;
let isDeptLoaded = false; 

async function openProfileModal() { /* ตัดโค้ดนี้มาเหมือนเดิม เพราะไม่มีปัญหาเรื่องความเร็วครับ */ }
async function saveProfileData() { /* ตัดโค้ดนี้มาเหมือนเดิม เพราะไม่มีปัญหาเรื่องความเร็วครับ */ }

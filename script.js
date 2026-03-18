const { PDFDocument } = PDFLib;
let pdfBytes, pdfDocJs, pageNum = 1, zoom = 1.0;
let signaturesByPage = {}; 
let currentFileName = "documento";
const canvas = document.getElementById("pdf-render"), ctx = canvas.getContext("2d");
const sigModal = document.getElementById("sig-modal"), sigCanvas = document.getElementById("sig-canvas");
const saveModal = document.getElementById("save-modal"), saveTimer = document.getElementById("save-timer");
let pad = null;

function resizeSigCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const wrapper = document.getElementById("sig-canvas-wrapper");
    sigCanvas.width = wrapper.clientWidth * ratio;
    sigCanvas.height = wrapper.clientHeight * ratio;
    sigCanvas.getContext("2d").scale(ratio, ratio);
    if (pad) pad.clear();
}

function initSignaturePad() {
    if (pad) pad.off();
    pad = new SignaturePad(sigCanvas, { penColor: "rgb(0, 0, 128)" });
    resizeSigCanvas();
}

async function fitToWidth() {
    if (!pdfDocJs) return;
    const page = await pdfDocJs.getPage(1);
    const vp = page.getViewport({scale: 1.0});
    zoom = (window.innerWidth * 0.92) / vp.width;
    render();
}

document.getElementById("file-in").onchange = async (e) => {
    const file = e.target.files[0];
    if(!file) return;
    currentFileName = file.name.replace(/\.[^/.]+$/, "");
    pdfBytes = await file.arrayBuffer();
    pdfDocJs = await pdfjsLib.getDocument({data: pdfBytes}).promise;
    document.getElementById("page-count").textContent = pdfDocJs.numPages;
    signaturesByPage = {}; 
    await fitToWidth();
};

async function render() {
    if(!pdfDocJs) return;
    const page = await pdfDocJs.getPage(pageNum);
    const vp = page.getViewport({scale: 2.0 * zoom});
    canvas.width = vp.width; canvas.height = vp.height;
    canvas.style.width = (vp.width / 2) + "px";
    canvas.style.height = (vp.height / 2) + "px";
    document.getElementById("pdf-wrapper").style.width = (vp.width / 2) + "px";
    document.getElementById("pdf-wrapper").style.height = (vp.height / 2) + "px";
    await page.render({canvasContext: ctx, viewport: vp}).promise;
    document.getElementById("page-num").textContent = pageNum;
    updateSigUI();
}

function updateSigUI() {
    const el = document.getElementById("draggable-sig");
    const data = signaturesByPage[pageNum];
    if (data && data.img) {
        const pdfWrapper = document.getElementById("pdf-wrapper");
        const xPx = (data.x / 100) * pdfWrapper.clientWidth;
        const yPx = (data.y / 100) * pdfWrapper.clientHeight;
        const wPx = (data.w / 100) * pdfWrapper.clientWidth;
        const hPx = (data.h / 100) * pdfWrapper.clientHeight;
        el.style.display = "block";
        document.getElementById("sig-preview").src = data.img;
        el.style.width = `${wPx}px`; el.style.height = `${hPx}px`;
        el.style.transform = `translate(${xPx}px, ${yPx}px) rotate(${data.rotation || 0}deg)`;
        el.setAttribute("data-x", xPx); el.setAttribute("data-y", yPx);
    } else { el.style.display = "none"; }
}

function openSignature() { 
    if(pdfBytes) { 
        sigModal.style.display = "flex"; 
        setTimeout(initSignaturePad, 200); 
    } 
}

function applySignature() {
    if(!pad || pad.isEmpty()) return;
    const sigData = pad.toDataURL("image/png");
    const pdfWrapper = document.getElementById("pdf-wrapper");
    const initialWidth = 160, initialHeight = 80;
    const initialX = (pdfWrapper.clientWidth / 2) - (initialWidth / 2);
    const initialY = (pdfWrapper.clientHeight / 2) - (initialHeight / 2);
    signaturesByPage[pageNum] = {
        x: (initialX / pdfWrapper.clientWidth) * 100,
        y: (initialY / pdfWrapper.clientHeight) * 100,
        w: (initialWidth / pdfWrapper.clientWidth) * 100,
        h: (initialHeight / pdfWrapper.clientHeight) * 100,
        rotation: 0,
        img: sigData
    };
    updateSigUI();
    sigModal.style.display = "none";
}

function removeSignature() { delete signaturesByPage[pageNum]; updateSigUI(); }

function rotateSignature() {
    if (!signaturesByPage[pageNum]) return;
    signaturesByPage[pageNum].rotation = (signaturesByPage[pageNum].rotation || 0) + 15;
    if (signaturesByPage[pageNum].rotation >= 360) signaturesByPage[pageNum].rotation = 0;
    updateSigUI();
}

function replicateToAll() {
    const current = signaturesByPage[pageNum];
    if (!current) return alert("Crie uma assinatura primeiro!");
    for (let i = 1; i <= pdfDocJs.numPages; i++) {
        signaturesByPage[i] = JSON.parse(JSON.stringify(current));
    }
    alert("Assinatura copiada para todas as páginas com posição, tamanho e rotação!");
    render();
}

interact("#draggable-sig").draggable({
    listeners: { move (event) {
        let x = (parseFloat(event.target.getAttribute("data-x")) || 0) + event.dx;
        let y = (parseFloat(event.target.getAttribute("data-y")) || 0) + event.dy;
        const rotation = signaturesByPage[pageNum]?.rotation || 0;
        event.target.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
        event.target.setAttribute("data-x", x); event.target.setAttribute("data-y", y);
        if(signaturesByPage[pageNum]) {
            const pdfWrapper = document.getElementById("pdf-wrapper");
            signaturesByPage[pageNum].x = (x / pdfWrapper.clientWidth) * 100;
            signaturesByPage[pageNum].y = (y / pdfWrapper.clientHeight) * 100;
        }
    }}
}).resizable({
    edges: { right: true, bottom: true },
    listeners: { move (event) {
        Object.assign(event.target.style, { width: `${event.rect.width}px`, height: `${event.rect.height}px` });
        if(signaturesByPage[pageNum]) {
            const pdfWrapper = document.getElementById("pdf-wrapper");
            signaturesByPage[pageNum].w = (event.rect.width / pdfWrapper.clientWidth) * 100;
            signaturesByPage[pageNum].h = (event.rect.height / pdfWrapper.clientHeight) * 100;
        }
    }}
});

async function saveFinalPdf() {
    if (!pdfBytes) return;
    saveModal.style.display = "flex";
    saveTimer.textContent = "Gravando...";
    try {
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        for (let i = 1; i <= pages.length; i++) {
            const data = signaturesByPage[i];
            if (data) {
                const page = pages[i - 1];
                const { width, height } = page.getSize();
                const sigImage = await pdfDoc.embedPng(data.img);
                const sigW = (data.w / 100) * width;
                const sigH = (data.h / 100) * height;
                const sigX = (data.x / 100) * width;
                const sigY = height - ((data.y / 100) * height) - sigH;
                const rotation = (data.rotation || 0) * (Math.PI / 180);
                
                page.drawImage(sigImage, { 
                    x: sigX, y: sigY, 
                    width: sigW, height: sigH, 
                    opacity: 1.0,
                    rotate: PDFLib.degrees(data.rotation || 0)
                });
            }
        }
        const b = await pdfDoc.save();
        const l = document.createElement("a");
        l.href = URL.createObjectURL(new Blob([b], {type: "application/pdf"}));
        l.download = `${currentFileName}_assinado.pdf`;
        l.click();
    } catch (err) {
        alert("Erro ao salvar: " + err.message);
    } finally {
        saveModal.style.display = "none";
        render();
    }
}

function changePage(v) { if(pageNum + v > 0 && pageNum + v <= pdfDocJs.numPages) { pageNum += v; render(); } }
function changeZoom(v) { zoom = Math.max(0.1, zoom + v); render(); }

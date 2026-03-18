const { PDFDocument, degrees } = PDFLib;
let pdfBytes, pdfDocJs, pageNum = 1, zoom = 1.0;
let signaturesByPage = {}; 
let currentFileName = "documento";
const canvas = document.getElementById("pdf-render"), ctx = canvas.getContext("2d");
const sigModal = document.getElementById("sig-modal"), sigCanvas = document.getElementById("sig-canvas");
const saveModal = document.getElementById("save-modal"), saveTimer = document.getElementById("save-timer");
let pad = null;

function initSignaturePad() {
    if (pad) pad.off();
    pad = new SignaturePad(sigCanvas, { penColor: "rgb(0, 0, 128)" });
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    sigCanvas.width = sigCanvas.offsetWidth * ratio;
    sigCanvas.height = sigCanvas.offsetHeight * ratio;
    sigCanvas.getContext("2d").scale(ratio, ratio);
}

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

async function saveFinalPdf() {
    if (!pdfBytes) return;
    saveModal.style.display = "flex";
    saveTimer.textContent = "Processando no servidor...";
    try {
        const fileInput = document.getElementById("file-in");
        const data = signaturesByPage[pageNum];
        const responseSig = await fetch(data.img);
        const sigBlob = await responseSig.blob();
        
        const formData = new FormData();
        formData.append("pdfFile", fileInput.files[0]);
        formData.append("signatureImage", sigBlob, "signature.png");
        formData.append("x", data.x.toFixed(2));
        formData.append("y", data.y.toFixed(2));
        formData.append("w", data.w.toFixed(2));
        formData.append("h", data.h.toFixed(2));
        formData.append("rotation", data.rotation || 0);

        const response = await fetch("/api/assinar", { method: "POST", body: formData });
        if (!response.ok) throw new Error("Erro no servidor");

        const finalBlob = await response.blob();
        const downloadUrl = URL.createObjectURL(finalBlob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = `${currentFileName}_assinado.pdf`;
        link.click();
        saveTimer.textContent = "Download concluído!";
        setTimeout(() => { saveModal.style.display = "none"; }, 2000);
    } catch (err) {
        alert("Erro: " + err.message);
        saveModal.style.display = "none";
    }
}
// ... (restante das funções auxiliares omitidas para brevidade, mas mantidas no seu arquivo real)

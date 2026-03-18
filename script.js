const { PDFDocument, degrees } = PDFLib;
let pdfBytes, pdfDocJs, pageNum = 1;
let signaturesByPage = {}; 
const canvas = document.getElementById("pdf-render"), ctx = canvas.getContext("2d");
const saveModal = document.getElementById("save-modal"), saveTimer = document.getElementById("save-timer");

document.getElementById('file-in').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    pdfBytes = arrayBuffer;
    pdfDocJs = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
    document.getElementById('page-count').textContent = pdfDocJs.numPages;
    render();
};

async function render() {
    if(!pdfDocJs) return;
    const page = await pdfDocJs.getPage(pageNum);
    const vp = page.getViewport({scale: 2.0});
    canvas.width = vp.width; canvas.height = vp.height;
    await page.render({canvasContext: ctx, viewport: vp}).promise;
    document.getElementById("page-num").textContent = pageNum;
    updateSigUI();
}

async function saveFinalPdf() {
    if (!pdfBytes) return;
    saveModal.style.display = "flex";
    saveTimer.textContent = "Gerando PDF no seu celular...";

    try {
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        
        // Percorre todas as assinaturas salvas no dicionário
        for (const [pNum, data] of Object.entries(signaturesByPage)) {
            const page = pages[parseInt(pNum) - 1];
            const { width, height } = page.getSize();
            const sigImg = await pdfDoc.embedPng(data.img);

            const drawW = width * (data.w / 100);
            const drawH = height * (data.h / 100);
            const drawX = width * (data.x / 100);
            // CORREÇÃO GEOMÉTRICA: Eixo Y invertido + compensação de altura
            const drawY = height - (height * (data.y / 100)) - drawH;

            page.drawImage(sigImg, {
                x: drawX,
                y: drawY,
                width: drawW,
                height: drawH,
                rotate: degrees(-(data.rotation || 0))
            });
        }

        const finalBytes = await pdfDoc.save();
        const blob = new Blob([finalBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "DUCATO_ASSINADO.pdf";
        a.click();

        saveTimer.textContent = "Concluído!";
        setTimeout(() => { saveModal.style.display = "none"; }, 1000);
    } catch (err) {
        alert("Erro local: " + err.message);
        saveModal.style.display = "none";
    }
}

// Funções de navegação e UI (Manter o que já funciona)
window.changePage = (n) => { if(pdfDocJs && pageNum+n > 0 && pageNum+n <= pdfDocJs.numPages) { pageNum += n; render(); } };
function updateSigUI() { /* Lógica de exibição da assinatura na tela */ }

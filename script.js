const { PDFDocument, degrees } = PDFLib;
let pdfBytes, pdfDocJs, pageNum = 1;
let signaturesByPage = {}; 
const canvas = document.getElementById("pdf-render"), ctx = canvas.getContext("2d");
const saveModal = document.getElementById("save-modal"), saveTimer = document.getElementById("save-timer");

// Carregar PDF
document.getElementById('file-in').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    pdfBytes = await file.arrayBuffer();
    pdfDocJs = await pdfjsLib.getDocument({data: pdfBytes}).promise;
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
}

// A FUNÇÃO MÁGICA: Processa sem internet
async function saveFinalPdf() {
    if (!pdfBytes) return alert("Abra o PDF da Ducato primeiro!");
    
    saveModal.style.display = "flex";
    saveTimer.textContent = "Aplicando assinatura (Processo Local)...";

    try {
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        
        // Pega os dados da assinatura que você posicionou na tela
        const data = signaturesByPage[pageNum];
        if (!data) throw new Error("Posicione a assinatura antes de salvar.");

        const page = pages[pageNum - 1];
        const { width, height } = page.getSize();
        const sigImg = await pdfDoc.embedPng(data.img);

        // Conversão de escala e posição
        const drawW = width * (data.w / 100);
        const drawH = height * (data.h / 100);
        const drawX = width * (data.x / 100);
        
        // CORREÇÃO DE GEOMETRIA (Eixo Y invertido do PDF)
        const drawY = height - (height * (data.y / 100)) - drawH;

        page.drawImage(sigImg, {
            x: drawX,
            y: drawY,
            width: drawW,
            height: drawH,
            rotate: degrees(-(data.rotation || 0))
        });

        const finalPdfBytes = await pdfDoc.save();
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.href = url;
        link.download = "DUCATO_ASSINADO.pdf";
        link.click();

        saveTimer.textContent = "Sucesso!";
        setTimeout(() => { saveModal.style.display = "none"; }, 1500);

    } catch (err) {
        alert("Erro no celular: " + err.message);
        saveModal.style.display = "none";
    }
}

window.changePage = (n) => { if(pdfDocJs && pageNum+n > 0 && pageNum+n <= pdfDocJs.numPages) { pageNum += n; render(); } };

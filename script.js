// Verificação de segurança: as bibliotecas carregaram?
window.onerror = function(msg, url, line) {
    alert("Erro detectado: " + msg + "\nLinha: " + line);
};

const { PDFDocument, degrees } = PDFLib;
let pdfBytes, pdfDocJs, pageNum = 1;
let signaturesByPage = {}; 
const canvas = document.getElementById("pdf-render"), ctx = canvas.getContext("2d");
const saveModal = document.getElementById("save-modal"), saveTimer = document.getElementById("save-timer");

document.getElementById('file-in').onchange = async (e) => {
    try {
        const file = e.target.files[0];
        if (!file) return;
        pdfBytes = await file.arrayBuffer();
        pdfDocJs = await pdfjsLib.getDocument({data: pdfBytes}).promise;
        document.getElementById('page-count').textContent = pdfDocJs.numPages;
        render();
    } catch (err) {
        alert("Erro ao abrir PDF: " + err.message);
    }
};

async function render() {
    if(!pdfDocJs) return;
    const page = await pdfDocJs.getPage(pageNum);
    const vp = page.getViewport({scale: 2.0});
    canvas.width = vp.width; canvas.height = vp.height;
    await page.render({canvasContext: ctx, viewport: vp}).promise;
    document.getElementById("page-num").textContent = pageNum;
}

async function saveFinalPdf() {
    if (!pdfBytes) return alert("Selecione o PDF primeiro!");
    
    saveModal.style.display = "flex";
    saveTimer.textContent = "Processando no seu celular...";

    try {
        console.log("Iniciando processamento local...");
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        
        // Se não houver assinatura posicionada, avisa
        if (Object.keys(signaturesByPage).length === 0) {
            throw new Error("Nenhuma assinatura encontrada. Adicione uma antes de salvar.");
        }

        for (const [pNum, data] of Object.entries(signaturesByPage)) {
            const page = pages[parseInt(pNum) - 1];
            const { width, height } = page.getSize();
            const sigImg = await pdfDoc.embedPng(data.img);

            const drawW = width * (data.w / 100);
            const drawH = height * (data.h / 100);
            const drawX = width * (data.x / 100);
            // CORREÇÃO GEOMÉTRICA
            const drawY = height - (height * (data.y / 100)) - drawH;

            page.drawImage(sigImg, {
                x: drawX, y: drawY, width: drawW, height: drawH,
                rotate: degrees(-(data.rotation || 0))
            });
        }

        const finalBytes = await pdfDoc.save();
        const blob = new Blob([finalBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "MANUAL_ASSINADO.pdf";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        saveTimer.textContent = "Sucesso!";
        setTimeout(() => { saveModal.style.display = "none"; }, 1000);
    } catch (err) {
        alert("FALHA: " + err.message);
        saveModal.style.display = "none";
    }
}

window.changePage = (n) => { if(pdfDocJs && pageNum+n > 0 && pageNum+n <= pdfDocJs.numPages) { pageNum += n; render(); } };

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
        alert("PDF Pronto para assinar!");
    } catch (err) {
        alert("Erro ao carregar: " + err.message);
    }
};

async function render() {
    if(!pdfDocJs) return;
    const page = await pdfDocJs.getPage(pageNum);
    const vp = page.getViewport({scale: 1.5});
    canvas.width = vp.width; canvas.height = vp.height;
    await page.render({canvasContext: ctx, viewport: vp}).promise;
}

async function saveFinalPdf() {
    if (!pdfBytes) return alert("Abra o PDF primeiro!");
    saveModal.style.display = "flex";

    try {
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        
        // Aqui ele vai aplicar as assinaturas em cada página salva
        for (const [pNum, data] of Object.entries(signaturesByPage)) {
            const page = pages[parseInt(pNum) - 1];
            const { width, height } = page.getSize();
            const sigImg = await pdfDoc.embedPng(data.img);

            const drawW = width * (data.w / 100);
            const drawH = height * (data.h / 100);
            const drawX = width * (data.x / 100);
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
        a.download = "DUCATO_ASSINADO.pdf";
        a.click();
        
        saveModal.style.display = "none";
        alert("Download Concluído!");
    } catch (err) {
        alert("Falha: " + err.message);
        saveModal.style.display = "none";
    }
}

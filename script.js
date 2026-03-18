const { PDFDocument, degrees } = PDFLib;
let pdfBytes, pdfDocJs, pageNum = 1;
const canvas = document.getElementById("pdf-render"), ctx = canvas.getContext("2d");

document.getElementById('file-in').onchange = async (e) => {
    try {
        const file = e.target.files[0];
        if (!file) return;
        pdfBytes = await file.arrayBuffer();
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        pdfDocJs = await pdfjsLib.getDocument({data: pdfBytes}).promise;
        
        // Só atualiza se os IDs existirem
        if(document.getElementById('page-count')) document.getElementById('page-count').textContent = pdfDocJs.numPages;
        
        render();
    } catch (err) {
        alert("Erro no carregamento: " + err.message);
    }
};

async function render() {
    if(!pdfDocJs) return;
    const page = await pdfDocJs.getPage(pageNum);
    const vp = page.getViewport({scale: 1.5});
    canvas.width = vp.width; canvas.height = vp.height;
    await page.render({canvasContext: ctx, viewport: vp}).promise;
    if(document.getElementById('page-num')) document.getElementById('page-num').textContent = pageNum;
}

window.changePage = (n) => {
    if(!pdfDocJs) return;
    if(pageNum + n > 0 && pageNum + n <= pdfDocJs.numPages) {
        pageNum += n;
        render();
    }
};

async function saveFinalPdf() {
    if (!pdfBytes) return alert("Abra o PDF primeiro!");
    document.getElementById("save-modal").style.display = "flex";

    try {
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        
        // TESTE: Escreve no topo para confirmar que o motor local funciona
        firstPage.drawText('TESTE LOCAL MOTOROLA', { x: 50, y: 50, size: 20 });

        const finalBytes = await pdfDoc.save();
        const blob = new Blob([finalBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "DUCATO_ASSINADO.pdf";
        a.click();
        
        document.getElementById("save-modal").style.display = "none";
    } catch (err) {
        alert("Erro ao salvar: " + err.message);
        document.getElementById("save-modal").style.display = "none";
    }
}

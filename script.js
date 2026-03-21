const { PDFDocument } = PDFLib;
let pdfDoc, currentCanvas, ctx, currentPageNum = 1, totalPages = 0, pdfScale = 1.0;
const dpr = window.devicePixelRatio || 1;

currentCanvas = document.getElementById('pdf-render');
ctx = currentCanvas.getContext('2d');

async function renderPage(num) {
    if (!pdfDoc) return;
    const pdfData = await pdfDoc.save();
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const page = await pdf.getPage(num);
    const viewport = page.getViewport({ scale: pdfScale });
    currentCanvas.width = viewport.width;
    currentCanvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    document.getElementById('page-num').textContent = num;
}

// FUNÇÃO DE SALVAR (O Check Verde)
async function salvarPDF() {
    if (!pdfDoc) return alert("Carregue um PDF!");
    const boxes = document.querySelectorAll('.sig-box');
    if (boxes.length === 0) return alert("Nenhuma assinatura!");

    const pages = pdfDoc.getPages();
    const page = pages[currentPageNum - 1];
    const { width, height } = page.getSize();
    const canvasRect = currentCanvas.getBoundingClientRect();

    for (const box of boxes) {
        const imgData = box.querySelector('img').src;
        const sigImg = await pdfDoc.embedPng(imgData);
        const boxRect = box.getBoundingClientRect();

        // Cálculo de conversão Pixels -> Pontos PDF
        const x = (boxRect.left - canvasRect.left) * (width / canvasRect.width);
        const y = height - ((boxRect.top - canvasRect.top + boxRect.height) * (height / canvasRect.height));

        page.drawImage(sigImg, {
            x: x, y: y,
            width: boxRect.width * (width / canvasRect.width),
            height: boxRect.height * (height / canvasRect.height),
        });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `assinado_${Date.now()}.pdf`;
    link.click();
}

// Vinculando botões
document.getElementById('btn-save').onclick = salvarPDF;
document.getElementById('file-in').onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
        pdfDoc = await PDFDocument.load(await file.arrayBuffer());
        totalPages = pdfDoc.getPageCount();
        renderPage(1);
    }
};

// Funções de Assinatura
window.openSigPad = () => {
    document.getElementById('sig-modal').style.display = 'flex';
    const canvas = document.getElementById('sig-pad');
    if (!window.sigPad) window.sigPad = new SignaturePad(canvas);
    setTimeout(() => {
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
        window.sigPad.clear();
    }, 200);
};

window.confirmSig = () => {
    if (window.sigPad && !window.sigPad.isEmpty()) {
        const box = document.createElement('div');
        box.className = 'sig-box';
        box.style.cssText = 'width:150px; position:absolute; top:100px; left:50px; z-index:100;';
        const img = document.createElement('img');
        img.src = window.sigPad.toDataURL();
        img.style.width = '100%';
        box.appendChild(img);
        document.getElementById('pdf-wrapper').appendChild(box);
        document.getElementById('sig-modal').style.display = 'none';
    }
};

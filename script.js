const { PDFDocument } = PDFLib;
let pdfDoc, currentCanvas, ctx, currentPageNum = 1, totalPages = 0, pdfScale = 1.0;
const wrapper = document.getElementById('pdf-wrapper'), sigModal = document.getElementById('sig-modal'), sigCanvas = document.getElementById('sig-pad');
let sigPad;

currentCanvas = document.getElementById('pdf-render');
ctx = currentCanvas.getContext('2d');

// 2.A: COMENTAR O CARREGAMENTO AUTOMÁTICO
// loadPdf(); 

async function renderPage(num) {
    if (!pdfDoc) return;
    const pdfData = await pdfDoc.save();
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const page = await pdf.getPage(num);
    const viewport = page.getViewport({ scale: pdfScale });
    currentCanvas.width = viewport.width; currentCanvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    document.getElementById('page-num').textContent = num;
}

window.adjustZoom = (amount) => { pdfScale = Math.max(0.3, Math.min(3.0, pdfScale + amount)); renderPage(currentPageNum); };
window.changePage = (offset) => { 
    const newPage = currentPageNum + offset; 
    if (newPage >= 1 && newPage <= totalPages) { currentPageNum = newPage; renderPage(currentPageNum); } 
};

// ASSINATURA
window.openSigPad = () => {
    sigModal.style.display = 'flex';
    if (!sigPad) {
        sigPad = new SignaturePad(sigCanvas, { minWidth: 0.8, maxWidth: 2.0, penColor: 'rgb(0,0,0)' });
        resizeSigCanvas();
    } else { sigPad.clear(); }
};

function resizeSigCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    sigCanvas.width = sigCanvas.offsetWidth * ratio;
    sigCanvas.height = sigCanvas.offsetHeight * ratio;
    sigCanvas.getContext("2d").scale(ratio, ratio);
}

window.clearSigPad = () => sigPad && sigPad.clear();
window.closeSigPad = () => sigModal.style.display = 'none';
window.confirmSig = () => { if (!sigPad.isEmpty()) { createSigBox(sigPad.toDataURL()); window.closeSigPad(); } };

function createSigBox(sigData) {
    const sigBox = document.createElement('div');
    sigBox.className = 'sig-box';
    sigBox.style.cssText = 'top:100px;left:100px;width:150px;height:75px;position:absolute;z-index:100;';
    
    // Lixeira ( tl )
    const btnDel = document.createElement('div'); btnDel.className = 'handle handle-tl'; btnDel.innerHTML = '🗑️';
    btnDel.onclick = (e) => { e.stopPropagation(); sigBox.remove(); };
    
    // Girar ( tr )
    const btnRot = document.createElement('div'); btnRot.className = 'handle handle-tr'; btnRot.innerHTML = '🔄';
    let rotation = 0;
    btnRot.onclick = (e) => { e.stopPropagation(); rotation += 90; sigBox.style.transform = `rotate(${rotation}deg)`; };

    const btnRes = document.createElement('div'); btnRes.className = 'handle handle-br';
    
    const img = document.createElement('img');
    img.src = sigData;
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;';

    sigBox.append(btnDel, btnRot, btnRes, img);
    wrapper.appendChild(sigBox);
}

// 2.B: UPLOAD MANUAL (Obrigatório para carregar o PDF)
document.getElementById('file-in').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await PDFDocument.load(arrayBuffer);
        totalPages = pdfDoc.getPageCount();
        document.getElementById('page-count').textContent = totalPages;
        currentPageNum = 1; renderPage(1);
    }
});

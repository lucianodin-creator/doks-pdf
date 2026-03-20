const { PDFDocument } = PDFLib;
let pdfDoc, currentCanvas, ctx, currentPageNum = 1, totalPages = 0, pdfScale = 1.0;
const wrapper = document.getElementById('pdf-wrapper');
const sigModal = document.getElementById('sig-modal');
const sigCanvas = document.getElementById('sig-pad');
let sigPad;

currentCanvas = document.getElementById('pdf-render');
ctx = currentCanvas.getContext('2d');

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

// MODAL ASSINATURA
window.openSigPad = () => {
    sigModal.style.display = 'flex';
    if (!sigPad) {
        sigPad = new SignaturePad(sigCanvas, { minWidth: 1.5, maxWidth: 3.5, penColor: 'black' });
    }
    setTimeout(() => {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        sigCanvas.width = sigCanvas.offsetWidth * ratio;
        sigCanvas.height = sigCanvas.offsetHeight * ratio;
        sigCanvas.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
        sigPad.clear();
    }, 200);
};

// CORREÇÃO BRAVA DO BOTÃO LIMPAR
document.getElementById('btn-clear').addEventListener('click', (e) => {
    e.preventDefault();
    if(sigPad) sigPad.clear();
});

window.closeSigPad = () => sigModal.style.display = 'none';
window.confirmSig = () => { if (sigPad && !sigPad.isEmpty()) { createSigBox(sigPad.toDataURL()); window.closeSigPad(); } };

// ASSINATURA NA FOLHA COM BOTÕES NOS CANTOS OPPOSTOS
function createSigBox(sigData) {
    const sigBox = document.createElement('div');
    sigBox.className = 'sig-box';
    sigBox.style.cssText = 'top:150px;left:50px;width:180px;height:90px;position:absolute;z-index:100;';
    
    // Lixeira na Esquerda
    const btnDel = document.createElement('button');
    btnDel.className = 'btn-del-box'; btnDel.innerHTML = '🗑️';
    btnDel.onclick = (e) => { e.stopPropagation(); sigBox.remove(); };

    // Girar na Direita
    const btnRot = document.createElement('button');
    btnRot.className = 'btn-rot-box'; btnRot.innerHTML = '🔄';
    let rotation = 0;
    btnRot.onclick = (e) => { e.stopPropagation(); rotation += 90; img.style.transform = `rotate(${rotation}deg)`; };

    const resizer = document.createElement('div');
    resizer.className = 'resizer';

    const img = document.createElement('img');
    img.src = sigData;
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;transition:transform 0.2s;';

    sigBox.append(btnDel, btnRot, resizer, img);
    wrapper.appendChild(sigBox);

    let isMoving = false, isResizing = false, startX, startY, startW, startH, startL, startT;

    sigBox.addEventListener('touchstart', (e) => {
        if (e.target === resizer) { isResizing = true; } 
        else if (e.target.tagName === 'BUTTON') { return; }
        else { isMoving = true; }
        const t = e.touches[0];
        startX = t.clientX; startY = t.clientY;
        startW = sigBox.offsetWidth; startH = sigBox.offsetHeight;
        startL = sigBox.offsetLeft; startT = sigBox.offsetTop;
    }, {passive: false});

    document.addEventListener('touchmove', (e) => {
        if (!isMoving && !isResizing) return;
        const t = e.touches[0];
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;

        if (isMoving) {
            sigBox.style.left = (startL + dx) + 'px';
            sigBox.style.top = (startT + dy) + 'px';
        } else if (isResizing) {
            sigBox.style.width = (startW + dx) + 'px';
            sigBox.style.height = (startH + dy) + 'px';
        }
    }, { passive: false });

    document.addEventListener('touchend', () => { isMoving = isResizing = false; });
}

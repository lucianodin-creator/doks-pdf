const { PDFDocument } = PDFLib;
let pdfDoc, currentCanvas, ctx, currentPageNum = 1, totalPages = 0, pdfScale = 1.0;
const wrapper = document.getElementById('pdf-wrapper');
const sigModal = document.getElementById('sig-modal');
const sigCanvas = document.getElementById('sig-pad');
let sigPad;

currentCanvas = document.getElementById('pdf-render');
ctx = currentCanvas.getContext('2d');

// 1. FUNÇÃO PARA CARREGAR O PDF QUE VOCÊ SELECIONAR
document.getElementById('file-in').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await PDFDocument.load(arrayBuffer);
        totalPages = pdfDoc.getPageCount();
        document.getElementById('page-count').textContent = totalPages;
        currentPageNum = 1;
        renderPage(1);
    }
});

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

// 2. CONTROLES DE ZOOM E PÁGINA
window.adjustZoom = (amount) => { pdfScale = Math.max(0.3, Math.min(3.0, pdfScale + amount)); renderPage(currentPageNum); };
window.changePage = (offset) => { 
    const newPage = currentPageNum + offset; 
    if (newPage >= 1 && newPage <= totalPages) { currentPageNum = newPage; renderPage(currentPageNum); } 
};

// 3. JANELA DE ASSINATURA (MODAL)
window.openSigPad = () => {
    sigModal.style.display = 'flex';
    if (!sigPad) {
        sigPad = new SignaturePad(sigCanvas, { minWidth: 1, maxWidth: 2.5, penColor: 'black' });
        resizeSigCanvas();
    } else {
        sigPad.clear();
    }
};

function resizeSigCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    sigCanvas.width = sigCanvas.offsetWidth * ratio;
    sigCanvas.height = sigCanvas.offsetHeight * ratio;
    sigCanvas.getContext("2d").scale(ratio, ratio);
}

window.clearSigPad = () => sigPad && sigPad.clear();
window.closeSigPad = () => sigModal.style.display = 'none';

window.confirmSig = () => {
    if (!sigPad.isEmpty()) {
        createSigBox(sigPad.toDataURL());
        window.closeSigPad();
    }
};

// 4. CRIAÇÃO DA ASSINATURA NA FOLHA (MÓVEL E REDIMENSIONÁVEL)
function createSigBox(sigData) {
    const sigBox = document.createElement('div');
    sigBox.className = 'sig-box';
    sigBox.style.cssText = 'top:100px;left:50px;width:150px;height:75px;position:absolute;z-index:100;';
    
    // Controles (Lixeira e Girar) acima da caixa
    const controls = document.createElement('div');
    controls.style.cssText = 'position:absolute;top:-35px;right:0;display:flex;gap:5px;';
    
    const btnDel = document.createElement('button');
    btnDel.innerHTML = '🗑️';
    btnDel.style.cssText = 'width:30px;height:30px;border-radius:50%;border:1px solid #ccc;background:#fff;';
    btnDel.onclick = () => sigBox.remove();

    const btnRot = document.createElement('button');
    btnRot.innerHTML = '🔄';
    btnRot.style.cssText = 'width:30px;height:30px;border-radius:50%;border:1px solid #ccc;background:#fff;';
    let rotation = 0;
    btnRot.onclick = () => { rotation += 90; img.style.transform = `rotate(${rotation}deg)`; };

    // Alça para REDIMENSIONAR (Canto inferior direito)
    const resizer = document.createElement('div');
    resizer.style.cssText = 'width:20px;height:20px;background:#1a73e8;position:absolute;right:-10px;bottom:-10px;border-radius:50%;border:2px solid #fff;';

    const img = document.createElement('img');
    img.src = sigData;
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;transition:transform 0.2s;';

    controls.append(btnDel, btnRot);
    sigBox.append(controls, resizer, img);
    wrapper.appendChild(sigBox);

    // LÓGICA DE MOVER (Touch)
    let isMoving = false, isResizing = false, startX, startY, startW, startH, startL, startT;

    sigBox.addEventListener('touchstart', (e) => {
        if (e.target === resizer) {
            isResizing = true;
        } else {
            isMoving = true;
        }
        const t = e.touches[0];
        startX = t.clientX; startY = t.clientY;
        startW = sigBox.offsetWidth; startH = sigBox.offsetHeight;
        startL = sigBox.offsetLeft; startT = sigBox.offsetTop;
    });

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

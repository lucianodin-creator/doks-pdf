const { PDFDocument } = PDFLib;
let pdfDoc, currentCanvas, ctx, currentPageNum = 1, totalPages = 0, pdfScale = 1.0;
const wrapper = document.getElementById('pdf-wrapper'), sigModal = document.getElementById('sig-modal'), sigCanvas = document.getElementById('sig-pad');
let sigPad;

currentCanvas = document.getElementById('pdf-render');
ctx = currentCanvas.getContext('2d');

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

window.openSigPad = () => {
    sigModal.style.display = 'flex';
    if (!sigPad) {
        sigPad = new SignaturePad(sigCanvas, { minWidth: 0.8, maxWidth: 1.8, penColor: 'rgb(0,0,0)' });
        resizeSigCanvas();
    } else { sigPad.clear(); }
};

function resizeSigCanvas() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    sigCanvas.width = sigCanvas.offsetWidth * ratio;
    sigCanvas.height = sigCanvas.offsetHeight * ratio;
    sigCanvas.getContext("2d").scale(ratio, ratio);
}

// --- SOLUÇÃO PARA O BOTÃO LIMPAR ---
function performClear() {
    if (sigPad) {
        sigPad.clear();
        const context = sigCanvas.getContext('2d');
        context.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
    }
}

// Vincula tanto o clique quanto o toque para garantir execução no Motorola
const clearBtn = document.querySelector('button[onclick*="clearSigPad"]');
if (clearBtn) {
    clearBtn.removeAttribute('onclick'); // Remove o antigo
    clearBtn.addEventListener('touchstart', (e) => { e.preventDefault(); performClear(); });
    clearBtn.addEventListener('click', (e) => { performClear(); });
}
window.clearSigPad = performClear;

window.closeSigPad = () => sigModal.style.display = 'none';
window.confirmSig = () => { if (!sigPad.isEmpty()) { createSigBox(sigPad.toDataURL()); window.closeSigPad(); } };

function createSigBox(sigData) {
    const sigBox = document.createElement('div');
    sigBox.className = 'sig-box';
    sigBox.style.cssText = 'top:100px;left:100px;width:150px;height:75px;';
    
    const btnDel = document.createElement('div'); btnDel.className = 'handle handle-tl'; btnDel.innerHTML = '🗑️';
    btnDel.onclick = (e) => { e.stopPropagation(); sigBox.remove(); };
    
    const btnRot = document.createElement('div'); btnRot.className = 'handle handle-tr'; btnRot.innerHTML = '🔄';
    let rotation = 0;
    btnRot.onclick = (e) => { e.stopPropagation(); rotation += 90; sigBox.style.transform = `rotate(${rotation}deg)`; };

    const btnRes = document.createElement('div'); btnRes.className = 'handle handle-br';
    
    const img = document.createElement('img');
    img.src = sigData;
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;';

    sigBox.append(btnDel, btnRot, btnRes, img);
    addManipulation(sigBox, btnRes);
    wrapper.appendChild(sigBox);
}

function addManipulation(box, resizer) {
    let isDragging = false, isResizing = false, startX, startY, startW, startH, startL, startT;

    box.addEventListener('touchstart', (e) => {
        if (e.target.classList.contains('handle')) return;
        isDragging = true;
        startX = e.touches[0].clientX; startY = e.touches[0].clientY;
        startL = parseInt(box.style.left); startT = parseInt(box.style.top);
    });

    resizer.addEventListener('touchstart', (e) => {
        e.stopPropagation(); isResizing = true;
        startX = e.touches[0].clientX; startY = e.touches[0].clientY;
        startW = parseInt(box.style.width); startH = parseInt(box.style.height);
    });

    wrapper.addEventListener('touchmove', (e) => {
        if (!isDragging && !isResizing) return;
        e.preventDefault();
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        if (isDragging) { box.style.left = (startL + dx) + 'px'; box.style.top = (startT + dy) + 'px'; }
        if (isResizing) { box.style.width = (startW + dx) + 'px'; box.style.height = (startH + dy) + 'px'; }
    });

    wrapper.addEventListener('touchend', () => { isDragging = isResizing = false; });
}

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

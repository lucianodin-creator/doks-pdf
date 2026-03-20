const { PDFDocument, rgb } = PDFLib;
let pdfDoc, currentCanvas, ctx, currentPageNum = 1, totalPages = 0, pdfScale = 1.0;
const wrapper = document.getElementById('pdf-wrapper');
currentCanvas = document.getElementById('pdf-render');
ctx = currentCanvas.getContext('2d');
const sigModal = document.getElementById('sig-modal'), sigCanvas = document.getElementById('sig-pad');
let sigPad;

currentCanvas.width = 0; currentCanvas.height = 0;

// Carregar PDF inicial (exemploAdobe)
loadPdf(); 

async function loadPdf() {
    const url = 'https://pdf-lib.js.org/assets/with_large_page_count.pdf';
    const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());
    pdfDoc = await PDFDocument.load(existingPdfBytes);
    totalPages = pdfDoc.getPageCount();
    document.getElementById('page-count').textContent = totalPages;
    renderPage(currentPageNum);
}

async function renderPage(num) {
    const pdfData = await pdfDoc.save();
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const page = await pdf.getPage(num);
    const viewport = page.getViewport({ scale: pdfScale });
    currentCanvas.width = viewport.width; currentCanvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
}

window.adjustZoom = (amount) => { pdfScale = Math.max(0.3, Math.min(3.0, pdfScale + amount)); renderPage(currentPageNum); };
window.changePage = (offset) => { const newPage = currentPageNum + offset; if (newPage >= 1 && newPage <= totalPages) { currentPageNum = newPage; renderPage(currentPageNum); } };

// ASSINATURA (SignaturePad)
window.openSigPad = () => { sigModal.style.display = 'flex'; if (!sigPad) { sigPad = new SignaturePad(sigCanvas, { minWidth: 1.5, maxWidth: 3.5, penColor: 'rgb(0,0,0)' }); } else { sigPad.clear(); } };
window.closeSigPad = () => sigModal.style.display = 'none';
window.confirmSig = () => { if (sigPad.isEmpty()) return; createSigBox(sigPad.toDataURL()); window.closeSigPad(); };

// CRIAR CAIXA INTERATIVA ( Tracejada com Handles )
function createSigBox(sigData) {
    const sigId = 'sig_' + Date.now();
    const sigBox = document.createElement('div');
    sigBox.id = sigId;
    sigBox.className = 'sig-box';
    sigBox.style.cssText = 'top:100px;left:100px;width:150px;height:75px;z-index:100;position:absolute;';
    
    const img = document.createElement('img');
    img.src = sigData;
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;';
    
    // Adicionar handles ( tl, tr, bl, br )
    ['tl', 'tr', 'bl', 'br'].forEach(pos => {
        const h = document.createElement('div');
        h.className = `handle handle-${pos}`;
        sigBox.appendChild(h);
    });

    // Lógica de manipulação ( simplificada para o mobile )
    addTouchManipulation(sigBox);

    sigBox.appendChild(img);
    wrapper.appendChild(sigBox);
}

// Lógica de Arrastar e Redimensionar (Touch)
function addTouchManipulation(box) {
    let isDragging = false, isResizing = false;
    let startX, startY, startWidth, startHeight, startTop, startLeft;
    let activeHandle;

    box.addEventListener('touchstart', (e) => {
        if (e.target.classList.contains('handle')) {
            isResizing = true;
            activeHandle = e.target;
        } else {
            isDragging = true;
        }
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startWidth = parseInt(box.style.width); startHeight = parseInt(box.style.height);
        startTop = parseInt(box.style.top); startLeft = parseInt(box.style.left);
    });

    wrapper.addEventListener('touchmove', (e) => {
        if (!isDragging && !isResizing) return;
        e.preventDefault();
        const touch = e.touches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;

        if (isDragging) {
            box.style.left = (startLeft + dx) + 'px';
            box.style.top = (startTop + dy) + 'px';
        } else if (isResizing) {
            // Lógica para o handle bottom-right (br) - Puxar para aumentar
            if (activeHandle.classList.contains('handle-br')) {
                box.style.width = Math.max(50, startWidth + dx) + 'px';
                box.style.height = Math.max(25, startHeight + dy) + 'px';
            }
        }
    });

    wrapper.addEventListener('touchend', () => { isDragging = isResizing = false; activeHandle = null; });
}

// Upload manual
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

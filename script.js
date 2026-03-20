const { PDFDocument, rgb } = PDFLib;
let pdfDoc, currentCanvas, ctx, currentPageNum = 1, totalPages = 0, pdfScale = 1.0, viewport;
const wrapper = document.getElementById('pdf-wrapper');
currentCanvas = document.getElementById('pdf-render');
ctx = currentCanvas.getContext('2d');
const sigModal = document.getElementById('sig-modal'), sigCanvas = document.getElementById('sig-pad');
let sigPad;

// Carregar PDF inicial (exemplo)
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
    viewport = page.getViewport({ scale: pdfScale });
    currentCanvas.width = viewport.width; currentCanvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    document.getElementById('page-num').textContent = num;
}

// ZOOM
window.adjustZoom = (amount) => { pdfScale = Math.max(0.3, Math.min(3.0, pdfScale + amount)); renderPage(currentPageNum); };
window.changePage = (offset) => { const newPage = currentPageNum + offset; if (newPage >= 1 && newPage <= totalPages) { currentPageNum = newPage; renderPage(currentPageNum); } };

// ASSINATURA
window.openSigPad = () => { sigModal.style.display = 'flex'; if (!sigPad) { sigPad = new SignaturePad(sigCanvas); } else { sigPad.clear(); } };
window.closeSigPad = () => sigModal.style.display = 'none';
window.confirmSig = () => { if (sigPad.isEmpty()) return; createSigBox(sigPad.toDataURL()); window.closeSigPad(); };

// --- NOVA LÓGICA INTERATIVA ---
function createSigBox(sigData) {
    const sigBox = document.createElement('div');
    sigBox.className = 'sig-box';
    // Posição e tamanho inicial padrão
    sigBox.style.cssText = 'top:100px;left:100px;width:150px;height:75px;';
    
    const img = document.createElement('img');
    img.src = sigData;
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;';
    
    // Adicionar Handles (tl=top-left, tr=top-right, bl=bottom-left, br=bottom-right)
    const handles = ['tl', 'tr', 'bl', 'br'].map(pos => {
        const h = document.createElement('div');
        h.className = `handle handle-${pos}`;
        sigBox.appendChild(h);
        return h;
    });

    // Estado da manipulação
    let currentRotation = 0;
    let isDragging = false, isResizing = false, isRotating = false;
    let startX, startY, startWidth, startHeight, startTop, startLeft;

    // --- FUNÇÕES DE TOQUE ---
    
    // 1. Arrastar (corpo da caixa)
    sigBox.addEventListener('touchstart', (e) => {
        if (e.target.classList.contains('handle')) return; // Não arraste se clicou no handle
        isDragging = true;
        startX = e.touches[0].clientX; startY = e.touches[0].clientY;
        startLeft = parseInt(sigBox.style.left); startTop = parseInt(sigBox.style.top);
    });

    // 2. Redimensionar (Handle BR - Bottom Right)
    sigBox.querySelector('.handle-br').addEventListener('touchstart', (e) => {
        e.stopPropagation(); // Impede o drag
        isResizing = true;
        startX = e.touches[0].clientX; startY = e.touches[0].clientY;
        startWidth = parseInt(sigBox.style.width); startHeight = parseInt(sigBox.style.height);
    });

    // 3. Girar (Handle TR - Top Right)
    sigBox.querySelector('.handle-tr').addEventListener('touchstart', (e) => {
        e.stopPropagation(); // Impede o drag
        isRotating = true;
        const rect = sigBox.getBoundingClientRect();
        // Centro da caixa para calcular o ângulo
        sigBox.dataset.centerX = rect.left + rect.width / 2;
        sigBox.dataset.centerY = rect.top + rect.height / 2;
    });

    // MOVER / REDIMENSIONAR / GIRAR
    wrapper.addEventListener('touchmove', (e) => {
        if (!isDragging && !isResizing && !isRotating) return;
        e.preventDefault();
        const touch = e.touches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;

        if (isDragging) {
            sigBox.style.left = (startLeft + dx) + 'px';
            sigBox.style.top = (startTop + dy) + 'px';
        } else if (isResizing) {
            // Mantém proporção simples
            sigBox.style.width = Math.max(50, startWidth + dx) + 'px';
            sigBox.style.height = Math.max(25, startHeight + dy) + 'px';
        } else if (isRotating) {
            const centerX = parseFloat(sigBox.dataset.centerX);
            const centerY = parseFloat(sigBox.dataset.centerY);
            // Calcula ângulo baseado na posição do toque em relação ao centro
            const angle = Math.atan2(touch.clientY - centerY, touch.clientX - centerX);
            currentRotation = angle * (180 / Math.PI); // Converte para graus
            sigBox.style.transform = `rotate(${currentRotation}deg)`;
        }
    });

    wrapper.addEventListener('touchend', () => { isDragging = isResizing = isRotating = false; });

    sigBox.appendChild(img);
    wrapper.appendChild(sigBox);
}

loadPdf();

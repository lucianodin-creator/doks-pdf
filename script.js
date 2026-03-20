const { PDFDocument, rgb } = PDFLib;
let pdfDoc, currentCanvas, ctx, currentPageNum = 1, totalPages = 0, pdfScale = 1.0, viewport;
const wrapper = document.getElementById('pdf-wrapper');
currentCanvas = document.getElementById('pdf-render');
ctx = currentCanvas.getContext('2d');
const sigModal = document.getElementById('sig-modal'), sigCanvas = document.getElementById('sig-pad');
let sigPad;

// loadPdf(); // Mantenha comentado para abrir limpo

async function renderPage(num) {
    const pdfData = await pdfDoc.save();
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const page = await pdf.getPage(num);
    viewport = page.getViewport({ scale: pdfScale });
    currentCanvas.width = viewport.width; currentCanvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    document.getElementById('page-num').textContent = num;
}

// ZOOM & NAVEGAÇÃO
window.adjustZoom = (amount) => { pdfScale = Math.max(0.3, Math.min(3.0, pdfScale + amount)); renderPage(currentPageNum); };
window.changePage = (offset) => { const newPage = currentPageNum + offset; if (newPage >= 1 && newPage <= totalPages) { currentPageNum = newPage; renderPage(currentPageNum); } };

// --- ASSINATURA ---

window.openSigPad = () => { 
    sigModal.style.display = 'flex'; 
    if (!sigPad) { 
        // --- PEÇA 1: Caneta Ultra-Fina e DPI-Aware ---
        sigPad = new SignaturePad(sigCanvas, {
            minWidth: 0.6, // Traço inicial super fino
            maxWidth: 1.4, // Traço máximo fino (DPI-Aware)
            penColor: 'rgb(0,0,0)'
        }); 
        // Força o ajuste de DPI imediatamente
        adjustSigCanvasDPI();
    } else { 
        sigPad.clear(); 
    } 
};

// --- PEÇA 2: Função técnica para ajustar DPI do Canvas ---
function adjustSigCanvasDPI() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    // Salva o traço atual antes de redimensionar
    const data = sigPad.toData();
    sigCanvas.width = sigCanvas.offsetWidth * ratio;
    sigCanvas.height = sigCanvas.offsetHeight * ratio;
    sigCanvas.getContext("2d").scale(ratio, ratio);
    sigPad.clear(); // Limpa e...
    sigPad.fromData(data); // ...recoloca o traço na nova escala
}

window.closeSigPad = () => sigModal.style.display = 'none';

// --- PEÇA 3: Fix Definitivo do Botão Limpar ---
window.clearSigPad = () => {
    if (sigPad) {
        sigPad.clear(); 
        // É vital reajustar o DPI após limpar para o próximo traço vir fino
        adjustSigCanvasDPI(); 
    }
};

window.confirmSig = () => { if (sigPad.isEmpty()) return; createSigBox(sigPad.toDataURL()); window.closeSigPad(); };

// --- PEÇA 4: Criar Caixa de Assinatura com Handles de Ajuste Manual ---
function createSigBox(sigData) {
    const sigId = 'sig_' + Date.now();
    const sigBox = document.createElement('div');
    sigBox.id = sigId;
    sigBox.className = 'sig-box';
    // Posição e tamanho inicial padrão
    sigBox.style.cssText = 'top:100px;left:100px;width:150px;height:75px;';
    
    const img = document.createElement('img');
    img.src = sigData;
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;';
    
    // Adicionar Handles ( tl, tr, bl, br )
    ['tl', 'tr', 'bl', 'br'].forEach(pos => {
        const h = document.createElement('div');
        h.className = `handle handle-${pos}`;
        sigBox.appendChild(h);
    });

    // Lógica de manipulação (Arrastar e Redimensionar)
    addManipulationLogic(sigBox);

    // Ferramentas (Lixeira)
    const tools = document.createElement('div');
    tools.style.cssText = 'position:absolute;top:-25px;right:0;';
    const btnDel = document.createElement('button');
    btnDel.innerHTML = '🗑️';
    btnDel.style.cssText = 'background:red;border:none;color:white;padding:3px;border-radius:5px;';
    btnDel.onclick = () => sigBox.remove();
    tools.appendChild(btnDel);
    sigBox.appendChild(tools);

    sigBox.appendChild(img);
    wrapper.appendChild(sigBox);
}

// --- PEÇA 5: Lógica de Arrastar e Redimensionar com o dedo ---
function addManipulationLogic(box) {
    let isDragging = false, isResizing = false;
    let startX, startY, startWidth, startHeight, startTop, startLeft;

    // Toque no corpo da caixa (para arrastar)
    box.addEventListener('touchstart', (e) => {
        if (e.target.classList.contains('handle')) return; // Ignora se clicou no handle
        isDragging = true;
        startX = e.touches[0].clientX; startY = e.touches[0].clientY;
        startLeft = parseInt(box.style.left); startTop = parseInt(box.style.top);
    });

    // Toque no handle BR (inferior direito, para redimensionar)
    box.querySelector('.handle-br').addEventListener('touchstart', (e) => {
        e.stopPropagation(); // Impede o drag
        isResizing = true;
        startX = e.touches[0].clientX; startY = e.touches[0].clientY;
        startWidth = parseInt(box.style.width); startHeight = parseInt(box.style.height);
    });

    // Movimentação
    wrapper.addEventListener('touchmove', (e) => {
        if (!isDragging && !isResizing) return;
        e.preventDefault(); // Impede rolar o PDF
        const touch = e.touches[0];
        const dx = touch.clientX - startX;
        const dy = touch.clientY - startY;

        if (isDragging) {
            box.style.left = (startLeft + dx) + 'px';
            box.style.top = (startTop + dy) + 'px';
        } else if (isResizing) {
            // Mantém a proporção da assinatura
            box.style.width = Math.max(50, startWidth + dx) + 'px';
            box.style.height = Math.max(25, startHeight + dy) + 'px';
        }
    });

    wrapper.addEventListener('touchend', () => { isDragging = isResizing = false; });
}

// Upload manual
document.getElementById('file-in').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await PDFDocument.load(arrayBuffer);
        totalPages = pdfDoc.getPageCount();
        document.getElementById('page-count').textContent = totalPages;
        document.getElementById('page-num').textContent = 1;
        currentPageNum = 1; renderPage(1);
    }
});

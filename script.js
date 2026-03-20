const { PDFDocument, rgb } = PDFLib;
let pdfDoc, currentCanvas, ctx, currentPageNum = 1, totalPages = 0, pdfScale = 1.0, viewport;
const wrapper = document.getElementById('pdf-wrapper');
currentCanvas = document.getElementById('pdf-render');
ctx = currentCanvas.getContext('2d');
const sigModal = document.getElementById('sig-modal'), sigCanvas = document.getElementById('sig-pad');
let sigPad;

// Carregar PDF inicial (mantenha comentado se quiser abrir limpo)
// loadPdf(); 

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

// --- ASSINATURA ---
window.openSigPad = () => { 
    sigModal.style.display = 'flex'; 
    if (!sigPad) { 
        // --- PEÇA 1: Caneta Ultra-Fina e DPI-Aware ---
        sigPad = new SignaturePad(sigCanvas, {
            // Traço Mínimo e Máximo super finos para telas de alta densidade
            minWidth: 0.5, 
            maxWidth: 1.2, 
            penColor: 'rgb(0,0,0)',
            velocityFilterWeight: 0.7 // Suaviza o traço
        }); 
        // Ajuste de DPI obrigatório para o canvas da assinatura
        adjustSigPadDPI();
    } else { 
        sigPad.clear(); 
    } 
};

// --- PEÇA 2: Ajuste técnico de DPI para o Canvas da Assinatura ---
function adjustSigPadDPI() {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    sigCanvas.width = sigCanvas.offsetWidth * ratio;
    sigCanvas.height = sigCanvas.offsetHeight * ratio;
    sigCanvas.getContext("2d").scale(ratio, ratio);
}

window.closeSigPad = () => sigModal.style.display = 'none';

// --- PEÇA 3: Correção do Botão Limpar ---
window.clearSigPad = () => {
    if (sigPad) {
        sigPad.clear(); // Limpa o traço
        adjustSigPadDPI(); // Reseta o DPI para evitar bugs de traço grosso ao re-assinar
    }
};

window.confirmSig = () => { if (sigPad.isEmpty()) return; createSigBox(sigPad.toDataURL()); window.closeSigPad(); };

// Criar a caixa de assinatura interativa sobre a folha
function createSigBox(sigData) {
    const sigId = 'sig_' + Date.now();
    const sigBox = document.createElement('div');
    sigBox.id = sigId;
    sigBox.className = 'sig-box';
    sigBox.style.cssText = 'top:100px;left:100px;width:150px;height:75px;position:absolute;z-index:100;cursor:move;border:2px dashed #1a73e8;';
    
    const img = document.createElement('img');
    img.src = sigData;
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;';
    
    // Ferramentas (Lixeira e Giro)
    const tools = document.createElement('div');
    tools.style.cssText = 'position:absolute;top:-25px;right:0;display:flex;gap:5px;';
    
    // Botão Lixeira
    const btnDel = document.createElement('button');
    btnDel.innerHTML = '🗑️';
    btnDel.style.cssText = 'background:red;border:none;color:white;padding:3px;border-radius:5px;';
    btnDel.onclick = () => sigBox.remove();
    tools.appendChild(btnDel);

    sigBox.appendChild(tools);
    sigBox.appendChild(img);

    // Lógica de arrastar
    sigBox.ontouchmove = (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = wrapper.getBoundingClientRect();
        sigBox.style.left = (touch.clientX - rect.left - (sigBox.offsetWidth/2)) + 'px';
        sigBox.style.top = (touch.clientY - rect.top - (sigBox.offsetHeight/2)) + 'px';
    };

    wrapper.appendChild(sigBox);
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

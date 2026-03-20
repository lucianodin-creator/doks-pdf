const { PDFDocument, rgb } = PDFLib;

let pdfDoc, currentCanvas, ctx;
let currentPageNum = 1;
let totalPages = 0;
let pdfScale = 1.0; // Escala inicial
let viewport;

const wrapper = document.getElementById('pdf-wrapper');
currentCanvas = document.getElementById('pdf-render');
ctx = currentCanvas.getContext('2d');

// Elementos do Modal
const sigModal = document.getElementById('sig-modal');
const sigCanvas = document.getElementById('sig-pad');
let sigPad;

async function loadPdf() {
    // Usando um PDF de exemplo ou o carregado pelo usuário
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
    
    // O segredo do zoom está aqui: aplicar o pdfScale global
    viewport = page.getViewport({ scale: pdfScale });
    currentCanvas.width = viewport.width;
    currentCanvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    document.getElementById('page-num').textContent = num;
}

// FUNÇÃO DE ZOOM (Ajuste de Escala)
window.adjustZoom = function(amount) {
    pdfScale += amount;
    // Limites de segurança para o zoom não sumir ou estourar a memória
    if (pdfScale < 0.3) pdfScale = 0.3;
    if (pdfScale > 3.0) pdfScale = 3.0;
    
    renderPage(currentPageNum);
};

window.changePage = function(offset) {
    const newPage = currentPageNum + offset;
    if (newPage >= 1 && newPage <= totalPages) {
        currentPageNum = newPage;
        renderPage(currentPageNum);
    }
};

// --- ASSINATURA ---
window.openSigPad = function() {
    sigModal.style.display = 'flex';
    if (!sigPad) {
        sigPad = new SignaturePad(sigCanvas, { penColor: 'rgb(0,0,0)' });
        // Ajustar tamanho do canvas da assinatura ao abrir
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        sigCanvas.width = sigCanvas.offsetWidth * ratio;
        sigCanvas.height = sigCanvas.offsetHeight * ratio;
        sigCanvas.getContext("2d").scale(ratio, ratio);
    } else {
        sigPad.clear();
    }
};

window.closeSigPad = () => sigModal.style.display = 'none';

window.confirmSig = function() {
    if (sigPad.isEmpty()) return;
    const sigData = sigPad.toDataURL();
    createSigBox(sigData);
    window.closeSigPad();
};

function createSigBox(sigData) {
    const sigId = 'sig_' + Date.now();
    const sigBox = document.createElement('div');
    sigBox.id = sigId;
    sigBox.className = 'sig-box';
    sigBox.style.cssText = 'top:50px;left:50px;width:150px;height:75px;position:absolute;z-index:100;cursor:move;';
    
    const img = document.createElement('img');
    img.src = sigData;
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;';
    
    // Adicionar botão de girar e deletar
    const tools = document.createElement('div');
    tools.style.cssText = 'position:absolute;top:-30px;right:0;display:flex;gap:5px;';
    
    // Botão Girar
    let rotation = 0;
    const btnRotate = document.createElement('button');
    btnRotate.innerHTML = '🔄';
    btnRotate.style.cssText = 'background:#1a73e8;border:none;color:white;padding:5px;border-radius:5px;';
    btnRotate.onclick = () => {
        rotation += 90;
        img.style.transform = `rotate(${rotation}deg)`;
    };

    // Botão Lixeira
    const btnDel = document.createElement('button');
    btnDel.innerHTML = '🗑️';
    btnDel.style.cssText = 'background:red;border:none;color:white;padding:5px;border-radius:5px;';
    btnDel.onclick = () => sigBox.remove();

    tools.appendChild(btnRotate);
    tools.appendChild(btnDel);
    sigBox.appendChild(tools);
    sigBox.appendChild(img);

    // Lógica simples de arrastar (Touch)
    sigBox.ontouchmove = (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = wrapper.getBoundingClientRect();
        sigBox.style.left = (touch.clientX - rect.left - (sigBox.offsetWidth/2)) + 'px';
        sigBox.style.top = (touch.clientY - rect.top - (sigBox.offsetHeight/2)) + 'px';
    };

    wrapper.appendChild(sigBox);
}

loadPdf();

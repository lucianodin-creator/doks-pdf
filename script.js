const { PDFDocument, rgb } = PDFLib;

let pdfDoc, currentCanvas, ctx;
let currentPageNum = 1;
let totalPages = 0;
let pdfScale = 1.0;
let viewport;

const wrapper = document.getElementById('pdf-wrapper');
currentCanvas = document.getElementById('pdf-render');
ctx = currentCanvas.getContext('2d');

// Elementos do Modal de Assinatura
const sigModal = document.getElementById('sig-modal');
const sigCanvas = document.getElementById('sig-pad');
let sigPad;

// Carregar PDF inicial (exemplo)
async function loadPdf() {
    const url = 'https://pdf-lib.js.org/assets/with_large_page_count.pdf'; // PDF de exemplo
    const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());
    pdfDoc = await PDFDocument.load(existingPdfBytes);
    totalPages = pdfDoc.getPageCount();
    document.getElementById('page-count').textContent = totalPages;
    renderPage(currentPageNum);
}

// Renderizar página no canvas
async function renderPage(num) {
    const pdf = await pdfjsLib.getDocument({ data: await pdfDoc.save() }).promise;
    const page = await pdf.getPage(num);
    
    viewport = page.getViewport({ scale: pdfScale });
    currentCanvas.width = viewport.width;
    currentCanvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    document.getElementById('page-num').textContent = num;
}

// --- FUNÇÕES DE ASSINATURA ---

function openSigPad() {
    sigModal.style.display = 'flex';
    if (!sigPad) {
        sigPad = new SignaturePad(sigCanvas, { penColor: 'rgb(0,0,0)' });
    } else {
        sigPad.clear();
    }
}

function closeSigPad() {
    sigModal.style.display = 'none';
}

function confirmSig() {
    if (sigPad.isEmpty()) return;
    
    const sigData = sigPad.toDataURL();
    createSigBox(sigData);
    closeSigPad();
}

// Criar a caixa de assinatura interativa sobre a folha
function createSigBox(sigData) {
    const sigId = 'sig_' + Date.now();
    
    // 1. Criar o Container Principal da Assinatura
    const sigBox = document.createElement('div');
    sigBox.id = sigId;
    sigBox.className = 'sig-box';
    // Posição inicial travada na folha (ex: top 100px, left 100px)
    sigBox.style.cssText = 'top:100px;left:100px;width:150px;height:75px;';
    
    // 2. Criar a imagem da assinatura
    const img = document.createElement('img');
    img.src = sigData;
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;';
    sigBox.appendChild(img);

    // 3. Adicionar Controles de Manipulação (Arrastar, Lixeira, Resize)
    addManipulationControls(sigBox, sigId);

    // 4. Injetar a caixa no wrapper do PDF (isso a cola na folha)
    wrapper.appendChild(sigBox);
}

// Adicionar controles para Arrastar, Deletar e Redimensionar
function addManipulationControls(box, id) {
    let isDragging = false;
    let isResizing = false;
    let startX, startY, startWidth, startHeight, startTop, startLeft;

    // --- ARRASTAR (Move) ---
    box.addEventListener('touchstart', (e) => {
        if (isResizing) return; // Se estiver redimensionando, não arraste
        isDragging = true;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startLeft = parseInt(box.style.left);
        startTop = parseInt(box.style.top);
        box.style.cursor = 'grabbing';
    });

    wrapper.addEventListener('touchmove', (e) => {
        if (isDragging) {
            e.preventDefault(); // Impede rolagem da página
            const dx = e.touches[0].clientX - startX;
            const dy = e.touches[0].clientY - startY;
            
            // Limitar dentro da folha (O PDF-WRAPPER)
            let newLeft = startLeft + dx;
            let newTop = startTop + dy;
            const mw = wrapper.offsetWidth - box.offsetWidth;
            const mh = wrapper.offsetHeight - box.offsetHeight;
            
            box.style.left = Math.max(0, Math.min(newLeft, mw)) + 'px';
            box.style.top = Math.max(0, Math.min(newTop, mh)) + 'px';
        } else if (isResizing) {
            e.preventDefault();
            const boxToResize = document.getElementById(isResizing);
            const dx = e.touches[0].clientX - startX;
            const dy = e.touches[0].clientY - startY;

            boxToResize.style.width = Math.max(50, startWidth + dx) + 'px';
            boxToResize.style.height = Math.max(25, startHeight + dy) + 'px';
        }
    });

    wrapper.addEventListener('touchend', () => {
        isDragging = false;
        isResizing = false;
        box.style.cursor = 'grab';
    });

    // --- FERRAMENTAS (Lixeira) ---
    const tools = document.createElement('div');
    tools.className = 'sig-tools';
    
    const btnDel = document.createElement('button');
    btnDel.className = 'tool-btn btn-del';
    btnDel.innerHTML = '<i class="fa fa-trash"></i>';
    btnDel.onclick = () => box.remove(); // Deleta a assinatura
    tools.appendChild(btnDel);

    box.appendChild(tools);

    // --- REDIMENSIONAR (Resize Handle) ---
    const resizer = document.createElement('div');
    resizer.className = 'resizer';
    
    resizer.addEventListener('touchstart', (e) => {
        e.stopPropagation(); // Impede o 'touchmove' de arrastar
        isResizing = id;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startWidth = parseInt(box.style.width);
        startHeight = parseInt(box.style.height);
    });

    box.appendChild(resizer);
}

// Inicializar
loadPdf();

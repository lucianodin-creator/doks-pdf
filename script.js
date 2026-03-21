const { PDFDocument } = PDFLib;
let pdfDoc, currentCanvas, ctx, currentPageNum = 1, totalPages = 0, pdfScale = 1.0;
let signatures = []; // Estado Global: Guarda as assinaturas da página atual

const wrapper = document.getElementById('pdf-wrapper');
const sigModal = document.getElementById('sig-modal');
const sigCanvas = document.getElementById('sig-pad');
let sigPad;

currentCanvas = document.getElementById('pdf-render');
ctx = currentCanvas.getContext('2d');

// FUNÇÃO MESTRE: Renderizar Tudo (PDF + Interface + Elementos)
async function renderizarTudo() {
    if (!pdfDoc) return;
    
    // 1. Mostrar PDF com o Zoom Atual
    const pdfData = await pdfDoc.save();
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const page = await pdf.getPage(currentPageNum);
    const viewport = page.getViewport({ scale: pdfScale });
    
    currentCanvas.width = viewport.width;
    currentCanvas.height = viewport.height;
    
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;

    // 2. Colocar Números de Páginas
    document.getElementById('page-num').textContent = currentPageNum;
    document.getElementById('page-count').textContent = totalPages;

    // 3. Manter assinaturas na posição correta (Independente do Zoom)
    // Aqui a mágica acontece: as sig-boxes já estão no wrapper, 
    // mas o wrapper cresce junto com o canvas.
}

// Botão de Upload
document.getElementById('file-in').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await PDFDocument.load(arrayBuffer);
        totalPages = pdfDoc.getPageCount();
        currentPageNum = 1;
        renderizarTudo();
    }
});

// Controles de Zoom usando a Função Mestre
window.adjustZoom = (amount) => { 
    pdfScale = Math.max(0.3, Math.min(3.0, pdfScale + amount)); 
    renderizarTudo(); 
};

window.changePage = (offset) => { 
    const newPage = currentPageNum + offset; 
    if (newPage >= 1 && newPage <= totalPages) { 
        currentPageNum = newPage; 
        renderizarTudo(); 
    } 
};

// MODAL E LIMPAR (Sincronizados)
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

// Vinculando o Botão Limpar de forma independente
document.getElementById('btn-clear').onclick = () => { if(sigPad) sigPad.clear(); };

window.closeSigPad = () => sigModal.style.display = 'none';

window.confirmSig = () => {
    if (sigPad && !sigPad.isEmpty()) {
        createSigBox(sigPad.toDataURL());
        window.closeSigPad();
    }
};

function createSigBox(sigData) {
    const sigBox = document.createElement('div');
    sigBox.className = 'sig-box';
    sigBox.style.cssText = `top:150px; left:50px; width:180px; height:90px; position:absolute; z-index:100;`;
    
    const btnDel = document.createElement('button');
    btnDel.className = 'btn-del-box'; btnDel.innerHTML = '🗑️';
    btnDel.onclick = (e) => { e.stopPropagation(); sigBox.remove(); };

    const btnRot = document.createElement('button');
    btnRot.className = 'btn-rot-box'; btnRot.innerHTML = '🔄';
    let rotation = 0;
    btnRot.onclick = (e) => { e.stopPropagation(); rotation += 90; img.style.transform = `rotate(${rotation}deg)`; };

    const resizer = document.createElement('div');
    resizer.className = 'resizer';

    const img = document.createElement('img');
    img.src = sigData;
    img.style.cssText = 'width:100%; height:100%; object-fit:contain; pointer-events:none;';

    sigBox.append(btnDel, btnRot, resizer, img);
    wrapper.appendChild(sigBox);

    addInteraction(sigBox, resizer);
}

function addInteraction(el, resizer) {
    let isMoving = false, isResizing = false, startX, startY, startW, startH, startL, startT;

    el.addEventListener('touchstart', (e) => {
        if (e.target === resizer) isResizing = true;
        else if (e.target.tagName === 'BUTTON') return;
        else isMoving = true;
        
        const t = e.touches[0];
        startX = t.clientX; startY = t.clientY;
        startW = el.offsetWidth; startH = el.offsetHeight;
        startL = el.offsetLeft; startT = el.offsetTop;
    });

    document.addEventListener('touchmove', (e) => {
        if (!isMoving && !isResizing) return;
        const t = e.touches[0];
        if (isMoving) {
            el.style.left = (startL + (t.clientX - startX)) + 'px';
            el.style.top = (startT + (t.clientY - startY)) + 'px';
        } else if (isResizing) {
            el.style.width = (startW + (t.clientX - startX)) + 'px';
            el.style.height = (startH + (t.clientY - startY)) + 'px';
        }
    });

    document.addEventListener('touchend', () => { isMoving = isResizing = false; });
}

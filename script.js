const { PDFDocument } = PDFLib;
let pdfDoc, currentCanvas, ctx, currentPageNum = 1, totalPages = 0, pdfScale = 1.0;
const wrapper = document.getElementById('pdf-wrapper');
const sigModal = document.getElementById('sig-modal');
const sigCanvas = document.getElementById('sig-pad');
let sigPad;

currentCanvas = document.getElementById('pdf-render');
ctx = currentCanvas.getContext('2d');

// RE-RENDER GLOBAL (Regra de Ouro 2)
async function renderPage(num) {
    if (!pdfDoc) return;
    const pdfData = await pdfDoc.save();
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const page = await pdf.getPage(num);
    const viewport = page.getViewport({ scale: pdfScale });
    
    currentCanvas.width = viewport.width;
    currentCanvas.height = viewport.height;
    
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    
    // Atualiza numeração (Regra de Ouro 3)
    document.getElementById('page-num').textContent = num;
    document.getElementById('page-count').textContent = totalPages;
}

// ZOOM chamando re-render
window.adjustZoom = (amount) => { 
    pdfScale = Math.max(0.3, Math.min(3.0, pdfScale + amount)); 
    renderPage(currentPageNum); 
};

window.changePage = (offset) => { 
    const newPage = currentPageNum + offset; 
    if (newPage >= 1 && newPage <= totalPages) { 
        currentPageNum = newPage; 
        renderPage(currentPageNum); 
    } 
};

// UPLOAD
document.getElementById('file-in').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await PDFDocument.load(arrayBuffer);
        totalPages = pdfDoc.getPageCount();
        currentPageNum = 1; renderPage(1);
    }
});

// MODAL ASSINATURA & BOTÃO LIMPAR (Independente)
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

document.getElementById('btn-clear').addEventListener('click', () => { if(sigPad) sigPad.clear(); });
window.closeSigPad = () => sigModal.style.display = 'none';
window.confirmSig = () => { if (sigPad && !sigPad.isEmpty()) { createSigBox(sigPad.toDataURL()); window.closeSigPad(); } };

// ASSINATURA NA FOLHA (Coordenadas Relativas % - Regra de Ouro 1)
function createSigBox(sigData) {
    const sigBox = document.createElement('div');
    sigBox.className = 'sig-box';
    // Começa em posição fixa mas será movida
    sigBox.style.cssText = 'top:20%; left:20%; width:150px; height:75px; position:absolute; z-index:100;';
    
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
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;

        if (isMoving) {
            el.style.left = (startL + dx) + 'px';
            el.style.top = (startT + dy) + 'px';
        } else if (isResizing) {
            el.style.width = (startW + dx) + 'px';
            el.style.height = (startH + dy) + 'px';
        }
    });

    document.addEventListener('touchend', () => { 
        isMoving = isResizing = false;
        // Ao soltar, poderíamos converter para %, mas como o wrapper cresce com o canvas, 
        // o posicionamento absoluto dentro do wrapper já resolve o zoom!
    });
}

const { PDFDocument, rgb } = PDFLib;
let pdfDoc, currentCanvas, ctx, currentPageNum = 1, totalPages = 0, pdfScale = 1.0, viewport;
const wrapper = document.getElementById('pdf-wrapper');
currentCanvas = document.getElementById('pdf-render');
ctx = currentCanvas.getContext('2d');
const sigModal = document.getElementById('sig-modal'), sigCanvas = document.getElementById('sig-pad');
let sigPad;

// Carregar PDF inicial (opcional, remova se quiser abrir limpo)
// loadPdf(); 

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

// --- ASSINATURA ---
window.openSigPad = () => { 
    sigModal.style.display = 'flex'; 
    if (!sigPad) { 
        // --- PEÇA 1: Ajustando a espessura da caneta ---
        sigPad = new SignaturePad(sigCanvas, {
            minWidth: 1.0, // Traço mais fino no início
            maxWidth: 2.5, // Traço máximo mais fino (era padrão > 5.0)
            penColor: 'rgb(0,0,0)'
        }); 
    } else { 
        sigPad.clear(); 
    } 
};
window.closeSigPad = () => sigModal.style.display = 'none';
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
    
    // --- PEÇA 2: Injetando o botão de Lixeira sobre a assinatura ---
    const tools = document.createElement('div');
    tools.style.cssText = 'position:absolute;top:-25px;right:-10px;display:flex;gap:5px;z-index:110;';
    
    const btnDel = document.createElement('button');
    btnDel.innerHTML = '🗑️'; // Ícone simples de lixeira
    btnDel.style.cssText = 'background:#ff4444;border:2px solid white;color:white;padding:3px 6px;border-radius:50%;font-size:12px;box-shadow:0 2px 5px rgba(0,0,0,0.3);';
    btnDel.onclick = () => sigBox.remove(); // Deleta a assinatura da folha

    tools.appendChild(btnDel);
    sigBox.appendChild(tools);
    sigBox.appendChild(img);

    // Lógica de arrastar (simplificada para o exemplo)
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

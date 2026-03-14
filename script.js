const { PDFDocument } = PDFLib;
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pdfBytes, pdfDocJs, pad = null, shouldDuplicate = false;
const sigModal = document.getElementById('sig-modal'), sigCanvas = document.getElementById('sig-canvas');
const container = document.getElementById('pdf-main-container'), draggable = document.getElementById('draggable-sig');
const sigPreview = document.getElementById('sig-preview'), btnDupli = document.getElementById('btn-duplicate');

function openSignature() {
    if (!container.querySelector('.page-wrapper')) return alert("Selecione um PDF primeiro!");
    sigModal.style.display = 'flex';
    setTimeout(setupCanvas, 200);
}

function setupCanvas() {
    const rect = sigCanvas.parentElement.getBoundingClientRect();
    sigCanvas.width = rect.width; sigCanvas.height = rect.height;
    if (pad) pad.off();
    pad = new SignaturePad(sigCanvas, { penColor: 'black' });
    pad.clear();
}

document.getElementById('btn-confirm-sig').onclick = function() {
    if (!pad || pad.isEmpty()) return alert("Assinatura vazia!");
    sigPreview.src = pad.toDataURL();
    draggable.style.display = 'block';
    const firstPage = container.querySelector('.page-wrapper');
    if (firstPage) {
        firstPage.appendChild(draggable);
        draggable.style.left = "50px";
        draggable.style.top = "50px";
    }
    sigModal.style.display = 'none';
};

function closeModal() { sigModal.style.display = 'none'; }

btnDupli.onclick = function(e) {
    e.stopPropagation();
    shouldDuplicate = !shouldDuplicate;
    this.innerText = shouldDuplicate ? "PÁG: TODAS" : "PÁG: ÚNICA";
    this.style.background = shouldDuplicate ? "#27ae60" : "#3498db";
    console.log("Duplicação ativa:", shouldDuplicate);
};

// ARRASTE E REDIMENSIONAMENTO
let isResizing = false;
draggable.addEventListener("touchstart", (e) => { isResizing = (e.target.id === 'resizer'); });

draggable.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const parentPage = draggable.parentElement;
    if (!parentPage || parentPage === container) return;
    const rect = parentPage.getBoundingClientRect();
    const touch = e.touches[0];

    if (isResizing) {
        const dRect = draggable.getBoundingClientRect();
        draggable.style.width = Math.max(40, touch.clientX - dRect.left) + "px";
        draggable.style.height = Math.max(20, touch.clientY - dRect.top) + "px";
    } else {
        let x = touch.clientX - rect.left - (draggable.offsetWidth / 2);
        let y = touch.clientY - rect.top - (draggable.offsetHeight / 2);
        draggable.style.left = Math.max(0, Math.min(x, rect.width - draggable.offsetWidth)) + "px";
        draggable.style.top = Math.max(0, Math.min(y, rect.height - draggable.offsetHeight)) + "px";
    }
}, { passive: false });

document.getElementById('file-in').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        pdfBytes = await file.arrayBuffer();
        pdfDocJs = await pdfjsLib.getDocument({data: pdfBytes}).promise;
        container.innerHTML = "";
        for (let i = 1; i <= pdfDocJs.numPages; i++) {
            const page = await pdfDocJs.getPage(i);
            const wrapper = document.createElement('div');
            wrapper.className = 'page-wrapper';
            const canvas = document.createElement('canvas');
            const viewport = page.getViewport({scale: 1.0});
            const scale = (container.clientWidth * 0.9) / viewport.width;
            const vp = page.getViewport({scale});
            canvas.width = vp.width; canvas.height = vp.height;
            await page.render({canvasContext: canvas.getContext('2d'), viewport: vp}).promise;
            wrapper.appendChild(canvas);
            container.appendChild(wrapper);
        }
    } catch (err) { alert("Erro: " + err); }
};

// SALVAR - LÓGICA DE DUPLICAÇÃO REFORÇADA
async function savePDF() {
    if(!pdfBytes || !sigPreview.src) return alert("Assine antes de salvar!");
    
    const doc = await PDFDocument.load(pdfBytes);
    const sigImg = await doc.embedPng(sigPreview.src);
    const allPages = doc.getPages();
    const firstWrapper = container.querySelector('.page-wrapper');
    
    // Pegamos a posição exata da assinatura no momento do clique em Salvar
    const posX = parseFloat(draggable.style.left);
    const posY = parseFloat(draggable.style.top);
    const sigW = draggable.offsetWidth;
    const sigH = draggable.offsetHeight;

    // Proporções em relação à folha exibida na tela
    const relX = posX / firstWrapper.offsetWidth;
    const relY = posY / firstWrapper.offsetHeight;
    const relW = sigW / firstWrapper.offsetWidth;
    const relH = sigH / firstWrapper.offsetHeight;

    // Se estiver no modo TODAS, usa o array completo, senão apenas a página 1
    const pagesToApply = shouldDuplicate ? allPages : [allPages[0]];

    pagesToApply.forEach((page) => {
        const { width, height } = page.getSize();
        
        // No PDF-Lib, o Y começa de baixo para cima, por isso invertemos
        page.drawImage(sigImg, {
            x: width * relX,
            y: height - (height * relY) - (height * relH),
            width: width * relW,
            height: height * relH
        });
    });

    const bytes = await doc.save();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([bytes], {type: 'application/pdf'}));
    link.download = "PDF_Assinado.pdf"; 
    link.click();
}

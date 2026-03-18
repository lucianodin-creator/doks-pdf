const { PDFDocument } = PDFLib;
let pdfBytes, pdfDocJs, pageNum = 1, zoom = 1.0;
const canvas = document.getElementById("pdf-render"), ctx = canvas.getContext("2d");
let sigsByPage = {};

document.getElementById('file-in').onchange = async (e) => {
    const file = e.target.files[0];
    pdfBytes = await file.arrayBuffer();
    pdfDocJs = await pdfjsLib.getDocument({data: pdfBytes}).promise;
    document.getElementById('page-count').textContent = pdfDocJs.numPages;
    
    const page = await pdfDocJs.getPage(1);
    zoom = (window.innerWidth * 0.95) / page.getViewport({scale: 1}).width;
    render();
};

async function render() {
    if(!pdfDocJs) return;
    const page = await pdfDocJs.getPage(pageNum);
    const vp = page.getViewport({scale: zoom});
    canvas.width = vp.width; canvas.height = vp.height;
    await page.render({canvasContext: ctx, viewport: vp}).promise;
    document.getElementById('page-num').textContent = pageNum;
    refreshSigs();
}

window.changePage = (n) => { if(pdfDocJs && pageNum+n > 0 && pageNum+n <= pdfDocJs.numPages) { pageNum += n; render(); } };
window.adjustZoom = (d) => { zoom += d; render(); };

window.openSigPad = () => {
    document.getElementById('sig-modal').style.display = 'flex';
    const c = document.getElementById('sig-pad');
    c.width = window.innerWidth; c.height = window.innerHeight - 120;
    window.pad = new SignaturePad(c);
};

window.confirmSig = () => {
    if(window.pad.isEmpty()) return;
    if(!sigsByPage[pageNum]) sigsByPage[pageNum] = [];
    const newSig = { img: window.pad.toDataURL(), x: 50, y: 50, w: 180 };
    sigsByPage[pageNum].push(newSig);
    document.getElementById('sig-modal').style.display = 'none';
    refreshSigs();
};

function refreshSigs() {
    document.querySelectorAll('.sig-box').forEach(b => b.remove());
    (sigsByPage[pageNum] || []).forEach((s, i) => {
        const div = document.createElement('div');
        div.className = 'sig-box';
        div.style.left = s.x + 'px'; div.style.top = s.y + 'px'; div.style.width = s.w + 'px';
        div.innerHTML = `<img src="${s.img}">`;
        
        // LOGICA DE ARRASTAR PARA MOTOROLA
        div.addEventListener('touchstart', (e) => { e.preventDefault(); }, {passive: false});
        div.addEventListener('touchmove', (e) => {
            const touch = e.touches[0];
            const rect = document.getElementById('pdf-wrapper').getBoundingClientRect();
            s.x = touch.clientX - rect.left - (s.w / 2);
            s.y = touch.clientY - rect.top - 30;
            div.style.left = s.x + 'px'; div.style.top = s.y + 'px';
        }, {passive: false});

        document.getElementById('pdf-wrapper').appendChild(div);
    });
}

window.saveFinalPdf = async () => {
    if(!pdfBytes) return;
    alert("Gerando PDF... Aguarde um instante.");
    const doc = await PDFDocument.load(pdfBytes);
    const pages = doc.getPages();
    
    for (let p in sigsByPage) {
        const page = pages[p-1];
        const { width, height } = page.getSize();
        for (let s of sigsByPage[p]) {
            const img = await doc.embedPng(s.img);
            const pX = (s.x / canvas.width) * width;
            const pY = height - ((s.y + 60) / canvas.height) * height; // Ajuste de altura
            page.drawImage(img, { x: pX, y: pY, width: (s.w/canvas.width)*width, height: 60 });
        }
    }
    const b = await doc.save();
    const blob = new Blob([b], {type: 'application/pdf'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "MANUAL_DUCATO_OK.pdf";
    a.click();
};

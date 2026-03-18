const { PDFDocument } = PDFLib;
let pdfBytes, pdfDocJs, pageNum = 1, zoom = 1.0;
const canvas = document.getElementById("pdf-render"), ctx = canvas.getContext("2d");
let signaturesByPage = {}; 

document.getElementById('file-in').onchange = async (e) => {
    const file = e.target.files[0];
    pdfBytes = await file.arrayBuffer();
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    pdfDocJs = await pdfjsLib.getDocument({data: pdfBytes}).promise;
    document.getElementById('page-count').textContent = pdfDocJs.numPages;
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
window.adjustZoom = (delta) => { zoom += delta; render(); };

window.openSigPad = () => {
    document.getElementById('sig-modal').style.display = 'flex';
    const c = document.getElementById('sig-pad');
    c.width = window.innerWidth; c.height = window.innerHeight - 120;
    window.pad = new SignaturePad(c);
};

window.confirmSig = () => {
    if(window.pad.isEmpty()) return;
    if(!signaturesByPage[pageNum]) signaturesByPage[pageNum] = [];
    signaturesByPage[pageNum].push({ img: window.pad.toDataURL(), x: 50, y: 50, w: 150 });
    document.getElementById('sig-modal').style.display = 'none';
    refreshSigs();
};

function refreshSigs() {
    document.querySelectorAll('.sig-box').forEach(b => b.remove());
    (signaturesByPage[pageNum] || []).forEach((s, i) => {
        const div = document.createElement('div');
        div.className = 'sig-box';
        div.style.left = s.x + 'px'; div.style.top = s.y + 'px'; div.style.width = s.w + 'px';
        div.innerHTML = `<img src="${s.img}" style="width:100%; pointer-events:none;">`;
        
        // Lógica de Arrastar (Touch)
        div.ontouchmove = (e) => {
            const touch = e.touches[0];
            const rect = document.getElementById('pdf-wrapper').getBoundingClientRect();
            s.x = touch.clientX - rect.left - (s.w/2);
            s.y = touch.clientY - rect.top - 25;
            div.style.left = s.x + 'px'; div.style.top = s.y + 'px';
        };
        
        document.getElementById('pdf-wrapper').appendChild(div);
    });
}

window.saveFinalPdf = async () => {
    if(!pdfBytes) return;
    const btn = document.querySelector('.btn-save');
    btn.innerHTML = '...';
    try {
        const doc = await PDFDocument.load(pdfBytes);
        const pages = doc.getPages();
        for (let p in signaturesByPage) {
            const page = pages[p-1];
            const { width, height } = page.getSize();
            for (let s of signaturesByPage[p]) {
                const img = await doc.embedPng(s.img);
                // Proporção: converte posição da tela para posição no PDF
                const pdfX = (s.x / canvas.width) * width;
                const pdfY = height - ((s.y + (s.w*0.5)) / canvas.height) * height;
                page.drawImage(img, { x: pdfX, y: pdfY, width: (s.w/canvas.width)*width, height: ((s.w*0.5)/canvas.height)*height });
            }
        }
        const saved = await doc.save();
        const blob = new Blob([saved], {type: 'application/pdf'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = "MANUAL_FINALIZADO.pdf";
        a.click();
    } catch(e) { alert(e.message); }
    btn.innerHTML = '<i class="fa fa-save"></i>';
};

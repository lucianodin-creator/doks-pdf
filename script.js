const { PDFDocument, degrees } = PDFLib;
let pdfBytes, pdfDocJs, pageNum = 1, zoom = 1.0;
const canvas = document.getElementById("pdf-render"), ctx = canvas.getContext("2d");
let signaturesByPage = {}; 

document.getElementById('file-in').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    pdfBytes = await file.arrayBuffer();
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    pdfDocJs = await pdfjsLib.getDocument({data: pdfBytes}).promise;
    document.getElementById('page-count').textContent = pdfDocJs.numPages;
    render();
};

async function render() {
    if(!pdfDocJs) return;
    const page = await pdfDocJs.getPage(pageNum);
    const viewport = page.getViewport({scale: zoom});
    canvas.width = viewport.width; canvas.height = viewport.height;
    await page.render({canvasContext: ctx, viewport: viewport}).promise;
    document.getElementById('page-num').textContent = pageNum;
    refreshSigs();
}

window.changePage = (n) => {
    if(pdfDocJs && pageNum + n > 0 && pageNum + n <= pdfDocJs.numPages) {
        pageNum += n; render();
    }
};

window.adjustZoom = (n) => { zoom += n; render(); };

// Modal de Assinatura
let pad;
window.openSigPad = () => {
    document.getElementById('sig-modal').style.display = 'flex';
    const c = document.getElementById('sig-pad');
    c.width = window.innerWidth; c.height = window.innerHeight - 100;
    pad = new SignaturePad(c);
};

window.closeSigPad = () => { document.getElementById('sig-modal').style.display = 'none'; };

window.confirmSig = () => {
    if(pad.isEmpty()) return alert("Assine primeiro!");
    const imgData = pad.toDataURL();
    if(!signaturesByPage[pageNum]) signaturesByPage[pageNum] = [];
    
    signaturesByPage[pageNum].push({
        img: imgData,
        x: 10, y: 10, w: 150, h: 80, rot: 0
    });
    
    closeSigPad();
    refreshSigs();
};

function refreshSigs() {
    document.querySelectorAll('.sig-box').forEach(b => b.remove());
    const pageSigs = signaturesByPage[pageNum] || [];
    pageSigs.forEach((sig, index) => {
        const box = document.createElement('div');
        box.className = 'sig-box';
        box.style.left = sig.x + 'px';
        box.style.top = sig.y + 'px';
        box.style.width = sig.w + 'px';
        box.innerHTML = `
            <div class="sig-ctrls">
                <button class="btn-ctrl btn-del" onclick="removeSig(${index})"><i class="fa fa-trash"></i></button>
            </div>
            <img src="${sig.img}" style="width:100%; pointer-events:none;">
        `;
        document.getElementById('pdf-wrapper').appendChild(box);
    });
}

window.removeSig = (index) => {
    signaturesByPage[pageNum].splice(index, 1);
    refreshSigs();
};

async function saveFinalPdf() {
    if(!pdfBytes) return alert("Abra um PDF!");
    document.getElementById('loading').style.display = 'flex';
    try {
        const doc = await PDFDocument.load(pdfBytes);
        const pages = doc.getPages();
        
        for (const pNum in signaturesByPage) {
            const page = pages[pNum - 1];
            const { width, height } = page.getSize();
            for (const sig of signaturesByPage[pNum]) {
                const img = await doc.embedPng(sig.img);
                // Conversão de coordenadas para o PDF
                page.drawImage(img, {
                    x: (sig.x / canvas.width) * width,
                    y: height - ((sig.y + sig.h) / canvas.height) * height,
                    width: (sig.w / canvas.width) * width,
                    height: (sig.h / canvas.height) * height
                });
            }
        }

        const finalBytes = await doc.save();
        const blob = new Blob([finalBytes], {type:'application/pdf'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = "MANUAL_ASSINADO.pdf";
        a.click();
    } catch(e) { alert("Erro ao salvar: " + e.message); }
    document.getElementById('loading').style.display = 'none';
}

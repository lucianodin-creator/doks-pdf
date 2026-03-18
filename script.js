const { PDFDocument } = PDFLib;
let pdfBytes, pdfDocJs, pageNum = 1, zoom = 1.0;
const canvas = document.getElementById("pdf-render"), ctx = canvas.getContext("2d");
let sigsByPage = {};

document.getElementById('file-in').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    pdfBytes = await file.arrayBuffer();
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
    pdfDocJs = await pdfjsLib.getDocument({data: pdfBytes}).promise;
    document.getElementById('page-count').textContent = pdfDocJs.numPages;
    // Zoom inicial inteligente para largura do celular
    const page = await pdfDocJs.getPage(1);
    const vp = page.getViewport({scale: 1});
    zoom = (window.innerWidth * 0.9) / vp.width;
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

window.changePage = (n) => {
    if(pdfDocJs && pageNum + n > 0 && pageNum + n <= pdfDocJs.numPages) {
        pageNum += n; render();
    }
};

// FUNÇÃO DE ZOOM CORRIGIDA
window.adjustZoom = (delta) => {
    zoom += delta;
    if (zoom < 0.2) zoom = 0.2;
    if (zoom > 3) zoom = 3;
    render();
};

window.openSigPad = () => {
    document.getElementById('sig-modal').style.display = 'flex';
    const c = document.getElementById('sig-pad');
    c.width = window.innerWidth; c.height = window.innerHeight - 100;
    window.pad = new SignaturePad(c);
};

window.confirmSig = () => {
    if(window.pad.isEmpty()) return alert("Assine!");
    if(!sigsByPage[pageNum]) sigsByPage[pageNum] = [];
    sigsByPage[pageNum].push({ img: window.pad.toDataURL(), x: 20, y: 20, w: 180 });
    document.getElementById('sig-modal').style.display = 'none';
    refreshSigs();
};

function refreshSigs() {
    document.querySelectorAll('.sig-box').forEach(b => b.remove());
    (sigsByPage[pageNum] || []).forEach((s, i) => {
        const div = document.createElement('div');
        div.className = 'sig-box';
        div.style.left = s.x + 'px'; div.style.top = s.y + 'px'; div.style.width = s.w + 'px';
        div.innerHTML = `<div class="sig-ctrls"><button class="btn-del" onclick="removeSig(${i})">X</button></div><img src="${s.img}" style="width:100%">`;
        document.getElementById('pdf-wrapper').appendChild(div);
    });
}

window.removeSig = (i) => { sigsByPage[pageNum].splice(i, 1); refreshSigs(); };

async function saveFinalPdf() {
    if(!pdfBytes) return;
    alert("Salvando... Aguarde.");
    const doc = await PDFDocument.load(pdfBytes);
    const pages = doc.getPages();
    for (let p in sigsByPage) {
        const page = pages[p-1];
        const { width, height } = page.getSize();
        for (let s of sigsByPage[p]) {
            const img = await doc.embedPng(s.img);
            page.drawImage(img, {
                x: (s.x / canvas.width) * width,
                y: height - ((s.y + (s.w/2)) / canvas.height) * height,
                width: (s.w / canvas.width) * width,
                height: ((s.w/2) / canvas.height) * height
            });
        }
    }
    const b = await doc.save();
    const blob = new Blob([b], {type:'application/pdf'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "PDF_ASSINADO.pdf";
    a.click();
}

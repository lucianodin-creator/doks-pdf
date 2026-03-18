const { PDFDocument } = PDFLib;
let pdfBytes, pdfDocJs, pageNum = 1, zoom = 1.0;
const canvas = document.getElementById("pdf-render"), ctx = canvas.getContext("2d");
let sigs = []; // Array unificado para facilitar clonagem

document.getElementById('file-in').onchange = async (e) => {
    const file = e.target.files[0];
    pdfBytes = await file.arrayBuffer();
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
window.adjustZoom = (d) => { zoom += d; render(); };

window.openSigPad = () => {
    document.getElementById('sig-modal').style.display = 'flex';
    const c = document.getElementById('sig-pad');
    c.width = window.innerWidth; c.height = window.innerHeight - 150;
    window.pad = new SignaturePad(c);
};

window.confirmSig = () => {
    if(window.pad.isEmpty()) return;
    sigs.push({ img: window.pad.toDataURL(), x: 50, y: 50, w: 150, h: 60, p: pageNum });
    document.getElementById('sig-modal').style.display = 'none';
    refreshSigs();
};

function refreshSigs() {
    document.querySelectorAll('.sig-box').forEach(b => b.remove());
    sigs.filter(s => s.p === pageNum).forEach((s, idx) => {
        const div = document.createElement('div');
        div.className = 'sig-box';
        div.style.left = s.x+'px'; div.style.top = s.y+'px'; div.style.width = s.w+'px'; div.style.height = s.h+'px';
        div.innerHTML = `
            <div class="sig-tools">
                <button class="tool-btn btn-del" onclick="removeSig(${sigs.indexOf(s)})"><i class="fa fa-trash"></i></button>
                <button class="tool-btn btn-clone" onclick="cloneSig(${sigs.indexOf(s)})"><i class="fa fa-copy"></i></button>
            </div>
            <img src="${s.img}">
            <div class="resizer"></div>
        `;
        
        // Drag e Resize
        div.addEventListener('touchmove', (e) => {
            const t = e.touches[0];
            const rect = document.getElementById('pdf-wrapper').getBoundingClientRect();
            if(e.target.className === 'resizer') {
                s.w = t.clientX - div.getBoundingClientRect().left;
                s.h = t.clientY - div.getBoundingClientRect().top;
            } else {
                s.x = t.clientX - rect.left - (s.w/2);
                s.y = t.clientY - rect.top - (s.h/2);
            }
            refreshSigs();
        });
        document.getElementById('pdf-wrapper').appendChild(div);
    });
}

window.removeSig = (i) => { sigs.splice(i, 1); refreshSigs(); };

window.cloneSig = (i) => {
    const original = sigs[i];
    for(let p=1; p<=pdfDocJs.numPages; p++) {
        if(p !== pageNum) sigs.push({...original, p: p});
    }
    alert("Assinatura clonada para todas as páginas!");
};

window.saveFinalPdf = async () => {
    const doc = await PDFDocument.load(pdfBytes);
    const pages = doc.getPages();
    for(let s of sigs) {
        const page = pages[s.p-1];
        const { width, height } = page.getSize();
        const img = await doc.embedPng(s.img);
        page.drawImage(img, {
            x: (s.x / canvas.width) * width,
            y: height - ((s.y + s.h) / canvas.height) * height,
            width: (s.w / canvas.width) * width,
            height: (s.h / canvas.height) * height
        });
    }
    const b = await doc.save();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([b], {type:'application/pdf'}));
    a.download = "MANUAL_COMPLETO.pdf";
    a.click();
};

window.closeSigPad = () => document.getElementById('sig-modal').style.display = 'none';

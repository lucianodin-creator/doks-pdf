const { PDFDocument } = PDFLib;
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pdfBytes, signaturePad;
const viewer = document.getElementById('viewer');
const dragBox = document.getElementById('drag-box');
const render = document.getElementById('render');
const tag = document.getElementById('tag');

function openPad() {
    if (!viewer.hasChildNodes()) return alert("Abra o PDF.");
    document.getElementById('modal').style.display = 'flex';
    const c = document.getElementById('pad-canvas');
    c.width = c.offsetWidth; c.height = c.offsetHeight;
    signaturePad = new SignaturePad(c);
}

function closePad() { document.getElementById('modal').style.display = 'none'; }

function confirm() {
    if (signaturePad.isEmpty()) return alert("Assine.");
    render.src = signaturePad.toDataURL();
    dragBox.style.display = 'block';
    const p1 = viewer.querySelector('.pdf-wrapper');
    if (p1) { p1.appendChild(dragBox); dragBox.style.left = "50px"; dragBox.style.top = "50px"; }
    closePad();
}

tag.onclick = function(e) {
    e.stopPropagation();
    const isAll = this.innerText.includes("TODAS");
    this.innerText = isAll ? "APLICAR: SÓ ESTA" : "APLICAR: TODAS";
    this.style.background = isAll ? "#f39c12" : "#28a745";
};

dragBox.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const r = dragBox.parentElement.getBoundingClientRect();
    const t = e.touches[0];
    dragBox.style.left = (t.clientX - r.left - 75) + "px";
    dragBox.style.top = (t.clientY - r.top - 30) + "px";
}, { passive: false });

document.getElementById('file').onchange = async (e) => {
    const file = e.target.files[0];
    pdfBytes = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({data: pdfBytes}).promise;
    viewer.innerHTML = "";
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const wrap = document.createElement('div');
        wrap.className = 'pdf-wrapper';
        const c = document.createElement('canvas');
        const vp = page.getViewport({scale: (viewer.clientWidth * 0.9) / page.getViewport({scale:1}).width});
        c.width = vp.width; c.height = vp.height;
        await page.render({canvasContext: c.getContext('2d'), viewport: vp}).promise;
        wrap.appendChild(c);
        viewer.appendChild(wrap);
    }
};

async function save() {
    if(!pdfBytes || !render.src) return alert("Erro.");
    const doc = await PDFDocument.load(pdfBytes);
    const img = await doc.embedPng(render.src);
    const pages = doc.getPages();
    const wrap = viewer.querySelector('.pdf-wrapper');
    const rx = parseFloat(dragBox.style.left) / wrap.offsetWidth;
    const ry = parseFloat(dragBox.style.top) / wrap.offsetHeight;
    const rw = dragBox.offsetWidth / wrap.offsetWidth;
    const rh = dragBox.offsetHeight / wrap.offsetHeight;
    const limit = tag.innerText.includes("TODAS") ? pages.length : 1;
    for (let i = 0; i < limit; i++) {
        const p = pages[i];
        const { width, height } = p.getSize();
        p.drawImage(img, { x: width * rx, y: height - (height * ry) - (height * rh), width: width * rw, height: height * rh });
    }
    const b = await doc.save();
    const l = document.createElement('a');
    l.href = URL.createObjectURL(new Blob([b], {type: 'application/pdf'}));
    l.download = "meupdf_ok.pdf";
    l.click();
}

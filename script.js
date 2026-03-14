const { PDFDocument } = PDFLib;
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let currentPdf, sp;
const viewer = document.getElementById('viewer');
const sigBox = document.getElementById('sig-box');
const sigTag = document.getElementById('sig-tag');
const sigRender = document.getElementById('sig-render');

function openPad() {
    if (!viewer.hasChildNodes()) return alert("Selecione um PDF primeiro.");
    document.getElementById('modal-overlay').style.display = 'flex';
    const canvas = document.getElementById('sig-canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    canvas.getContext("2d").scale(dpr, dpr);
    sp = new SignaturePad(canvas, { penColor: 'black' });
}

function closePad() { document.getElementById('modal-overlay').style.display = 'none'; }

function confirmSig() {
    if (sp.isEmpty()) return alert("Área em branco!");
    sigRender.src = sp.toDataURL();
    sigBox.style.display = 'block';
    const page1 = viewer.querySelector('.page-container');
    if (page1) {
        page1.appendChild(sigBox);
        sigBox.style.left = "50px";
        sigBox.style.top = "50px";
    }
    closePad();
}

sigTag.onclick = function(e) {
    e.stopPropagation();
    const all = this.innerText.includes("TODAS");
    this.innerText = all ? "PÁGINA: ÚNICA" : "PÁGINA: TODAS";
    this.style.background = all ? "#ffc107" : "#28a745";
};

sigBox.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const parent = sigBox.parentElement;
    const rect = parent.getBoundingClientRect();
    const touch = e.touches[0];
    sigBox.style.left = (touch.clientX - rect.left - 80) + "px";
    sigBox.style.top = (touch.clientY - rect.top - 35) + "px";
}, { passive: false });

document.getElementById('pdf-input').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    currentPdf = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({data: currentPdf}).promise;
    viewer.innerHTML = "";
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const div = document.createElement('div');
        div.className = 'page-container';
        const canvas = document.createElement('canvas');
        const viewport = page.getViewport({scale: (viewer.clientWidth * 0.95) / page.getViewport({scale:1}).width});
        canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({canvasContext: canvas.getContext('2d'), viewport}).promise;
        div.appendChild(canvas);
        viewer.appendChild(div);
    }
};

async function saveFile() {
    if(!currentPdf || !sigRender.src) return alert("Faltam dados para salvar.");
    const doc = await PDFDocument.load(currentPdf);
    const pngImg = await doc.embedPng(sigRender.src);
    const pages = doc.getPages();
    const container = viewer.querySelector('.page-container');
    
    const xRel = parseFloat(sigBox.style.left) / container.offsetWidth;
    const yRel = parseFloat(sigBox.style.top) / container.offsetHeight;
    const wRel = sigBox.offsetWidth / container.offsetWidth;
    const hRel = sigBox.offsetHeight / container.offsetHeight;

    const allPages = sigTag.innerText.includes("TODAS");
    const iterations = allPages ? pages.length : 1;

    for (let i = 0; i < iterations; i++) {
        const p = pages[i];
        const { width, height } = p.getSize();
        p.drawImage(pngImg, {
            x: width * xRel, 
            y: height - (height * yRel) - (height * hRel),
            width: width * wRel, 
            height: height * hRel
        });
    }
    const bytes = await doc.save();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([bytes], {type: 'application/pdf'}));
    link.download = "MeuPDF_Final.pdf";
    link.click();
}

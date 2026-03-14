const { PDFDocument } = PDFLib;
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

let pdfRaw, sigPad;
const view = document.getElementById('view');
const floatSig = document.getElementById('float-sig');
const sigImg = document.getElementById('sig-img');
const sigOpt = document.getElementById('sig-opt');

function initSig() {
    if (!view.hasChildNodes()) return alert("Carregue um PDF.");
    document.getElementById('modal').style.display = 'flex';
    const canvas = document.getElementById('main-canvas');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    canvas.getContext("2d").scale(dpr, dpr);
    sigPad = new SignaturePad(canvas);
}

function closeModal() { document.getElementById('modal').style.display = 'none'; }

function confirmSig() {
    if (sigPad.isEmpty()) return alert("Assine primeiro.");
    sigImg.src = sigPad.toDataURL();
    floatSig.style.display = 'block';
    const firstPage = view.querySelector('.pdf-page');
    if (firstPage) firstPage.appendChild(floatSig);
    closeModal();
}

sigOpt.onclick = function(e) {
    e.stopPropagation();
    const isAll = this.innerText.includes("TODAS");
    this.innerText = isAll ? "PÁGINA: ATUAL" : "PÁGINA: TODAS";
    this.style.background = isAll ? "#ffc107" : "#28a745";
};

floatSig.addEventListener("touchmove", (e) => {
    e.preventDefault();
    const parent = floatSig.parentElement;
    const rect = parent.getBoundingClientRect();
    const touch = e.touches[0];
    floatSig.style.left = (touch.clientX - rect.left - 75) + "px";
    floatSig.style.top = (touch.clientY - rect.top - 32) + "px";
}, { passive: false });

document.getElementById('pdf-upload').onchange = async (e) => {
    const file = e.target.files[0];
    pdfRaw = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({data: pdfRaw}).promise;
    view.innerHTML = "";
    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const wrapper = document.createElement('div');
        wrapper.className = 'pdf-page';
        const canvas = document.createElement('canvas');
        const vp = page.getViewport({scale: view.clientWidth / page.getViewport({scale:1}).width * 0.9});
        canvas.width = vp.width; canvas.height = vp.height;
        await page.render({canvasContext: canvas.getContext('2d'), viewport: vp}).promise;
        wrapper.appendChild(canvas);
        view.appendChild(wrapper);
    }
};

async function exportPDF() {
    if(!pdfRaw || !sigImg.src) return alert("Faltam dados.");
    const doc = await PDFDocument.load(pdfRaw);
    const png = await doc.embedPng(sigImg.src);
    const pages = doc.getPages();
    const wrapper = view.querySelector('.pdf-page');
    
    const rx = parseFloat(floatSig.style.left) / wrapper.offsetWidth;
    const ry = parseFloat(floatSig.style.top) / wrapper.offsetHeight;
    const rw = floatSig.offsetWidth / wrapper.offsetWidth;
    const rh = floatSig.offsetHeight / wrapper.offsetHeight;

    const applyAll = sigOpt.innerText.includes("TODAS");
    const limit = applyAll ? pages.length : 1;

    for (let i = 0; i < limit; i++) {
        const p = pages[i];
        const { width, height } = p.getSize();
        p.drawImage(png, {
            x: width * rx, y: height - (height * ry) - (height * rh),
            width: width * rw, height: height * rh
        });
    }
    const bytes = await doc.save();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([bytes], {type: 'application/pdf'}));
    link.download = "meupdf_assinado.pdf";
    link.click();
}

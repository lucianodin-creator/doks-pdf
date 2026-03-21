const { PDFDocument } = PDFLib;
let pdfDoc, currentCanvas, ctx, currentPageNum = 1, totalPages = 0, pdfScale = 1.0;
const wrapper = document.getElementById('pdf-wrapper');
const sigModal = document.getElementById('sig-modal');
const sigCanvas = document.getElementById('sig-pad');
let sigPad;

currentCanvas = document.getElementById('pdf-render');
ctx = currentCanvas.getContext('2d');

async function renderPage(num) {
    if (!pdfDoc) return;
    const pdfData = await pdfDoc.save();
    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    const page = await pdf.getPage(num);
    const viewport = page.getViewport({ scale: pdfScale });
    currentCanvas.width = viewport.width;
    currentCanvas.height = viewport.height;
    await page.render({ canvasContext: ctx, viewport: viewport }).promise;
    document.getElementById('page-num').textContent = num;
    document.getElementById('page-count').textContent = totalPages;
}

document.getElementById('file-in').onchange = async (e) => {
    const file = e.target.files[0];
    if (file) {
        const arrayBuffer = await file.arrayBuffer();
        pdfDoc = await PDFDocument.load(arrayBuffer);
        totalPages = pdfDoc.getPageCount();
        currentPageNum = 1; renderPage(1);
    }
};

window.adjustZoom = (amt) => { pdfScale = Math.max(0.3, Math.min(3.0, pdfScale + amt)); renderPage(currentPageNum); };
window.changePage = (off) => { 
    const n = currentPageNum + off; 
    if (n >= 1 && n <= totalPages) { currentPageNum = n; renderPage(n); } 
};

// ESTRATÉGIA 3: Sincronização de DPI e Área de Desenho
function resizeSigCanvas() {
    const rect = sigCanvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    sigCanvas.width = rect.width * ratio;
    sigCanvas.height = rect.height * ratio;
    sigCanvas.getContext("2d").scale(ratio, ratio);
    if(sigPad) sigPad.clear();
}

window.openSigPad = () => {
    sigModal.style.display = 'flex';
    if (!sigPad) {
        sigPad = new SignaturePad(sigCanvas, { minWidth: 1.5, maxWidth: 4.5, penColor: 'black' });
    }
    setTimeout(resizeSigCanvas, 250);
};

document.getElementById('btn-clear').onclick = () => sigPad.clear();
window.closeSigPad = () => sigModal.style.display = 'none';
window.confirmSig = () => {
    if (sigPad && !sigPad.isEmpty()) {
        createSigBox(sigPad.toDataURL());
        window.closeSigPad();
    }
};

function createSigBox(data) {
    const box = document.createElement('div');
    box.className = 'sig-box';
    box.style.cssText = 'top:100px;left:50px;width:180px;height:90px;position:absolute;z-index:100;';
    
    const del = document.createElement('button'); del.className = 'btn-del-box'; del.innerHTML = '🗑️';
    del.onclick = (e) => { e.stopPropagation(); box.remove(); };

    const rot = document.createElement('button'); rot.className = 'btn-rot-box'; rot.innerHTML = '🔄';
    let r = 0;
    rot.onclick = (e) => { e.stopPropagation(); r += 90; img.style.transform = `rotate(${r}deg)`; };

    const res = document.createElement('div'); res.className = 'resizer';
    const img = document.createElement('img');
    img.src = data; img.style.cssText = 'width:100%;height:100%;object-fit:contain;pointer-events:none;';

    box.append(del, rot, res, img);
    wrapper.appendChild(box);
    addInteraction(box, res);
}

function addInteraction(el, res) {
    let m = false, r = false, sx, sy, sw, sh, sl, st;
    el.ontouchstart = (e) => {
        const t = e.touches[0];
        if (e.target === res) r = true; else if (e.target.tagName === 'BUTTON') return; else m = true;
        sx = t.clientX; sy = t.clientY; sw = el.offsetWidth; sh = el.offsetHeight; sl = el.offsetLeft; st = el.offsetTop;
    };
    document.ontouchmove = (e) => {
        if (!m && !r) return;
        const t = e.touches[0];
        if (m) { el.style.left = (sl + (t.clientX - sx)) + 'px'; el.style.top = (st + (t.clientY - sy)) + 'px'; }
        else if (r) { el.style.width = (sw + (t.clientX - sx)) + 'px'; el.style.height = (sh + (t.clientY - sy)) + 'px'; }
    };
    document.ontouchend = () => { m = r = false; };
}

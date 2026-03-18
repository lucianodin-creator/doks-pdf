const { PDFDocument, degrees } = PDFLib;
let pdfBytes, pdfDocJs, pageNum = 1;
const canvas = document.getElementById("pdf-render"), ctx = canvas.getContext("2d");
let signaturesByPage = {};

document.getElementById('file-in').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    pdfBytes = await file.arrayBuffer();
    pdfDocJs = await pdfjsLib.getDocument({data: pdfBytes}).promise;
    document.getElementById('page-count').textContent = pdfDocJs.numPages;
    render();
};

async function render() {
    if(!pdfDocJs) return;
    const page = await pdfDocJs.getPage(pageNum);
    // Ajuste de zoom automático para o Motorola
    const viewport = page.getViewport({scale: 1});
    const scale = (window.innerWidth * 0.9) / viewport.width;
    const vp = page.getViewport({scale: scale});
    
    canvas.width = vp.width; canvas.height = vp.height;
    await page.render({canvasContext: ctx, viewport: vp}).promise;
    document.getElementById("page-num").textContent = pageNum;
    refreshSignatures();
}

function refreshSignatures() {
    // Remove assinaturas visuais antigas
    document.querySelectorAll('.sig-box').forEach(b => b.remove());
    // Se tiver assinatura na página atual, mostra
    if(signaturesByPage[pageNum]) {
        createSigBox(signaturesByPage[pageNum]);
    }
}

function createSigBox(data) {
    const box = document.createElement('div');
    box.className = 'sig-box';
    box.style.width = data.w + '%';
    box.style.left = data.x + '%';
    box.style.top = data.y + '%';
    box.innerHTML = `
        <div class="sig-controls">
            <button class="ctrl-btn btn-del" onclick="deleteSig()"><i class="fa fa-trash"></i></button>
            <button class="ctrl-btn btn-rot" onclick="rotateSig()"><i class="fa fa-sync"></i></button>
        </div>
        <img src="${data.img}" class="sig-img">
        <div class="resizer"></div>
    `;
    document.getElementById('pdf-wrapper').appendChild(box);
    // Adicionar lógica de arrastar aqui depois...
}

window.changePage = (n) => {
    if(pdfDocJs && pageNum+n > 0 && pageNum+n <= pdfDocJs.numPages) {
        pageNum += n; render();
    }
};

async function saveFinalPdf() {
    if (!pdfBytes) return alert("Selecione o PDF!");
    document.getElementById("save-modal").style.display = "flex";
    try {
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        for (const [p, data] of Object.entries(signaturesByPage)) {
            const page = pages[p-1];
            const { width, height } = page.getSize();
            const sigImg = await pdfDoc.embedPng(data.img);
            page.drawImage(sigImg, {
                x: width * (data.x/100),
                y: height - (height * (data.y/100)) - (height * (data.h/100)),
                width: width * (data.w/100),
                height: height * (data.h/100)
            });
        }
        const final = await pdfDoc.save();
        const blob = new Blob([final], {type:'application/pdf'});
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = "MANUAL_ASSINADO.pdf";
        a.click();
        document.getElementById("save-modal").style.display = "none";
    } catch (e) { alert(e.message); document.getElementById("save-modal").style.display = "none"; }
}

const { PDFDocument, degrees } = PDFLib;
let pdfBytes, pdfDocJs, pageNum = 1;
let signaturesByPage = {}; 
const canvas = document.getElementById("pdf-render"), ctx = canvas.getContext("2d");
const saveModal = document.getElementById("save-modal"), saveTimer = document.getElementById("save-timer");

// Inicialização de arquivo
document.getElementById('file-in').onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const arrayBuffer = await file.arrayBuffer();
    pdfBytes = arrayBuffer;
    pdfDocJs = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
    document.getElementById('page-count').textContent = pdfDocJs.numPages;
    render();
};

async function render() {
    if(!pdfDocJs) return;
    const page = await pdfDocJs.getPage(pageNum);
    const vp = page.getViewport({scale: 2.0});
    canvas.width = vp.width; canvas.height = vp.height;
    await page.render({canvasContext: ctx, viewport: vp}).promise;
    document.getElementById("page-num").textContent = pageNum;
    updateSigUI();
}

async function saveFinalPdf() {
    if (!pdfBytes) { alert("Abra um PDF primeiro!"); return; }
    
    saveModal.style.display = "flex";
    saveTimer.textContent = "Conectando ao servidor...";

    try {
        const fileInput = document.getElementById("file-in");
        const data = signaturesByPage[pageNum];
        
        if (!data) throw new Error("Posicione a assinatura na tela antes de salvar.");

        const responseSig = await fetch(data.img);
        const sigBlob = await responseSig.blob();
        
        const formData = new FormData();
        formData.append("pdfFile", fileInput.files[0]);
        formData.append("signatureImage", sigBlob, "signature.png");
        formData.append("x", data.x);
        formData.append("y", data.y);
        formData.append("w", data.w);
        formData.append("h", data.h);
        formData.append("rotation", data.rotation || 0);

        saveTimer.textContent = "Enviando arquivos (isso pode demorar)...";

        const response = await fetch("/api/assinar", { 
            method: "POST", 
            body: formData 
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error("Erro no Servidor: " + errorText);
        }

        const finalBlob = await response.blob();
        const downloadUrl = URL.createObjectURL(finalBlob);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = "DUCATO_ASSINADO.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        saveTimer.textContent = "Sucesso!";
        setTimeout(() => { saveModal.style.display = "none"; }, 1500);

    } catch (err) {
        console.error(err);
        alert("FALHA CRÍTICA: " + err.message);
        saveModal.style.display = "none";
    }
}

// Funções de navegação simplificadas
window.changePage = (num) => {
    if (pageNum + num > 0 && pageNum + num <= pdfDocJs.numPages) {
        pageNum += num;
        render();
    }
};

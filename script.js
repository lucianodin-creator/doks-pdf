const { PDFDocument, degrees } = PDFLib;
let pdfBytes;
const saveModal = document.getElementById("save-modal");

document.getElementById('file-in').onchange = async (e) => {
    const file = e.target.files[0];
    pdfBytes = await file.arrayBuffer();
    alert("PDF Carregado! Agora tente salvar.");
};

async function saveFinalPdf() {
    if (!pdfBytes) return alert("Selecione o PDF primeiro!");
    saveModal.style.display = "flex";

    try {
        // Tenta processar o PDF na memória do celular
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();
        const firstPage = pages[0];
        
        // Adiciona apenas um texto de teste para ver se o motor funciona
        firstPage.drawText('ASSINADO NO MOTOROLA', { x: 50, y: 50, size: 30 });

        const finalPdfBytes = await pdfDoc.save();
        const blob = new Blob([finalPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        a.href = url;
        a.download = "TESTE_SUCESSO.pdf";
        a.click();
        
        saveModal.style.display = "none";
    } catch (err) {
        alert("ERRO CRÍTICO: " + err.message);
        saveModal.style.display = "none";
    }
}

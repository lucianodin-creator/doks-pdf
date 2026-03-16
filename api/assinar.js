import { PDFDocument } from 'pdf-lib';
import formidable from 'formidable';
import fs from 'fs/promises';

// Configuração necessária para a Vercel não travar o upload de arquivos
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Método não permitido');
  }

  const form = formidable({});

  try {
    const [fields, files] = await form.parse(req);

    // 1. Validar e carregar arquivos
    const pdfFile = files.pdfFile[0];
    const sigFile = files.signatureImage[0];
    
    const pdfBuffer = await fs.readFile(pdfFile.filepath);
    const sigBuffer = await fs.readFile(sigFile.filepath);

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const signatureImg = await pdfDoc.embedPng(sigBuffer);

    // Pegar coordenadas (X e Y vêm como porcentagem do frontend)
    const xPct = parseFloat(fields.x[0]) / 100;
    const yPct = parseFloat(fields.y[0]) / 100;

    const pages = pdfDoc.getPages();

    // 2. Processar cada página do documento
    pages.forEach((page) => {
      const { width, height } = page.getSize();

      // Definir tamanho da assinatura no PDF (ex: 150px de largura proporcional)
      const sigWidth = 150; 
      const sigHeight = (signatureImg.height / signatureImg.width) * sigWidth;

      // Cálculo das Coordenadas:
      // X: Largura da página * porcentagem recebida
      // Y: Inverter (Origem pdf-lib é inferior esquerdo, navegador é superior esquerdo)
      const drawX = width * xPct;
      const drawY = height - (height * yPct) - sigHeight;

      page.drawImage(signatureImg, {
        x: drawX,
        y: drawY,
        width: sigWidth,
        height: sigHeight,
      });
    });

    // 3. Gerar PDF final e enviar
    const pdfBytes = await pdfDoc.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="DUCATO_ASSINADO.pdf"');
    res.send(Buffer.from(pdfBytes));

  } catch (err) {
    console.error('Erro no processamento:', err);
    res.status(500).json({ error: 'Falha ao processar PDF' });
  }
}

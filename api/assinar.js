import { PDFDocument } from 'pdf-lib';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(500).json({ error: 'Erro no formulário' });

    try {
      const pdfPath = files.pdfFile[0].filepath;
      const sigPath = files.signatureImage[0].filepath;
      const xPct = parseFloat(fields.x[0]);
      const yPct = parseFloat(fields.y[0]);

      const pdfDoc = await PDFDocument.load(fs.readFileSync(pdfPath));
      const sigImg = await pdfDoc.embedPng(fs.readFileSync(sigPath));
      const pages = pdfDoc.getPages();

      pages.forEach(page => {
        const { width, height } = page.getSize();
        const sW = 150; // Largura padrão da assinatura no PDF
        const sH = sW * (sigImg.height / sigImg.width);
        
        // Converte porcentagem para coordenadas do PDF-LIB (origem inferior esquerda)
        const finalX = (xPct / 100) * width;
        const finalY = height - ((yPct / 100) * height) - sH;

        page.drawImage(sigImg, { x: finalX, y: finalY, width: sW, height: sH });
      });

      const pdfBytes = await pdfDoc.save();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="DUCATO_ASSINADO.pdf"');
      res.send(Buffer.from(pdfBytes));
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });
}

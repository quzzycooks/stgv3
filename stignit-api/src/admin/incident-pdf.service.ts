import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { IncidentDnaService } from '../incident-dna/incident-dna.service';

/** Audit-ready Incident DNA PDF export (PRD 6.12.2). */
@Injectable()
export class IncidentPdfService {
  constructor(private readonly dna: IncidentDnaService) {}

  async generate(incidentId: string): Promise<Buffer> {
    const record = await this.dna.getDna(incidentId);
    const doc = new PDFDocument({ margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));

    doc.fontSize(18).text('Stignit — Incident DNA Report', { underline: true });
    doc.moveDown(0.5).fontSize(11);
    doc.text(`Incident ID: ${record.incidentId}`);
    doc.text(`Type: ${record.incidentType}    Status: ${record.status}`);
    doc.text(`Occurred: ${record.occurredAt.toISOString()}`);
    doc.text(`Closed: ${record.closedAt?.toISOString() ?? '—'}`);
    doc.text(
      `Responders — participants: ${record.responderAggregate.participants}, ` +
        `confirmed: ${record.responderAggregate.confirmed}, silent: ${record.responderAggregate.silent}`,
    );

    doc.moveDown().fontSize(13).text('Timeline', { underline: true });
    doc.fontSize(10);
    for (const ev of record.timeline) {
      doc.text(`${ev.at.toISOString()}  [${ev.type}]  ${JSON.stringify(ev.payload)}`);
    }

    doc.moveDown().fontSize(8).fillColor('gray').text('Confidential — anonymized where applicable.');
    doc.end();

    return new Promise((resolve) => doc.on('end', () => resolve(Buffer.concat(chunks))));
  }
}

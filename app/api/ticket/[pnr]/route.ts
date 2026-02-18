import { NextRequest, NextResponse } from 'next/server';
import { generateTicketPDF } from '@/lib/pdf';

export async function GET(request: NextRequest, { params }: { params: { pnr: string } }) {
  try {
    const pdfBuffer = await generateTicketPDF(params.pnr);
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ticket-${params.pnr}.pdf"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

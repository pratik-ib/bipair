import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import { supabaseAdmin } from './supabase';
import { getDurationMinutes, formatDuration, formatDate, formatTime } from './bipair-utils';

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return rgb(r, g, b);
}

const ORANGE = hexToRgb('#FF6600');
const DARK = hexToRgb('#1a1a1a');
const GRAY = hexToRgb('#888888');
const LIGHT_GRAY = hexToRgb('#f5f5f5');
const WHITE = rgb(1, 1, 1);
const BLACK = rgb(0, 0, 0);
const GREEN = hexToRgb('#22c55e');

async function generateQRCodeImage(text: string): Promise<Uint8Array> {
  const dataUrl = await QRCode.toDataURL(text, { width: 200, margin: 1 });
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
  return Buffer.from(base64, 'base64');
}

export async function generateTicketPDF(pnr: string): Promise<Buffer> {
  // Fetch booking
  const { data: booking, error: bErr } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('pnr', pnr)
    .single();
  if (bErr || !booking) throw new Error('Booking not found');

  const { data: passenger } = await supabaseAdmin
    .from('passengers')
    .select('*')
    .eq('id', booking.passenger_id)
    .single();

  const { data: flight } = await supabaseAdmin
    .from('flights')
    .select('*')
    .eq('id', booking.flight_id)
    .single();

  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('id', booking.payment_id)
    .single();

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();

  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Header bar
  page.drawRectangle({ x: 0, y: height - 60, width, height: 60, color: ORANGE });
  page.drawText('BipAir', { x: 30, y: height - 38, size: 24, font: boldFont, color: WHITE });
  page.drawText('E-TICKET', { x: 480, y: height - 30, size: 12, font: regularFont, color: WHITE });

  // Booking reference section
  page.drawRectangle({ x: 0, y: height - 120, width, height: 60, color: LIGHT_GRAY });
  page.drawText('BOOKING REFERENCE', { x: 30, y: height - 85, size: 9, font: boldFont, color: GRAY });
  page.drawText(pnr, { x: 30, y: height - 108, size: 26, font: boldFont, color: ORANGE });
  page.drawText(`Status: ${booking.status.toUpperCase()}`, { x: 420, y: height - 95, size: 11, font: boldFont, color: ORANGE });

  // Divider
  page.drawLine({ start: { x: 30, y: height - 125 }, end: { x: width - 30, y: height - 125 }, thickness: 1, color: hexToRgb('#e5e5e5') });

  // Passenger details
  const passengerName = passenger ? `${passenger.first_name} ${passenger.last_name}` : 'Unknown';
  page.drawText('PASSENGER DETAILS', { x: 30, y: height - 150, size: 9, font: boldFont, color: GRAY });
  page.drawText(passengerName, { x: 30, y: height - 168, size: 14, font: boldFont, color: BLACK });
  if (passenger?.passport_number) {
    page.drawText('Passport:', { x: 30, y: height - 186, size: 10, font: regularFont, color: GRAY });
    page.drawText(passenger.passport_number, { x: 90, y: height - 186, size: 10, font: regularFont, color: BLACK });
  }
  if (passenger?.nationality) {
    page.drawText('Nationality:', { x: 30, y: height - 202, size: 10, font: regularFont, color: GRAY });
    page.drawText(passenger.nationality, { x: 100, y: height - 202, size: 10, font: regularFont, color: BLACK });
  }
  if (passenger?.date_of_birth) {
    page.drawText('Date of Birth:', { x: 30, y: height - 218, size: 10, font: regularFont, color: GRAY });
    page.drawText(passenger.date_of_birth, { x: 105, y: height - 218, size: 10, font: regularFont, color: BLACK });
  }

  // Flight details (right column)
  page.drawText('FLIGHT DETAILS', { x: 310, y: height - 150, size: 9, font: boldFont, color: GRAY });
  if (flight) {
    page.drawText(flight.flight_number, { x: 310, y: height - 168, size: 14, font: boldFont, color: BLACK });
    page.drawText('Aircraft:', { x: 310, y: height - 186, size: 10, font: regularFont, color: GRAY });
    page.drawText(flight.aircraft_type, { x: 365, y: height - 186, size: 10, font: regularFont, color: BLACK });
    page.drawText('Booking Date:', { x: 310, y: height - 202, size: 10, font: regularFont, color: GRAY });
    page.drawText(formatDate(booking.created_at), { x: 397, y: height - 202, size: 10, font: regularFont, color: BLACK });
    page.drawText('Fare Class:', { x: 310, y: height - 218, size: 10, font: regularFont, color: GRAY });
    page.drawText(booking.fare_class.replace('_', ' ').toUpperCase(), { x: 375, y: height - 218, size: 10, font: regularFont, color: BLACK });
  }

  // Large flight route section
  if (flight) {
    page.drawRectangle({ x: 0, y: height - 315, width, height: 90, color: DARK });
    page.drawText(flight.origin, { x: 40, y: height - 270, size: 36, font: boldFont, color: WHITE });
    page.drawText('->', { x: width / 2 - 15, y: height - 270, size: 28, font: boldFont, color: ORANGE });
    page.drawText(flight.destination, { x: width - 120, y: height - 270, size: 36, font: boldFont, color: WHITE });
    page.drawText(flight.origin_city, { x: 40, y: height - 292, size: 12, font: regularFont, color: GRAY });
    page.drawText(flight.destination_city, { x: width - 140, y: height - 292, size: 12, font: regularFont, color: GRAY });
    page.drawText(formatTime(flight.departure_time), { x: 40, y: height - 308, size: 14, font: boldFont, color: WHITE });
    page.drawText(formatTime(flight.arrival_time), { x: width - 120, y: height - 308, size: 14, font: boldFont, color: WHITE });
  }

  // Flight info row
  if (flight) {
    const durationMin = getDurationMinutes(flight.departure_time, flight.arrival_time);
    page.drawText('Gate:', { x: 30, y: height - 340, size: 10, font: regularFont, color: GRAY });
    page.drawText(flight.gate || 'TBD', { x: 60, y: height - 340, size: 10, font: boldFont, color: BLACK });
    page.drawText('Terminal:', { x: 150, y: height - 340, size: 10, font: regularFont, color: GRAY });
    page.drawText(flight.terminal || 'TBD', { x: 203, y: height - 340, size: 10, font: boldFont, color: BLACK });
    page.drawText('Duration:', { x: 300, y: height - 340, size: 10, font: regularFont, color: GRAY });
    page.drawText(formatDuration(durationMin), { x: 352, y: height - 340, size: 10, font: boldFont, color: BLACK });
  }

  // Seat and fare section
  page.drawRectangle({ x: 30, y: height - 420, width: width - 60, height: 60, borderColor: ORANGE, borderWidth: 1.5 });
  page.drawText('YOUR SEAT', { x: 50, y: height - 368, size: 9, font: boldFont, color: GRAY });
  page.drawText(booking.seat_number || 'TBD', { x: 50, y: height - 400, size: 32, font: boldFont, color: ORANGE });
  page.drawText(booking.fare_class.replace('_', ' ').toUpperCase(), { x: 160, y: height - 390, size: 12, font: boldFont, color: ORANGE });

  // Payment section
  if (payment) {
    page.drawText('AMOUNT PAID', { x: 30, y: height - 440, size: 9, font: boldFont, color: GRAY });
    page.drawText(`$${Number(payment.amount).toFixed(2)}`, { x: 30, y: height - 460, size: 18, font: boldFont, color: BLACK });
    page.drawText(`${payment.currency} · ${payment.payment_method?.toUpperCase() || 'CARD'}`, { x: 100, y: height - 458, size: 10, font: regularFont, color: GRAY });
  }

  // QR Code
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bipair-tickets.preview.emergentagent.com';
  const qrData = await generateQRCodeImage(`${baseUrl}/api/bookings/${pnr}`);
  const qrImage = await pdfDoc.embedPng(qrData);
  page.drawImage(qrImage, { x: width / 2 - 70, y: height - 620, width: 140, height: 140 });
  page.drawText('Scan to view booking details', { x: width / 2 - 65, y: height - 630, size: 10, font: regularFont, color: GRAY });
  page.drawText(pnr, { x: width / 2 - 20, y: height - 645, size: 12, font: boldFont, color: ORANGE });

  // Footer
  page.drawLine({ start: { x: 30, y: 60 }, end: { x: width - 30, y: 60 }, thickness: 1, color: hexToRgb('#e5e5e5') });
  page.drawText('Thank you for flying with BipAir', { x: width / 2 - 100, y: 40, size: 9, font: regularFont, color: GRAY });
  page.drawText('bipair.com | Terms and conditions apply', { x: width / 2 - 110, y: 25, size: 8, font: regularFont, color: GRAY });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

export async function generateBoardingPassPDF(pnr: string): Promise<Buffer> {
  const { data: booking, error: bErr } = await supabaseAdmin
    .from('bookings')
    .select('*')
    .eq('pnr', pnr)
    .single();
  if (bErr || !booking) throw new Error('Booking not found');
  if (booking.status !== 'checked_in') throw new Error('Passenger has not completed check-in');

  const { data: passenger } = await supabaseAdmin
    .from('passengers')
    .select('*')
    .eq('id', booking.passenger_id)
    .single();

  const { data: flight } = await supabaseAdmin
    .from('flights')
    .select('*')
    .eq('id', booking.flight_id)
    .single();

  if (!flight) throw new Error('Flight not found');

  const boardingTime = new Date(new Date(flight.departure_time).getTime() - 30 * 60000);
  const boardingTimeStr = boardingTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const pdfDoc = await PDFDocument.create();
  // Landscape A5: 595 x 420
  const page = pdfDoc.addPage([595, 420]);
  const { width, height } = page.getSize();

  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Left section background
  page.drawRectangle({ x: 0, y: 0, width: 385, height, color: WHITE });

  // BOARDING PASS header
  page.drawText('BOARDING PASS', { x: 25, y: height - 30, size: 18, font: boldFont, color: ORANGE });
  page.drawText('BipAir', { x: 25, y: height - 48, size: 11, font: regularFont, color: GRAY });
  page.drawLine({ start: { x: 25, y: height - 55 }, end: { x: 370, y: height - 55 }, thickness: 1.5, color: ORANGE });

  // Passenger name
  const passengerName = passenger ? `${passenger.first_name} ${passenger.last_name}` : 'Unknown';
  page.drawText(passengerName, { x: 25, y: height - 80, size: 20, font: boldFont, color: BLACK });

  // Route
  page.drawText(flight.origin, { x: 25, y: height - 135, size: 44, font: boldFont, color: BLACK });
  page.drawText('->', { x: 170, y: height - 130, size: 28, font: boldFont, color: ORANGE });
  page.drawText(flight.destination, { x: 220, y: height - 135, size: 44, font: boldFont, color: BLACK });
  page.drawText(flight.origin_city, { x: 25, y: height - 150, size: 11, font: regularFont, color: GRAY });
  page.drawText(flight.destination_city, { x: 220, y: height - 150, size: 11, font: regularFont, color: GRAY });

  // Details grid (2 cols x 3 rows)
  const detailsStartY = height - 185;
  const col1X = 25;
  const col2X = 200;
  const rowH = 40;

  // Row 1: Flight Number | Date
  page.drawText('FLIGHT', { x: col1X, y: detailsStartY, size: 8, font: boldFont, color: GRAY });
  page.drawText(flight.flight_number, { x: col1X, y: detailsStartY - 14, size: 14, font: boldFont, color: BLACK });
  page.drawText('DATE', { x: col2X, y: detailsStartY, size: 8, font: boldFont, color: GRAY });
  page.drawText(formatDate(flight.departure_time), { x: col2X, y: detailsStartY - 14, size: 11, font: boldFont, color: BLACK });

  // Row 2: Seat | Class
  page.drawText('SEAT', { x: col1X, y: detailsStartY - rowH, size: 8, font: boldFont, color: GRAY });
  page.drawText(booking.seat_number || 'TBD', { x: col1X, y: detailsStartY - rowH - 16, size: 22, font: boldFont, color: ORANGE });
  page.drawText('CLASS', { x: col2X, y: detailsStartY - rowH, size: 8, font: boldFont, color: GRAY });
  page.drawText(booking.fare_class.replace('_', ' ').toUpperCase(), { x: col2X, y: detailsStartY - rowH - 14, size: 12, font: boldFont, color: BLACK });

  // Row 3: Gate | Terminal
  page.drawText('GATE', { x: col1X, y: detailsStartY - 2 * rowH, size: 8, font: boldFont, color: GRAY });
  page.drawText(flight.gate || 'TBD', { x: col1X, y: detailsStartY - 2 * rowH - 14, size: 14, font: boldFont, color: BLACK });
  page.drawText('TERMINAL', { x: col2X, y: detailsStartY - 2 * rowH, size: 8, font: boldFont, color: GRAY });
  page.drawText(flight.terminal || 'TBD', { x: col2X, y: detailsStartY - 2 * rowH - 14, size: 14, font: boldFont, color: BLACK });

  // Boarding time box
  page.drawRectangle({ x: 25, y: 40, width: 180, height: 55, color: ORANGE });
  page.drawText('BOARD BY', { x: 35, y: 80, size: 9, font: boldFont, color: WHITE });
  page.drawText(boardingTimeStr, { x: 35, y: 58, size: 18, font: boldFont, color: WHITE });
  page.drawText(formatDate(flight.departure_time), { x: 35, y: 44, size: 9, font: regularFont, color: WHITE });

  // Dashed vertical divider
  for (let y = 10; y < height; y += 12) {
    page.drawLine({ start: { x: 390, y }, end: { x: 390, y: y + 6 }, thickness: 1, color: hexToRgb('#cccccc') });
  }

  // Right section
  page.drawRectangle({ x: 392, y: 0, width: width - 392, height, color: hexToRgb('#f8f8f8') });

  const rightCenterX = 392 + (width - 392) / 2;

  // BipAir logo on right
  page.drawText('BipAir', { x: rightCenterX - 20, y: height - 28, size: 14, font: boldFont, color: ORANGE });

  // QR code
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://bipair-tickets.preview.emergentagent.com';
  const qrData = await generateQRCodeImage(`${baseUrl}/checkin/${pnr}`);
  const qrImage = await pdfDoc.embedPng(qrData);
  page.drawImage(qrImage, { x: rightCenterX - 60, y: height - 195, width: 120, height: 120 });

  // Passenger info on right
  page.drawText(passenger?.last_name?.toUpperCase() || '', { x: rightCenterX - 30, y: height - 210, size: 11, font: boldFont, color: BLACK });
  page.drawText(flight.flight_number, { x: rightCenterX - 20, y: height - 228, size: 10, font: regularFont, color: GRAY });
  page.drawText('SEAT', { x: rightCenterX - 12, y: height - 250, size: 8, font: boldFont, color: GRAY });
  page.drawText(booking.seat_number || 'TBD', { x: rightCenterX - 18, y: height - 270, size: 18, font: boldFont, color: BLACK });

  // Checked in badge
  page.drawText('CHECKED IN', { x: rightCenterX - 38, y: 30, size: 10, font: boldFont, color: GREEN });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

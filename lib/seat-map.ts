import { createCanvas, Canvas, CanvasRenderingContext2D } from '@napi-rs/canvas';
import { supabaseAdmin } from './supabase';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 1150;

const SEAT_W = 46;
const SEAT_H = 40;
const SEAT_GAP_H = 6;
const SEAT_GAP_V = 8;
const AISLE_GAP = 28;
const LEFT_MARGIN = 60;
const GRID_START_Y = 165;

// Columns: A B C [AISLE] D E F
const COLS = ['A', 'B', 'C', 'D', 'E', 'F'];

// Rows: 1-3 First, 4-8 Business, 9-30 Economy (skip 13)
function getRows(): number[] {
  const rows: number[] = [];
  for (let i = 1; i <= 30; i++) {
    if (i === 13) continue;
    rows.push(i);
  }
  return rows;
}

function getFareClass(row: number): 'first_class' | 'business' | 'economy' {
  if (row <= 3) return 'first_class';
  if (row <= 8) return 'business';
  return 'economy';
}

function isExtraLegroom(row: number): boolean {
  return row === 9 || row === 20;
}

function isFirstClassRow(row: number): boolean {
  return row <= 3;
}

function getSeatColor(row: number, col: string, isOccupied: boolean, isHighlighted: boolean): string {
  if (isHighlighted) return '#FF6600';
  if (isOccupied) return '#374151';
  const fc = getFareClass(row);
  if (fc === 'first_class') return '#8b5cf6';
  if (fc === 'business') return '#3b82f6';
  if (isExtraLegroom(row)) return '#0ea5e9';
  return '#22c55e';
}

function getColX(colIndex: number): number {
  // A=0, B=1, C=2, [aisle], D=3, E=4, F=5
  const aisleAfter = 2; // after index 2 (C)
  if (colIndex <= aisleAfter) {
    return LEFT_MARGIN + colIndex * (SEAT_W + SEAT_GAP_H);
  } else {
    return LEFT_MARGIN + aisleAfter * (SEAT_W + SEAT_GAP_H) + SEAT_W + SEAT_GAP_H + AISLE_GAP + (colIndex - aisleAfter - 1) * (SEAT_W + SEAT_GAP_H);
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export async function generateSeatMapImage(options: {
  flightNumber: string;
  originCity: string;
  destinationCity: string;
  occupiedSeats: string[];
  highlightSeat?: string;
  headerText?: string;
}): Promise<Buffer> {
  const { flightNumber, originCity, destinationCity, occupiedSeats, highlightSeat, headerText } = options;
  const canvas: Canvas = createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;

  // Background
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Header bar
  ctx.fillStyle = '#FF6600';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 90);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('BipAir ✈', CANVAS_WIDTH / 2, 55);

  // Gray divider
  ctx.fillStyle = '#333333';
  ctx.fillRect(0, 90, CANVAS_WIDTH, 1);

  // Subtitle
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${flightNumber} · ${originCity} → ${destinationCity}`, CANVAS_WIDTH / 2, 115);

  // Header label
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(headerText || 'SELECT YOUR SEAT', CANVAS_WIDTH / 2, 133);

  // Column headers
  const colLabels = ['A', 'B', 'C', 'AISLE', 'D', 'E', 'F'];
  const colPositions = [
    LEFT_MARGIN + SEAT_W / 2,
    LEFT_MARGIN + (SEAT_W + SEAT_GAP_H) + SEAT_W / 2,
    LEFT_MARGIN + 2 * (SEAT_W + SEAT_GAP_H) + SEAT_W / 2,
    LEFT_MARGIN + 3 * (SEAT_W + SEAT_GAP_H) + AISLE_GAP / 2,
    LEFT_MARGIN + 3 * (SEAT_W + SEAT_GAP_H) + AISLE_GAP + SEAT_W / 2,
    LEFT_MARGIN + 4 * (SEAT_W + SEAT_GAP_H) + AISLE_GAP + SEAT_W / 2,
    LEFT_MARGIN + 5 * (SEAT_W + SEAT_GAP_H) + AISLE_GAP + SEAT_W / 2,
  ];

  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  colPositions.forEach((x, i) => {
    if (colLabels[i] === 'AISLE') {
      ctx.fillStyle = '#555555';
      ctx.font = '10px sans-serif';
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px sans-serif';
    }
    ctx.fillText(colLabels[i], x, 158);
  });

  // Draw seats
  const rows = getRows();
  let lastFareClass = '';

  rows.forEach((row, rowIdx) => {
    const y = GRID_START_Y + rowIdx * (SEAT_H + SEAT_GAP_V);
    const fc = getFareClass(row);
    const firstClassRow = isFirstClassRow(row);

    // Fare class label on left
    if (fc !== lastFareClass) {
      lastFareClass = fc;
      let label = 'ECONOMY';
      let labelColor = '#22c55e';
      if (fc === 'first_class') { label = 'FIRST'; labelColor = '#8b5cf6'; }
      else if (fc === 'business') { label = 'BUSINESS'; labelColor = '#3b82f6'; }
      ctx.fillStyle = labelColor;
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'right';
      ctx.save();
      ctx.translate(8, y + SEAT_H / 2 + 4);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }

    // Row number
    ctx.fillStyle = '#888888';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(row), 44, y + SEAT_H / 2 + 4);

    // Draw each seat
    const seatsInRow = firstClassRow ? ['A', 'C', 'D', 'F'] : ['A', 'B', 'C', 'D', 'E', 'F'];
    
    COLS.forEach((col, colIdx) => {
      if (firstClassRow && !seatsInRow.includes(col)) return;
      
      const seatId = `${row}${col}`;
      const isOccupied = occupiedSeats.includes(seatId);
      const isHighlighted = highlightSeat === seatId;
      const x = getColX(colIdx);

      const fillColor = getSeatColor(row, col, isOccupied, isHighlighted);
      ctx.fillStyle = fillColor;
      roundRect(ctx, x, y, SEAT_W, SEAT_H, 6);
      ctx.fill();

      // Seat label
      ctx.fillStyle = isOccupied ? '#6b7280' : '#ffffff';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(seatId, x + SEAT_W / 2, y + SEAT_H / 2 + 4);
    });
  });

  // Legend section
  const legendY = CANVAS_HEIGHT - 90;
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, legendY, CANVAS_WIDTH, 90);

  const legendItems = [
    { color: '#22c55e', label: 'Available' },
    { color: '#3b82f6', label: 'Business' },
    { color: '#8b5cf6', label: 'First Class' },
    { color: '#0ea5e9', label: 'Extra Legroom' },
    { color: '#374151', label: 'Occupied' },
    { color: '#FF6600', label: 'Selected' },
  ];

  const legendTotalWidth = legendItems.length * 110;
  const legendStartX = (CANVAS_WIDTH - legendTotalWidth) / 2;

  legendItems.forEach((item, i) => {
    const lx = legendStartX + i * 110;
    const ly = legendY + 35;
    ctx.fillStyle = item.color;
    ctx.fillRect(lx, ly, 14, 14);
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(item.label, lx + 18, ly + 11);
  });

  // Footer
  ctx.fillStyle = '#666666';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Reply with seat number to select (e.g. 14A)', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 8);

  return canvas.toBuffer('image/png') as unknown as Buffer;
}

export async function uploadSeatMapToStorage(imageBuffer: Buffer, filename: string): Promise<string> {
  const { data, error } = await supabaseAdmin.storage
    .from('seat-maps')
    .upload(filename, imageBuffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data: urlData } = supabaseAdmin.storage.from('seat-maps').getPublicUrl(filename);
  return urlData.publicUrl;
}

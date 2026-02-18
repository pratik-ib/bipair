import { createCanvas, Canvas, CanvasRenderingContext2D } from '@napi-rs/canvas';
import { supabaseAdmin } from './supabase';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 1200;

const SEAT_W = 46;
const SEAT_H = 40;
const SEAT_GAP_H = 6;
const SEAT_GAP_V = 8;
const AISLE_GAP = 28;
const LEFT_MARGIN = 60;
const GRID_START_Y = 175;

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

function getSeatColor(
  row: number, 
  col: string, 
  isOccupied: boolean, 
  isHighlighted: boolean,
  userFareClass?: string
): { fill: string; textColor: string; isSelectable: boolean } {
  const seatFareClass = getFareClass(row);
  
  // Check if this seat is selectable for the user's fare class
  const isSelectable = !userFareClass || seatFareClass === userFareClass;
  
  if (isHighlighted) {
    return { fill: '#FF6600', textColor: '#ffffff', isSelectable: true };
  }
  
  if (isOccupied) {
    return { fill: '#374151', textColor: '#6b7280', isSelectable: false };
  }
  
  // If user has a fare class and this seat is not in their class, show as unavailable
  if (userFareClass && seatFareClass !== userFareClass) {
    return { fill: '#2a2a2a', textColor: '#4a4a4a', isSelectable: false };
  }
  
  // Available seats by class
  if (seatFareClass === 'first_class') {
    return { fill: '#8b5cf6', textColor: '#ffffff', isSelectable: true };
  }
  if (seatFareClass === 'business') {
    return { fill: '#3b82f6', textColor: '#ffffff', isSelectable: true };
  }
  if (isExtraLegroom(row)) {
    return { fill: '#0ea5e9', textColor: '#ffffff', isSelectable: true };
  }
  return { fill: '#22c55e', textColor: '#ffffff', isSelectable: true };
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

export interface SeatMapOptions {
  flightNumber: string;
  originCity: string;
  destinationCity: string;
  occupiedSeats: string[];
  highlightSeat?: string;
  headerText?: string;
  fareClass?: 'economy' | 'business' | 'first_class';
}

export async function generateSeatMapImage(options: SeatMapOptions): Promise<Buffer> {
  const { flightNumber, originCity, destinationCity, occupiedSeats, highlightSeat, headerText, fareClass } = options;
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
  ctx.fillText('BipAir', CANVAS_WIDTH / 2, 55);

  // Gray divider
  ctx.fillStyle = '#333333';
  ctx.fillRect(0, 90, CANVAS_WIDTH, 1);

  // Subtitle
  ctx.fillStyle = '#ffffff';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${flightNumber} - ${originCity} to ${destinationCity}`, CANVAS_WIDTH / 2, 118);

  // Header label / Fare class indicator
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  
  let headerLabel = headerText || 'SELECT YOUR SEAT';
  if (fareClass) {
    const classLabel = fareClass === 'first_class' ? 'FIRST CLASS' : fareClass.toUpperCase();
    headerLabel = `${classLabel} SEAT SELECTION`;
    
    // Add colored indicator for fare class
    const classColors: Record<string, string> = {
      'first_class': '#8b5cf6',
      'business': '#3b82f6',
      'economy': '#22c55e'
    };
    ctx.fillStyle = classColors[fareClass] || '#22c55e';
    ctx.fillRect(CANVAS_WIDTH / 2 - 100, 130, 200, 3);
  }
  
  ctx.fillStyle = '#aaaaaa';
  ctx.fillText(headerLabel, CANVAS_WIDTH / 2, 150);

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
    ctx.fillText(colLabels[i], x, 168);
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
      
      // Dim the label if it's not the user's fare class
      if (fareClass && fc !== fareClass) {
        labelColor = '#444444';
      }
      
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

      const { fill, textColor, isSelectable } = getSeatColor(row, col, isOccupied, isHighlighted, fareClass);
      
      // Draw seat rectangle
      ctx.fillStyle = fill;
      roundRect(ctx, x, y, SEAT_W, SEAT_H, 6);
      ctx.fill();
      
      // Add border for selectable seats
      if (isSelectable && !isOccupied && !isHighlighted) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        roundRect(ctx, x, y, SEAT_W, SEAT_H, 6);
        ctx.stroke();
      }
      
      // Add X mark for occupied seats
      if (isOccupied) {
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 2;
        const padding = 12;
        ctx.beginPath();
        ctx.moveTo(x + padding, y + padding);
        ctx.lineTo(x + SEAT_W - padding, y + SEAT_H - padding);
        ctx.moveTo(x + SEAT_W - padding, y + padding);
        ctx.lineTo(x + padding, y + SEAT_H - padding);
        ctx.stroke();
      }

      // Seat label
      ctx.fillStyle = textColor;
      ctx.font = isHighlighted ? 'bold 11px sans-serif' : '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(seatId, x + SEAT_W / 2, y + SEAT_H / 2 + 4);
    });
  });

  // Legend section
  const legendY = CANVAS_HEIGHT - 110;
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, legendY, CANVAS_WIDTH, 110);
  
  // Legend title
  ctx.fillStyle = '#888888';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LEGEND', CANVAS_WIDTH / 2, legendY + 18);

  // Build legend items based on fare class
  const legendItems: Array<{ color: string; label: string }> = [];
  
  if (!fareClass || fareClass === 'economy') {
    legendItems.push({ color: '#22c55e', label: 'Economy' });
  }
  if (!fareClass || fareClass === 'economy') {
    legendItems.push({ color: '#0ea5e9', label: 'Extra Legroom' });
  }
  if (!fareClass || fareClass === 'business') {
    legendItems.push({ color: '#3b82f6', label: 'Business' });
  }
  if (!fareClass || fareClass === 'first_class') {
    legendItems.push({ color: '#8b5cf6', label: 'First Class' });
  }
  legendItems.push({ color: '#374151', label: 'Occupied' });
  legendItems.push({ color: '#FF6600', label: 'Your Seat' });
  if (fareClass) {
    legendItems.push({ color: '#2a2a2a', label: 'Not Available' });
  }

  const legendTotalWidth = legendItems.length * 95;
  const legendStartX = (CANVAS_WIDTH - legendTotalWidth) / 2;

  legendItems.forEach((item, i) => {
    const lx = legendStartX + i * 95;
    const ly = legendY + 40;
    ctx.fillStyle = item.color;
    roundRect(ctx, lx, ly, 14, 14, 3);
    ctx.fill();
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(item.label, lx + 18, ly + 11);
  });

  // Seat counts summary
  const availableSeats = rows.reduce((count, row) => {
    const seatsInRow = isFirstClassRow(row) ? 4 : 6;
    const rowOccupied = occupiedSeats.filter(s => s.startsWith(String(row))).length;
    const rowFareClass = getFareClass(row);
    if (fareClass && rowFareClass !== fareClass) return count;
    return count + (seatsInRow - rowOccupied);
  }, 0);

  const classLabel = fareClass ? (fareClass === 'first_class' ? 'First Class' : fareClass.charAt(0).toUpperCase() + fareClass.slice(1)) : 'Total';
  ctx.fillStyle = '#888888';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${availableSeats} ${classLabel} seats available`, CANVAS_WIDTH / 2, legendY + 75);

  // Footer
  ctx.fillStyle = '#FF6600';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Reply with seat number to select (e.g. 14A)', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 12);

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

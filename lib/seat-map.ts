import { createCanvas, Canvas, CanvasRenderingContext2D, GlobalFonts } from '@napi-rs/canvas';
import { supabaseAdmin } from './supabase';
import path from 'path';
import fs from 'fs';

// Register fonts for Vercel serverless environment
function registerFonts() {
  try {
    // Try public/fonts directory (woff2 files bundled with deployment)
    const publicFontsPath = path.join(process.cwd(), 'public/fonts');
    const regularFont = path.join(publicFontsPath, 'Inter-Regular.woff2');
    const boldFont = path.join(publicFontsPath, 'Inter-Bold.woff2');
    
    if (fs.existsSync(regularFont)) {
      GlobalFonts.registerFromPath(regularFont, 'Inter');
      console.log('[Fonts] Registered Inter-Regular.woff2 from public/fonts');
    } else {
      // Fallback to node_modules
      const nmPath = path.join(process.cwd(), 'node_modules/@fontsource/inter/files');
      const nmRegular = path.join(nmPath, 'inter-latin-400-normal.woff2');
      if (fs.existsSync(nmRegular)) {
        GlobalFonts.registerFromPath(nmRegular, 'Inter');
        console.log('[Fonts] Registered inter-latin-400-normal.woff2 from node_modules');
      }
    }
    
    if (fs.existsSync(boldFont)) {
      GlobalFonts.registerFromPath(boldFont, 'InterBold');
      console.log('[Fonts] Registered Inter-Bold.woff2 from public/fonts');
    } else {
      const nmPath = path.join(process.cwd(), 'node_modules/@fontsource/inter/files');
      const nmBold = path.join(nmPath, 'inter-latin-700-normal.woff2');
      if (fs.existsSync(nmBold)) {
        GlobalFonts.registerFromPath(nmBold, 'InterBold');
        console.log('[Fonts] Registered inter-latin-700-normal.woff2 from node_modules');
      }
    }
    
    console.log('[Fonts] Registration complete');
  } catch (err) {
    console.error('[Fonts] Registration failed:', err);
  }
}

// Reduced canvas width - removed empty space
const CANVAS_WIDTH = 420;
const SEAT_W = 44;
const SEAT_H = 38;
const SEAT_GAP_H = 5;
const SEAT_GAP_V = 6;
const AISLE_GAP = 24;
const LEFT_MARGIN = 45;
const GRID_START_Y = 160;

// Columns: A B C [AISLE] D E F
const COLS = ['A', 'B', 'C', 'D', 'E', 'F'];
const FIRST_CLASS_COLS = ['A', 'C', 'D', 'F']; // 4 seats per row (wider)

interface SeatConfig {
  economySeats: number;
  businessSeats: number;
  firstClassSeats: number;
}

interface RowInfo {
  row: number;
  fareClass: 'first_class' | 'business' | 'economy';
  cols: string[];
}

function calculateRows(config: SeatConfig): RowInfo[] {
  const rows: RowInfo[] = [];
  let currentRow = 1;
  
  // First class: 4 seats per row (A, C, D, F)
  const firstClassRows = Math.ceil(config.firstClassSeats / 4);
  for (let i = 0; i < firstClassRows; i++) {
    rows.push({ row: currentRow++, fareClass: 'first_class', cols: FIRST_CLASS_COLS });
  }
  
  // Business: 6 seats per row
  const businessRows = Math.ceil(config.businessSeats / 6);
  for (let i = 0; i < businessRows; i++) {
    rows.push({ row: currentRow++, fareClass: 'business', cols: COLS });
  }
  
  // Economy: 6 seats per row
  const economyRows = Math.ceil(config.economySeats / 6);
  for (let i = 0; i < economyRows; i++) {
    rows.push({ row: currentRow++, fareClass: 'economy', cols: COLS });
  }
  
  return rows;
}

function isExtraLegroom(row: number, economyStartRow: number): boolean {
  // First economy row and middle economy row have extra legroom
  return row === economyStartRow || row === economyStartRow + 4;
}

function getSeatColor(
  fareClass: 'first_class' | 'business' | 'economy',
  isOccupied: boolean, 
  isHighlighted: boolean,
  isExtraLeg: boolean,
  userFareClass?: string
): { fill: string; textColor: string; isSelectable: boolean } {
  
  const isSelectable = !userFareClass || fareClass === userFareClass;
  
  if (isHighlighted) {
    return { fill: '#FF6600', textColor: '#ffffff', isSelectable: true };
  }
  
  if (isOccupied) {
    return { fill: '#374151', textColor: '#6b7280', isSelectable: false };
  }
  
  // If user has a fare class and this seat is not in their class, show as unavailable
  if (userFareClass && fareClass !== userFareClass) {
    return { fill: '#2a2a2a', textColor: '#4a4a4a', isSelectable: false };
  }
  
  // Available seats by class
  if (fareClass === 'first_class') {
    return { fill: '#8b5cf6', textColor: '#ffffff', isSelectable: true };
  }
  if (fareClass === 'business') {
    return { fill: '#3b82f6', textColor: '#ffffff', isSelectable: true };
  }
  if (isExtraLeg) {
    return { fill: '#0ea5e9', textColor: '#ffffff', isSelectable: true };
  }
  return { fill: '#22c55e', textColor: '#ffffff', isSelectable: true };
}

function getColX(colIndex: number): number {
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
  seatConfig: SeatConfig;
}

export async function generateSeatMapImage(options: SeatMapOptions): Promise<Buffer> {
  // Register fonts first - critical for Vercel serverless
  registerFonts();
  
  const { flightNumber, originCity, destinationCity, occupiedSeats, highlightSeat, headerText, fareClass, seatConfig } = options;
  
  // Calculate dynamic rows based on seat configuration
  const rows = calculateRows(seatConfig);
  const totalRows = rows.length;
  
  // Calculate dynamic canvas height based on number of rows
  const canvasHeight = GRID_START_Y + (totalRows * (SEAT_H + SEAT_GAP_V)) + 120;
  
  const canvas: Canvas = createCanvas(CANVAS_WIDTH, canvasHeight);
  const ctx = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;

  // Background
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, CANVAS_WIDTH, canvasHeight);

  // Header bar
  ctx.fillStyle = '#FF6600';
  ctx.fillRect(0, 0, CANVAS_WIDTH, 70);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px InterBold';
  ctx.textAlign = 'center';
  ctx.fillText('BipAir', CANVAS_WIDTH / 2, 45);

  // Gray divider
  ctx.fillStyle = '#333333';
  ctx.fillRect(0, 70, CANVAS_WIDTH, 1);

  // Subtitle
  ctx.fillStyle = '#ffffff';
  ctx.font = '13px Inter';
  ctx.textAlign = 'center';
  ctx.fillText(`${flightNumber} - ${originCity} to ${destinationCity}`, CANVAS_WIDTH / 2, 95);

  // Header label / Fare class indicator
  let headerLabel = headerText || 'SELECT YOUR SEAT';
  if (fareClass) {
    const classLabel = fareClass === 'first_class' ? 'FIRST CLASS' : fareClass.toUpperCase();
    headerLabel = `${classLabel} SEAT SELECTION`;
    
    const classColors: Record<string, string> = {
      'first_class': '#8b5cf6',
      'business': '#3b82f6',
      'economy': '#22c55e'
    };
    ctx.fillStyle = classColors[fareClass] || '#22c55e';
    ctx.fillRect(CANVAS_WIDTH / 2 - 80, 108, 160, 2);
  }
  
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '11px Inter';
  ctx.fillText(headerLabel, CANVAS_WIDTH / 2, 125);

  // Column headers
  ctx.font = 'bold 11px InterBold';
  ctx.textAlign = 'center';
  
  COLS.forEach((col, colIdx) => {
    const x = getColX(colIdx) + SEAT_W / 2;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(col, x, 148);
  });
  
  // Aisle label
  ctx.fillStyle = '#444444';
  ctx.font = '8px Inter';
  const aisleX = LEFT_MARGIN + 3 * (SEAT_W + SEAT_GAP_H) + AISLE_GAP / 2 - 5;
  ctx.fillText('AISLE', aisleX, 148);

  // Find economy start row for extra legroom calculation
  const economyStartRow = rows.find(r => r.fareClass === 'economy')?.row || 9;
  
  // Draw seats
  let lastFareClass = '';

  rows.forEach((rowInfo, rowIdx) => {
    const y = GRID_START_Y + rowIdx * (SEAT_H + SEAT_GAP_V);
    const { row, fareClass: rowFareClass, cols: rowCols } = rowInfo;

    // Fare class label on left
    if (rowFareClass !== lastFareClass) {
      lastFareClass = rowFareClass;
      let label = 'ECON';
      let labelColor = '#22c55e';
      if (rowFareClass === 'first_class') { label = 'FIRST'; labelColor = '#8b5cf6'; }
      else if (rowFareClass === 'business') { label = 'BIZ'; labelColor = '#3b82f6'; }
      
      if (fareClass && rowFareClass !== fareClass) {
        labelColor = '#444444';
      }
      
      ctx.fillStyle = labelColor;
      ctx.font = '8px Inter';
      ctx.textAlign = 'right';
      ctx.save();
      ctx.translate(6, y + SEAT_H / 2 + 3);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }

    // Row number
    ctx.fillStyle = '#666666';
    ctx.font = '10px Inter';
    ctx.textAlign = 'right';
    ctx.fillText(String(row), 38, y + SEAT_H / 2 + 3);

    // Draw each seat
    const isExtraLeg = isExtraLegroom(row, economyStartRow);
    
    COLS.forEach((col, colIdx) => {
      // Skip seats not in this row's configuration (first class has fewer seats per row)
      if (!rowCols.includes(col)) return;
      
      const seatId = `${row}${col}`;
      const isOccupied = occupiedSeats.includes(seatId);
      const isHighlighted = highlightSeat === seatId;
      const x = getColX(colIdx);

      const { fill, textColor, isSelectable } = getSeatColor(rowFareClass, isOccupied, isHighlighted, isExtraLeg && rowFareClass === 'economy', fareClass);
      
      // Draw seat rectangle
      ctx.fillStyle = fill;
      roundRect(ctx, x, y, SEAT_W, SEAT_H, 5);
      ctx.fill();
      
      // Add border for selectable seats
      if (isSelectable && !isOccupied && !isHighlighted) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 1;
        roundRect(ctx, x, y, SEAT_W, SEAT_H, 5);
        ctx.stroke();
      }
      
      // Add X mark for occupied seats
      if (isOccupied) {
        ctx.strokeStyle = '#6b7280';
        ctx.lineWidth = 2;
        const padding = 10;
        ctx.beginPath();
        ctx.moveTo(x + padding, y + padding);
        ctx.lineTo(x + SEAT_W - padding, y + SEAT_H - padding);
        ctx.moveTo(x + SEAT_W - padding, y + padding);
        ctx.lineTo(x + padding, y + SEAT_H - padding);
        ctx.stroke();
      }

      // Seat label
      ctx.fillStyle = textColor;
      ctx.font = isHighlighted ? 'bold 10px InterBold' : '9px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(seatId, x + SEAT_W / 2, y + SEAT_H / 2 + 3);
    });
  });

  // Legend section
  const legendY = canvasHeight - 100;
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, legendY, CANVAS_WIDTH, 100);
  
  // Legend title
  ctx.fillStyle = '#666666';
  ctx.font = 'bold 9px InterBold';
  ctx.textAlign = 'center';
  ctx.fillText('LEGEND', CANVAS_WIDTH / 2, legendY + 14);

  // Build legend items - compact version
  const legendItems: Array<{ color: string; label: string }> = [
    { color: '#22c55e', label: 'Econ' },
    { color: '#3b82f6', label: 'Biz' },
    { color: '#8b5cf6', label: 'First' },
    { color: '#374151', label: 'Taken' },
    { color: '#FF6600', label: 'You' },
  ];

  const legendItemWidth = 70;
  const legendTotalWidth = legendItems.length * legendItemWidth;
  const legendStartX = (CANVAS_WIDTH - legendTotalWidth) / 2;

  legendItems.forEach((item, i) => {
    const lx = legendStartX + i * legendItemWidth;
    const ly = legendY + 28;
    ctx.fillStyle = item.color;
    roundRect(ctx, lx, ly, 12, 12, 2);
    ctx.fill();
    ctx.fillStyle = '#888888';
    ctx.font = '9px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(item.label, lx + 15, ly + 9);
  });

  // Seat counts summary
  const availableSeats = rows.reduce((count, rowInfo) => {
    const seatsInRow = rowInfo.cols.length;
    const rowOccupied = occupiedSeats.filter(s => s.startsWith(String(rowInfo.row)) && s.length <= 3).length;
    if (fareClass && rowInfo.fareClass !== fareClass) return count;
    return count + Math.max(0, seatsInRow - rowOccupied);
  }, 0);

  const classLabel = fareClass ? (fareClass === 'first_class' ? 'First Class' : fareClass.charAt(0).toUpperCase() + fareClass.slice(1)) : 'Total';
  ctx.fillStyle = '#888888';
  ctx.font = '10px Inter';
  ctx.textAlign = 'center';
  ctx.fillText(`${availableSeats} ${classLabel} seats available`, CANVAS_WIDTH / 2, legendY + 58);

  // Footer
  ctx.fillStyle = '#FF6600';
  ctx.font = 'bold 10px InterBold';
  ctx.textAlign = 'center';
  ctx.fillText('Reply with seat number (e.g. 5A)', CANVAS_WIDTH / 2, canvasHeight - 12);

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

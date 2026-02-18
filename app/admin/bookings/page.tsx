'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/admin/status-badge';
import { Search, Eye, ChevronLeft, ChevronRight, Send } from 'lucide-react';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

const PAGE_SIZE = 10;

export default function BookingsPage() {
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);
  const [notifMsg, setNotifMsg] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await fetch(`/api/admin/bookings?page=${page}&limit=${PAGE_SIZE}&search=${search}`);
    const d = await r.json();
    if (d.success) { setBookings(d.data.bookings); setTotal(d.data.total); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page, search]);

  const handleAction = async (pnr: string, action: string) => {
    let body: any = {};
    if (action === 'confirm') body = { status: 'confirmed' };
    else if (action === 'cancel') body = { status: 'cancelled' };
    else if (action === 'paid') body = { payment_status: 'paid', status: 'confirmed' };
    else if (action === 'refund') body = { payment_status: 'refunded' };
    const r = await fetch(`/api/bookings/${pnr}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const d = await r.json();
    if (d.success) { toast({title:'Updated successfully'}); load(); if (selected?.pnr === pnr) setSelected({...selected, ...body}); }
    else toast({title:'Error', description:d.error, variant:'destructive'});
  };

  const handleSendNotif = async () => {
    if (!notifMsg || !selected) return;
    setSendingNotif(true);
    const r = await fetch('/api/notifications/send', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ passengerId: selected.passenger?.id, message: notifMsg, bookingId: selected.id })
    });
    const d = await r.json();
    if (d.success) { toast({title:'Notification sent'}); setNotifMsg(''); }
    else toast({title:'Error', description:d.error, variant:'destructive'});
    setSendingNotif(false);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Bookings</h1>
          <p className="text-gray-400 text-sm">{total} total bookings</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search PNR, passenger, flight..."
            value={search}
            onChange={e=>{ setSearch(e.target.value); setPage(1); }}
            className="bg-gray-800 border-gray-700 text-white pl-9 w-64"
          />
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['PNR','Passenger','Flight No','Route','Fare','Seat','Status','Payment','Amount','Source','Date','Actions'].map(h=>(
                  <th key={h} className="px-3 py-3 text-left text-gray-400 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array(5).fill(0).map((_,i)=>(
                <tr key={i}><td colSpan={12} className="px-3 py-4"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td></tr>
              )) : bookings.map(b=>(
                <tr key={b.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-3 py-3 text-orange-400 font-mono font-bold text-sm">{b.pnr}</td>
                  <td className="px-3 py-3 text-white text-sm whitespace-nowrap">{b.passenger?.first_name} {b.passenger?.last_name}</td>
                  <td className="px-3 py-3 text-gray-300 text-sm">{b.flight?.flight_number}</td>
                  <td className="px-3 py-3 text-gray-300 text-xs whitespace-nowrap">{b.flight?.origin}→{b.flight?.destination}</td>
                  <td className="px-3 py-3 text-gray-400 text-xs capitalize">{b.fare_class?.replace('_',' ')}</td>
                  <td className="px-3 py-3 text-gray-300 text-sm">{b.seat_number||'-'}</td>
                  <td className="px-3 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-3 py-3"><StatusBadge status={b.payment_status} /></td>
                  <td className="px-3 py-3 text-gray-300 text-sm whitespace-nowrap">{formatCurrency(b.total_amount||0)}</td>
                  <td className="px-3 py-3 text-gray-400 text-xs">{b.booking_source}</td>
                  <td className="px-3 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDateTime(b.created_at)}</td>
                  <td className="px-3 py-3">
                    <Button size="sm" variant="ghost" onClick={()=>setSelected(b)} className="h-7 px-2 text-gray-400 hover:text-white">
                      <Eye className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <span className="text-gray-400 text-sm">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={()=>setPage(p=>p-1)} disabled={page===1} className="border-gray-700 text-gray-300"><ChevronLeft className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" onClick={()=>setPage(p=>p+1)} disabled={page>=totalPages} className="border-gray-700 text-gray-300"><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <Dialog open={!!selected} onOpenChange={()=>setSelected(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-orange-400 font-mono">Booking {selected?.pnr}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="text-gray-400 text-xs font-semibold mb-2 uppercase">Passenger</div>
                  <div className="text-white font-medium">{selected.passenger?.first_name} {selected.passenger?.last_name}</div>
                  <div className="text-gray-400 text-xs mt-1">{selected.passenger?.phone}</div>
                  <div className="text-gray-400 text-xs">{selected.passenger?.email}</div>
                  <div className="text-gray-400 text-xs">Passport: {selected.passenger?.passport_number}</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="text-gray-400 text-xs font-semibold mb-2 uppercase">Flight</div>
                  <div className="text-white font-medium">{selected.flight?.flight_number}</div>
                  <div className="text-gray-400 text-xs">{selected.flight?.origin_city} → {selected.flight?.destination_city}</div>
                  <div className="text-gray-400 text-xs">{formatDateTime(selected.flight?.departure_time)}</div>
                  <div className="text-gray-400 text-xs">Gate: {selected.flight?.gate} | Terminal: {selected.flight?.terminal}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="text-gray-400 text-xs font-semibold mb-2 uppercase">Booking Details</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Status:</span><StatusBadge status={selected.status} /></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Payment:</span><StatusBadge status={selected.payment_status} /></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Fare:</span><span className="text-white capitalize">{selected.fare_class?.replace('_',' ')}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Seat:</span><span className="text-white">{selected.seat_number||'Not assigned'}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Amount:</span><span className="text-white">{formatCurrency(selected.total_amount||0)}</span></div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <div className="text-gray-400 text-xs font-semibold mb-2 uppercase">Payment</div>
                  <div className="space-y-1">
                    {selected.payment ? (
                      <>
                        <div className="flex justify-between text-sm"><span className="text-gray-400">Method:</span><span className="text-white">{selected.payment?.payment_method}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-400">Card:</span><span className="text-white">**** {selected.payment?.card_last_four||'N/A'}</span></div>
                        <div className="flex justify-between text-sm"><span className="text-gray-400">Ref:</span><span className="text-white text-xs">{selected.payment?.transaction_ref||'N/A'}</span></div>
                      </>
                    ) : <span className="text-gray-500 text-sm">No payment yet</span>}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={()=>handleAction(selected.pnr,'confirm')} className="text-white" style={{backgroundColor:'#22c55e'}}>Confirm Booking</Button>
                <Button size="sm" onClick={()=>handleAction(selected.pnr,'cancel')} variant="destructive">Cancel Booking</Button>
                <Button size="sm" onClick={()=>handleAction(selected.pnr,'paid')} style={{backgroundColor:'#3b82f6'}} className="text-white">Mark as Paid</Button>
                <Button size="sm" onClick={()=>handleAction(selected.pnr,'refund')} style={{backgroundColor:'#eab308'}} className="text-white">Process Refund</Button>
              </div>
              <div className="border-t border-gray-700 pt-3">
                <div className="text-gray-400 text-xs font-semibold mb-2 uppercase">Send WhatsApp Notification</div>
                <textarea
                  value={notifMsg}
                  onChange={e=>setNotifMsg(e.target.value)}
                  placeholder="Type message..."
                  rows={3}
                  className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-2 resize-none"
                />
                <Button size="sm" onClick={handleSendNotif} disabled={sendingNotif||!notifMsg} className="mt-2 text-white" style={{backgroundColor:'#FF6600'}}>
                  <Send className="h-3 w-3 mr-1" />{sendingNotif ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

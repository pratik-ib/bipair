'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/admin/status-badge';
import { Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateTime, formatCurrency } from '@/lib/bipair-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

const PAGE_SIZE = 10;

export default function PaymentsPage() {
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const r = await fetch(`/api/admin/payments?page=${page}&limit=${PAGE_SIZE}`);
    const d = await r.json();
    if (d.success) { setPayments(d.data.payments); setTotal(d.data.total); }
    setLoading(false);
  };

  useEffect(()=>{ load(); },[page]);

  const handleRefund = async (p: any) => {
    const r = await fetch(`/api/admin/payments/${p.id}/refund`, { method:'POST' });
    const d = await r.json();
    if (d.success) { toast({title:'Refund processed'}); load(); setSelected(null); }
    else toast({title:'Error', description:d.error, variant:'destructive'});
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-white text-2xl font-bold">Payments</h1>
        <p className="text-gray-400 text-sm">{total} total payments</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['Transaction Ref','PNR','Passenger','Amount','Currency','Method','Card','Status','Date','Actions'].map(h=>(
                  <th key={h} className="px-3 py-3 text-left text-gray-400 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array(5).fill(0).map((_,i)=>(
                <tr key={i}><td colSpan={10} className="px-3 py-4"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td></tr>
              )) : payments.map(p=>(
                <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-3 py-3 text-gray-300 font-mono text-xs">{p.transaction_ref||'N/A'}</td>
                  <td className="px-3 py-3 text-orange-400 font-mono font-bold text-sm">{p.booking?.pnr}</td>
                  <td className="px-3 py-3 text-white text-sm whitespace-nowrap">{p.passenger?.first_name} {p.passenger?.last_name}</td>
                  <td className="px-3 py-3 text-gray-300 text-sm">{formatCurrency(p.amount)}</td>
                  <td className="px-3 py-3 text-gray-400 text-sm">{p.currency}</td>
                  <td className="px-3 py-3 text-gray-400 text-sm capitalize">{p.payment_method}</td>
                  <td className="px-3 py-3 text-gray-400 text-sm">{p.card_last_four ? `**** ${p.card_last_four}` : 'N/A'}</td>
                  <td className="px-3 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-3 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDateTime(p.created_at)}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={()=>setSelected(p)} className="h-7 w-7 p-0 text-gray-400 hover:text-white"><Eye className="h-3 w-3" /></Button>
                      {p.status === 'success' && (
                        <Button size="sm" onClick={()=>handleRefund(p)} className="h-7 px-2 text-xs" style={{backgroundColor:'#eab308',color:'#000'}}>Refund</Button>
                      )}
                    </div>
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

      <Dialog open={!!selected} onOpenChange={()=>setSelected(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader><DialogTitle>Payment Details</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-3">
              {[{l:'ID',v:selected.id},{l:'Booking PNR',v:selected.booking?.pnr},{l:'Passenger',v:`${selected.passenger?.first_name||''} ${selected.passenger?.last_name||''}`},{l:'Amount',v:formatCurrency(selected.amount)},{l:'Currency',v:selected.currency},{l:'Method',v:selected.payment_method},{l:'Card',v:selected.card_last_four?`**** ${selected.card_last_four}`:'N/A'},{l:'Transaction Ref',v:selected.transaction_ref||'N/A'},{l:'Date',v:formatDateTime(selected.created_at)}].map(({l,v})=>(
                <div key={l} className="flex justify-between">
                  <span className="text-gray-400 text-sm">{l}:</span>
                  <span className="text-white text-sm font-medium">{v}</span>
                </div>
              ))}
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Status:</span>
                <StatusBadge status={selected.status} />
              </div>
              {selected.status === 'success' && (
                <Button onClick={()=>handleRefund(selected)} className="w-full" style={{backgroundColor:'#eab308',color:'#000'}}>Process Refund</Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

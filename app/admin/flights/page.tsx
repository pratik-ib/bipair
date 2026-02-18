'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StatusBadge } from '@/components/admin/status-badge';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateTime, formatCurrency } from '@/lib/bipair-utils';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const STATUSES = ['scheduled','boarding','delayed','cancelled','departed','landed'];
const PAGE_SIZE = 10;

const emptyFlight = {
  flight_number:'', origin:'', origin_city:'', destination:'', destination_city:'',
  departure_time:'', arrival_time:'', aircraft_type:'Boeing 737', status:'scheduled',
  gate:'', terminal:'', economy_seats:120, business_seats:20, first_class_seats:8,
  economy_price:'', business_price:'', first_class_price:''
};

export default function FlightsPage() {
  const { toast } = useToast();
  const [flights, setFlights] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editFlight, setEditFlight] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyFlight);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string|null>(null);

  const load = async () => {
    setLoading(true);
    const r = await fetch(`/api/admin/flights?page=${page}&limit=${PAGE_SIZE}`);
    const d = await r.json();
    if (d.success) { setFlights(d.data.flights); setTotal(d.data.total); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [page]);

  const openAdd = () => { setEditFlight(null); setForm(emptyFlight); setModalOpen(true); };
  const openEdit = (f: any) => { setEditFlight(f); setForm({...f, departure_time: f.departure_time?.slice(0,16), arrival_time: f.arrival_time?.slice(0,16)}); setModalOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    const method = editFlight ? 'PATCH' : 'POST';
    const url = editFlight ? `/api/admin/flights/${editFlight.id}` : '/api/admin/flights';
    const r = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
    const d = await r.json();
    if (d.success) { toast({title: editFlight ? 'Flight updated' : 'Flight added'}); setModalOpen(false); load(); }
    else toast({title: 'Error', description: d.error, variant:'destructive'});
    setSaving(false);
  };

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/admin/flights/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status}) });
    load();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/admin/flights/${deleteId}`, { method:'DELETE' });
    toast({title:'Flight deleted'});
    setDeleteId(null);
    load();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Flights</h1>
          <p className="text-gray-400 text-sm">{total} total flights</p>
        </div>
        <Button onClick={openAdd} style={{backgroundColor:'#FF6600'}} className="text-white">
          <Plus className="h-4 w-4 mr-2" />Add Flight
        </Button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['Flight No','Route','Departure','Arrival','Aircraft','Status','Economy','Business','First','Gate','Terminal','Actions'].map(h=>(
                  <th key={h} className="px-3 py-3 text-left text-gray-400 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array(5).fill(0).map((_,i)=>(
                <tr key={i} className="border-b border-gray-800"><td colSpan={12} className="px-3 py-4"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td></tr>
              )) : flights.map(f=>(
                <tr key={f.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-3 py-3 text-white font-mono font-bold text-sm">{f.flight_number}</td>
                  <td className="px-3 py-3 text-gray-300 text-sm whitespace-nowrap">{f.origin} → {f.destination}</td>
                  <td className="px-3 py-3 text-gray-300 text-xs whitespace-nowrap">{formatDateTime(f.departure_time)}</td>
                  <td className="px-3 py-3 text-gray-300 text-xs whitespace-nowrap">{formatDateTime(f.arrival_time)}</td>
                  <td className="px-3 py-3 text-gray-400 text-xs">{f.aircraft_type}</td>
                  <td className="px-3 py-3">
                    <Select defaultValue={f.status} onValueChange={v=>handleStatusChange(f.id,v)}>
                      <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-xs h-7">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {STATUSES.map(s=><SelectItem key={s} value={s} className="text-white text-xs">{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-3 py-3 text-gray-300 text-sm">{f.economy_seats}</td>
                  <td className="px-3 py-3 text-gray-300 text-sm">{f.business_seats}</td>
                  <td className="px-3 py-3 text-gray-300 text-sm">{f.first_class_seats}</td>
                  <td className="px-3 py-3 text-gray-400 text-sm">{f.gate||'-'}</td>
                  <td className="px-3 py-3 text-gray-400 text-sm">{f.terminal||'-'}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={()=>openEdit(f)} className="h-7 w-7 p-0 text-gray-400 hover:text-white">
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={()=>setDeleteId(f.id)} className="h-7 w-7 p-0 text-red-400 hover:text-red-300">
                        <Trash2 className="h-3 w-3" />
                      </Button>
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
              <Button size="sm" variant="outline" onClick={()=>setPage(p=>p-1)} disabled={page===1} className="border-gray-700 text-gray-300">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={()=>setPage(p=>p+1)} disabled={page>=totalPages} className="border-gray-700 text-gray-300">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">{editFlight ? 'Edit Flight' : 'Add Flight'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            {[
              {label:'Flight Number',key:'flight_number'},
              {label:'Origin IATA',key:'origin'},
              {label:'Origin City',key:'origin_city'},
              {label:'Destination IATA',key:'destination'},
              {label:'Destination City',key:'destination_city'},
              {label:'Aircraft Type',key:'aircraft_type'},
              {label:'Gate',key:'gate'},
              {label:'Terminal',key:'terminal'},
            ].map(f=>(
              <div key={f.key} className="space-y-1">
                <Label className="text-gray-300 text-xs">{f.label}</Label>
                <Input value={form[f.key]||''} onChange={e=>setForm((p:any)=>({...p,[f.key]:e.target.value}))} className="bg-gray-800 border-gray-700 text-white text-sm h-8" />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-gray-300 text-xs">Departure Time</Label>
              <Input type="datetime-local" value={form.departure_time||''} onChange={e=>setForm((p:any)=>({...p,departure_time:e.target.value}))} className="bg-gray-800 border-gray-700 text-white text-sm h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-gray-300 text-xs">Arrival Time</Label>
              <Input type="datetime-local" value={form.arrival_time||''} onChange={e=>setForm((p:any)=>({...p,arrival_time:e.target.value}))} className="bg-gray-800 border-gray-700 text-white text-sm h-8" />
            </div>
            {[{label:'Economy Seats',key:'economy_seats'},{label:'Business Seats',key:'business_seats'},{label:'First Class Seats',key:'first_class_seats'},{label:'Economy Price',key:'economy_price'},{label:'Business Price',key:'business_price'},{label:'First Class Price',key:'first_class_price'}].map(f=>(
              <div key={f.key} className="space-y-1">
                <Label className="text-gray-300 text-xs">{f.label}</Label>
                <Input type="number" value={form[f.key]||''} onChange={e=>setForm((p:any)=>({...p,[f.key]:e.target.value}))} className="bg-gray-800 border-gray-700 text-white text-sm h-8" />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-gray-300 text-xs">Status</Label>
              <Select value={form.status} onValueChange={v=>setForm((p:any)=>({...p,status:v}))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-sm h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  {STATUSES.map(s=><SelectItem key={s} value={s} className="text-white">{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setModalOpen(false)} className="border-gray-700 text-gray-300">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} style={{backgroundColor:'#FF6600'}} className="text-white">
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={!!deleteId} onOpenChange={()=>setDeleteId(null)}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white">
          <DialogHeader><DialogTitle>Confirm Delete</DialogTitle></DialogHeader>
          <p className="text-gray-300">Are you sure you want to delete this flight?</p>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setDeleteId(null)} className="border-gray-700 text-gray-300">Cancel</Button>
            <Button onClick={handleDelete} variant="destructive">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

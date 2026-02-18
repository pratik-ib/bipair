'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Eye, Pencil, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/bipair-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';

const PAGE_SIZE = 10;
const emptyPassenger = { first_name:'',last_name:'',email:'',phone:'',passport_number:'',nationality:'',date_of_birth:'' };

export default function PassengersPage() {
  const { toast } = useToast();
  const [passengers, setPassengers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editP, setEditP] = useState<any>(null);
  const [form, setForm] = useState<any>(emptyPassenger);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const r = await fetch(`/api/admin/passengers?page=${page}&limit=${PAGE_SIZE}`);
    const d = await r.json();
    if (d.success) { setPassengers(d.data.passengers); setTotal(d.data.total); }
    setLoading(false);
  };

  useEffect(()=>{ load(); },[page]);

  const openAdd = () => { setEditP(null); setForm(emptyPassenger); setModalOpen(true); };
  const openEdit = (p: any) => { setEditP(p); setForm({...p}); setModalOpen(true); };

  const handleSave = async () => {
    setSaving(true);
    const method = editP ? 'PATCH' : 'POST';
    const url = editP ? `/api/admin/passengers/${editP.id}` : '/api/admin/passengers/create';
    const r = await fetch(url, {method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(form)});
    const d = await r.json();
    if (d.success) { toast({title: editP ? 'Passenger updated' : 'Passenger added'}); setModalOpen(false); load(); }
    else toast({title:'Error', description:d.error, variant:'destructive'});
    setSaving(false);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-bold">Passengers</h1>
          <p className="text-gray-400 text-sm">{total} total passengers</p>
        </div>
        <Button onClick={openAdd} style={{backgroundColor:'#FF6600'}} className="text-white">
          <Plus className="h-4 w-4 mr-2" />Add Passenger
        </Button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['Name','Phone','Email','Passport','Nationality','Loyalty Points','Member Since','Actions'].map(h=>(
                  <th key={h} className="px-3 py-3 text-left text-gray-400 text-xs font-semibold uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array(5).fill(0).map((_,i)=>(
                <tr key={i}><td colSpan={8} className="px-3 py-4"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td></tr>
              )) : passengers.map(p=>(
                <tr key={p.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-3 py-3 text-white font-medium text-sm whitespace-nowrap">{p.first_name} {p.last_name}</td>
                  <td className="px-3 py-3 text-gray-300 text-sm">{p.phone}</td>
                  <td className="px-3 py-3 text-gray-400 text-sm">{p.email||'-'}</td>
                  <td className="px-3 py-3 text-gray-400 text-sm">{p.passport_number||'-'}</td>
                  <td className="px-3 py-3 text-gray-400 text-sm">{p.nationality||'-'}</td>
                  <td className="px-3 py-3">
                    <span className="text-yellow-400 font-bold">{p.loyalty_points?.toLocaleString()}</span>
                  </td>
                  <td className="px-3 py-3 text-gray-400 text-xs">{formatDate(p.created_at)}</td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1">
                      <Link href={`/admin/passengers/${p.id}`}>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-gray-400 hover:text-white"><Eye className="h-3 w-3" /></Button>
                      </Link>
                      <Button size="sm" variant="ghost" onClick={()=>openEdit(p)} className="h-7 w-7 p-0 text-gray-400 hover:text-white"><Pencil className="h-3 w-3" /></Button>
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg">
          <DialogHeader><DialogTitle>{editP ? 'Edit Passenger' : 'Add Passenger'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {[
              {l:'First Name',k:'first_name'},{l:'Last Name',k:'last_name'},
              {l:'Phone',k:'phone'},{l:'Email',k:'email'},
              {l:'Passport Number',k:'passport_number'},{l:'Nationality',k:'nationality'},
            ].map(f=>(
              <div key={f.k} className="space-y-1">
                <Label className="text-gray-300 text-xs">{f.l}</Label>
                <Input value={form[f.k]||''} onChange={e=>setForm((p:any)=>({...p,[f.k]:e.target.value}))} className="bg-gray-800 border-gray-700 text-white text-sm h-8" />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-gray-300 text-xs">Date of Birth</Label>
              <Input type="date" value={form.date_of_birth||''} onChange={e=>setForm((p:any)=>({...p,date_of_birth:e.target.value}))} className="bg-gray-800 border-gray-700 text-white text-sm h-8" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setModalOpen(false)} className="border-gray-700 text-gray-300">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} style={{backgroundColor:'#FF6600'}} className="text-white">{saving?'Saving...':'Save'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

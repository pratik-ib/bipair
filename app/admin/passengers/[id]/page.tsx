'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/admin/status-badge';
import { ArrowLeft, Plus, Minus } from 'lucide-react';
import { formatDate, formatDateTime, formatCurrency } from '@/lib/bipair-utils';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function PassengerDetailPage() {
  const params = useParams();
  const { toast } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingPoints, setUpdatingPoints] = useState(false);

  const load = async () => {
    const r = await fetch(`/api/admin/passengers/${params.id}`);
    const d = await r.json();
    if (d.success) setData(d.data);
    setLoading(false);
  };

  useEffect(()=>{ load(); },[]);

  const adjustPoints = async (delta: number) => {
    setUpdatingPoints(true);
    const newPoints = (data.passenger.loyalty_points || 0) + delta;
    const r = await fetch(`/api/admin/passengers/${params.id}`, {
      method:'PATCH', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ loyalty_points: newPoints })
    });
    const d = await r.json();
    if (d.success) { toast({title:'Points updated'}); load(); }
    setUpdatingPoints(false);
  };

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;
  if (!data) return <div className="p-6 text-gray-400">Passenger not found</div>;

  const { passenger, bookings } = data;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/passengers">
          <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
        </Link>
        <h1 className="text-white text-2xl font-bold">{passenger.first_name} {passenger.last_name}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Profile Card */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Profile</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              {l:'Full Name', v:`${passenger.first_name} ${passenger.last_name}`},
              {l:'Phone', v:passenger.phone},
              {l:'Email', v:passenger.email||'N/A'},
              {l:'Passport', v:passenger.passport_number||'N/A'},
              {l:'Nationality', v:passenger.nationality||'N/A'},
              {l:'Date of Birth', v:passenger.date_of_birth ? formatDate(passenger.date_of_birth) : 'N/A'},
              {l:'Member Since', v:formatDate(passenger.created_at)},
            ].map(({l,v})=>(
              <div key={l}>
                <div className="text-gray-400 text-xs">{l}</div>
                <div className="text-white text-sm font-medium">{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Loyalty Points */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Loyalty Points</h2>
          <div className="text-5xl font-black text-center mb-4" style={{color:'#FF6600'}}>
            {passenger.loyalty_points?.toLocaleString()}
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={()=>adjustPoints(-100)} disabled={updatingPoints} variant="outline" size="sm" className="border-gray-700 text-gray-300">
              <Minus className="h-3 w-3 mr-1" />100
            </Button>
            <Button onClick={()=>adjustPoints(100)} disabled={updatingPoints} size="sm" style={{backgroundColor:'#FF6600'}} className="text-white">
              <Plus className="h-3 w-3 mr-1" />100
            </Button>
          </div>
        </div>
      </div>

      {/* Booking History */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">Booking History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['PNR','Flight','Route','Date','Fare','Status','Payment','Amount'].map(h=>(
                  <th key={h} className="px-3 py-3 text-left text-gray-400 text-xs font-semibold uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b: any)=>(
                <tr key={b.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-3 py-3 text-orange-400 font-mono font-bold text-sm">{b.pnr}</td>
                  <td className="px-3 py-3 text-white text-sm">{b.flight?.flight_number}</td>
                  <td className="px-3 py-3 text-gray-300 text-xs">{b.flight?.origin}→{b.flight?.destination}</td>
                  <td className="px-3 py-3 text-gray-400 text-xs">{formatDateTime(b.flight?.departure_time)}</td>
                  <td className="px-3 py-3 text-gray-400 text-xs capitalize">{b.fare_class?.replace('_',' ')}</td>
                  <td className="px-3 py-3"><StatusBadge status={b.status} /></td>
                  <td className="px-3 py-3"><StatusBadge status={b.payment_status} /></td>
                  <td className="px-3 py-3 text-gray-300 text-sm">{formatCurrency(b.total_amount||0)}</td>
                </tr>
              ))}
              {!bookings.length && (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-500">No bookings found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

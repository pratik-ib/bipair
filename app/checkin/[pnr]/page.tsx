'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, Plane, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/bipair-utils';

export default function CheckinConfirmPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    fetch(`/api/checkin-page/${params.pnr}`).then(r=>r.json()).then(d=>{
      if (d.success) setData(d.data);
      setLoading(false);
    });
  },[]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500">Loading...</div>
    </div>
  );

  if (!data) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow p-8 text-center">
        <div className="text-red-400 text-5xl mb-4">✗</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Booking Not Found</h1>
        <p className="text-gray-500">PNR: {params.pnr}</p>
      </div>
    </div>
  );

  if (data.status !== 'checked_in') return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow p-8 text-center max-w-md">
        <div className="text-4xl mb-4">ℹ️</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Check-in Not Yet Completed</h1>
        <p className="text-gray-500 text-sm mb-4">Please complete your check-in via WhatsApp by sending:</p>
        <div className="bg-gray-100 rounded-lg px-4 py-2 font-mono text-sm text-gray-800">
          CHECK IN {params.pnr}
        </div>
        <p className="text-gray-400 text-xs mt-3">WhatsApp: +1234567890</p>
      </div>
    </div>
  );

  const boardingTime = data.departureTime
    ? new Date(new Date(data.departureTime).getTime() - 30 * 60000).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})
    : 'N/A';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-4 px-6" style={{backgroundColor:'#FF6600'}}>
        <div className="max-w-lg mx-auto">
          <div className="text-white text-2xl font-black">BipAir</div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-1">You're all checked in! ✈</h1>
          <p className="text-gray-500 text-center text-sm mb-6">{data.passengerName}</p>

          <div className="space-y-3 mb-6">
            {[
              {l:'Flight', v:data.flightNumber},
              {l:'Route', v:data.route},
              {l:'Departure', v:data.departureTime ? formatDateTime(data.departureTime) : 'N/A'},
              {l:'Gate', v:data.gate},
              {l:'Terminal', v:data.terminal},
            ].filter(i=>i.v).map(({l,v})=>(
              <div key={l} className="flex justify-between">
                <span className="text-gray-500 text-sm">{l}</span>
                <span className="text-gray-900 font-medium text-sm">{v}</span>
              </div>
            ))}
            <div className="flex justify-between items-center">
              <span className="text-gray-500 text-sm">Seat</span>
              <span className="text-3xl font-black" style={{color:'#FF6600'}}>{data.seatNumber}</span>
            </div>
          </div>

          <div className="rounded-xl flex items-center justify-between px-4 py-3 mb-6" style={{backgroundColor:'#FF6600'}}>
            <span className="text-white text-sm font-medium">BOARD BY</span>
            <span className="text-white text-lg font-black">{boardingTime}</span>
          </div>

          <a href={`/api/boarding-pass/${params.pnr}`} target="_blank" rel="noreferrer">
            <Button className="w-full text-white" style={{backgroundColor:'#FF6600'}}>
              <Download className="h-4 w-4 mr-2" />Download Boarding Pass
            </Button>
          </a>

          <div className="text-center mt-6">
            <div className="text-sm font-black" style={{color:'#FF6600'}}>BipAir</div>
            <div className="text-xs text-gray-400">bipair.com</div>
          </div>
        </div>
      </div>
    </div>
  );
}

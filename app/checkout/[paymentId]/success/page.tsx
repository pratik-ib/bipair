'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Copy, Check, Download, MessageCircle } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={()=>{ navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2000); }}
      className="ml-2 text-gray-400 hover:text-gray-600 transition-colors"
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

export default function SuccessPage() {
  const params = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showWhatsApp, setShowWhatsApp] = useState(false);

  useEffect(()=>{
    fetch(`/api/checkout-success/${params.paymentId}`).then(r=>r.json()).then(d=>{
      if (d.success) setData(d.data);
      setLoading(false);
    });
  },[]);

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500">Loading...</div>
    </div>
  );

  const pnr = data?.pnr || 'N/A';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-4 px-6" style={{backgroundColor:'#FF6600'}}>
        <div className="max-w-lg mx-auto">
          <div className="text-white text-2xl font-black">BipAir</div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed! 🎉</h1>
          <p className="text-gray-500 mb-6">Your booking reference is:</p>

          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="text-4xl font-black font-mono" style={{color:'#FF6600'}}>{pnr}</span>
            <CopyBtn text={pnr} />
          </div>

          {data && (
            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 mb-6">
              {data.passengerName && <div className="flex justify-between text-sm"><span className="text-gray-500">Passenger</span><span className="font-medium">{data.passengerName}</span></div>}
              {data.flightNumber && <div className="flex justify-between text-sm"><span className="text-gray-500">Flight</span><span className="font-medium">{data.flightNumber}</span></div>}
              {data.route && <div className="flex justify-between text-sm"><span className="text-gray-500">Route</span><span className="font-medium">{data.route}</span></div>}
              {data.departureTime && <div className="flex justify-between text-sm"><span className="text-gray-500">Departure</span><span className="font-medium text-xs">{data.departureTime}</span></div>}
              {data.fareClass && <div className="flex justify-between text-sm"><span className="text-gray-500">Class</span><span className="font-medium capitalize">{data.fareClass?.replace('_',' ')}</span></div>}
              {data.seatNumber && <div className="flex justify-between text-sm"><span className="text-gray-500">Seat</span><span className="font-medium">{data.seatNumber}</span></div>}
            </div>
          )}

          <div className="space-y-3">
            <a href={`/api/ticket/${pnr}`} target="_blank" rel="noreferrer">
              <Button className="w-full text-white" style={{backgroundColor:'#FF6600'}}>
                <Download className="h-4 w-4 mr-2" />Download E-Ticket (PDF)
              </Button>
            </a>
            <Button variant="outline" onClick={()=>setShowWhatsApp(v=>!v)} className="w-full border-gray-300">
              <MessageCircle className="h-4 w-4 mr-2 text-green-500" />Check In via WhatsApp
            </Button>
          </div>

          {showWhatsApp && (
            <div className="mt-4 bg-green-50 border border-green-200 rounded-xl p-4 text-left">
              <p className="text-sm text-gray-600 mb-2">Send this message to our WhatsApp chatbot:</p>
              <div className="flex items-center justify-between bg-white border border-green-200 rounded-lg px-3 py-2">
                <code className="font-mono text-sm text-gray-800">CHECK IN {pnr}</code>
                <CopyBtn text={`CHECK IN ${pnr}`} />
              </div>
              <p className="text-xs text-gray-500 mt-2">WhatsApp: <strong>+1234567890</strong></p>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-6">Save your PNR: <strong>{pnr}</strong></p>
        </div>
      </div>
    </div>
  );
}

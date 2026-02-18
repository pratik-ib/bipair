'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, CreditCard, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/utils';

function formatCardNumber(v: string) {
  return v.replace(/\D/g,'').slice(0,16).replace(/(\d{4})/g,'$1 ').trim();
}
function formatExpiry(v: string) {
  const digits = v.replace(/\D/g,'').slice(0,4);
  if (digits.length >= 3) return `${digits.slice(0,2)}/${digits.slice(2)}`;
  return digits;
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ cardNumber:'', expiry:'', cvv:'', name:'' });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(()=>{
    fetch(`/api/payments/${params.paymentId}/status`).then(r=>r.json()).then(async d=>{
      if (!d.success) { setLoading(false); return; }
      if (d.data.status === 'success') { router.push(`/checkout/${params.paymentId}/success`); return; }
      // Fetch booking details
      const br = await fetch(`/api/admin/payments-detail/${params.paymentId}`);
      const bd = await br.json();
      setData(bd.success ? { payment: d.data, booking: bd.data } : { payment: d.data });
      setLoading(false);
    });
  },[]);

  const handlePay = async () => {
    if (!form.cardNumber || !form.expiry || !form.cvv || !form.name) {
      setError('Please fill in all card details'); return;
    }
    setProcessing(true); setError('');
    await new Promise(r => setTimeout(r, 2000));
    const cardLastFour = form.cardNumber.replace(/\s/g,'').slice(-4);
    const r = await fetch(`/api/payments/${params.paymentId}/process`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ cardLastFour, cardholderName: form.name })
    });
    const d = await r.json();
    if (d.success && d.data?.status === 'success') {
      router.push(`/checkout/${params.paymentId}/success`);
    } else {
      setError('Payment declined. Please try again.');
      setProcessing(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500">Loading payment details...</div>
    </div>
  );

  const amount = data?.payment?.amount || 0;
  const tax = amount * 0.1;
  const total = amount + tax;
  const booking = data?.booking;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="py-4 px-6" style={{backgroundColor:'#FF6600'}}>
        <div className="max-w-5xl mx-auto">
          <div className="text-white text-2xl font-black">BipAir</div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Complete Your Booking</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Summary */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>
            {booking ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Passenger</span>
                  <span className="text-gray-900 font-medium text-sm">{booking.passengerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Flight</span>
                  <span className="text-gray-900 font-medium text-sm">{booking.flightNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Route</span>
                  <span className="text-gray-900 font-medium text-sm">{booking.route}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Departure</span>
                  <span className="text-gray-900 font-medium text-sm">{booking.departureTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 text-sm">Class</span>
                  <span className="text-gray-900 font-medium text-sm capitalize">{booking.fareClass?.replace('_',' ')}</span>
                </div>
                {booking.seatNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-500 text-sm">Seat</span>
                    <span className="text-gray-900 font-medium text-sm">{booking.seatNumber}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500 text-sm">Loading booking details...</div>
            )}
            <div className="border-t border-gray-100 mt-4 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Taxes (10%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold mt-2" style={{color:'#FF6600'}}>
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-bold text-gray-900">Secure Payment</h2>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-700 text-sm">Card Number</Label>
                <div className="relative mt-1">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={form.cardNumber}
                    onChange={e=>setForm(p=>({...p,cardNumber:formatCardNumber(e.target.value)}))}
                    placeholder="1234 5678 9012 3456"
                    className="pl-9"
                    maxLength={19}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-700 text-sm">Expiry Date</Label>
                  <Input
                    value={form.expiry}
                    onChange={e=>setForm(p=>({...p,expiry:formatExpiry(e.target.value)}))}
                    placeholder="MM/YY"
                    className="mt-1"
                    maxLength={5}
                  />
                </div>
                <div>
                  <Label className="text-gray-700 text-sm">CVV</Label>
                  <Input
                    value={form.cvv}
                    onChange={e=>setForm(p=>({...p,cvv:e.target.value.replace(/\D/g,'').slice(0,4)}))}
                    placeholder="123"
                    className="mt-1"
                    type="password"
                    maxLength={4}
                  />
                </div>
              </div>
              <div>
                <Label className="text-gray-700 text-sm">Cardholder Name</Label>
                <Input
                  value={form.name}
                  onChange={e=>setForm(p=>({...p,name:e.target.value}))}
                  placeholder="John Doe"
                  className="mt-1"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 rounded-lg px-3 py-2 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              <Button
                onClick={handlePay}
                disabled={processing}
                className="w-full text-white font-semibold py-3 text-base"
                style={{backgroundColor:'#FF6600'}}
              >
                {processing ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : `Pay ${formatCurrency(total)}`}
              </Button>
              <div className="flex items-center justify-center gap-1 text-gray-400 text-xs">
                <Lock className="h-3 w-3" />
                Demo Mode — No real charges will be made
              </div>
              <div className="flex justify-center gap-4 text-gray-400 text-sm mt-2">
                {['VISA','MC','AMEX'].map(c=><span key={c} className="border border-gray-200 rounded px-2 py-0.5 text-xs font-bold">{c}</span>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

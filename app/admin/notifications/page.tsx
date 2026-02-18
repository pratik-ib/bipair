'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/admin/status-badge';
import { Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDateTime } from '@/lib/bipair-utils';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PAGE_SIZE = 10;

const TEMPLATES = [
  {
    name: 'Flight Delay Alert',
    text: 'Your flight {flightNumber} has been delayed by {duration}. New departure time is {newTime}. We apologize for the inconvenience.'
  },
  {
    name: 'Boarding Reminder',
    text: 'Boarding for your flight {flightNumber} to {destination} is now open at Gate {gate}. Please proceed to the gate immediately.'
  },
  {
    name: 'Check-in Reminder',
    text: 'Reminder: Check-in for your flight {flightNumber} on {date} is now open via WhatsApp. Reply CHECK IN {pnr} to proceed.'
  },
  {
    name: 'Booking Confirmation',
    text: 'Your BipAir booking is confirmed! PNR: {pnr}. Flight {flightNumber} on {date}. Reply TICKET to receive your e-ticket.'
  },
  {
    name: 'Gate Change',
    text: 'Important update: Gate change for flight {flightNumber}. Your new gate is {gate}. Please proceed immediately.'
  },
];

export default function NotificationsPage() {
  const { toast } = useToast();
  const [passengers, setPassengers] = useState<any[]>([]);
  const [selectedPassenger, setSelectedPassenger] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    fetch('/api/admin/passengers?limit=100').then(r=>r.json()).then(d=>{ if(d.success) setPassengers(d.data.passengers); });
  },[]);

  const loadNotifications = async () => {
    setLoading(true);
    const r = await fetch(`/api/admin/notifications?page=${page}&limit=${PAGE_SIZE}`);
    const d = await r.json();
    if (d.success) { setNotifications(d.data.notifications); setTotal(d.data.total); }
    setLoading(false);
  };

  useEffect(()=>{ loadNotifications(); },[page]);

  const handleSend = async () => {
    if (!selectedPassenger || !message) return;
    setSending(true);
    const r = await fetch('/api/notifications/send', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ passengerId: selectedPassenger, message })
    });
    const d = await r.json();
    if (d.success) { toast({title:'Notification sent successfully'}); setMessage(''); loadNotifications(); }
    else toast({title:'Error', description:d.error, variant:'destructive'});
    setSending(false);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-white text-2xl font-bold">Notifications</h1>

      {/* Send Panel */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <h2 className="text-white font-semibold">Send Manual Message</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-gray-400 text-xs uppercase font-semibold">Passenger</label>
            <Select value={selectedPassenger} onValueChange={setSelectedPassenger}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Select passenger..." />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 max-h-64">
                {passengers.map(p=>(
                  <SelectItem key={p.id} value={p.id} className="text-white">
                    {p.first_name} {p.last_name} ({p.phone})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-gray-400 text-xs uppercase font-semibold">Template</label>
            <Select onValueChange={v=>setMessage(TEMPLATES.find(t=>t.name===v)?.text||'')}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Select template..." />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {TEMPLATES.map(t=>(
                  <SelectItem key={t.name} value={t.name} className="text-white">{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-gray-400 text-xs uppercase font-semibold">Message</label>
          <textarea
            value={message}
            onChange={e=>setMessage(e.target.value)}
            rows={3}
            placeholder="Type or select a template..."
            className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded-lg p-3 resize-none focus:outline-none focus:border-orange-500"
          />
        </div>
        <Button onClick={handleSend} disabled={sending||!selectedPassenger||!message} style={{backgroundColor:'#FF6600'}} className="text-white">
          <Send className="h-4 w-4 mr-2" />{sending?'Sending...':'Send Notification'}
        </Button>
      </div>

      {/* Log Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-white font-semibold">Notification Log ({total})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                {['Passenger','Phone','Message','Channel','Status','Sent At','Booking PNR'].map(h=>(
                  <th key={h} className="px-3 py-3 text-left text-gray-400 text-xs font-semibold uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array(3).fill(0).map((_,i)=>(
                <tr key={i}><td colSpan={7} className="px-3 py-4"><div className="h-4 bg-gray-800 rounded animate-pulse" /></td></tr>
              )) : notifications.map(n=>(
                <tr key={n.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-3 py-3 text-white text-sm whitespace-nowrap">{n.passenger?.first_name} {n.passenger?.last_name}</td>
                  <td className="px-3 py-3 text-gray-400 text-sm">{n.passenger?.phone}</td>
                  <td className="px-3 py-3 text-gray-300 text-xs max-w-xs truncate">{n.message}</td>
                  <td className="px-3 py-3 text-gray-400 text-xs">{n.channel}</td>
                  <td className="px-3 py-3"><StatusBadge status={n.status} /></td>
                  <td className="px-3 py-3 text-gray-400 text-xs whitespace-nowrap">{formatDateTime(n.sent_at)}</td>
                  <td className="px-3 py-3 text-orange-400 font-mono text-sm">{n.booking?.pnr||'-'}</td>
                </tr>
              ))}
              {!loading && !notifications.length && (
                <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-500">No notifications yet</td></tr>
              )}
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
    </div>
  );
}

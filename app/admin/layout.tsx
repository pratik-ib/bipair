import { getSession } from '@/lib/session';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/admin/sidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.isLoggedIn) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-gray-950">
      <Sidebar username={session.username} />
      <main className="flex-1 overflow-auto">
        <div className="lg:hidden flex items-center p-4 border-b border-gray-800 bg-gray-950">
          <div className="text-xl font-black" style={{ color: '#FF6600' }}>BipAir</div>
        </div>
        {children}
      </main>
    </div>
  );
}

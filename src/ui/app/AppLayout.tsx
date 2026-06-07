import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar.tsx';

/** App shell: fixed sidebar + scrollable main content area. */
export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-canvas text-fg">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

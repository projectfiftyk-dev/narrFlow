import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

const NAV_ITEMS = [
  { label: 'Books', path: '/books', icon: '📚' },
  { label: 'New Transformation', path: '/new-transformation', icon: '✨' },
  { label: 'Transformations', path: '/transformations', icon: '🎭' },
  { label: 'Player', path: '/player', icon: '▶' },
];

const MOBILE_BREAKPOINT = 768;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < MOBILE_BREAKPOINT);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

interface Props {
  children: React.ReactNode;
}

export function AppLayout({ children }: Props) {
  const activeId = useAppStore((s) => s.activeTransformationId);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar when switching from mobile to desktop
  useEffect(() => {
    if (!isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const closeSidebar = () => setSidebarOpen(false);

  const sidebar = (
    <aside
      style={{
        // Desktop: fixed column. Mobile: full-screen overlay.
        ...(isMobile
          ? {
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              width: '100vw',
              height: '100vh',
            }
          : {
              width: 220,
              minWidth: 220,
            }),
        background: '#1a202c',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
      }}
    >
      {/* Mobile close button row */}
      {isMobile && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 20px 28px',
          }}
        >
          <span style={{ color: '#fff', fontSize: 17, fontWeight: 700, letterSpacing: '-0.01em' }}>
            narrFlow
          </span>
          <button
            onClick={closeSidebar}
            aria-label="Close menu"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            }}
          >
            {/* X icon made from two lines rotated */}
            <span style={{ display: 'block', width: 22, height: 2, background: '#a0aec0', transform: 'rotate(45deg) translate(5px, 5px)' }} />
            <span style={{ display: 'block', width: 22, height: 2, background: '#a0aec0', transform: 'rotate(-45deg) translate(5px, -5px)' }} />
          </button>
        </div>
      )}

      {/* Desktop logo */}
      {!isMobile && (
        <div
          style={{
            padding: '0 20px 32px',
            color: '#fff',
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: '-0.01em',
          }}
        >
          narrFlow
        </div>
      )}

      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={isMobile ? closeSidebar : undefined}
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: isMobile ? '16px 24px' : '11px 20px',
            color: isActive ? '#fff' : '#a0aec0',
            background: isActive ? 'rgba(102,126,234,0.18)' : 'transparent',
            textDecoration: 'none',
            fontSize: isMobile ? 16 : 14,
            fontWeight: isActive ? 600 : 400,
            borderLeft: `3px solid ${isActive ? '#667eea' : 'transparent'}`,
            transition: 'background 0.15s',
          })}
        >
          <span style={{ fontSize: isMobile ? 18 : 15 }}>{item.icon}</span>
          <span style={{ flex: 1 }}>{item.label}</span>
          {item.path === '/player' && activeId && (
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#48bb78',
                flexShrink: 0,
              }}
            />
          )}
        </NavLink>
      ))}
    </aside>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Desktop sidebar — always in flow */}
      {!isMobile && sidebar}

      {/* Mobile sidebar — overlay, only rendered when open */}
      {isMobile && sidebarOpen && sidebar}

      <main
        style={{
          flex: 1,
          background: '#f7fafc',
          overflow: 'auto',
          minHeight: '100vh',
          // On mobile give space at top for the hamburger button
          paddingTop: isMobile ? 52 : 0,
        }}
      >
        {/* Hamburger — only on mobile, always visible */}
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            style={{
              position: 'fixed',
              top: 12,
              left: 12,
              zIndex: 999,
              background: '#1a202c',
              border: 'none',
              borderRadius: 8,
              padding: '8px 10px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
            }}
          >
            <span style={{ display: 'block', width: 20, height: 2, background: '#fff', borderRadius: 1 }} />
            <span style={{ display: 'block', width: 20, height: 2, background: '#fff', borderRadius: 1 }} />
            <span style={{ display: 'block', width: 20, height: 2, background: '#fff', borderRadius: 1 }} />
          </button>
        )}
        {children}
      </main>
    </div>
  );
}

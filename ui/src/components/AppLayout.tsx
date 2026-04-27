import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useRole } from '../features/auth/useRole';

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

interface NavItem {
  label: string;
  path: string;
  icon: string;
}

function getNavItems(role: ReturnType<typeof useRole>): NavItem[] {
  const base: NavItem[] = [{ label: 'Books', path: '/books', icon: '📚' }];
  if (role !== 'GUEST') {
    base.push(
      { label: 'New Transformation', path: '/new-transformation', icon: '✨' },
      { label: 'Transformations', path: '/transformations', icon: '🎭' }
    );
  } else {
    base.push({ label: 'Transformations', path: '/transformations', icon: '🎭' });
  }
  base.push({ label: 'Player', path: '/player', icon: '▶' });
  return base;
}

interface Props {
  children: React.ReactNode;
}

export function AppLayout({ children }: Props) {
  const activeId = useAppStore((s) => s.activeTransformationId);
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const role = useRole();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isMobile) setSidebarOpen(false);
  }, [isMobile]);

  const closeSidebar = () => setSidebarOpen(false);

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    navigate('/');
  };

  const navItems = getNavItems(role);

  const sidebar = (
    <aside
      style={{
        ...(isMobile
          ? { position: 'fixed', inset: 0, zIndex: 1000, width: '100vw', height: '100vh' }
          : { width: 220, minWidth: 220 }),
        background: '#1a202c',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
      }}
    >
      {/* Mobile close button */}
      {isMobile && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 20px 28px',
          }}
        >
          <span
            onClick={role === 'GUEST' ? () => navigate('/') : undefined}
            style={{ color: '#fff', fontSize: 17, fontWeight: 700, cursor: role === 'GUEST' ? 'pointer' : 'default' }}
          >
            narrFlow
          </span>
          <button
            onClick={closeSidebar}
            aria-label="Close menu"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <span style={{ display: 'block', width: 22, height: 2, background: '#a0aec0', transform: 'rotate(45deg) translate(5px, 5px)' }} />
            <span style={{ display: 'block', width: 22, height: 2, background: '#a0aec0', transform: 'rotate(-45deg) translate(5px, -5px)' }} />
          </button>
        </div>
      )}

      {/* Desktop logo + role badge */}
      {!isMobile && (
        <div style={{ padding: '0 20px 32px' }}>
          <div
            onClick={role === 'GUEST' ? () => navigate('/') : undefined}
            style={{
              color: '#fff',
              fontSize: 17,
              fontWeight: 700,
              marginBottom: 6,
              cursor: role === 'GUEST' ? 'pointer' : 'default',
            }}
          >
            narrFlow
          </div>
          {role === 'ADMIN' && (
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 700,
                color: '#fff',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Admin
            </span>
          )}
          {role === 'GUEST' && (
            <span
              style={{
                display: 'inline-block',
                padding: '2px 8px',
                background: 'rgba(160,174,192,0.15)',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 600,
                color: '#718096',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              Guest
            </span>
          )}
        </div>
      )}

      {/* Nav items */}
      <div style={{ flex: 1 }}>
        {navItems.map((item) => (
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
      </div>

      {/* Bottom: sign in / sign out */}
      <div style={{ padding: '16px 20px 0', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        {role === 'GUEST' ? (
          <button
            onClick={() => navigate('/login')}
            style={{
              width: '100%',
              padding: '9px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Sign In
          </button>
        ) : (
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '9px',
              background: 'transparent',
              color: '#718096',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            Sign Out
          </button>
        )}
      </div>
    </aside>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {!isMobile && sidebar}
      {isMobile && sidebarOpen && sidebar}

      <main
        style={{
          flex: 1,
          background: '#f7fafc',
          overflow: 'auto',
          minHeight: '100vh',
          paddingTop: isMobile ? 52 : 0,
        }}
      >
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

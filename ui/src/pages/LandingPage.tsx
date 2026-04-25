import { useNavigate } from 'react-router-dom';

const GRADIENT = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

function NavBar({ onScrollTo }: { onScrollTo: (id: string) => void }) {
  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 48px',
        height: 64,
        background: 'rgba(26, 32, 44, 0.95)',
        backdropFilter: 'blur(8px)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 28 }}>🎧</span>
        <span
          style={{
            fontSize: 20,
            fontWeight: 700,
            background: GRADIENT,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          narrFlow
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        {['features', 'how-it-works', 'get-started'].map((id) => (
          <button
            key={id}
            onClick={() => onScrollTo(id)}
            style={{
              background: 'none',
              border: 'none',
              color: '#a0aec0',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
              padding: '4px 0',
              textTransform: 'capitalize',
              letterSpacing: '0.02em',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.color = '#fff')}
            onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.color = '#a0aec0')}
          >
            {id.replace(/-/g, ' ')}
          </button>
        ))}
        <button
          onClick={() => onScrollTo('get-started')}
          style={{
            padding: '8px 20px',
            background: GRADIENT,
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Get Started
        </button>
      </div>
    </nav>
  );
}

function HeroSection({ onScrollTo }: { onScrollTo: (id: string) => void }) {
  return (
    <section
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '120px 48px 80px',
        background: '#0f1117',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          height: 600,
          background: 'radial-gradient(circle, rgba(102,126,234,0.15) 0%, transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 16px',
          background: 'rgba(102,126,234,0.12)',
          border: '1px solid rgba(102,126,234,0.3)',
          borderRadius: 100,
          fontSize: 13,
          color: '#a78bfa',
          fontWeight: 500,
          marginBottom: 32,
        }}
      >
        <span>✨</span> Multi-persona audiobook experience
      </div>

      <h1
        style={{
          margin: '0 0 24px',
          fontSize: 'clamp(40px, 6vw, 72px)',
          fontWeight: 800,
          lineHeight: 1.1,
          color: '#fff',
          maxWidth: 800,
        }}
      >
        Bring Books to Life with{' '}
        <span
          style={{
            background: GRADIENT,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Distinct Voices
        </span>
      </h1>

      <p
        style={{
          margin: '0 0 48px',
          fontSize: 18,
          color: '#718096',
          maxWidth: 560,
          lineHeight: 1.7,
        }}
      >
        narrFlow transforms your books into immersive audiobooks where every character
        speaks in their own unique AI-generated voice.
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => onScrollTo('get-started')}
          style={{
            padding: '14px 32px',
            background: GRADIENT,
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 24px rgba(102,126,234,0.4)',
          }}
        >
          Get Started Free
        </button>
        <button
          onClick={() => onScrollTo('how-it-works')}
          style={{
            padding: '14px 32px',
            background: 'transparent',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10,
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          See How It Works
        </button>
      </div>

      <div
        style={{
          marginTop: 80,
          padding: '32px 40px',
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 16,
          display: 'flex',
          gap: 48,
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {[
          { value: '100+', label: 'Books Supported' },
          { value: '30+', label: 'AI Voices' },
          { value: '∞', label: 'Personas per Book' },
        ].map(({ value, label }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: 32,
                fontWeight: 800,
                background: GRADIENT,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {value}
            </div>
            <div style={{ fontSize: 13, color: '#718096', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    {
      icon: '🎭',
      title: 'Multi-Persona Narration',
      description:
        'Assign unique AI voices to each character or author. Every voice is distinct, making the listening experience feel alive.',
    },
    {
      icon: '⚡',
      title: 'AI-Powered Generation',
      description:
        'State-of-the-art text-to-speech via ElevenLabs produces natural, expressive audio that captures the emotion of the text.',
    },
    {
      icon: '📚',
      title: 'Smart Book Library',
      description:
        'Upload and manage your book collection. Organize transformations, resume where you left off, and replay any time.',
    },
    {
      icon: '🎧',
      title: 'Immersive Player',
      description:
        'Follow along with synchronized text and audio. Navigate by section, skip segments, and control playback with ease.',
    },
    {
      icon: '🔒',
      title: 'Secure & Private',
      description:
        'Your books and audio content are private to your account. Enterprise-grade JWT authentication keeps your data safe.',
    },
    {
      icon: '🚀',
      title: 'Fast Processing',
      description:
        'Asynchronous generation pipelines mean you can queue a book and come back when it\'s ready — no waiting around.',
    },
  ];

  return (
    <section
      id="features"
      style={{
        padding: '100px 48px',
        background: '#f7fafc',
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2
            style={{
              margin: '0 0 16px',
              fontSize: 40,
              fontWeight: 800,
              color: '#1a202c',
            }}
          >
            Everything you need for
            <br />
            <span
              style={{
                background: GRADIENT,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              great audiobooks
            </span>
          </h2>
          <p style={{ margin: 0, color: '#718096', fontSize: 18 }}>
            Powerful features that make narrFlow the best way to experience your library.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 24,
          }}
        >
          {features.map(({ icon, title, description }) => (
            <div
              key={title}
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: 32,
                border: '1px solid #e2e8f0',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
            >
              <div style={{ fontSize: 36, marginBottom: 16 }}>{icon}</div>
              <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 700, color: '#1a202c' }}>
                {title}
              </h3>
              <p style={{ margin: 0, fontSize: 14, color: '#718096', lineHeight: 1.7 }}>
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    {
      step: '01',
      title: 'Add Your Book',
      description: 'Upload or select a book from the library. narrFlow parses it into sections and identifies all authors and speakers.',
    },
    {
      step: '02',
      title: 'Assign Voices',
      description: 'Pick from 30+ ElevenLabs AI voices. Map each character or narrator to the perfect voice for the story.',
    },
    {
      step: '03',
      title: 'Generate Audio',
      description: 'Hit generate and let narrFlow do the work. The async pipeline processes your book and notifies you when done.',
    },
    {
      step: '04',
      title: 'Listen & Enjoy',
      description: 'Open the player and experience your book like never before — full narration with distinct voices for each character.',
    },
  ];

  return (
    <section
      id="how-it-works"
      style={{
        padding: '100px 48px',
        background: '#0f1117',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2
            style={{
              margin: '0 0 16px',
              fontSize: 40,
              fontWeight: 800,
              color: '#fff',
            }}
          >
            How It Works
          </h2>
          <p style={{ margin: 0, color: '#718096', fontSize: 18 }}>
            From book to audiobook in four simple steps.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {steps.map(({ step, title, description }, i) => (
            <div
              key={step}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 32,
                padding: 32,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 16,
              }}
            >
              <div
                style={{
                  minWidth: 56,
                  height: 56,
                  borderRadius: 14,
                  background: i % 2 === 0 ? GRADIENT : 'rgba(102,126,234,0.12)',
                  border: i % 2 !== 0 ? '1px solid rgba(102,126,234,0.3)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 15,
                  fontWeight: 800,
                  color: i % 2 === 0 ? '#fff' : '#a78bfa',
                }}
              >
                {step}
              </div>
              <div>
                <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#fff' }}>
                  {title}
                </h3>
                <p style={{ margin: 0, fontSize: 15, color: '#718096', lineHeight: 1.7 }}>
                  {description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GetStartedSection({ onLogin, onGuest }: { onLogin: () => void; onGuest: () => void }) {
  return (
    <section
      id="get-started"
      style={{
        padding: '100px 48px',
        background: '#f7fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          maxWidth: 560,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            margin: '0 0 16px',
            fontSize: 40,
            fontWeight: 800,
            color: '#1a202c',
          }}
        >
          Ready to start listening?
        </h2>
        <p style={{ margin: '0 0 48px', fontSize: 18, color: '#718096', lineHeight: 1.7 }}>
          Sign in to save your library and transformations, or jump straight in as a guest.
        </p>

        <div
          style={{
            background: '#fff',
            borderRadius: 20,
            padding: 40,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 24 }}>🎧</div>

          <button
            onClick={onLogin}
            style={{
              display: 'block',
              width: '100%',
              padding: '14px',
              background: GRADIENT,
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: 12,
              boxShadow: '0 4px 16px rgba(102,126,234,0.35)',
            }}
          >
            Sign In
          </button>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: '16px 0',
              color: '#cbd5e0',
              fontSize: 13,
            }}
          >
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            <span>or</span>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          </div>

          <button
            onClick={onGuest}
            style={{
              display: 'block',
              width: '100%',
              padding: '14px',
              background: 'transparent',
              color: '#4a5568',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Continue as Guest
          </button>

          <p style={{ margin: '20px 0 0', fontSize: 12, color: '#a0aec0' }}>
            Guest sessions are not saved. Sign in to keep your progress.
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer
      style={{
        padding: '32px 48px',
        background: '#0f1117',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 20 }}>🎧</span>
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            background: GRADIENT,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          narrFlow
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 13, color: '#4a5568' }}>
        Multi-Persona Audiobook Experience
      </p>
    </footer>
  );
}

export function LandingPage() {
  const navigate = useNavigate();

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <NavBar onScrollTo={scrollTo} />
      <HeroSection onScrollTo={scrollTo} />
      <FeaturesSection />
      <HowItWorksSection />
      <GetStartedSection
        onLogin={() => navigate('/login')}
        onGuest={() => navigate('/books')}
      />
      <Footer />
    </div>
  );
}

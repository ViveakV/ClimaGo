import React from 'react';

interface Props {
  showPrompt: boolean;
  setShowPrompt: (v: boolean) => void;
  showOverlay: boolean;
  setShowOverlay: (v: boolean) => void;
  password: string;
  setPassword: (v: string) => void;
  wrongPassword: boolean;
  setWrongPassword: (v: boolean) => void;
}

const ideas = [
  { icon: '🌍', text: 'Multi-day trip planner with route and weather optimization' },
  { icon: '📱', text: 'Mobile-friendly PWA with offline support' },
  { icon: '🔔', text: 'Push/email notifications for best activity days' },
  { icon: '🗺️', text: 'More detailed map overlays (ski slopes, surf spots, POIs)' },
  { icon: '🧑‍🤝‍🧑', text: 'Social sharing and trip collaboration' },
  { icon: '🧠', text: 'AI-powered personalized recommendations' },
  { icon: '🌦️', text: 'Hourly weather and real-time updates' },
  { icon: '🗣️', text: 'Multi-language support' },
  { icon: '💬', text: 'User reviews and tips for each activity/location' },
  { icon: '🎨', text: 'More themes and accessibility options' },
];

const MoreTimeModal: React.FC<Props> = ({
  showPrompt, setShowPrompt, showOverlay, setShowOverlay,
  password, setPassword, wrongPassword, setWrongPassword
}) => (
  <>
    {/* Password prompt popup */}
    {showPrompt && (
      <div
        style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.32)',
          zIndex: 4000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.2s',
        }}
        onClick={() => setShowPrompt(false)}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 14,
            boxShadow: '0 8px 32px #0002',
            padding: '2em 2.5em 1.5em 2.5em',
            minWidth: 260,
            minHeight: 80,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            animation: 'fadeInUp 0.25s',
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => setShowPrompt(false)}
            style={{
              position: 'absolute',
              top: 10,
              right: 12,
              background: 'none',
              border: 'none',
              fontSize: 20,
              color: '#888',
              cursor: 'pointer',
              zIndex: 10,
              padding: 0,
            }}
            aria-label="Close"
          >
            ×
          </button>
          <div style={{ fontWeight: 700, fontSize: '1.13rem', marginBottom: 12, color: '#ffd600', display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* ...lightbulb SVG... */}
            If I had more time...
          </div>
          <form
            onSubmit={e => {
              e.preventDefault();
              if (password === 'Viveak') {
                setShowPrompt(false);
                setShowOverlay(true);
                setWrongPassword(false);
              } else {
                setWrongPassword(true);
                setTimeout(() => setShowPrompt(false), 1200);
              }
            }}
            style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
          >
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={e => { setPassword(e.target.value); setWrongPassword(false); }}
              style={{
                padding: '0.7em 1em',
                borderRadius: 8,
                border: wrongPassword ? '2px solid #e53935' : '1.5px solid #ffd600',
                fontSize: '1.07rem',
                marginBottom: 10,
                outline: 'none',
                width: 180,
                transition: 'border 0.2s',
              }}
              autoFocus
            />
            <button
              type="submit"
              style={{
                background: '#ffd600',
                color: '#222',
                border: 'none',
                borderRadius: 8,
                padding: '0.6em 1.3em',
                fontWeight: 600,
                fontSize: '1.05rem',
                cursor: 'pointer',
                boxShadow: '0 2px 8px #ffd60033',
                transition: 'background 0.2s',
              }}
            >
              Submit
            </button>
          </form>
          {wrongPassword && (
            <div style={{ color: '#e53935', marginTop: 8, fontWeight: 500, fontSize: '1.01rem' }}>
              Wrong password
            </div>
          )}
        </div>
      </div>
    )}
    {/* Overlay with additional ideas */}
    {showOverlay && (
      <div
        style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.32)',
          zIndex: 4000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'fadeIn 0.2s',
        }}
        onClick={() => setShowOverlay(false)}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 8px 32px #0002',
            padding: '2.5em 2.7em 2em 2.7em',
            minWidth: 320,
            minHeight: 120,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            animation: 'fadeInUp 0.25s',
            maxWidth: '90vw',
          }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => setShowOverlay(false)}
            style={{
              position: 'absolute',
              top: 14,
              right: 16,
              background: 'none',
              border: 'none',
              fontSize: 22,
              color: '#888',
              cursor: 'pointer',
              zIndex: 10,
              padding: 0,
            }}
            aria-label="Close"
          >
            ×
          </button>
          <div style={{ fontWeight: 700, color: '#ffd600', fontSize: '1.22rem', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* ...lightbulb SVG... */}
            If I had more time...
          </div>
          <div style={{ color: '#444', fontSize: '1.09rem', marginBottom: 12, textAlign: 'center', fontWeight: 500 }}>
            Here are some additional features and improvements I would add:
          </div>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              maxWidth: 420,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {ideas.map(({ icon, text }, idx) => (
              <li
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'linear-gradient(90deg, #fffde7 60%, #ffd60018 100%)',
                  borderRadius: 10,
                  boxShadow: '0 1px 6px #ffd60022',
                  padding: '0.7em 1.1em',
                  fontWeight: 500,
                  color: '#222',
                  fontSize: '1.05rem',
                  gap: 14,
                  borderLeft: '4px solid #ffd600',
                  transition: 'background 0.2s',
                }}
              >
                <span style={{
                  fontSize: 22,
                  marginRight: 6,
                  filter: 'drop-shadow(0 2px 2px #ffd60033)'
                }}>{icon}</span>
                <span style={{ flex: 1 }}>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    )}
  </>
);

export default MoreTimeModal;

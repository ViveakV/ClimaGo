import React, { useState, useRef } from 'react';
import './MoreTime.css';

const LightbulbIcon: React.FC<{ size?: number }> = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" fill="#fffde7" stroke="#ffd600" strokeWidth="2"/>
    <path d="M9 17h6M10 20h4" stroke="#ffd600" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 6a4 4 0 0 1 4 4c0 2-2 3-2 5h-4c0-2-2-3-2-5a4 4 0 0 1 4-4z" stroke="#ffd600" strokeWidth="1.5" fill="#fffde7"/>
  </svg>
);

const features = [
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

const MoreTime: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [password, setPassword] = useState('');
  const [wrongPassword, setWrongPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = process.env.REACT_APP_MORETIME_PASSWORD;
    if (password === correctPassword) {
      setShowPrompt(false);
      setShowOverlay(true);
      setWrongPassword(false);
    } else {
      setWrongPassword(true);
      setTimeout(() => setShowPrompt(false), 1200);
    }
  };

  return (
    <>
      <button
        className="moretime-btn"
        onClick={() => setShowPrompt(true)}
        aria-label="Show more time modal"
      >
        <LightbulbIcon size={20} />
      </button>
      {/* Password prompt popup */}
      {showPrompt && (
        <div className="moretime-overlay" onClick={() => setShowPrompt(false)}>
          <div className="moretime-popup" onClick={e => e.stopPropagation()}>
            <button
              className="moretime-close-btn"
              onClick={() => setShowPrompt(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="moretime-title">
              <LightbulbIcon />
              If I had more time...
            </div>
            <form className="moretime-form" onSubmit={handleSubmit}>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                ref={inputRef}
                onChange={e => { setPassword(e.target.value); setWrongPassword(false); }}
                className={`moretime-input${wrongPassword ? ' wrong' : ''}`}
                autoFocus
              />
              <button type="submit" className="moretime-submit-btn">
                Submit
              </button>
            </form>
            {wrongPassword && (
              <div className="moretime-wrong">
                Wrong password
              </div>
            )}
          </div>
        </div>
      )}
      {showOverlay && (
        <div className="moretime-overlay" onClick={() => setShowOverlay(false)}>
          <div className="moretime-features-popup" onClick={e => e.stopPropagation()}>
            <button
              className="moretime-close-btn"
              onClick={() => setShowOverlay(false)}
              aria-label="Close"
            >
              ×
            </button>
            <div className="moretime-features-title">
              <LightbulbIcon size={26} />
              If I had more time...
            </div>
            <div className="moretime-features-desc">
              Here are some additional features and improvements I would add:
            </div>
            <ul className="moretime-features-list">
              {features.map(({ icon, text }, idx) => (
                <li key={idx} className="moretime-feature-item">
                  <span className="moretime-feature-icon">{icon}</span>
                  <span className="moretime-feature-text">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
};

export default MoreTime;

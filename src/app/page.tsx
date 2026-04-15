import Game from './components/Game';

export default function Home() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">PLINKO</h1>
        <p className="app-subtitle">Provably Fair • Verifiable Outcomes</p>
      </header>
      <nav className="nav-bar">
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <a href="/" className="nav-link active">Game</a>
          <a href="/verify" className="nav-link">Verifier</a>
        </div>
      </nav>
      <Game />
    </div>
  );
}

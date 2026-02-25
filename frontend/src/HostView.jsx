import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { Play, SkipForward, Search, Settings2, BarChart2, Share2, Eye, Activity } from 'lucide-react';

const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3001' : '';

export default function HostView() {
    const [socket, setSocket] = useState(null);
    const [room, setRoom] = useState(null);
    const [copied, setCopied] = useState(false);

    // Setup Params
    const [params, setParams] = useState({
        theta: 50,
        bias: 8,
        alpha: 0.4,
        totalRounds: 6,
        timerDuration: 60,
        networkType: 'sparse',
        advocateRatio: 0.3
    });

    useEffect(() => {
        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        newSocket.on('host_update', (roomState) => {
            setRoom(roomState);
        });

        return () => newSocket.disconnect();
    }, []);

    const handleCreateRoom = (e) => {
        e.preventDefault();
        socket.emit('create_room', params, (res) => {
            // Room creates and auto joins via server callback if needed, but 'host_update' covers it
        });
    };

    const handleStartGame = () => {
        socket.emit('start_game', room.code, (res) => {
            if (!res.success) alert(res.message);
        });
    };

    const handleNextRound = () => {
        socket.emit('next_round', room.code);
    };

    const copyLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/room/${room.code}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Views based on room state
    if (!room) {
        return (
            <div className="container" style={{ maxWidth: '600px', marginTop: '4rem' }}>
                <div className="card animate-fade-in">
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <Settings2 color="var(--primary)" /> Game Setup
                    </h2>
                    <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="dashboard-grid">
                            <div className="form-group">
                                <label>True State (θ) [1-100]</label>
                                <input type="number" min="1" max="100" value={params.theta} onChange={e => setParams({ ...params, theta: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Advocate Bias (b)</label>
                                <input type="number" value={params.bias} onChange={e => setParams({ ...params, bias: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Learning Rate (α) [0-1]</label>
                                <input type="number" step="0.1" min="0" max="1" value={params.alpha} onChange={e => setParams({ ...params, alpha: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Advocate % [0-1]</label>
                                <input type="number" step="0.1" min="0" max="1" value={params.advocateRatio} onChange={e => setParams({ ...params, advocateRatio: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Rounds (T)</label>
                                <input type="number" min="1" max="20" value={params.totalRounds} onChange={e => setParams({ ...params, totalRounds: e.target.value })} required />
                            </div>
                            <div className="form-group">
                                <label>Network Type</label>
                                <select value={params.networkType} onChange={e => setParams({ ...params, networkType: e.target.value })}>
                                    <option value="sparse">Sparse / Random</option>
                                    <option value="circle">Circle Graph</option>
                                    <option value="line">Line Graph</option>
                                    <option value="fully_connected">Fully Connected</option>
                                </select>
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary btn-block mt-4">
                            Generate Game Room
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const playersArr = Object.values(room.players || {});
    const tsPlayers = playersArr.filter(p => p.role === 'Truth-Seeker');
    const advPlayers = playersArr.filter(p => p.role === 'Advocate');

    return (
        <div className="container" style={{ maxWidth: '1000px', paddingTop: '1rem' }}>
            {/* Header Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <span className="badge badge-purple" style={{ fontSize: '1.25rem' }}>Room: {room.code}</span>
                    {room.gameState !== 'LOBBY' && (
                        <span className="badge" style={{ marginLeft: '1rem', background: 'var(--surface-light)', fontSize: '1rem' }}>
                            Round {room.currentRound} of {room.params.totalRounds}
                        </span>
                    )}
                </div>

                {room.gameState === 'LOBBY' && (
                    <button onClick={copyLink} className={`btn ${copied ? 'btn-secondary' : 'btn-primary'}`}>
                        <Share2 size={16} /> {copied ? 'Copied URL!' : 'Copy Join Link'}
                    </button>
                )}
            </div>

            {room.gameState === 'LOBBY' && (
                <div className="dashboard-grid">
                    <div className="card animate-slide-up flex flex-col justify-center items-center" style={{ minHeight: '300px' }}>
                        <h1 style={{ fontSize: '5rem', letterSpacing: '4px', margin: '0', background: 'linear-gradient(45deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            {room.code}
                        </h1>
                        <p style={{ marginTop: '1rem' }}>Instruct students to join with this code.</p>

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                            <div className="badge badge-blue">{playersArr.length} Total Players</div>
                        </div>
                    </div>

                    <div className="card animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--surface-light)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                            <h3>Connected Students ({playersArr.length})</h3>
                            <button onClick={handleStartGame} disabled={playersArr.length < 2} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
                                <Play size={16} /> Start Experiment
                            </button>
                        </div>

                        <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                            {playersArr.length === 0 ? (
                                <p className="text-muted" style={{ textAlign: 'center', marginTop: '2rem' }}>Waiting for students...</p>
                            ) : (
                                <ul style={{ listStyle: 'none', padding: 0 }}>
                                    {playersArr.map(p => (
                                        <li key={p.id} style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></div>
                                            {p.name}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {(room.gameState === 'PLAYING' || room.gameState === 'ROUND_END') && (
                <div className="animate-fade-in">
                    <div className="dashboard-grid" style={{ marginBottom: '2rem', gridTemplateColumns: 'repeat(4, 1fr)' }}>
                        <div className="stat-card">
                            <span className="text-muted text-sm uppercase font-bold">Total Players</span>
                            <div className="stat-value">{playersArr.length}</div>
                        </div>
                        <div className="stat-card">
                            <span className="text-muted text-sm uppercase font-bold">Submissions</span>
                            <div className="stat-value" style={{ color: Object.values(playersArr).filter(p => p.hasSubmitted).length === playersArr.length ? 'var(--success)' : 'var(--warning)' }}>
                                {Object.values(playersArr).filter(p => p.hasSubmitted).length} / {playersArr.length}
                            </div>
                        </div>
                        <div className="stat-card">
                            <span className="text-muted text-sm uppercase font-bold">True State (θ)</span>
                            <div className="stat-value text-white">{room.params.theta}</div>
                        </div>
                        <div className="stat-card">
                            <span className="text-muted text-sm uppercase font-bold">Target (θ + b)</span>
                            <div className="stat-value" style={{ color: 'var(--accent)' }}>{Number(room.params.theta) + Number(room.params.bias)}</div>
                        </div>
                    </div>

                    <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
                        <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={18} /> Live Network Feed</h3>
                                {room.gameState === 'ROUND_END' && (
                                    <button onClick={handleNextRound} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
                                        <SkipForward size={16} /> {room.currentRound >= room.params.totalRounds ? 'Finish Game' : 'Next Round'}
                                    </button>
                                )}
                            </div>

                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--surface-light)' }}>
                                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Player Name</th>
                                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Role</th>
                                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>New Opinion</th>
                                            <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {playersArr.map(p => (
                                            <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                <td style={{ padding: '1rem' }}>{p.name}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span className={`badge ${p.role === 'Truth-Seeker' ? 'badge-blue' : 'badge-amber'}`}>
                                                        {p.role.substring(0, 3)}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                                                    {p.currentOpinion ? Math.round(p.currentOpinion * 10) / 10 : '--'}
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    {p.hasSubmitted ? <span style={{ color: 'var(--success)' }}>Submitted</span> : <span style={{ color: 'var(--warning)' }}>Thinking...</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {room.gameState === 'GAME_END' && (
                <div className="card animate-slide-up">
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '2rem' }}>
                        <BarChart2 color="var(--primary)" /> Final Experiment Results
                    </h2>

                    <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
                        <div className="stat-card" style={{ textAlign: 'center' }}>
                            <p className="text-muted uppercase mb-4" style={{ fontWeight: 'bold' }}>Average Truth-Seeker Divergence</p>
                            <p style={{ fontSize: '3rem', fontWeight: 'bold', margin: 0, color: 'var(--primary)' }}>
                                {Math.abs((tsPlayers.reduce((a, b) => a + b.currentOpinion, 0) / (tsPlayers.length || 1)) - room.params.theta).toFixed(1)}
                            </p>
                            <p className="text-muted mt-2">Points away from True State (θ)</p>
                        </div>
                        <div className="stat-card" style={{ textAlign: 'center' }}>
                            <p className="text-muted uppercase mb-4" style={{ fontWeight: 'bold' }}>Average Advocate Success</p>
                            <p style={{ fontSize: '3rem', fontWeight: 'bold', margin: 0, color: 'var(--accent)' }}>
                                {Math.abs((tsPlayers.reduce((a, b) => a + b.currentOpinion, 0) / (tsPlayers.length || 1)) - (Number(room.params.theta) + Number(room.params.bias))).toFixed(1)}
                            </p>
                            <p className="text-muted mt-2">Points away from Target (θ+b)</p>
                        </div>
                    </div>

                    <h3 style={{ marginTop: '3rem', marginBottom: '1rem' }}>Final Roll Call & Scores</h3>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--surface-light)' }}>
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Player Name</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Role</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Final Opinion</th>
                                    <th style={{ padding: '1rem', color: 'var(--text-muted)' }}>Final Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {playersArr.map(p => (
                                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                        <td style={{ padding: '1rem' }}>{p.name}</td>
                                        <td style={{ padding: '1rem' }}>
                                            <span className={`badge ${p.role === 'Truth-Seeker' ? 'badge-blue' : 'badge-amber'}`}>
                                                {p.role}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem', fontWeight: 'bold' }}>
                                            {p.currentOpinion ? Math.round(p.currentOpinion * 10) / 10 : '--'}
                                        </td>
                                        <td style={{ padding: '1rem', fontWeight: 'bold', color: 'var(--success)' }}>
                                            {p.score ? Math.round(p.score) : 0} pts
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <button className="btn btn-secondary mt-4 btn-block" onClick={() => window.location.reload()}>Return to Setup</button>
                </div>
            )}
        </div>
    );
}

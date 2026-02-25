import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Send, Clock, UserCheck, ShieldAlert, Cpu } from 'lucide-react';

const SOCKET_URL = import.meta.env.DEV ? 'http://localhost:3001' : '';

export default function StudentView() {
    const { roomCode } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [socket, setSocket] = useState(null);

    // Identity State
    const fromHome = location.state?.fromHome;
    const initialName = localStorage.getItem('studentName') || '';
    const [studentName, setStudentName] = useState(initialName);
    const [hasName, setHasName] = useState(!!fromHome && !!initialName);

    // Game State
    const [gameState, setGameState] = useState('CONNECTING'); // ENTER_NAME, CONNECTING, LOBBY, PLAYING, ROUND_END, GAME_END
    const [playerState, setPlayerState] = useState(null);
    const [error, setError] = useState('');

    // Round State
    const [currentRound, setCurrentRound] = useState(0);
    const [totalRounds, setTotalRounds] = useState(0);
    const [messageInput, setMessageInput] = useState(50);
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [roundResult, setRoundResult] = useState(null);

    useEffect(() => {
        if (!hasName) {
            setGameState('ENTER_NAME');
            return;
        }

        const finalName = studentName || `Student_${Math.floor(Math.random() * 1000)}`;

        const newSocket = io(SOCKET_URL);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            newSocket.emit('join_room', { playerName: finalName, roomCode: roomCode }, (res) => {
                if (!res.success) {
                    setError(res.message);
                    setGameState('ERROR');
                } else {
                    setGameState('LOBBY');
                }
            });
        });

        newSocket.on('game_started', (data) => {
            setCurrentRound(data.currentRound);
            setTotalRounds(data.totalRounds);
            setGameState('PLAYING');
            setHasSubmitted(false);
            setRoundResult(null);
            setMessageInput('');
        });

        newSocket.on('player_state', (data) => {
            setPlayerState(data);
        });

        newSocket.on('round_started', (data) => {
            setCurrentRound(data.currentRound);
            setGameState('PLAYING');
            setHasSubmitted(false);
            setRoundResult(null);
            setMessageInput('');
        });

        newSocket.on('message_received', () => {
            setHasSubmitted(true);
        });

        newSocket.on('round_ended', (data) => {
            setRoundResult(data);
            if (playerState?.role === 'Truth-Seeker') {
                setPlayerState(prev => ({ ...prev, currentOpinion: data.newOpinion }));
            }
            setGameState('ROUND_END');
        });

        newSocket.on('game_ended', (data) => {
            // Use data.theta for final reveal
            setPlayerState(prev => ({ ...prev, thetaFinal: data.theta }));
            setGameState('GAME_END');
        });

        newSocket.on('game_reset', () => {
            setGameState('LOBBY');
            setPlayerState(null);
            setCurrentRound(0);
            setTotalRounds(0);
            setRoundResult(null);
            setHasSubmitted(false);
        });

        return () => newSocket.disconnect();
    }, [roomCode, hasName, studentName]);

    const handleNameSubmit = (e) => {
        e.preventDefault();
        if (studentName.trim()) {
            localStorage.setItem('studentName', studentName.trim());
            setHasName(true);
            setGameState('CONNECTING');
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!messageInput || isNaN(messageInput)) return;
        socket.emit('submit_message', { roomCode, message: Number(messageInput) });
    };

    if (gameState === 'ERROR') {
        return (
            <div className="container" style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
                <div className="card animate-fade-in" style={{ textAlign: 'center' }}>
                    <h2 style={{ color: 'var(--danger)' }}>Error Joining</h2>
                    <p>{error}</p>
                    <button className="btn btn-primary mt-4" onClick={() => navigate('/')}>Back Home</button>
                </div>
            </div>
        );
    }

    if (gameState === 'ENTER_NAME') {
        return (
            <div className="container" style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
                <div className="card animate-fade-in" style={{ textAlign: 'center', maxWidth: '400px', width: '100%' }}>
                    <h2>Enter Your Name</h2>
                    <p>You need a name to join room <strong>{roomCode}</strong></p>
                    <form onSubmit={handleNameSubmit} style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                        <input
                            type="text"
                            placeholder="Your Name"
                            value={studentName}
                            onChange={(e) => setStudentName(e.target.value)}
                            required
                            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--surface-light)', background: 'var(--surface)', color: 'var(--text-color)', width: '100%' }}
                        />
                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Join Game</button>
                    </form>
                </div>
            </div>
        );
    }

    if (gameState === 'CONNECTING') {
        return <div className="container" style={{ textAlign: 'center', marginTop: '4rem' }}><h2>Connecting to {roomCode}...</h2></div>;
    }

    if (gameState === 'LOBBY') {
        return (
            <div className="container" style={{ maxWidth: '600px', marginTop: '2rem' }}>
                <div className="card animate-slide-up" style={{ textAlign: 'center' }}>
                    <h2>Waiting to Start</h2>
                    <p>Room: <strong>{roomCode}</strong></p>
                    <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--surface-light)', borderRadius: '12px' }}>
                        <p>You have joined the room. Please wait for the host to assign roles and start the game.</p>
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
                            <Clock className="animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const roleColor = playerState?.role === 'Truth-Seeker' ? 'var(--primary)' : 'var(--danger)';

    return (
        <div className="container" style={{ maxWidth: '800px', paddingTop: '1rem' }}>
            {/* Header Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <span className="badge badge-blue">Room: {roomCode}</span>
                    <span className="badge" style={{ marginLeft: '0.5rem', background: 'rgba(255,255,255,0.1)' }}>Round {currentRound} of {totalRounds}</span>
                </div>
                <div>
                    <span className="badge" style={{ backgroundColor: roleColor, color: 'white' }}>
                        {playerState?.role === 'Truth-Seeker' ? <UserCheck size={12} style={{ display: 'inline', marginRight: '4px' }} /> : <ShieldAlert size={12} style={{ display: 'inline', marginRight: '4px' }} />}
                        {playerState?.role}
                    </span>
                </div>
            </div>

            {(gameState === 'PLAYING' || gameState === 'ROUND_END') && playerState && (
                <div className="dashboard-grid" style={{ marginBottom: '2rem' }}>
                    {/* Left Column: Role Details & Status */}
                    <div className="card animate-slide-up flex flex-col justify-between">
                        <div>
                            <h3 style={{ borderBottom: '1px solid var(--surface-light)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Your Information</h3>

                            {playerState.role === 'Truth-Seeker' && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <p>Your goal is to guess the true state exactly.</p>
                                    <div className="stat-value text-center">{Math.round(playerState.currentOpinion)}</div>
                                    <p className="text-center" style={{ marginBottom: 0 }}>Current Opinion</p>
                                </div>
                            )}

                            {playerState.role === 'Advocate' && (
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <p>Your goal is to convince Truth-Seekers the state is <strong>{playerState.theta + playerState.bias}</strong>.</p>
                                    <div style={{ display: 'flex', justifyContent: 'space-around', margin: '1rem 0' }}>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{playerState.theta}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>True State</div>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--accent)' }}>{playerState.theta + playerState.bias}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target</div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {gameState === 'PLAYING' && (
                            <div style={{ marginTop: 'auto', background: hasSubmitted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: '8px', border: `1px solid ${hasSubmitted ? 'var(--success)' : 'var(--warning)'}` }}>
                                <p style={{ margin: 0, textAlign: 'center', color: hasSubmitted ? 'var(--success)' : 'var(--warning)', fontWeight: 'bold' }}>
                                    {hasSubmitted ? 'Message Submitted ✓' : 'Awaiting Your Action...'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Interaction */}
                    <div className="card animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        <h3 style={{ borderBottom: '1px solid var(--surface-light)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
                            {gameState === 'PLAYING' ? 'Action Phase' : 'Round Results'}
                        </h3>

                        {gameState === 'PLAYING' && !hasSubmitted && (
                            <form onSubmit={handleSubmit}>
                                <p style={{ marginBottom: '1.5rem' }}>Send a message (number between 1 and 100) to your network neighbors.</p>

                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                                    <div style={{ fontSize: '3rem', fontWeight: 'bold' }}>{messageInput || '--'}</div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="100"
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        style={{ width: '100%', maxWidth: '300px' }}
                                    />
                                </div>

                                <button type="submit" className="btn btn-primary btn-block" disabled={!messageInput}>
                                    <Send size={18} /> Broadcast Message
                                </button>
                            </form>
                        )}

                        {gameState === 'PLAYING' && hasSubmitted && (
                            <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                                <Cpu className="animate-pulse" size={48} style={{ color: 'var(--primary)', marginBottom: '1rem', display: 'inline-block' }} />
                                <p>Waiting for other players to submit...</p>
                            </div>
                        )}

                        {gameState === 'ROUND_END' && roundResult && (
                            <div className="animate-fade-in">
                                <p><strong>Messages Received from Neighbors:</strong></p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                    {roundResult.neighborMessages.length > 0 ? (
                                        roundResult.neighborMessages.map((m, i) => (
                                            <span key={i} className="badge" style={{ background: 'var(--surface-light)', fontSize: '1rem', padding: '0.5rem 1rem' }}>{m}</span>
                                        ))
                                    ) : (
                                        <span className="text-muted">No messages received.</span>
                                    )}
                                </div>

                                {playerState.role === 'Truth-Seeker' && (
                                    <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--primary)', marginBottom: '1rem' }}>
                                        <p style={{ margin: 0 }}>Based on these messages, your opinion auto-updated to:</p>
                                        <h2 style={{ color: 'var(--primary)', margin: '0.5rem 0 0 0' }}>{Math.round(roundResult.newOpinion * 10) / 10}</h2>
                                    </div>
                                )}

                                {playerState.role === 'Advocate' && (
                                    <div>
                                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid var(--primary)', marginBottom: '1rem' }}>
                                            <p style={{ margin: 0 }}>Current Average Truth-Seeker Opinion:</p>
                                            <h2 style={{ color: 'var(--primary)', margin: '0.5rem 0 0 0' }}>{Math.round(roundResult.avgTruthSeekerOpinion * 10) / 10}</h2>
                                        </div>

                                        <p><strong>Other Advocate Messages:</strong></p>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {roundResult.advocateMessages?.map((m, i) => (
                                                <span key={i} className="badge badge-purple" style={{ fontSize: '0.85rem' }}>{m.from}: {m.msg}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                                    <p className="text-muted">Waiting for host to start the next round...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {gameState === 'GAME_END' && (
                <div className="card animate-slide-up" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                    <h1 style={{ color: 'var(--primary)', marginBottom: '2rem' }}>Game Over!</h1>

                    <div style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>
                        The True State (θ) was <strong style={{ color: 'var(--accent)', fontSize: '2rem' }}>{playerState?.thetaFinal}</strong>
                    </div>

                    <div style={{ margin: '2rem 0', background: 'var(--bg-color)', padding: '2rem', borderRadius: '12px', display: 'inline-block', minWidth: '50%' }}>
                        <p style={{ margin: 0 }}>Your Final Score</p>
                        <h1 style={{ fontSize: '4rem', margin: '0.5rem 0', color: roundResult?.score > 50 ? 'var(--success)' : 'var(--warning)' }}>
                            {Math.round(roundResult?.score || 0)}
                        </h1>
                        <p className="text-muted" style={{ margin: 0 }}>out of 100</p>
                    </div>

                    <p style={{ color: 'var(--text-muted)' }}>Check the host screen for global analytics and true dynamics.</p>

                    <button className="btn btn-secondary mt-4" onClick={() => navigate('/')}>Return to Main Menu</button>
                </div>
            )}
        </div>
    );
}

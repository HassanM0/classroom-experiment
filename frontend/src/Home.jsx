import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Presentation } from 'lucide-react';

export default function Home() {
    const [name, setName] = nameHook();
    const [roomCode, setRoomCode] = codeHook();
    const navigate = useNavigate();

    const handleJoin = (e) => {
        e.preventDefault();
        if (name.trim() && roomCode.trim()) {
            localStorage.setItem('studentName', name.trim());
            navigate(`/room/${roomCode.trim().toUpperCase()}`);
        }
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
            <div className="card animate-slide-up" style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
                <div style={{ textAlign: 'center' }}>
                    <h1 style={{ marginBottom: '0.5rem', background: 'linear-gradient(to right, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Strategic Comms</h1>
                    <p>Classroom Experiment Platform</p>
                </div>

                <form onSubmit={handleJoin} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div className="form-group" style={{ marginBottom: '0' }}>
                        <input
                            type="text"
                            placeholder="Your Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: '0' }}>
                        <input
                            type="text"
                            placeholder="Room Code"
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            required
                            maxLength={6}
                            style={{ letterSpacing: '2px', textAlign: 'center', fontWeight: 'bold' }}
                        />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block">
                        <Users size={18} /> Join Game
                    </button>
                </form>

                <div style={{ width: '100%', height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>

                <button
                    onClick={() => navigate('/host')}
                    className="btn btn-secondary btn-block"
                >
                    <Presentation size={18} /> Host Dashboard
                </button>
            </div>
        </div>
    );
}

function nameHook() { return useState(''); }
function codeHook() { return useState(''); }

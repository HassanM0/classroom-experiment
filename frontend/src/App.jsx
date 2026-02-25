import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home';
import HostView from './HostView';
import StudentView from './StudentView';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/host" element={<HostView />} />
          <Route path="/room/:roomCode" element={<StudentView />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

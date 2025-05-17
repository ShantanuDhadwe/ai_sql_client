// client/src/components/Sidebar.js (or client/src/Sidebar.js)
import React from 'react';
import './Sidebar.css'; // We'll create this CSS file

function Sidebar({ threads, currentSessionId, onSelectThread, onNewThread }) {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Dashboard</h2>
        <button onClick={onNewThread} className="new-thread-btn">+ New Thread</button>
      </div>
      <div className="threads-list">
        <h3>Threads ({threads.length})</h3>
        {threads.length === 0 && <p className="no-threads-message">No active threads.</p>}
        <ul>
          {threads.map(thread => (
            <li 
              key={thread.id} 
              className={thread.id === currentSessionId ? 'active-thread' : ''}
              onClick={() => onSelectThread(thread.id)}
            >
              {thread.title || `Session ${thread.id.substring(0, 8)}...`} 
              {/* We'll need to think about how to get a 'title' for threads */}
            </li>
          ))}
        </ul>
      </div>
      {/* Add Learning and Settings sections later */}
    </div>
  );
}
export default Sidebar;
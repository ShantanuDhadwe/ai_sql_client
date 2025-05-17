// client/src/components/MainContent.js (or client/src/MainContent.js)
import React, { useState, useEffect, useRef } from 'react';
import ChartComponent from './ChartComponent'; // Assuming it's in the same folder or src/
import './MainContent.css'; // We'll create this

function MainContent({ 
    messages, 
    currentQuestion, 
    onQuestionChange, 
    onSubmitQuestion, 
    isLoading, 
    error,
    renderDataTable /* Pass renderDataTable function as prop */
}) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="main-content">
      <div className="chat-messages-area-main"> {/* Renamed to avoid conflict if App.css still has old one */}
        {messages.map((msg) => (
          <div key={msg.id} className={`message-bubble ${msg.sender === 'user' ? 'user-message' : 'bot-message'} ${msg.isError ? 'error-bot-message' : ''}`}>
            <div className="message-text">{msg.text}</div>
            {msg.sender === 'bot' && !msg.isError && (
              <div className="bot-message-details">
                {msg.sql && (
                  <details className="sql-details">
                    <summary>View SQL</summary> {/* Changed text */}
                    <pre>{msg.sql}</pre>
                  </details>
                )}
                {msg.tableData && (
                  <div className="data-table-section">
                    <h4>Data Table:</h4>
                    {renderDataTable(msg.tableData)}
                  </div>
                )}
                {msg.tableData && 
                 Array.isArray(msg.tableData) && 
                 msg.tableData.filter(row => typeof row === 'object' && row !== null && !row.status && !row.error).length > 0 && (
                  <div className="chart-section">
                    <h4>Chart:</h4>
                    <ChartComponent 
                      dbResults={msg.tableData} 
                      originalQuestion={msg.originalQuestionForChart}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {error && !isLoading && <div className="error-message-main">App Error: {error}</div>}
      
      <form onSubmit={onSubmitQuestion} className="chat-input-form-main">
        <input
          type="text"
          placeholder="Ask to explore your data..."
          value={currentQuestion}
          onChange={onQuestionChange}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Thinking...' : 'Ask'}
        </button>
      </form>
    </div>
  );
}
export default MainContent;
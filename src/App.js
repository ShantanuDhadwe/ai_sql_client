// client/src/App.js
// This version is for the UI with Sidebar and MainContent
import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css'; // Main App layout styles
import Sidebar from './components/Sidebar'; // Assuming components are in src/components/
import MainContent from './components/MainContent';
// ChartComponent will be imported within MainContent.js

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getThreadTitle(messages) {
  if (!messages || messages.length === 0) return 'New Chat';
  const firstUserMessage = messages.find(msg => msg.sender === 'user');
  const titleText = firstUserMessage ? firstUserMessage.text : (messages[0] ? messages[0].text : 'Chat');
  return titleText.substring(0, 35) + (titleText.length > 35 ? '...' : '');
}

function App() {
  console.log("--- App.js: Multi-Thread UI - App() function EXECUTED ---");

  const [currentSessionId, setCurrentSessionId] = useState(null);
  // Store threads as an object: { sessionId: { messages: [], createdAt: timestamp (for sorting) } }
  const [threads, setThreads] = useState({});
  
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [globalError, setGlobalError] = useState(null);

  // Load threads and active session from localStorage
  useEffect(() => {
    console.log("--- App.js: Initializing session and threads from localStorage ---");
    let storedThreadsData = {};
    try {
      storedThreadsData = JSON.parse(localStorage.getItem('chatThreads')) || {};
    } catch (e) { console.error("Error parsing stored threads:", e); storedThreadsData = {}; }
    setThreads(storedThreadsData);

    let activeId = localStorage.getItem('activeChatSessionId');

    if (activeId && storedThreadsData[activeId]) {
      setCurrentSessionId(activeId);
      console.log("--- App.js: Active session loaded:", activeId);
    } else if (Object.keys(storedThreadsData).length > 0) {
      // If no valid active session, find the most recent thread to set as active
      const sortedThreadIds = Object.keys(storedThreadsData).sort((a, b) =>
        (storedThreadsData[b]?.createdAt || 0) - (storedThreadsData[a]?.createdAt || 0)
      );
      activeId = sortedThreadIds[0];
      setCurrentSessionId(activeId);
      localStorage.setItem('activeChatSessionId', activeId); // Update active session
      console.log("--- App.js: No active session, defaulted to most recent:", activeId);
    } else {
      // No threads exist, create and activate a new one
      console.log("--- App.js: No threads found, creating a new one.");
      const newId = generateUUID();
      const newThreadData = { messages: [], createdAt: Date.now() };
      setThreads({ [newId]: newThreadData }); // Set threads with the new one
      setCurrentSessionId(newId);
      localStorage.setItem('activeChatSessionId', newId);
      localStorage.setItem('chatThreads', JSON.stringify({ [newId]: newThreadData })); // Save new thread
      console.log("--- App.js: Created and set new thread as active:", newId);
    }
  }, []); // Runs once on mount

  // Save threads to localStorage
  useEffect(() => {
    // Only save if threads has been initialized (not the initial {} from useState)
    // and currentSessionId is also set (meaning initialization is complete)
    if (currentSessionId && Object.keys(threads).length > 0) {
        localStorage.setItem('chatThreads', JSON.stringify(threads));
        console.log("--- App.js: Threads saved to localStorage ---");
    } else if (currentSessionId && Object.keys(threads).length === 0 && localStorage.getItem('chatThreads')) {
        // If all threads were deleted, clear from storage
        localStorage.removeItem('chatThreads');
        console.log("--- App.js: All threads deleted, removed from localStorage ---");
    }
  }, [threads, currentSessionId]);

  // Save active session ID
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('activeChatSessionId', currentSessionId);
      console.log("--- App.js: Active session ID saved:", currentSessionId);
    }
  }, [currentSessionId]);

  const handleNewThread = useCallback(() => {
    const newSessionId = generateUUID();
    setThreads(prev => ({
      ...prev,
      [newSessionId]: { messages: [], createdAt: Date.now() } // Add createdAt for sorting
    }));
    setCurrentSessionId(newSessionId);
    setCurrentQuestion('');
    setGlobalError(null);
    console.log("--- App.js: New thread created and selected:", newSessionId);
  }, []);

  const handleSelectThread = useCallback((sessionId) => {
    if (threads[sessionId]) {
      setCurrentSessionId(sessionId);
      setCurrentQuestion(''); // Clear input when switching threads
      setGlobalError(null);
      console.log("--- App.js: Selected thread:", sessionId);
    } else {
      console.warn("--- App.js: Attempted to select non-existent thread:", sessionId, "Creating new one.");
      handleNewThread(); // Fallback to creating a new thread
    }
  }, [threads, handleNewThread]);

  const handleQuestionSubmit = async () => {
    const questionToSubmit = currentQuestion.trim();
    if (!questionToSubmit) { setGlobalError("Please type a question."); return; }
    if (!currentSessionId || !threads[currentSessionId]) {
      setGlobalError("No active session. Click '+ New Thread'.");
      console.error("--- App.js: No currentSessionId or thread for it in handleQuestionSubmit.");
      return;
    }

    const userMessage = { id: Date.now(), sender: 'user', text: questionToSubmit };
    setThreads(prev => {
      const updatedMessages = [...(prev[currentSessionId]?.messages || []), userMessage];
      return { ...prev, [currentSessionId]: { ...prev[currentSessionId], messages: updatedMessages }};
    });
    setCurrentQuestion('');
    setIsLoading(true);
    setGlobalError(null);

    try {
      //const backendUrl = `http://localhost:3002/ask?question=${encodeURIComponent(questionToSubmit)}&sessionId=${encodeURIComponent(currentSessionId)}`;
      const backendUrl = `https://ai-sql-engine-backend.onrender.com/ask?question=${encodeURIComponent(questionToSubmit)}&sessionId=${encodeURIComponent(currentSessionId)}`;
      const response = await fetch(backendUrl);
      const responseData = await response.json();
      console.log("--- App.js: Backend responseData:", responseData);

      if (!response.ok) {
        const errorMsg = responseData.naturalLanguageSummary || responseData.details || responseData.error || `Server error: ${response.status}`;
        throw new Error(errorMsg);
      }
      
      const botMessage = {
        id: Date.now() + 1, sender: 'bot',
        text: responseData.naturalLanguageSummary || "Response received.",
        sql: responseData.generatedSql,
        tableData: responseData.databaseResults,
        originalQuestionForChart: responseData.question 
      };
      setThreads(prev => {
        const updatedMessages = [...(prev[currentSessionId]?.messages || []), botMessage];
        return { ...prev, [currentSessionId]: { ...prev[currentSessionId], messages: updatedMessages }};
      });
    } catch (err) {
      console.error('--- App.js: CAUGHT ERROR during submit:', err);
      setGlobalError(err.message);
      const errorMessage = { id: Date.now() + 1, sender: 'bot', text: `Sorry, an error occurred: ${err.message || "Unknown error."}`, isError: true };
      setThreads(prev => {
        const updatedMessages = [...(prev[currentSessionId]?.messages || []), errorMessage];
        return { ...prev, [currentSessionId]: { ...prev[currentSessionId], messages: updatedMessages }};
      });
    } finally {
      setIsLoading(false);
    }
  };

  const renderDataTable = useCallback((dbResults) => {
    if (!dbResults) return <p>No table data available.</p>;
    if (Array.isArray(dbResults) && dbResults.length === 0) return <p>Query returned no data rows.</p>;
    let dataToTable = dbResults;
    if (typeof dbResults === 'object' && !Array.isArray(dbResults)) {
        if (dbResults.status === 'success' && dbResults.message) return <p>{dbResults.message}</p>;
        if (dbResults.error && dbResults.error.message) return <p>Database error: {dbResults.error.message}</p>;
        if (!dbResults.status && !dbResults.error) dataToTable = [dbResults]; // Wrap single data object
        else return <p>Data not in expected table format (object).</p>;
    }
    if (!Array.isArray(dataToTable) || dataToTable.length === 0 || typeof dataToTable[0] !== 'object' || dataToTable[0] === null) {
        return <p>Data not in expected table format (array).</p>;
    }
    const headers = Object.keys(dataToTable[0]);
    if (headers.length === 0) return <p>Data objects have no properties to display.</p>;
    return (
      <table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead>
      <tbody>{dataToTable.map((r,ri)=><tr key={ri}>{headers.map(h=><td key={`${ri}-${h}`}>{String(r[h]??'')}</td>)}</tr>)}</tbody>
      </table>
    );
  }, []);

  // --- CORRECTED formattedThreadsForSidebar ---
  const formattedThreadsForSidebar = Object.keys(threads)
    .map(sessionId => {
      const threadData = threads[sessionId]; // This is { messages: [], createdAt: timestamp }
      return {
        id: sessionId,
        title: getThreadTitle(threadData?.messages || []), // Pass messages array to get title
        createdAt: threadData?.createdAt || 0 // Use thread's createdAt for sorting
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt); // Sort by createdAt, newest first


  if (!currentSessionId) {
    return <div className="loading-indicator">Initializing session...</div>;
  }

  const currentMessages = threads[currentSessionId]?.messages || [];

  return (
    <div className="app-layout">
      <Sidebar 
        threads={formattedThreadsForSidebar}
        currentSessionId={currentSessionId}
        onSelectThread={handleSelectThread}
        onNewThread={handleNewThread}
      />
      <MainContent
        messages={currentMessages}
        currentQuestion={currentQuestion}
        onQuestionChange={(e) => setCurrentQuestion(e.target.value)}
        onSubmitQuestion={(e) => { e.preventDefault(); if(!isLoading) handleQuestionSubmit(); }}
        isLoading={isLoading}
        error={globalError} // Pass the globalError to MainContent
        renderDataTable={renderDataTable}
        // ChartComponent is used inside MainContent and receives its props there
      />
    </div>
  );
}
export default App;
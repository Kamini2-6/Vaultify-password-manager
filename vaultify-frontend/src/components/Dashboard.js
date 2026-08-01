import React, { useState } from 'react';
import './Dashboard.css';

function Dashboard() {
  const [activeTab, setActiveTab] = useState('Home');

  const renderContent = () => {
    switch (activeTab) {
      case 'Home':
        return <h2>Welcome To Vaultify Dashboard</h2>;
      case 'Password':
        return <h2>Manage Your Passwords Here</h2>;
      case 'Generate':
        return <h2>Password Generator Section</h2>;
      case 'Settings':
        return <h2>Settings</h2>;
      default:
        return null;
    }
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <h1 className="logo">
          <span className="lock-icon">🔒</span> Vaultify
        </h1>
        <ul>
          <li 
            className={activeTab === 'Home' ? 'active' : ''} 
            onClick={() => setActiveTab('Home')}
          >
            Home
          </li>
          <li 
            className={activeTab === 'Password' ? 'active' : ''} 
            onClick={() => setActiveTab('Password')}
          >
            Password
          </li>
          <li 
            className={activeTab === 'Generate' ? 'active' : ''} 
            onClick={() => setActiveTab('Generate')}
          >
            Generate
          </li>
          <li 
            className={activeTab === 'Settings' ? 'active' : ''} 
            onClick={() => setActiveTab('Settings')}
          >
            Settings
          </li>
        </ul>
      </aside>
      <main className="content">
        {renderContent()}
      </main>
    </div>
  );
}

export default Dashboard;

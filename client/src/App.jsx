import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <header>
          <h1>🌎 South America Trip Tracker</h1>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

function Home() {
  return (
    <div className="home">
      <h2>Welcome to Your South America Adventure!</h2>
      <p>Track your journey across Peru, Ecuador, Bolivia, Chile, and Argentina</p>
      <div className="stats">
        <div className="stat-card">
          <h3>43</h3>
          <p>Locations</p>
        </div>
        <div className="stat-card">
          <h3>103</h3>
          <p>Days</p>
        </div>
        <div className="stat-card">
          <h3>5</h3>
          <p>Countries</p>
        </div>
      </div>
    </div>
  )
}

export default App

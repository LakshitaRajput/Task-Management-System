import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from "react-router-dom";
import axios from "axios";
import Dashboard from "./components/Dashboard";
import Projects from "./components/Projects";
import Tasks from "./components/Tasks";
import "./App.css";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("admin@test.com");
  const [password, setPassword] = useState("123456");
  const [name, setName] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("token");
    const savedUser = localStorage.getItem("user");
    if (saved) {
      setToken(saved);
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    }
  }, []);

  const login = async () => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        email,
        password,
      });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setToken(res.data.token);
      setUser(res.data.user);
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err.response?.data?.msg || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const signup = async () => {
    try {
      setLoading(true);
      setError("");
      await axios.post("http://localhost:5000/api/auth/signup", {
        name,
        email,
        password,
      });
      setError("");
      alert("Signup successful! Please login.");
      setIsSignup(false);
      setName("");
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(err.response?.data?.msg || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
  };

  if (!token) {
    return (
      <div className="auth-container">
        <div className="auth-box">
          <h1>Project Management</h1>
          <p>Organize your work efficiently</p>

          {error && <div className="error-message">{error}</div>}

          {isSignup ? (
            <>
              <h2>Create Account</h2>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button onClick={signup} disabled={loading} className="btn-primary">
                {loading ? "Creating..." : "Sign Up"}
              </button>
              <p>
                Already have an account?{" "}
                <button
                  onClick={() => setIsSignup(false)}
                  className="link-btn"
                >
                  Login
                </button>
              </p>
            </>
          ) : (
            <>
              <h2>Login</h2>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <button onClick={login} disabled={loading} className="btn-primary">
                {loading ? "Logging in..." : "Login"}
              </button>
              <p>
                Don't have an account?{" "}
                <button
                  onClick={() => setIsSignup(true)}
                  className="link-btn"
                >
                  Sign Up
                </button>
              </p>
            </>
          )}

          <div className="demo-notice">
            <p>Demo credentials:</p>
            <p>Email: admin@test.com</p>
            <p>Password: 123456</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container">
        <nav className="navbar">
          <div className="nav-brand">
            <h2>Project Manager</h2>
          </div>
          <ul className="nav-links">
            <li>
              <Link to="/">Dashboard</Link>
            </li>
            <li>
              <Link to="/projects">Projects</Link>
            </li>
            <li>
              <Link to="/tasks">Tasks</Link>
            </li>
          </ul>
          <div className="nav-user">
            <span className="user-name">{user?.name}</span>
            <span className="user-role">{user?.role}</span>
            <button onClick={logout} className="btn-logout">
              Logout
            </button>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
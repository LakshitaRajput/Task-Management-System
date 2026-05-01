import { useState, useEffect } from 'react';
import * as api from '../api';
import '../styles/Dashboard.css';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashRes, tasksRes] = await Promise.all([
        api.getDashboard(),
        api.getTasks()
      ]);
      setStats(dashRes.data);
      setTasks(tasksRes.data);
      setError('');
    } catch (err) {
      setError('Failed to load dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const recentTasks = tasks.slice(0, 5);
  const overdueTasks = tasks.filter(
    t => t.status !== 'Done' && new Date(t.dueDate) < new Date()
  ).slice(0, 3);

  return (
    <div className="dashboard-container">
      <h1>Dashboard</h1>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <p>Loading dashboard...</p>
      ) : stats ? (
        <>
          <div className="stats-grid">
            <div className="stat-card total">
              <div className="stat-content">
                <h3>{stats.totalTasks}</h3>
                <p>Total Tasks</p>
              </div>
            </div>

            <div className="stat-card done">
              <div className="stat-content">
                <h3>{stats.completedTasks}</h3>
                <p>Completed</p>
              </div>
            </div>

            <div className="stat-card in-progress">
              <div className="stat-content">
                <h3>{stats.inProgressTasks}</h3>
                <p>In Progress</p>
              </div>
            </div>

            <div className="stat-card todo">
              <div className="stat-content">
                <h3>{stats.todoTasks}</h3>
                <p>To Do</p>
              </div>
            </div>

            <div className="stat-card overdue">
              <div className="stat-content">
                <h3>{stats.overdueTasks}</h3>
                <p>Overdue</p>
              </div>
            </div>
          </div>

          <div className="dashboard-sections">
            {overdueTasks.length > 0 && (
              <div className="section">
                <h2>Overdue Tasks</h2>
                <div className="task-list">
                  {overdueTasks.map((task) => (
                    <div key={task._id} className="task-item overdue">
                      <span className="task-title">{task.title}</span>
                      <span className="task-project">{task.project?.name}</span>
                      <span className="task-status">{task.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="section">
              <h2>Recent Tasks</h2>
              {recentTasks.length === 0 ? (
                <p className="empty-message">No tasks yet</p>
              ) : (
                <div className="task-list">
                  {recentTasks.map((task) => (
                    <div key={task._id} className={`task-item status-${task.status.toLowerCase().replace(' ', '-')}`}>
                      <span className="task-title">{task.title}</span>
                      <span className="task-project">{task.project?.name}</span>
                      <span className={`task-status status-${task.status.toLowerCase().replace(' ', '-')}`}>
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button onClick={fetchDashboardData} className="btn-secondary">
            Refresh Dashboard
          </button>
        </>
      ) : null}
    </div>
  );
}

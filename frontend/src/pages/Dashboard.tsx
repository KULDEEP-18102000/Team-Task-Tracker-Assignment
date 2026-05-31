import { useEffect, useState } from 'react';
import api from '../api/axios';
import { LogOut, Plus, Edit2 } from 'lucide-react';
import CreateTaskModal from '../components/CreateTaskModal';
import EditTaskModal from '../components/EditTaskModal';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  dueDate: string;
  assignee: { name: string };
}

export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  let user;
  try {
    user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user || !user.id) throw new Error('Invalid user object');
  } catch {
    localStorage.clear();
    user = {};
    window.location.reload();
  }

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    onLogout();
  };

  const columns = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'];

  return (
    <div className="container animate-fade-in">
      <header className="flex items-center justify-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Task Board</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome back, {user.name} ({user.role})</p>
        </div>
        
        <div className="flex gap-4">
          <button className="primary flex items-center gap-2" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> New Task
          </button>
          <button className="danger flex items-center gap-2" onClick={handleLogout}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </header>

      <div className="kanban-board">
        {columns.map(status => (
          <div key={status} className="kanban-column">
            <div className="kanban-column-header">
              {status.replace('_', ' ')}
              <span style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '10px' }}>
                {tasks.filter(t => t.status === status).length}
              </span>
            </div>
            
            <div className="flex flex-col">
              {tasks.filter(t => t.status === status).map(task => (
                <div key={task.id} className="task-card">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`task-badge badge-${(task.priority || 'low').toLowerCase()}`}>
                      {task.priority}
                    </span>
                    <div className="flex gap-2 items-center">
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                      <button 
                        onClick={() => setEditingTask(task)}
                        style={{ padding: '0.2rem', background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
                        title="Edit Task"
                      >
                        <Edit2 size={14} />
                      </button>
                    </div>
                  </div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.25rem' }}>{task.title}</h3>
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    {task.description || 'No description provided.'}
                  </p>
                  <div className="flex items-center gap-2 mt-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {task.assignee?.name?.charAt(0) || '?'}
                    </div>
                    <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                      {task.assignee?.name || 'Unassigned'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <CreateTaskModal onClose={() => setIsModalOpen(false)} onCreated={fetchTasks} />
      )}

      {editingTask && (
        <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} onUpdated={fetchTasks} />
      )}
    </div>
  );
}

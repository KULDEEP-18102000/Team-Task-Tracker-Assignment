import { useState } from 'react';
import api from '../api/axios';
import { X } from 'lucide-react';

export default function CreateTaskModal({ onClose, onCreated }: { onClose: () => void, onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Default assignee to self to keep MVP simple since there's no GET /users endpoint
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/tasks', {
        title,
        description,
        priority,
        dueDate: new Date(dueDate).toISOString(),
        assigneeId: user.id
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="flex justify-between items-center mb-6">
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Create New Task</h2>
          <button onClick={onClose} style={{ background: 'transparent', padding: '0.5rem' }}>
            <X size={20} color="var(--text-secondary)" />
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>Title</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Fix login bug" />
          </div>
          
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Add details..." />
          </div>

          <div className="flex gap-4">
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>
            
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.25rem', display: 'block' }}>Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} required />
            </div>
          </div>

          <button type="submit" className="primary" disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? 'Creating...' : 'Create Task'}
          </button>
        </form>
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { User, Users, Edit, Plus, Search } from 'lucide-react';

const API_BASE = 'http://localhost:5272';  // Ocelot Gateway

function App() {
  const [activeTab, setActiveTab] = useState('view');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ username: '', email: '', bio: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load users on mount or view tab
  useEffect(() => {
    if (activeTab === 'view') {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/users`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);  // Backend returns full objects: id, username, email, name, bio, followers, following
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        userId: Date.now(),  // Backend generates if needed
        name: formData.username,  // Map UI username to backend name
        username: formData.username,
        email: formData.email,
        bio: formData.bio
      };
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to create user');
      const newUser = await response.json();
      setUsers([...users, newUser]);
      setFormData({ username: '', email: '', bio: '' });
      setActiveTab('view');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: formData.username,
        username: formData.username,
        bio: formData.bio
      };
      const response = await fetch(`${API_BASE}/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Failed to update user');
      const updatedUser = await response.json();
      setUsers(users.map(u => u.id === selectedUser.id ? updatedUser : u));
      setSelectedUser(null);
      setFormData({ username: '', email: '', bio: '' });
      setActiveTab('view');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      email: user.email || '',
      bio: user.bio || ''
    });
    setActiveTab('edit');
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div style={{ textAlign: 'center', padding: '2rem' }}>Loading users...</div>;
  if (error) return <div style={{ textAlign: 'center', padding: '2rem', color: 'red' }}>Error: {error}</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '1.5rem' }}>
        {/* Header */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '0.5rem', 
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <User style={{ width: '2rem', height: '2rem', color: '#9333ea' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>User Management</h1>
          </div>
          <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>Manage users for your Instagram-like application</p>
        </div>

        {/* Tabs */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
            <button
              onClick={() => setActiveTab('view')}
              style={{
                flex: 1,
                padding: '1rem 1.5rem',
                fontWeight: '500',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: activeTab === 'view' ? '#9333ea' : '#6b7280',
                borderBottom: activeTab === 'view' ? '2px solid #9333ea' : 'none',
                transition: 'color 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Users style={{ width: '1.25rem', height: '1.25rem' }} />
                View Users
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('create');
                setFormData({ username: '', email: '', bio: '' });
                setSelectedUser(null);
              }}
              style={{
                flex: 1,
                padding: '1rem 1.5rem',
                fontWeight: '500',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: activeTab === 'create' ? '#9333ea' : '#6b7280',
                borderBottom: activeTab === 'create' ? '2px solid #9333ea' : 'none',
                transition: 'color 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Plus style={{ width: '1.25rem', height: '1.25rem' }} />
                Create User
              </div>
            </button>
            {activeTab === 'edit' && (
              <button
                style={{
                  flex: 1,
                  padding: '1rem 1.5rem',
                  fontWeight: '500',
                  border: 'none',
                  background: 'none',
                  color: '#9333ea',
                  borderBottom: '2px solid #9333ea'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <Edit style={{ width: '1.25rem', height: '1.25rem' }} />
                  Edit User
                </div>
              </button>
            )}
          </div>

          <div style={{ padding: '1.5rem' }}>
            {/* View Users Tab */}
            {activeTab === 'view' && (
              <div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ position: 'relative' }}>
                    <Search style={{ 
                      position: 'absolute', 
                      left: '0.75rem', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: '#9ca3af',
                      width: '1.25rem',
                      height: '1.25rem'
                    }} />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      style={{
                        width: '100%',
                        paddingLeft: '2.5rem',
                        paddingRight: '1rem',
                        paddingTop: '0.5rem',
                        paddingBottom: '0.5rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '0.5rem',
                        fontSize: '1rem',
                        outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = '#9333ea'}
                      onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '0.5rem',
                        padding: '1rem',
                        transition: 'border-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#d8b4fe'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <div style={{
                              width: '2.5rem',
                              height: '2.5rem',
                              background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 'bold'
                            }}>
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 style={{ fontWeight: '600', color: '#111827' }}>@{user.username}</h3>
                              <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>{user.email}</p>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.875rem' }}>
                            <div>
                              <span style={{ fontWeight: '600', color: '#111827' }}>{user.followers}</span>
                              <span style={{ color: '#6b7280', marginLeft: '0.25rem' }}>followers</span>
                            </div>
                            <div>
                              <span style={{ fontWeight: '600', color: '#111827' }}>{user.following}</span>
                              <span style={{ color: '#6b7280', marginLeft: '0.25rem' }}>following</span>
                            </div>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => startEdit(user)}
                          style={{
                            color: '#9333ea',
                            padding: '0.5rem',
                            borderRadius: '0.5rem',
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.target.style.backgroundColor = '#faf5ff'}
                          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                        >
                          <Edit style={{ width: '1.25rem', height: '1.25rem' }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {filteredUsers.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: '#6b7280' }}>
                    No users found
                  </div>
                )}
              </div>
            )}

            {/* Create User Tab */}
            {activeTab === 'create' && (
              <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    placeholder="Enter username"
                    onFocus={(e) => e.target.style.borderColor = '#9333ea'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    placeholder="Enter email"
                    onFocus={(e) => e.target.style.borderColor = '#9333ea'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Bio (optional)
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                    rows="3"
                    placeholder="Tell us about yourself"
                    onFocus={(e) => e.target.style.borderColor = '#9333ea'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    width: '100%',
                    backgroundColor: '#9333ea',
                    color: 'white',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#7e22ce'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#9333ea'}
                >
                  Create User
                </button>
              </form>
            )}

            {/* Edit User Tab */}
            {activeTab === 'edit' && selectedUser && (
              <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#9333ea'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#9333ea'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.5rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      outline: 'none',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                    rows="3"
                    onFocus={(e) => e.target.style.borderColor = '#9333ea'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      backgroundColor: '#9333ea',
                      color: 'white',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      fontWeight: '500',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#7e22ce'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#9333ea'}
                  >
                    Update User
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('view');
                      setSelectedUser(null);
                      setFormData({ username: '', email: '', bio: '' });
                    }}
                    style={{
                      flex: 1,
                      backgroundColor: '#e5e7eb',
                      color: '#374151',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      fontWeight: '500',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#d1d5db'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Info Footer */}
        <div style={{
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '0.5rem',
          padding: '1rem',
          fontSize: '0.875rem',
          color: '#1e40af'
        }}>
          <p style={{ fontWeight: '500', marginBottom: '0.25rem' }}>🔗 Connected to Ocelot API Gateway</p>
          <p style={{ color: '#2563eb' }}>Using Neo4j database | Microservice Architecture | Post Service coming soon</p>
        </div>
      </div>
    </div>
  );
}

export default App;
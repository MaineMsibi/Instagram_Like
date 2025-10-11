import { useState, useEffect } from 'react';
import { User, Users, Edit, Plus, Search, Eye, LogOut } from 'lucide-react';

const API_BASE = 'http://localhost:5272';  // Ocelot Gateway

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState(null);
  const [createUserPassword, setCreateUserPassword] = useState('');

  const [activeTab, setActiveTab] = useState('view');
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ username: '', email: '', bio: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [activeSubTab, setActiveSubTab] = useState('followers');
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [followingMap, setFollowingMap] = useState({});

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError(null);
    
    if (!loginForm.username.trim()) {
      setLoginError('Username is required');
      return;
    }

    if (!loginForm.password.trim()) {
      setLoginError('Password is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/users`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const allUsers = await response.json();
      
      const user = allUsers.find(u => 
        u.username.toLowerCase() === loginForm.username.toLowerCase() && 
        u.password === loginForm.password
      );
      
      if (user) {
        setCurrentUser(user);
        setIsLoggedIn(true);
        setLoginForm({ username: '', password: '' });
        fetchFollowingForUser(user.id);
      } else {
        setLoginError('Invalid username or password');
      }
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setLoginForm({ username: '', password: '' });
    setFollowingMap({});
    setActiveTab('view');
  };

  // Fetch who the current user is following
  const fetchFollowingForUser = async (userId) => {
    try {
      const response = await fetch(`${API_BASE}/users/${userId}/following`);
      if (!response.ok) return;
      const data = await response.json();
      const map = {};
      data.forEach(u => map[u.id] = true);
      setFollowingMap(map);
    } catch (err) {
      console.error('Error fetching following:', err);
    }
  };

  // Follow a user
  const handleFollow = async (userId) => {
    if (!currentUser) return;
    
    try {
      const response = await fetch(`${API_BASE}/users/${currentUser.id}/follow/${userId}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to follow user');
      
      setFollowingMap({ ...followingMap, [userId]: true });
      // Update the users list to reflect the new following count
      fetchUsers();
      if (selectedUser) {
        fetchFollowers(selectedUser.id);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Unfollow a user
  const handleUnfollow = async (userId) => {
    if (!currentUser) return;
    
    try {
      const response = await fetch(`${API_BASE}/users/${currentUser.id}/unfollow/${userId}`, {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Failed to unfollow user');
      
      const newMap = { ...followingMap };
      delete newMap[userId];
      setFollowingMap(newMap);
      // Update the users list to reflect the new following count
      fetchUsers();
      if (selectedUser) {
        fetchFollowers(selectedUser.id);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Load users on mount or view tab
  useEffect(() => {
    if (activeTab === 'view' && isLoggedIn) {
      fetchUsers();
    }
  }, [activeTab, isLoggedIn]);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/users`);
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowers = async (userId) => {
    setDetailsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/users/${userId}/followers`);
      if (!response.ok) throw new Error('Failed to fetch followers');
      const data = await response.json();
      setFollowers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  const fetchFollowing = async (userId) => {
    setDetailsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/users/${userId}/following`);
      if (!response.ok) throw new Error('Failed to fetch following');
      const data = await response.json();
      setFollowing(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'details' && selectedUser) {
      fetchFollowers(selectedUser.id);
      fetchFollowing(selectedUser.id);
    }
  }, [activeTab]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: formData.username,
        username: formData.username,
        email: formData.email,
        password: createUserPassword,
        bio: formData.bio
      };
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create user: ${errorText}`);
      }
      const newUser = await response.json();
      setUsers([...users, newUser]);
      setFormData({ username: '', email: '', bio: '' });
      setCreateUserPassword('');
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
        email: formData.email,
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

  const startDetails = (user) => {
    setSelectedUser(user);
    setActiveTab('details');
  };

  const filteredUsers = users.filter(u => 
    u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderUserList = (userList, title) => (
    <div>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>{title}</h3>
      {userList.length === 0 ? (
        <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No {title.toLowerCase()} yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
          {userList.map((u) => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem', borderRadius: '0.375rem', backgroundColor: '#f9fafb' }}>
              <div style={{ width: '2rem', height: '2rem', background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.875rem', fontWeight: 'bold' }}>
                {u.username.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontWeight: '500', color: '#111827' }}>@{u.username}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Login screen
  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '28rem', width: '100%', margin: '0 auto', padding: '1.5rem' }}>
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '0.5rem', 
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            padding: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', justifyContent: 'center' }}>
              <User style={{ width: '2rem', height: '2rem', color: '#9333ea' }} />
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>Login</h1>
            </div>

            {loginError && (
              <div style={{
                backgroundColor: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '0.5rem',
                padding: '1rem',
                marginBottom: '1.5rem',
                color: '#991b1b',
                fontSize: '0.875rem'
              }}>
                <strong>Error:</strong> {loginError}
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={loginForm.username}
                  onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                  placeholder="Enter your username"
                  onFocus={(e) => e.target.style.borderColor = '#9333ea'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem' }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                  placeholder="Enter your password"
                  onFocus={(e) => e.target.style.borderColor = '#9333ea'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  backgroundColor: '#9333ea',
                  color: 'white',
                  padding: '0.75rem',
                  borderRadius: '0.5rem',
                  fontWeight: '500',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1,
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#7e22ce')}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#9333ea'}
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>

            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '1rem', textAlign: 'center' }}>
              Demo: Try logging in with any existing username in the system
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <div style={{ maxWidth: '64rem', margin: '0 auto', padding: '1.5rem' }}>
        {/* Header */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '0.5rem', 
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <User style={{ width: '2rem', height: '2rem', color: '#9333ea' }} />
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#111827' }}>User Management</h1>
              <p style={{ fontSize: '0.875rem', color: '#6b7280', margin: 0 }}>Logged in as <strong>@{currentUser.username}</strong></p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              fontWeight: '500',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#fecaca'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#fee2e2'}
          >
            <LogOut style={{ width: '1.25rem', height: '1.25rem' }} />
            Logout
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1.5rem',
            color: '#991b1b'
          }}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            Loading...
          </div>
        )}

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
            {activeTab === 'details' && selectedUser && (
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
                  <Eye style={{ width: '1.25rem', height: '1.25rem' }} />
                  User Details
                </div>
              </button>
            )}
          </div>

          <div style={{ padding: '1.5rem' }}>
            {/* View Users Tab */}
            {activeTab === 'view' && !loading && (
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
                          
                          {user.bio && (
                            <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.5rem' }}>
                              {user.bio}
                            </p>
                          )}
                          
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
                        
                        <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                          {currentUser.id !== user.id && (
                            <button
                              onClick={() => followingMap[user.id] ? handleUnfollow(user.id) : handleFollow(user.id)}
                              style={{
                                backgroundColor: followingMap[user.id] ? '#ec4899' : '#9333ea',
                                color: 'white',
                                padding: '0.5rem 1rem',
                                borderRadius: '0.5rem',
                                fontWeight: '500',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s',
                                fontSize: '0.875rem'
                              }}
                              onMouseEnter={(e) => e.target.style.backgroundColor = followingMap[user.id] ? '#be185d' : '#7e22ce'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = followingMap[user.id] ? '#ec4899' : '#9333ea'}
                            >
                              {followingMap[user.id] ? 'Unfollow' : 'Follow'}
                            </button>
                          )}
                          <button
                            onClick={() => startDetails(user)}
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
                            <Eye style={{ width: '1.25rem', height: '1.25rem' }} />
                          </button>
                          {currentUser.id === user.id && (
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
                          )}
                        </div>
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

            {/* User Details Tab */}
            {activeTab === 'details' && selectedUser && !detailsLoading && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '3rem',
                    height: '3rem',
                    background: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1.125rem'
                  }}>
                    {selectedUser.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 style={{ fontWeight: '600', color: '#111827' }}>@{selectedUser.username}</h2>
                    <p style={{ color: '#6b7280' }}>{selectedUser.email}</p>
                  </div>
                </div>
                {selectedUser.bio && (
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '1.5rem' }}>
                    {selectedUser.bio}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', fontSize: '0.875rem' }}>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontWeight: '600', color: '#111827', display: 'block' }}>{selectedUser.followers}</span>
                    <span style={{ color: '#6b7280' }}>followers</span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontWeight: '600', color: '#111827', display: 'block' }}>{selectedUser.following}</span>
                    <span style={{ color: '#6b7280' }}>following</span>
                  </div>
                </div>
                <div style={{ borderBottom: '1px solid #e5e7eb', marginBottom: '1rem' }}>
                  <button
                    onClick={() => setActiveSubTab('followers')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      fontWeight: '500',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: activeSubTab === 'followers' ? '#9333ea' : '#6b7280',
                      borderBottom: activeSubTab === 'followers' ? '2px solid #9333ea' : 'none',
                      transition: 'color 0.2s'
                    }}
                  >
                    Followers
                  </button>
                  <button
                    onClick={() => setActiveSubTab('following')}
                    style={{
                      padding: '0.75rem 1.5rem',
                      fontWeight: '500',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer',
                      color: activeSubTab === 'following' ? '#9333ea' : '#6b7280',
                      borderBottom: activeSubTab === 'following' ? '2px solid #9333ea' : 'none',
                      transition: 'color 0.2s'
                    }}
                  >
                    Following
                  </button>
                </div>
                {activeSubTab === 'followers' && renderUserList(followers, `${selectedUser.followers} Followers`)}
                {activeSubTab === 'following' && renderUserList(following, `${selectedUser.following} Following`)}
                <button
                  onClick={() => setActiveTab('view')}
                  style={{
                    marginTop: '1.5rem',
                    backgroundColor: '#e5e7eb',
                    color: '#374151',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '0.5rem',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#d1d5db'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#e5e7eb'}
                >
                  Back to Users
                </button>
              </div>
            )}

            {/* Create User Tab */}
            {activeTab === 'create' && !loading && (
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
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={createUserPassword}
                    onChange={(e) => setCreateUserPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem 1rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    placeholder="Enter password"
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
                  disabled={loading}
                  style={{
                    width: '100%',
                    backgroundColor: '#9333ea',
                    color: 'white',
                    padding: '0.75rem',
                    borderRadius: '0.5rem',
                    fontWeight: '500',
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1,
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#7e22ce')}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#9333ea'}
                >
                  {loading ? 'Creating...' : 'Create User'}
                </button>
              </form>
            )}

            {/* Edit User Tab */}
            {activeTab === 'edit' && selectedUser && !loading && (
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
                    disabled={loading}
                    style={{
                      flex: 1,
                      backgroundColor: '#9333ea',
                      color: 'white',
                      padding: '0.75rem',
                      borderRadius: '0.5rem',
                      fontWeight: '500',
                      border: 'none',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = '#7e22ce')}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#9333ea'}
                  >
                    {loading ? 'Updating...' : 'Update User'}
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
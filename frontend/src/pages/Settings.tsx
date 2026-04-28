import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { mockUsers, rolePermissions } from '../lib/mockData';
import { Users, Shield, Plus, Edit, Trash2, Key, Lock } from 'lucide-react';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [showAddUser, setShowAddUser] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);

  const allPermissions = [
    'dashboard', 'pos', 'prescriptions', 'wholesale', 'inventory',
    'suppliers', 'customers', 'finance', 'reports', 'branches',
    'settings', 'my_sales'
  ];

  if (user?.role !== 'admin') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
            <p className="text-gray-500 mt-2">Only admins can access settings.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-500 mt-1">Manage users and role permissions</p>
        </div>

        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${activeTab === 'users' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            <Users className="w-4 h-4" />Users
          </button>
          <button onClick={() => setActiveTab('roles')} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${activeTab === 'roles' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            <Shield className="w-4 h-4" />Roles
          </button>
        </div>

        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setShowAddUser(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium flex items-center gap-2">
                <Plus className="w-5 h-5" />Add User
              </button>
            </div>

            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {mockUsers.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">{u.username.charAt(0).toUpperCase()}</span>
                          </div>
                          <div>
                            <p className="font-medium">{u.username}</p>
                            <p className="text-sm text-gray-500">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700 capitalize">{u.role}</span></td>
                      <td className="px-4 py-3 text-gray-500">{u.branch}</td>
                      <td className="px-4 py-3"><span className="text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-700">Active</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Key className="w-4 h-4" /></button>
                          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"><Edit className="w-4 h-4" /></button>
                          <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'roles' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rolePermissions.map(role => (
                <div key={role.role} className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <Shield className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 capitalize">{role.label}</h3>
                      </div>
                    </div>
                    <button onClick={() => setEditingRole(role.role)} className="text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1">
                      <Edit className="w-4 h-4" />Edit
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 mb-4">{role.description}</p>
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">Access:</p>
                    <div className="flex flex-wrap gap-1">
                      {role.menuItems.map(item => (
                        <span key={item} className="text-xs bg-gray-100 px-2 py-1 rounded capitalize">{item}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showAddUser && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-4 border-b"><h2 className="font-semibold">Add User</h2></div>
              <div className="p-4 space-y-3">
                <input type="text" placeholder="Username" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl" />
                <input type="email" placeholder="Email" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl" />
                <input type="password" placeholder="Password" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl" />
                <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl">
                  <option value="">Select Role</option>
                  {rolePermissions.map(r => <option key={r.role} value={r.role}>{r.label}</option>)}
                </select>
                <select className="w-full px-3 py-2.5 border border-gray-200 rounded-xl">
                  <option value="">Select Branch</option>
                  <option>Main Branch</option>
                  <option>All Branches</option>
                </select>
              </div>
              <div className="p-4 border-t flex gap-3">
                <button onClick={() => setShowAddUser(false)} className="flex-1 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
                <button onClick={() => setShowAddUser(false)} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700">Save</button>
              </div>
            </div>
          </div>
        )}

        {editingRole && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold capitalize">Edit {rolePermissions.find(r => r.role === editingRole)?.label} Permissions</h2>
                <button onClick={() => setEditingRole(null)} className="text-gray-400 hover:text-gray-600"><Trash2 className="w-5 h-5" /></button>
              </div>
              <div className="p-4 space-y-3">
                <p className="text-sm text-gray-600 mb-4">Select which menu items this role can access:</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {allPermissions.map(perm => (
                    <label key={perm} className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input type="checkbox" defaultChecked={rolePermissions.find(r => r.role === editingRole)?.menuItems.includes(perm)} className="w-4 h-4 rounded text-blue-600" />
                      <span className="text-sm capitalize">{perm.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="p-4 border-t flex gap-3">
                <button onClick={() => setEditingRole(null)} className="flex-1 py-2.5 border border-gray-200 rounded-xl hover:bg-gray-50">Cancel</button>
                <button onClick={() => setEditingRole(null)} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700">Save Changes</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default SettingsPage;
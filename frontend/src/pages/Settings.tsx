import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { mockUsers, rolePermissions } from '../lib/mockData';
import { PageHeader, Tabs, Chip, Th, Td, Modal, Avatar } from '../components/ui';
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

  const roleTones: Record<string, 'lime' | 'sky' | 'sun' | 'lav' | 'mint'> = {
    admin: 'lime',
    pharmacist: 'sky',
    cashier: 'sun',
    inventory: 'lav',
    wholesale: 'mint',
  };

  if (user?.role !== 'admin') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="card-dark p-10 text-center max-w-sm">
            <div className="w-16 h-16 bg-lime rounded-3xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-ink" />
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Access Denied</h2>
            <p className="text-white/50 mt-2 text-sm">Only admins can access settings.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader title="Settings" subtitle="Manage users and role permissions" />

        <Tabs
          tabs={[
            { id: 'users', label: 'Users', icon: Users },
            { id: 'roles', label: 'Roles', icon: Shield },
          ]}
          active={activeTab}
          onChange={(id) => setActiveTab(id as typeof activeTab)}
        />

        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setShowAddUser(true)} className="btn btn-dark">
                <Plus className="w-5 h-5" />Add User
              </button>
            </div>

            <div className="card overflow-hidden">
              <table className="w-full">
                <thead className="bg-cream-soft border-b border-line">
                  <tr>
                    <Th>User</Th>
                    <Th>Role</Th>
                    <Th>Branch</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Actions</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cream-deep/70">
                  {mockUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-cream-soft">
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.username} tone={roleTones[u.role] || 'lime'} size="sm" />
                          <div>
                            <p className="font-bold text-ink capitalize">{u.username}</p>
                            <p className="text-xs text-stone-400">{u.email}</p>
                          </div>
                        </div>
                      </Td>
                      <Td><Chip tone={roleTones[u.role] || 'neutral'}>{u.role}</Chip></Td>
                      <Td className="text-stone-500">{u.branch}</Td>
                      <Td><Chip tone="mint">Active</Chip></Td>
                      <Td>
                        <div className="flex items-center justify-end gap-1">
                          <button className="p-2 text-stone-400 hover:text-ink hover:bg-lime-soft rounded-full"><Key className="w-4 h-4" /></button>
                          <button className="p-2 text-stone-400 hover:text-ink hover:bg-cream-deep rounded-full"><Edit className="w-4 h-4" /></button>
                          <button className="p-2 text-stone-400 hover:text-[#a34141] hover:bg-blush-soft rounded-full"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'roles' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rolePermissions.map((role) => (
              <div key={role.role} className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                      role.role === 'admin' ? 'bg-lime-soft text-[#5c6b12]' :
                      role.role === 'pharmacist' ? 'bg-sky-soft text-[#3d5a94]' :
                      role.role === 'cashier' ? 'bg-sun-soft text-[#8a6d10]' :
                      role.role === 'inventory' ? 'bg-lav-soft text-[#5d4394]' :
                      'bg-mint-soft text-[#2f6b46]'
                    }`}>
                      <Shield className="w-5 h-5" />
                    </div>
                    <h3 className="font-extrabold tracking-tight text-ink">{role.label}</h3>
                  </div>
                  <button onClick={() => setEditingRole(role.role)} className="text-sm font-bold text-ink underline decoration-lime decoration-2 underline-offset-4 flex items-center gap-1">
                    <Edit className="w-3.5 h-3.5" />Edit
                  </button>
                </div>
                <p className="text-sm text-stone-400 mb-4">{role.description}</p>
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 mb-2">Access</p>
                <div className="flex flex-wrap gap-1.5">
                  {role.menuItems.map((item) => (
                    <Chip key={item} tone="neutral">{item.replace('_', ' ')}</Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add user modal */}
        <Modal
          open={showAddUser}
          onClose={() => setShowAddUser(false)}
          title="Add User"
          footer={
            <>
              <button onClick={() => setShowAddUser(false)} className="btn btn-ghost flex-1">Cancel</button>
              <button onClick={() => setShowAddUser(false)} className="btn btn-dark flex-1">Save</button>
            </>
          }
        >
          <input type="text" placeholder="Username" className="input" />
          <input type="email" placeholder="Email" className="input" />
          <input type="password" placeholder="Password" className="input" />
          <select className="input">
            <option value="">Select Role</option>
            {rolePermissions.map((r) => <option key={r.role} value={r.role}>{r.label}</option>)}
          </select>
          <select className="input">
            <option value="">Select Branch</option>
            <option>Main Branch</option>
            <option>All Branches</option>
          </select>
        </Modal>

        {/* Edit role modal */}
        <Modal
          open={!!editingRole}
          onClose={() => setEditingRole(null)}
          title={`Edit ${rolePermissions.find((r) => r.role === editingRole)?.label} permissions`}
          maxWidth="max-w-lg"
          footer={
            <>
              <button onClick={() => setEditingRole(null)} className="btn btn-ghost flex-1">Cancel</button>
              <button onClick={() => setEditingRole(null)} className="btn btn-dark flex-1">Save Changes</button>
            </>
          }
        >
          <p className="text-sm text-stone-400 -mt-1">Select which menu items this role can access:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {allPermissions.map((perm) => (
              <label key={perm} className="flex items-center gap-2 p-2.5 border border-line rounded-2xl cursor-pointer hover:border-lime hover:bg-lime-soft/30">
                <input
                  type="checkbox"
                  defaultChecked={rolePermissions.find((r) => r.role === editingRole)?.menuItems.includes(perm)}
                  className="w-4 h-4 rounded accent-[#1d1d18]"
                />
                <span className="text-sm font-medium capitalize text-ink">{perm.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default SettingsPage;

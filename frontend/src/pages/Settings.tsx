import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../lib/AuthContext';
import { apiGet, apiPost, apiPatch } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { dateStr, errMsg } from '../lib/format';
import { PageHeader, Tabs, Chip, Modal, Btn, Th, Td, Avatar } from '../components/ui';
import { Users, Plus, KeyRound, Copy, Check, Building2 } from 'lucide-react';
import type { TenantUser, Invite } from '../lib/types';
import { roleLabels } from '../lib/roles';
import { canManageUsers } from '../lib/roles';

const roleTones: Record<string, 'lime' | 'sky' | 'sun' | 'lav' | 'mint' | 'blush'> = {
  OWNER: 'lime', ADMIN: 'sky', BRANCH_MANAGER: 'sun', PHARMACIST: 'mint',
  CASHIER: 'neutral' as never, INVENTORY_MANAGER: 'lav', WHOLESALE_MANAGER: 'mint', ACCOUNTANT: 'sky',
};

const Settings: React.FC = () => {
  const { session, changePassword } = useAuth();
  const [tab, setTab] = useState('users');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const allowed = canManageUsers(session?.user.role || 'CASHIER');

  const { data: users, reload: reloadUsers } = useApi<TenantUser[]>(() => apiGet('/users'), [tab]);
  const { data: invites, reload: reloadInvites } = useApi<Invite[]>(() => apiGet('/users/invites'), [tab]);
  const { data: tenantInfo } = useApi<{ name: string; phone: string; address: string; settings: Record<string, unknown> }>(() => apiGet('/settings'), [tab]);
  const { data: branches } = useApi<{ id: string; name: string }[]>(() => apiGet('/branches'), []);

  const [showAddUser, setShowAddUser] = useState(false);
  const [userForm, setUserForm] = useState({ username: '', password: '', fullName: '', role: 'CASHIER', branchIds: [] as string[] });
  const [showInvite, setShowInvite] = useState(false);
  const [inviteForm, setInviteForm] = useState({ username: '', fullName: '', role: 'CASHIER', branchIds: [] as string[] });
  const [inviteResult, setInviteResult] = useState<Invite | null>(null);
  const [copied, setCopied] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState('');
  const [tenantForm, setTenantForm] = useState<{ name: string; phone: string; address: string; receiptHeader: string } | null>(null);

  if (tenantInfo && !tenantForm) {
    const s = tenantInfo.settings as { receiptHeader?: string };
    setTenantForm({ name: tenantInfo.name, phone: tenantInfo.phone || '', address: tenantInfo.address || '', receiptHeader: s.receiptHeader || '' });
  }

  const createUser = async () => {
    setBusy(true);
    setError('');
    try {
      await apiPost('/users', { ...userForm, email: undefined });
      setShowAddUser(false);
      setUserForm({ username: '', password: '', fullName: '', role: 'CASHIER', branchIds: [] });
      reloadUsers();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const createInvite = async () => {
    setBusy(true);
    setError('');
    try {
      const inv = await apiPost<Invite>('/users/invites', { ...inviteForm });
      setInviteResult(inv);
      setShowInvite(false);
      setInviteForm({ username: '', fullName: '', role: 'CASHIER', branchIds: [] });
      reloadInvites();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const toggleUser = async (u: TenantUser) => {
    setError('');
    try {
      await apiPatch(`/users/${u.id}`, { isActive: !u.isActive });
      reloadUsers();
    } catch (e) {
      setError(errMsg(e));
    }
  };

  const doChangePassword = async () => {
    if (pwForm.next !== pwForm.confirm) {
      setError('New passwords do not match');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await changePassword(pwForm.current, pwForm.next);
      setPwForm({ current: '', next: '', confirm: '' });
      setPwMsg('Password changed ✓');
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  const saveTenant = async () => {
    if (!tenantForm) return;
    setBusy(true);
    setError('');
    try {
      await apiPatch('/settings', {
        name: tenantForm.name,
        phone: tenantForm.phone,
        address: tenantForm.address,
        settings: { receiptHeader: tenantForm.receiptHeader },
      });
      setPwMsg('Pharmacy info saved ✓');
      window.location.reload();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <PageHeader title="Settings" subtitle="Team, roles and pharmacy info" />

        {error && <div className="px-4 py-3 bg-blush-soft border border-blush rounded-2xl text-sm text-[#a34141] font-medium">{error}</div>}
        {pwMsg && <div className="px-4 py-3 bg-mint-soft border border-mint rounded-2xl text-sm text-[#2f6b46] font-medium">{pwMsg}</div>}

        <Tabs
          tabs={[
            { id: 'users', label: 'Team', icon: Users },
            { id: 'pharmacy', label: 'Pharmacy info', icon: Building2 },
            { id: 'security', label: 'Password', icon: KeyRound },
          ]}
          active={tab}
          onChange={setTab}
        />

        {tab === 'users' && (
          <div className="space-y-4">
            {allowed && (
              <div className="flex justify-end gap-2">
                <Btn variant="ghost" onClick={() => setShowInvite(true)}><Plus className="w-4 h-4" />Invite by code</Btn>
                <Btn variant="dark" onClick={() => setShowAddUser(true)}><Plus className="w-4 h-4" />Add user directly</Btn>
              </div>
            )}

            <div className="card overflow-hidden hidden md:block">
              <table className="w-full min-w-[640px]">
                <thead className="bg-cream-soft border-b border-line">
                  <tr><Th>User</Th><Th>Role</Th><Th>Branches</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr>
                </thead>
                <tbody className="divide-y divide-cream-deep/70">
                  {users?.map((u) => (
                    <tr key={u.id} className="hover:bg-cream-soft">
                      <Td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={u.username} tone={roleTones[u.role] || 'lime'} size="sm" />
                          <div>
                            <p className="font-bold text-ink">{u.fullName || u.username}</p>
                            <p className="text-xs text-stone-400">@{u.username}{u.email ? ` · ${u.email}` : ''}</p>
                          </div>
                        </div>
                      </Td>
                      <Td><Chip tone={roleTones[u.role] || 'neutral'}>{roleLabels[u.role]}</Chip></Td>
                      <Td className="text-xs text-stone-400">{u.branches.map((b) => b.name).join(', ') || 'all'}</Td>
                      <Td><Chip tone={u.isActive ? 'mint' : 'blush'}>{u.isActive ? 'active' : 'disabled'}</Chip></Td>
                      <Td className="text-right">
                        {allowed && u.role !== 'OWNER' && (
                          <Btn variant="ghost" onClick={() => toggleUser(u)}>{u.isActive ? 'Disable' : 'Enable'}</Btn>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3">
              {users?.map((u) => (
                <div key={u.id} className="card p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={u.username} tone={roleTones[u.role] || 'lime'} size="sm" />
                    <div className="min-w-0">
                      <p className="font-extrabold text-ink tracking-tight truncate">{u.fullName || u.username}</p>
                      <p className="text-xs text-stone-400">{roleLabels[u.role]}</p>
                    </div>
                  </div>
                  <Chip tone={u.isActive ? 'mint' : 'blush'}>{u.isActive ? 'active' : 'off'}</Chip>
                </div>
              ))}
            </div>

            {invites && invites.length > 0 && (
              <div className="card p-5">
                <h3 className="font-extrabold tracking-tight text-ink mb-3">Pending invites</h3>
                <div className="space-y-2">
                  {invites.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 bg-cream-soft border border-line rounded-2xl flex-wrap gap-2">
                      <div>
                        <p className="font-bold text-sm text-ink">@{inv.username} · {roleLabels[inv.role]}</p>
                        <p className="text-xs text-stone-400">expires {dateStr(inv.expiresAt)}</p>
                      </div>
                      <button
                        onClick={() => { navigator.clipboard.writeText(inv.code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                        className="btn btn-lime !py-1.5 !px-3 !text-xs"
                      >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        {inv.code}
                      </button>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-stone-400 mt-3">Share the code — the invitee enters it at <b>/accept-invite</b> to set their password.</p>
              </div>
            )}
          </div>
        )}

        {tab === 'pharmacy' && tenantForm && (
          <div className="card p-6 max-w-xl space-y-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Pharmacy name</label>
              <input className="input mt-1" value={tenantForm.name} onChange={(e) => setTenantForm({ ...tenantForm, name: e.target.value })} disabled={!allowed} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Phone</label>
                <input className="input mt-1" value={tenantForm.phone} onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })} disabled={!allowed} />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Address</label>
                <input className="input mt-1" value={tenantForm.address} onChange={(e) => setTenantForm({ ...tenantForm, address: e.target.value })} disabled={!allowed} />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Receipt header</label>
              <input className="input mt-1" value={tenantForm.receiptHeader} onChange={(e) => setTenantForm({ ...tenantForm, receiptHeader: e.target.value })} placeholder="Shown on printed receipts" disabled={!allowed} />
            </div>
            {allowed && <Btn variant="dark" onClick={saveTenant} disabled={busy} className="self-start">{busy ? 'Saving…' : 'Save changes'}</Btn>}
          </div>
        )}

        {tab === 'security' && (
          <div className="card p-6 max-w-md space-y-3">
            <h3 className="font-extrabold tracking-tight text-ink">Change your password</h3>
            <input type="password" className="input" placeholder="Current password" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} />
            <input type="password" className="input" placeholder="New password (min 8 chars)" value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} />
            <input type="password" className="input" placeholder="Confirm new password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} />
            <Btn variant="dark" onClick={doChangePassword} disabled={busy || !pwForm.current || pwForm.next.length < 8}>{busy ? 'Saving…' : 'Change password'}</Btn>
            <p className="text-xs text-stone-400">Changing your password signs out all other devices.</p>
          </div>
        )}
      </div>

      {/* Add user modal */}
      <Modal
        open={showAddUser}
        onClose={() => setShowAddUser(false)}
        title="Add user directly"
        maxWidth="max-w-lg"
        footer={
          <>
            <Btn variant="ghost" className="flex-1" onClick={() => setShowAddUser(false)}>Cancel</Btn>
            <Btn variant="dark" className="flex-1" onClick={createUser} disabled={busy || !userForm.username || userForm.password.length < 8}>{busy ? 'Creating…' : 'Create user'}</Btn>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Username *</label>
            <input className="input mt-1 font-mono" value={userForm.username} onChange={(e) => setUserForm({ ...userForm, username: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Full name</label>
            <input className="input mt-1" value={userForm.fullName} onChange={(e) => setUserForm({ ...userForm, fullName: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Password * (min 8)</label>
          <input type="password" className="input mt-1" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} />
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Role *</label>
          <select className="input mt-1" value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
            {['CASHIER', 'PHARMACIST', 'BRANCH_MANAGER', 'INVENTORY_MANAGER', 'WHOLESALE_MANAGER', 'ACCOUNTANT', 'ADMIN'].map((r) => (
              <option key={r} value={r}>{roleLabels[r as keyof typeof roleLabels]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Branches (empty = tenant-wide)</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {branches?.map((b) => (
              <label key={b.id} className={`chip cursor-pointer border ${userForm.branchIds.includes(b.id) ? 'bg-lime text-ink border-lime' : 'bg-white border-line text-stone-500'}`}>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={userForm.branchIds.includes(b.id)}
                  onChange={() => setUserForm({ ...userForm, branchIds: userForm.branchIds.includes(b.id) ? userForm.branchIds.filter((x) => x !== b.id) : [...userForm.branchIds, b.id] })}
                />
                {b.name}
              </label>
            ))}
          </div>
        </div>
      </Modal>

      {/* Invite modal */}
      <Modal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        title="Invite a team member"
        maxWidth="max-w-lg"
        footer={
          <>
            <Btn variant="ghost" className="flex-1" onClick={() => setShowInvite(false)}>Cancel</Btn>
            <Btn variant="dark" className="flex-1" onClick={createInvite} disabled={busy || !inviteForm.username}>{busy ? 'Creating…' : 'Generate invite code'}</Btn>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Username *</label>
            <input className="input mt-1 font-mono" value={inviteForm.username} onChange={(e) => setInviteForm({ ...inviteForm, username: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Full name</label>
            <input className="input mt-1" value={inviteForm.fullName} onChange={(e) => setInviteForm({ ...inviteForm, fullName: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Role *</label>
          <select className="input mt-1" value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}>
            {['CASHIER', 'PHARMACIST', 'BRANCH_MANAGER', 'INVENTORY_MANAGER', 'WHOLESALE_MANAGER', 'ACCOUNTANT', 'ADMIN'].map((r) => (
              <option key={r} value={r}>{roleLabels[r as keyof typeof roleLabels]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-stone-400">Branches</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {branches?.map((b) => (
              <label key={b.id} className={`chip cursor-pointer border ${inviteForm.branchIds.includes(b.id) ? 'bg-lime text-ink border-lime' : 'bg-white border-line text-stone-500'}`}>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={inviteForm.branchIds.includes(b.id)}
                  onChange={() => setInviteForm({ ...inviteForm, branchIds: inviteForm.branchIds.includes(b.id) ? inviteForm.branchIds.filter((x) => x !== b.id) : [...inviteForm.branchIds, b.id] })}
                />
                {b.name}
              </label>
            ))}
          </div>
        </div>
      </Modal>

      {/* Invite result */}
      <Modal
        open={!!inviteResult}
        onClose={() => setInviteResult(null)}
        title="Invite created 🎉"
        footer={<Btn variant="dark" className="flex-1" onClick={() => setInviteResult(null)}>Done</Btn>}
      >
        {inviteResult && (
          <>
            <p className="text-sm text-stone-500">Share this code with {inviteResult.username} — they visit <b className="text-ink">/accept-invite</b>, enter the code and choose a password.</p>
            <button
              onClick={() => { navigator.clipboard.writeText(inviteResult.code); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              className="w-full p-4 bg-lime rounded-2xl font-mono font-extrabold text-2xl text-ink tracking-widest text-center"
            >
              {copied ? 'COPIED ✓' : inviteResult.code}
            </button>
          </>
        )}
      </Modal>
    </Layout>
  );
};

export default Settings;

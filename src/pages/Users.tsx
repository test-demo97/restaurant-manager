import { useEffect, useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  RefreshCw,
  Link2,
  Lock,
} from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { showToast } from '../components/ui/Toast';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePlanFeatures } from '../hooks/usePlanFeatures';
import { useDemoGuard } from '../hooks/useDemoGuard';
import type { User, UserRole, Employee } from '../types';
import { ROLE_LABELS } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getEmployees } from '../lib/database';

export function Users() {
  useLanguage(); // Ready for translations
  const { isPremium } = usePlanFeatures();
  const { checkCanWrite } = useDemoGuard();
  const [users, setUsers] = useState<User[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: '',
    role: 'staff' as UserRole,
    employee_id: null as number | null,
  });

  const { user: currentUser } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Carica utenti
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .order('name');
        if (error) throw error;
        setUsers(data || []);
      } else {
        const storedUsers = JSON.parse(localStorage.getItem('kebab_users') || '[]');
        setUsers(storedUsers);
      }

      // Carica dipendenti
      const emps = await getEmployees();
      setEmployees(emps);
    } catch (err) {
      console.error('Errore caricamento dati:', err);
      showToast('Errore nel caricamento dati', 'error');
    }
    setLoading(false);
  }

  // Dipendenti non ancora collegati a un utente
  const availableEmployees = employees.filter(emp => {
    // Escludi dipendenti già collegati a un altro utente
    const linkedUser = users.find(u => u.employee_id === emp.id && u.id !== editingUser?.id);
    return !linkedUser;
  });

  // Trova dipendente collegato a un utente
  function getLinkedEmployee(userId: number): Employee | undefined {
    const user = users.find(u => u.id === userId);
    if (!user?.employee_id) return undefined;
    return employees.find(e => e.id === user.employee_id);
  }

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function openAddModal() {
    setEditingUser(null);
    setFormData({ username: '', password: '', name: '', role: 'staff', employee_id: null });
    setShowModal(true);
  }

  function openEditModal(user: User) {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: '', // Non mostrare password esistente
      name: user.name,
      role: user.role,
      employee_id: user.employee_id || null,
    });
    setShowModal(true);
  }

  async function handleSave() {
    // Blocca in modalità demo
    if (!checkCanWrite()) return;

    // Blocca creazione nuovi utenti se non premium
    if (!editingUser && !isPremium) {
      showToast('La creazione di nuovi utenti richiede il piano Premium', 'warning');
      return;
    }

    if (!formData.username || !formData.name) {
      showToast('Username e nome sono obbligatori', 'warning');
      return;
    }

    if (!editingUser && !formData.password) {
      showToast('La password è obbligatoria per i nuovi utenti', 'warning');
      return;
    }

    // Controlla username duplicato
    const duplicate = users.find(
      (u) =>
        u.username.toLowerCase() === formData.username.toLowerCase() &&
        u.id !== editingUser?.id
    );
    if (duplicate) {
      showToast('Username già esistente', 'error');
      return;
    }

    try {
      if (isSupabaseConfigured && supabase) {
        if (editingUser) {
          // Modifica utente esistente
          // Nota: per Supabase passiamo i valori direttamente senza convertire null in undefined
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const roleToSave: UserRole = editingUser.username === 'admin' ? 'superadmin' : formData.role;
          const updateData: any = {
            username: formData.username,
            name: formData.name,
            role: roleToSave,
            employee_id: formData.employee_id, // Può essere number o null
          };
          if (formData.password) {
            updateData.password = formData.password;
          }

          const { error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', editingUser.id);
          if (error) throw error;
          showToast('Utente modificato con successo', 'success');
        } else {
          // Nuovo utente
          const { error } = await supabase.from('users').insert({
            username: formData.username,
            password: formData.password,
            name: formData.name,
            role: formData.role,
            employee_id: formData.employee_id || null,
            active: true,
          });
          if (error) throw error;
          showToast('Utente creato con successo', 'success');
        }
        await loadData();
      } else {
        // Fallback localStorage
        let updatedUsers: User[];

        if (editingUser) {
          const roleToSave: UserRole = editingUser.username === 'admin' ? 'superadmin' : formData.role;
          updatedUsers = users.map((u) => {
            if (u.id === editingUser.id) {
              return {
                ...u,
                username: formData.username,
                name: formData.name,
                role: roleToSave,
                employee_id: formData.employee_id || undefined,
                ...(formData.password && { password: formData.password }),
              };
            }
            return u;
          });
          showToast('Utente modificato con successo', 'success');
        } else {
          const newUser: User = {
            id: Date.now(),
            username: formData.username,
            password: formData.password,
            name: formData.name,
            role: formData.role,
            employee_id: formData.employee_id || undefined,
            active: true,
            created_at: new Date().toISOString(),
          };
          updatedUsers = [...users, newUser];
          showToast('Utente creato con successo', 'success');
        }

        localStorage.setItem('kebab_users', JSON.stringify(updatedUsers));
        setUsers(updatedUsers);
      }
      setShowModal(false);
    } catch (err) {
      console.error('Errore salvataggio utente:', err);
      showToast('Errore nel salvataggio', 'error');
    }
  }

  async function toggleUserStatus(userId: number) {
    // Blocca in modalità demo
    if (!checkCanWrite()) return;

    // Non permettere di disattivare se stesso
    if (userId === currentUser?.id) {
      showToast('Non puoi disattivare il tuo account', 'error');
      return;
    }

    const userToToggle = users.find(u => u.id === userId);
    if (!userToToggle) return;

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('users')
          .update({ active: !userToToggle.active })
          .eq('id', userId);
        if (error) throw error;
        await loadData();
      } else {
        const updatedUsers = users.map((u) => {
          if (u.id === userId) {
            return { ...u, active: !u.active };
          }
          return u;
        });
        localStorage.setItem('kebab_users', JSON.stringify(updatedUsers));
        setUsers(updatedUsers);
      }
      showToast('Stato utente aggiornato', 'success');
    } catch (err) {
      console.error('Errore aggiornamento stato:', err);
      showToast('Errore nell\'aggiornamento', 'error');
    }
  }

  async function deleteUser(userId: number) {
    // Blocca in modalità demo
    if (!checkCanWrite()) return;

    // Non permettere di eliminare se stesso
    if (userId === currentUser?.id) {
      showToast('Non puoi eliminare il tuo account', 'error');
      return;
    }

    // Non permettere di eliminare l'utente predefinito (admin)
    const userToDelete = users.find(u => u.id === userId);
    if (userToDelete?.username === 'admin') {
      showToast('L\'utente amministratore predefinito non può essere eliminato', 'error');
      return;
    }

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.from('users').delete().eq('id', userId);
        if (error) throw error;
        await loadData();
      } else {
        const updatedUsers = users.filter((u) => u.id !== userId);
        localStorage.setItem('kebab_users', JSON.stringify(updatedUsers));
        setUsers(updatedUsers);
      }
      setShowDeleteConfirm(null);
      showToast('Utente eliminato', 'success');
    } catch (err) {
      console.error('Errore eliminazione utente:', err);
      showToast('Errore nell\'eliminazione', 'error');
    }
  }

  function getRoleIcon(role: UserRole) {
    switch (role) {
      case 'superadmin':
        return <ShieldAlert className="w-4 h-4 text-red-400" />;
      case 'admin':
        return <ShieldCheck className="w-4 h-4 text-amber-400" />;
      case 'staff':
        return <Shield className="w-4 h-4 text-blue-400" />;
    }
  }

  function getRoleBadgeClass(role: UserRole) {
    switch (role) {
      case 'superadmin':
        return 'bg-red-500/20 text-red-400 border border-red-500/30';
      case 'admin':
        return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
      case 'staff':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Gestione Utenti</h1>
          <p className="text-dark-400 text-xs sm:text-sm">
            Crea e gestisci gli account del sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="btn-secondary btn-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={isPremium ? openAddModal : () => showToast('La creazione di nuovi utenti richiede il piano Premium', 'warning')}
            className={`btn-sm flex-1 sm:flex-none justify-center ${isPremium ? 'btn-primary' : 'btn-secondary opacity-70'}`}
            title={!isPremium ? 'Richiede piano Premium' : ''}
          >
            {isPremium ? <Plus className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            Nuovo Utente
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label text-xs">Totale Utenti</p>
              <p className="stat-value text-lg sm:text-2xl">{users.length}</p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Shield className="w-4 h-4 sm:w-6 sm:h-6 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label text-xs">Super Admin</p>
              <p className="stat-value text-lg sm:text-2xl">
                {users.filter((u) => u.role === 'superadmin').length}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 sm:w-6 sm:h-6 text-red-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label text-xs">Admin</p>
              <p className="stat-value text-lg sm:text-2xl">
                {users.filter((u) => u.role === 'admin').length}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 sm:w-6 sm:h-6 text-amber-400" />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="stat-label text-xs">Staff</p>
              <p className="stat-value text-lg sm:text-2xl">
                {users.filter((u) => u.role === 'staff').length}
              </p>
            </div>
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
              <UserCheck className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-dark-400" />
        <input
          type="text"
          placeholder="Cerca utente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input pl-9 sm:pl-10 text-sm sm:text-base"
        />
      </div>

      {/* Users Table - Desktop */}
      <div className="card hidden md:block">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Utente</th>
                <th>Username</th>
                <th>Ruolo</th>
                <th>Dipendente</th>
                <th>Stato</th>
                <th>Ultimo Accesso</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center">
                        <span className="text-lg font-semibold text-primary-400">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">{user.name}</p>
                        {user.id === currentUser?.id && (
                          <p className="text-xs text-primary-400">(Tu)</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <p className="font-mono text-dark-300">{user.username}</p>
                  </td>
                  <td>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeClass(
                        user.role
                      )}`}
                    >
                      {getRoleIcon(user.role)}
                      {ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td>
                    {(() => {
                      const linkedEmp = getLinkedEmployee(user.id);
                      return linkedEmp ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-primary-500/20 text-primary-400">
                          <Link2 className="w-3 h-3" />
                          {linkedEmp.name}
                        </span>
                      ) : (
                        <span className="text-dark-500 text-sm">-</span>
                      );
                    })()}
                  </td>
                  <td>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                        user.active
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {user.active ? (
                        <>
                          <UserCheck className="w-3 h-3" />
                          Attivo
                        </>
                      ) : (
                        <>
                          <UserX className="w-3 h-3" />
                          Disattivato
                        </>
                      )}
                    </span>
                  </td>
                  <td>
                    <p className="text-dark-400 text-sm">
                      {user.last_login
                        ? new Date(user.last_login).toLocaleString('it-IT')
                        : 'Mai'}
                    </p>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="btn-secondary btn-sm"
                        title="Modifica"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleUserStatus(user.id)}
                        className={`btn-sm ${
                          user.active ? 'btn-secondary' : 'btn-primary'
                        }`}
                        title={user.active ? 'Disattiva' : 'Attiva'}
                        disabled={user.id === currentUser?.id}
                      >
                        {user.active ? (
                          <UserX className="w-4 h-4" />
                        ) : (
                          <UserCheck className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(user.id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={user.username === 'admin' ? 'Utente predefinito non eliminabile' : 'Elimina'}
                        disabled={user.id === currentUser?.id || user.username === 'admin'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Users Cards - Mobile */}
      <div className="md:hidden space-y-3">
        {filteredUsers.map((user) => {
          const linkedEmp = getLinkedEmployee(user.id);
          return (
            <div key={user.id} className="card p-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-semibold text-primary-400">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-medium text-white text-sm truncate">{user.name}</p>
                      {user.id === currentUser?.id && (
                        <span className="text-xs text-primary-400">(Tu)</span>
                      )}
                    </div>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
                        user.active
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      {user.active ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
                      {user.active ? 'Attivo' : 'Disattivato'}
                    </span>
                  </div>
                  <p className="font-mono text-dark-400 text-xs mt-0.5">@{user.username}</p>

                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeClass(user.role)}`}
                    >
                      {getRoleIcon(user.role)}
                      {ROLE_LABELS[user.role]}
                    </span>
                    {linkedEmp && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-500/20 text-primary-400">
                        <Link2 className="w-3 h-3" />
                        {linkedEmp.name}
                      </span>
                    )}
                  </div>

                  <p className="text-dark-500 text-xs mt-2">
                    Ultimo accesso: {user.last_login ? new Date(user.last_login).toLocaleString('it-IT') : 'Mai'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dark-700">
                <button
                  onClick={() => openEditModal(user)}
                  className="btn-secondary btn-sm flex-1 justify-center text-xs"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Modifica
                </button>
                <button
                  onClick={() => toggleUserStatus(user.id)}
                  className={`btn-sm flex-1 justify-center text-xs ${user.active ? 'btn-secondary' : 'btn-primary'}`}
                  disabled={user.id === currentUser?.id}
                >
                  {user.active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                  {user.active ? 'Disattiva' : 'Attiva'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(user.id)}
                  className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={user.id === currentUser?.id || user.username === 'admin'}
                  title={user.username === 'admin' ? 'Utente predefinito non eliminabile' : 'Elimina'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Permissions Info */}
      <div className="bg-dark-800 rounded-xl border border-dark-700 p-3 sm:p-4">
        <h3 className="font-semibold text-white mb-2 sm:mb-3 text-sm sm:text-base">Permessi per Ruolo</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-dark-900 rounded-lg p-2.5 sm:p-3">
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
              <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
              <span className="font-medium text-red-400 text-sm">Super Admin</span>
            </div>
            <p className="text-xs text-dark-400">
              Accesso completo: Dashboard, Ordini, Menu, Tavoli, Inventario, Ricette,
              Personale, Report, SMAC, Impostazioni, Gestione Utenti
            </p>
          </div>

          <div className="bg-dark-900 rounded-lg p-2.5 sm:p-3">
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              <span className="font-medium text-amber-400 text-sm">Admin</span>
            </div>
            <p className="text-xs text-dark-400">
              Accesso operativo: Dashboard, Ordini, Menu, Tavoli, Inventario, Ricette,
              Personale
            </p>
          </div>

          <div className="bg-dark-900 rounded-lg p-2.5 sm:p-3">
            <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              <span className="font-medium text-blue-400 text-sm">Staff</span>
            </div>
            <p className="text-xs text-dark-400">
              Servizio: Nuovo Ordine, Ordini, Tavoli, I Miei Turni (solo propri turni e paga)
            </p>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingUser ? 'Modifica Utente' : 'Nuovo Utente'}
        size="xl"
      >
        <div className="space-y-4">
          {/* Desktop: Nome e Username su stessa riga */}
          <div className="md:grid md:grid-cols-2 md:gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Nome Completo *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Es: Mario Rossi"
                className="input"
              />
            </div>

            <div className="mt-4 md:mt-0">
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Username *
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value.toLowerCase() })
                }
                placeholder="Es: mario.rossi"
                className="input font-mono"
              />
            </div>
          </div>

          {/* Desktop: Password e Ruolo su stessa riga */}
          <div className="md:grid md:grid-cols-2 md:gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Password {editingUser ? '(lascia vuoto per non modificare)' : '*'}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? '••••••••' : 'Inserisci password'}
                className="input"
              />
            </div>

            <div className="mt-4 md:mt-0">
              <label className="block text-sm font-medium text-dark-300 mb-1">
                Ruolo *
              </label>
              <select
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value as UserRole })
                }
                className="input"
                disabled={editingUser?.username === 'admin'}
                title={editingUser?.username === 'admin' ? 'Ruolo utente predefinito non modificabile' : ''}
              >
                <option value="staff">Staff - Solo servizio</option>
                <option value="admin">Admin - Operativo</option>
                <option value="superadmin">Super Admin - Accesso completo</option>
              </select>
            </div>
          </div>

          {/* Collegamento Dipendente - utile per Staff */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1">
              Collega a Dipendente
            </label>
            <select
              value={formData.employee_id || ''}
              onChange={(e) =>
                setFormData({ ...formData, employee_id: e.target.value ? parseInt(e.target.value) : null })
              }
              className="input"
            >
              <option value="">Nessun collegamento</option>
              {/* Mostra dipendente corrente se in modifica */}
              {editingUser?.employee_id && !availableEmployees.find(e => e.id === editingUser.employee_id) && (
                <option value={editingUser.employee_id}>
                  {employees.find(e => e.id === editingUser.employee_id)?.name} (collegato)
                </option>
              )}
              {availableEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} - {emp.role}
                </option>
              ))}
            </select>
            <p className="text-xs text-dark-400 mt-1">
              Collega l'utente a un dipendente per permettere di vedere turni e paga personali
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setShowModal(false)} className="btn-secondary">
              Annulla
            </button>
            <button onClick={handleSave} className="btn-primary">
              {editingUser ? 'Salva Modifiche' : 'Crea Utente'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm !== null}
        onClose={() => setShowDeleteConfirm(null)}
        title="Conferma Eliminazione"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-dark-300">
            Sei sicuro di voler eliminare questo utente? L'azione è irreversibile.
          </p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowDeleteConfirm(null)}
              className="btn-secondary"
            >
              Annulla
            </button>
            <button
              onClick={() => showDeleteConfirm && deleteUser(showDeleteConfirm)}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl font-medium transition-colors"
            >
              Elimina
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

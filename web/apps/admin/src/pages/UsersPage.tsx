import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sdk } from '../context/AuthContext';
import { User } from '@traceability/sdk';
import { DataTable } from '../components/ui/DataTable';
import { Modal } from '../components/ui/Modal';
import { Plus, User as UserIcon } from 'lucide-react';

interface UserFormData {
  username: string;
  password?: string; // Optional for edit
  display_name: string;
  roles: string[];
}

const AVAILABLE_ROLES = ['ADMIN', 'SUPERVISOR', 'OPERATOR', 'STORE', 'PRODUCTION', 'QA'];

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<UserFormData>({
    username: '',
    password: '',
    display_name: '',
    roles: ['OPERATOR'],
  });

  // 1. Fetch Users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => sdk.admin.getUsers()
  });

  // 2. Create User Mutation
  const createUser = useMutation({
    mutationFn: async () => {
       await sdk.admin.createUser({
         username: formData.username,
         password: formData.password,
         display_name: formData.display_name,
         roles: formData.roles
       });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsModalOpen(false);
      setFormData({ username: '', password: '', display_name: '', roles: ['OPERATOR'] });
    }
  });

  // 3. Activate / Deactivate user
  const toggleActive = useMutation({
    mutationFn: async (user: User) => {
      const isActive = (user as any).is_active ?? (user as any).isActive ?? true;
      await sdk.admin.updateUser(user.id, { is_active: !isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const assignRoles = useMutation({
    mutationFn: async (user: User) => {
      const current = (user.roles || []).join(',');
      const input = prompt('Enter roles (comma separated)', current);
      if (input === null) return;
      const roles = input
        .split(',')
        .map((r) => r.trim().toUpperCase())
        .filter((r) => AVAILABLE_ROLES.includes(r));
      await sdk.admin.updateUser(user.id, { roles });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });

  const columns = [
    {
      header: 'User',
      accessorKey: 'username' as any,
      cell: (user: User) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
            <UserIcon size={16} />
          </div>
          <div>
            <div className="font-medium text-gray-900">{(user as any).display_name ?? (user as any).displayName}</div>
            <div className="text-xs text-gray-500">@{user.username}</div>
          </div>
        </div>
      )
    },
    {
      header: 'Roles',
      accessorKey: 'roles' as any,
      cell: (user: User) => (
        <div className="flex flex-wrap gap-1">
          {user.roles?.map((role: string) => (
            <span key={role} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#D8E2FA] text-[#0A1F66]">
              {role}
            </span>
          ))}
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'is_active' as any,
      cell: (user: User) => {
        const isActive = (user as any).is_active ?? (user as any).isActive ?? true;
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
            }`}
          >
            {isActive ? 'Active' : 'Inactive'}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      cell: (user: User) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => assignRoles.mutate(user)}
            className="text-xs px-3 py-1 rounded border border-[#9FB4EE] text-[#0D2A84] hover:bg-[#E8EEFC]"
          >
            Assign Roles
          </button>
          <button
            onClick={() => toggleActive.mutate(user)}
            className="text-xs px-3 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            {((user as any).is_active ?? (user as any).isActive ?? true) ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Users & Roles</h1>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#1134A6] text-white rounded-md hover:bg-[#0D2A84] transition-colors"
        >
            <Plus size={18} />
            Add User
        </button>
      </div>

      <DataTable 
        data={users} 
        columns={columns} 
        isLoading={isLoading} 
      />

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Create New User"
      >
        <form onSubmit={(e) => { e.preventDefault(); createUser.mutate(); }} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input 
                    className="w-full px-3 py-2 border rounded-md" 
                    value={formData.display_name}
                    onChange={e => setFormData({...formData, display_name: e.target.value})}
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input 
                    className="w-full px-3 py-2 border rounded-md" 
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input 
                    type="password"
                    className="w-full px-3 py-2 border rounded-md" 
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    required
                />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Roles</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_ROLES.map((role) => {
                  const checked = formData.roles.includes(role);
                  return (
                    <label key={role} className="inline-flex items-center gap-1 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300"
                        checked={checked}
                        onChange={(e) => {
                          setFormData({
                            ...formData,
                            roles: e.target.checked
                              ? [...formData.roles, role]
                              : formData.roles.filter((r) => r !== role),
                          });
                        }}
                      />
                      <span>{role}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end pt-4">
                <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="mr-3 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                >
                    Cancel
                </button>
                <button 
                    type="submit" 
                    disabled={createUser.isPending}
                    className="px-4 py-2 bg-[#1134A6] text-white rounded-md hover:bg-[#0D2A84] disabled:opacity-50"
                >
                    {createUser.isPending ? 'Creating...' : 'Create User'}
                </button>
            </div>
        </form>
      </Modal>
    </div>
  );
}

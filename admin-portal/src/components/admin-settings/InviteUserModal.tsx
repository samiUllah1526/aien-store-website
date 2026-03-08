import { useState } from 'react';
import { Controller } from 'react-hook-form';
import { api } from '../../lib/api';
import type { Role } from '../../lib/types';
import { Modal } from '../ui/Modal';
import { inviteUserSchema } from '../../lib/validation/user';
import { useZodForm } from '../../lib/forms/useZodForm';
import { mapApiErrorToForm } from '../../lib/forms/mapApiErrorToForm';

interface InviteUserModalProps {
  roles: Role[];
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteUserModal({ roles, onClose, onSuccess }: InviteUserModalProps) {
  const form = useZodForm({
    schema: inviteUserSchema,
    defaultValues: {
      name: '',
      email: '',
      roleIds: [],
      permissionIds: [],
    },
  });
  const [submitting, setSubmitting] = useState(false);
  const error = form.formState.errors.root?.serverError?.message;

  const handleSubmit = form.handleSubmit(async (values) => {
    form.clearErrors('root.serverError');
    setSubmitting(true);
    try {
      await api.post('/users/invite', {
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        roleIds: values.roleIds.length ? values.roleIds : undefined,
        permissionIds: values.permissionIds.length ? values.permissionIds : undefined,
      });
      onSuccess();
    } catch (err) {
      mapApiErrorToForm(err, form.setError);
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Modal open title="Invite user" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
            {error}
          </div>
        )}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Name</label>
          <input
            type="text"
            required
            {...form.register('name')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
          <input
            type="email"
            required
            {...form.register('email')}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Role</label>
          <Controller
            control={form.control}
            name="roleIds"
            render={({ field }) => (
              <div className="flex flex-wrap gap-3">
                {roles.filter((r) => r.name !== 'Customer').map((role) => {
                  const checked = field.value.includes(role.id);
                  return (
                    <label key={role.id} className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          field.onChange(
                            checked ? field.value.filter((id: string) => id !== role.id) : [...field.value, role.id],
                          )
                        }
                        className="h-4 w-4 rounded border-slate-300 text-slate-600 dark:text-slate-400"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{role.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-600"
          >
            {submitting ? 'Sending…' : 'Send invite'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}

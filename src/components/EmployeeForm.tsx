import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Employee } from '../database/db';
import { format } from 'date-fns';

const employeeSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(50, 'Name is too long'),
  phone: z.string().optional().or(z.literal('')),
  dailyWage: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return undefined;
      const num = Number(val);
      return isNaN(num) ? undefined : num;
    },
    z.number({ invalid_type_error: 'Daily wage must be a number' }).min(1, 'Wage must be at least 1')
  ),
  joiningDate: z.string().min(1, 'Joining date is required'),
  status: z.enum(['active', 'archived']).default('active'),
});

type EmployeeFormValues = z.infer<typeof employeeSchema>;

interface EmployeeFormProps {
  initialData?: Employee;
  onSubmit: (data: EmployeeFormValues) => void;
  onCancel: () => void;
}

export default function EmployeeForm({ initialData, onSubmit, onCancel }: EmployeeFormProps) {
  const defaultValues: EmployeeFormValues = {
    name: initialData?.name || '',
    phone: initialData?.phone || '',
    dailyWage: initialData?.dailyWage || '' as unknown as number,
    joiningDate: initialData?.joiningDate || format(new Date(), 'yyyy-MM-dd'),
    status: initialData?.status || 'active',
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues,
  });

  const onInvalid = (formErrors: any) => {
    console.error("Form validation failed:", formErrors);
    const messages = Object.entries(formErrors)
      .map(([field, err]: [string, any]) => {
        const label = field === 'dailyWage' ? 'Daily Wage' : field === 'joiningDate' ? 'Joining Date' : field;
        return `${label}: ${err.message}`;
      })
      .join('\n');
    alert(`Please fix the following errors:\n${messages}`);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-5 text-brand-lightGray">
      {/* Name */}
      <div className="flex flex-col space-y-1">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Full Name <span className="text-brand-danger">*</span>
        </label>
        <input
          {...register('name')}
          type="text"
          placeholder="e.g. John Doe"
          className={`w-full px-3 py-2 bg-brand-black border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-yellow font-medium text-sm transition-shadow text-white ${
            errors.name ? 'border-brand-danger' : 'border-zinc-800'
          }`}
        />
        {errors.name && (
          <span className="text-xs text-brand-danger font-medium">{errors.name.message}</span>
        )}
      </div>

      {/* Phone */}
      <div className="flex flex-col space-y-1">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Phone Number <span className="text-zinc-500 font-normal">(Optional)</span>
        </label>
        <input
          {...register('phone')}
          type="tel"
          placeholder="e.g. 9876543210"
          className={`w-full px-3 py-2 bg-brand-black border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-yellow font-medium text-sm transition-shadow text-white ${
            errors.phone ? 'border-brand-danger' : 'border-zinc-800'
          }`}
        />
        {errors.phone && (
          <span className="text-xs text-brand-danger font-medium">{errors.phone.message}</span>
        )}
      </div>

      {/* Daily Wage */}
      <div className="flex flex-col space-y-1">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Daily Wage (₹) <span className="text-brand-danger">*</span>
        </label>
        <input
          {...register('dailyWage')}
          type="number"
          step="any"
          placeholder="e.g. 500"
          className={`w-full px-3 py-2 bg-brand-black border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-yellow font-medium text-sm transition-shadow text-white ${
            errors.dailyWage ? 'border-brand-danger' : 'border-zinc-800'
          }`}
        />
        {errors.dailyWage && (
          <span className="text-xs text-brand-danger font-medium">{errors.dailyWage.message}</span>
        )}
      </div>

      {/* Joining Date */}
      <div className="flex flex-col space-y-1">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Joining Date <span className="text-brand-danger">*</span>
        </label>
        <input
          {...register('joiningDate')}
          type="date"
          className={`w-full px-3 py-2 bg-brand-black border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-yellow font-medium text-sm transition-shadow text-white ${
            errors.joiningDate ? 'border-brand-danger' : 'border-zinc-800'
          }`}
        />
        {errors.joiningDate && (
          <span className="text-xs text-brand-danger font-medium">{errors.joiningDate.message}</span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3 pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-brand-lightGray font-semibold rounded-xl active:scale-[0.98] transition-transform text-center text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 py-3 bg-brand-yellow text-brand-black font-bold rounded-xl active:scale-[0.98] transition-transform text-center text-sm disabled:opacity-50"
        >
          {initialData ? 'Save Changes' : 'Add Employee'}
        </button>
      </div>
    </form>
  );
}

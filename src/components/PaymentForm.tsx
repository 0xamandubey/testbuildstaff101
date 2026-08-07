import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';

const paymentSchema = z.object({
  amount: z.number({ message: 'Amount must be a number' }).positive('Amount must be greater than 0'),
  paymentDate: z.string().min(10, 'Payment date is required'),
  paymentMethod: z.enum(['Cash', 'UPI', 'Bank']),
  remarks: z.string().optional().or(z.literal('')),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  employeeName: string;
  currentDue: number;
  onSubmit: (data: PaymentFormValues) => void;
  onCancel: () => void;
  initialData?: {
    amount: number;
    paymentDate: string;
    paymentMethod: 'Cash' | 'UPI' | 'Bank';
    remarks?: string;
  };
}

export default function PaymentForm({ employeeName, currentDue, onSubmit, onCancel, initialData }: PaymentFormProps) {
  const adjustedDue = initialData ? currentDue + initialData.amount : currentDue;

  const defaultValues: PaymentFormValues = initialData
    ? {
        amount: initialData.amount,
        paymentDate: initialData.paymentDate,
        paymentMethod: initialData.paymentMethod,
        remarks: initialData.remarks || '',
      }
    : {
        amount: currentDue > 0 ? currentDue : '' as unknown as number,
        paymentDate: format(new Date(), 'yyyy-MM-dd'),
        paymentMethod: 'Cash',
        remarks: '',
      };

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues,
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 text-brand-lightGray">
      {/* Information Row */}
      <div className="bg-brand-black p-3 rounded-lg border border-zinc-850">
        <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">Paying Staff</div>
        <div className="font-bold text-base truncate text-white">{employeeName}</div>
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-zinc-800">
          <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Remaining Due</span>
          <span className={`text-sm font-extrabold ${adjustedDue > 0 ? 'text-brand-danger' : 'text-brand-success'}`}>
            ₹ {adjustedDue.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Amount */}
      <div className="flex flex-col space-y-1">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Amount To Pay <span className="text-brand-danger">*</span>
          </label>
          {adjustedDue > 0 && (
            <button
              type="button"
              onClick={() => setValue('amount', adjustedDue)}
              className="text-[10px] font-extrabold text-brand-yellow bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded uppercase active:scale-95 transition-transform"
            >
              {initialData ? 'Use Original Due' : 'Pay Full Due'}
            </button>
          )}
        </div>
        <input
          {...register('amount', { valueAsNumber: true })}
          type="number"
          step="any"
          placeholder="e.g. 2500"
          className={`w-full px-3 py-2 bg-brand-black border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-yellow font-medium text-sm transition-shadow text-white ${
            errors.amount ? 'border-brand-danger' : 'border-zinc-850'
          }`}
        />
        {errors.amount && (
          <span className="text-xs text-brand-danger font-medium">{errors.amount.message}</span>
        )}
      </div>

      {/* Date */}
      <div className="flex flex-col space-y-1">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Payment Date <span className="text-brand-danger">*</span>
        </label>
        <input
          {...register('paymentDate')}
          type="date"
          className={`w-full px-3 py-2 bg-brand-black border border-zinc-850 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-yellow font-medium text-sm transition-shadow text-white ${
            errors.paymentDate ? 'border-brand-danger' : 'border-zinc-850'
          }`}
        />
        {errors.paymentDate && (
          <span className="text-xs text-brand-danger font-medium">{errors.paymentDate.message}</span>
        )}
      </div>

      {/* Payment Method */}
      <div className="flex flex-col space-y-1">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Payment Method <span className="text-brand-danger">*</span>
        </label>
        <select
          {...register('paymentMethod')}
          className="w-full px-3 py-2 bg-brand-black border border-zinc-850 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-yellow font-medium text-sm transition-shadow h-[44px] text-white"
        >
          <option value="Cash">Cash</option>
          <option value="UPI">UPI</option>
          <option value="Bank">Bank Transfer</option>
        </select>
        {errors.paymentMethod && (
          <span className="text-xs text-brand-danger font-medium">{errors.paymentMethod.message}</span>
        )}
      </div>

      {/* Remarks */}
      <div className="flex flex-col space-y-1">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Remarks <span className="text-zinc-500 font-normal">(Optional)</span>
        </label>
        <input
          {...register('remarks')}
          type="text"
          placeholder="e.g. July full settlement"
          className="w-full px-3 py-2 bg-brand-black border border-zinc-850 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-yellow text-sm font-medium transition-shadow text-white"
        />
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
          Save Payment
        </button>
      </div>
    </form>
  );
}

// Simple localStorage-based store with safe in-memory fallback.
// Data is stored as JSON strings in localStorage. If blocked, fallbacks to memory.

export interface Employee {
  id: number;
  name: string;
  phone?: string;
  dailyWage: number;
  joiningDate: string; // YYYY-MM-DD
  status: 'active' | 'archived';
}

export interface Attendance {
  id: number;
  employeeId: number;
  date: string; // YYYY-MM-DD
  value: 0 | 0.5 | 1 | 1.5 | 2;
  dailyWage: number; // frozen wage at time of marking
}

export interface SalaryPayment {
  id: number;
  employeeId: number;
  amount: number;
  paymentDate: string; // YYYY-MM-DD
  paymentMethod: 'Cash' | 'UPI' | 'Bank';
  remarks?: string;
}

export interface AdvanceReturn {
  amount: number;
  date: string; // YYYY-MM-DD
}

export interface Advance {
  id: number;
  name: string;
  phone?: string;
  amount: number;
  paidBack: number; // Total amount received back so far
  dateGiven: string; // YYYY-MM-DD
  status: 'pending' | 'returned';
  dateReturned?: string; // YYYY-MM-DD (date when fully settled)
  returns?: AdvanceReturn[]; // Log of partial payments
}

export interface Settings {
  businessName: string;
}

// ---- Formatting Helpers ----
export function formatDateDisplay(dateStr?: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}

// ---- Safe Storage Helpers ----

let isLocalStorageAvailable = false;
try {
  const testKey = '__storage_test__';
  localStorage.setItem(testKey, testKey);
  const retrieved = localStorage.getItem(testKey);
  localStorage.removeItem(testKey);
  isLocalStorageAvailable = (retrieved === testKey);
} catch {
  isLocalStorageAvailable = false;
}

export function checkStorageSupport() {
  const isFile = typeof window !== 'undefined' && window.location.protocol === 'file:';
  return {
    supported: isLocalStorageAvailable,
    persistent: isLocalStorageAvailable && !isFile,
    isFileProtocol: isFile,
    reason: isFile
      ? 'fileProtocol' as const
      : (!isLocalStorageAvailable ? 'blocked' as const : undefined)
  };
}

export function requestPersistentStorage() {
  if (
    typeof navigator !== 'undefined' &&
    navigator.storage &&
    navigator.storage.persist
  ) {
    navigator.storage.persisted().then((persisted) => {
      if (!persisted) {
        navigator.storage.persist().then((granted) => {
          if (granted) {
            console.log('Storage persistence granted successfully.');
          } else {
            console.warn('Storage persistence not granted by browser.');
          }
        }).catch((err) => {
          console.error('Error requesting storage persistence:', err);
        });
      } else {
        console.log('Storage is already persistent.');
      }
    });
  }
}

const memoryStorage: Record<string, string> = {};

function safeGetItem(key: string): string | null {
  if (isLocalStorageAvailable) {
    try {
      return localStorage.getItem(key);
    } catch {
      // Fallback
    }
  }
  return memoryStorage[key] || null;
}

function safeSetItem(key: string, value: string): void {
  if (isLocalStorageAvailable) {
    try {
      localStorage.setItem(key, value);
      return;
    } catch {
      // Fallback
    }
  }
  memoryStorage[key] = value;
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = safeGetItem(key);
    if (raw) return JSON.parse(raw) as T;
  } catch { /* corrupted data, reset */ }
  return fallback;
}

function save<T>(key: string, data: T): void {
  safeSetItem(key, JSON.stringify(data));
}

// ---- storage keys ----
const KEYS = {
  employees: 'sa_employees',
  attendance: 'sa_attendance',
  payments: 'sa_payments',
  advances: 'sa_advances',
  settings: 'sa_settings',
  nextId: 'sa_next_id',
} as const;

// ---- auto-increment ID ----
function nextId(): number {
  const current = load<number>(KEYS.nextId, 0);
  const next = current + 1;
  save(KEYS.nextId, next);
  return next;
}

// ---- Storage API ----
// Simple synchronous CRUD. Every mutation saves immediately.

export const store = {
  // ============ EMPLOYEES ============
  getEmployees(): Employee[] {
    return load<Employee[]>(KEYS.employees, []);
  },

  getEmployee(id: number): Employee | undefined {
    return this.getEmployees().find(e => e.id === id);
  },

  addEmployee(data: Omit<Employee, 'id'>): Employee {
    const employees = this.getEmployees();
    const emp: Employee = { ...data, id: nextId() };
    employees.push(emp);
    save(KEYS.employees, employees);
    return emp;
  },

  updateEmployee(id: number, updates: Partial<Omit<Employee, 'id'>>): void {
    const employees = this.getEmployees();
    const idx = employees.findIndex(e => e.id === id);
    if (idx !== -1) {
      employees[idx] = { ...employees[idx], ...updates };
      save(KEYS.employees, employees);
    }
  },

  deleteEmployee(id: number): void {
    save(KEYS.employees, this.getEmployees().filter(e => e.id !== id));
    // Also delete related attendance and payments
    save(KEYS.attendance, this.getAttendance().filter(a => a.employeeId !== id));
    save(KEYS.payments, this.getPayments().filter(p => p.employeeId !== id));
  },

  // ============ ATTENDANCE ============
  getAttendance(): Attendance[] {
    return load<Attendance[]>(KEYS.attendance, []);
  },

  getAttendanceByDate(date: string): Attendance[] {
    return this.getAttendance().filter(a => a.date === date);
  },

  getAttendanceByEmployee(employeeId: number): Attendance[] {
    return this.getAttendance().filter(a => a.employeeId === employeeId);
  },

  getAttendanceInRange(start: string, end: string): Attendance[] {
    return this.getAttendance().filter(a => a.date >= start && a.date <= end);
  },

  addAttendance(data: Omit<Attendance, 'id'>): Attendance {
    const all = this.getAttendance();
    const record: Attendance = { ...data, id: nextId() };
    all.push(record);
    save(KEYS.attendance, all);
    return record;
  },

  updateAttendance(id: number, updates: Partial<Omit<Attendance, 'id'>>): void {
    const all = this.getAttendance();
    const idx = all.findIndex(a => a.id === id);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      save(KEYS.attendance, all);
    }
  },

  deleteAttendanceByEmployee(employeeId: number): void {
    save(KEYS.attendance, this.getAttendance().filter(a => a.employeeId !== employeeId));
  },

  // ============ PAYMENTS ============
  getPayments(): SalaryPayment[] {
    return load<SalaryPayment[]>(KEYS.payments, []);
  },

  getPaymentsByEmployee(employeeId: number): SalaryPayment[] {
    return this.getPayments().filter(p => p.employeeId === employeeId);
  },

  getPaymentsInRange(start: string, end: string): SalaryPayment[] {
    return this.getPayments().filter(p => p.paymentDate >= start && p.paymentDate <= end);
  },

  addPayment(data: Omit<SalaryPayment, 'id'>): SalaryPayment {
    const all = this.getPayments();
    const payment: SalaryPayment = { ...data, id: nextId() };
    all.push(payment);
    save(KEYS.payments, all);
    return payment;
  },

  deletePaymentsByEmployee(employeeId: number): void {
    save(KEYS.payments, this.getPayments().filter(p => p.employeeId !== employeeId));
  },

  // ============ ADVANCES ============
  getAdvances(): Advance[] {
    const raw = load<Advance[]>(KEYS.advances, []);
    // Ensure backward compatibility for database values
    return raw.map(a => ({
      ...a,
      paidBack: a.paidBack ?? (a.status === 'returned' ? a.amount : 0),
      returns: a.returns ?? (a.status === 'returned' && a.dateReturned ? [{ amount: a.amount, date: a.dateReturned }] : []),
    }));
  },

  addAdvance(data: Omit<Advance, 'id' | 'status' | 'dateReturned' | 'paidBack' | 'returns'>): Advance {
    const all = this.getAdvances();
    const advance: Advance = {
      ...data,
      id: nextId(),
      status: 'pending',
      paidBack: 0,
      returns: []
    };
    all.push(advance);
    save(KEYS.advances, all);
    return advance;
  },

  receiveAdvancePayment(id: number, amount: number, date: string): void {
    const all = this.getAdvances();
    const idx = all.findIndex(a => a.id === id);
    if (idx !== -1) {
      const adv = all[idx];
      
      const prevPaidBack = adv.paidBack ?? (adv.status === 'returned' ? adv.amount : 0);
      const prevReturns = adv.returns ?? (adv.status === 'returned' && adv.dateReturned ? [{ amount: adv.amount, date: adv.dateReturned }] : []);

      const newPaidBack = prevPaidBack + amount;
      const newReturns = [...prevReturns, { amount, date }];

      adv.paidBack = newPaidBack;
      adv.returns = newReturns;

      if (adv.paidBack >= adv.amount) {
        adv.status = 'returned';
        adv.dateReturned = date;
      } else {
        adv.status = 'pending';
      }
      
      save(KEYS.advances, all);
    }
  },

  deleteAdvance(id: number): void {
    save(KEYS.advances, this.getAdvances().filter(a => a.id !== id));
  },

  // ============ SETTINGS ============
  getSettings(): Settings {
    return load<Settings>(KEYS.settings, { businessName: 'Staff Attendance' });
  },

  updateSettings(updates: Partial<Settings>): void {
    const current = this.getSettings();
    save(KEYS.settings, { ...current, ...updates });
  },

  // ============ BULK (for backup/restore) ============
  exportAll() {
    return {
      version: 1,
      timestamp: new Date().toISOString(),
      employees: this.getEmployees(),
      attendance: this.getAttendance(),
      payments: this.getPayments(),
      advances: this.getAdvances(),
      settings: this.getSettings(),
    };
  },

  importAll(data: { employees: Employee[]; attendance: Attendance[]; payments: SalaryPayment[]; advances?: Advance[]; settings: Settings }) {
    save(KEYS.employees, data.employees);
    save(KEYS.attendance, data.attendance);
    save(KEYS.payments, data.payments);
    save(KEYS.advances, data.advances || []);
    save(KEYS.settings, data.settings);
    // Fix next ID to be higher than any existing
    const maxId = Math.max(
      0,
      ...data.employees.map(e => e.id),
      ...data.attendance.map(a => a.id),
      ...data.payments.map(p => p.id),
      ...(data.advances || []).map(a => a.id),
    );
    save(KEYS.nextId, maxId + 1);
  },

  clearAll() {
    save(KEYS.employees, []);
    save(KEYS.attendance, []);
    save(KEYS.payments, []);
    save(KEYS.advances, []);
    save(KEYS.settings, { businessName: 'Staff Attendance' });
    save(KEYS.nextId, 0);
  },
};

import { store } from '../database/db';

export interface SalarySummary {
  totalEarned: number;
  totalPaid: number;
  remainingDue: number;
}

export function useEmployeeSalary(employeeId?: number): SalarySummary {
  if (employeeId === undefined) return { totalEarned: 0, totalPaid: 0, remainingDue: 0 };
  
  const attendance = store.getAttendanceByEmployee(employeeId);
  const payments = store.getPaymentsByEmployee(employeeId);
  
  const totalEarned = attendance.reduce((sum, r) => sum + (r.value * r.dailyWage), 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  
  return { totalEarned, totalPaid, remainingDue: totalEarned - totalPaid };
}

interface AllSalariesResult {
  salaryMap: Record<number, SalarySummary>;
  globalTotalDue: number;
}

export function useAllSalaries(): AllSalariesResult {
  const employees = store.getEmployees();
  const attendance = store.getAttendance();
  const payments = store.getPayments();
  
  const salaryMap: Record<number, SalarySummary> = {};
  
  employees.forEach(emp => {
    salaryMap[emp.id] = { totalEarned: 0, totalPaid: 0, remainingDue: 0 };
  });
  
  attendance.forEach(record => {
    if (!salaryMap[record.employeeId]) {
      salaryMap[record.employeeId] = { totalEarned: 0, totalPaid: 0, remainingDue: 0 };
    }
    salaryMap[record.employeeId].totalEarned += record.value * record.dailyWage;
  });
  
  payments.forEach(payment => {
    if (!salaryMap[payment.employeeId]) {
      salaryMap[payment.employeeId] = { totalEarned: 0, totalPaid: 0, remainingDue: 0 };
    }
    salaryMap[payment.employeeId].totalPaid += payment.amount;
  });
  
  let globalTotalDue = 0;
  Object.keys(salaryMap).forEach(key => {
    const id = Number(key);
    salaryMap[id].remainingDue = salaryMap[id].totalEarned - salaryMap[id].totalPaid;
    globalTotalDue += salaryMap[id].remainingDue;
  });
  
  return { salaryMap, globalTotalDue };
}

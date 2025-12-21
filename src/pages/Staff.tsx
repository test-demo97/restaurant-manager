import { useEffect, useState } from 'react';
import {
  Plus,
  Users,
  Calendar,
  DollarSign,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Calculator,
  Clock,
  Euro,
  CalendarDays,
  User,
} from 'lucide-react';
import {
  getEmployees,
  getWorkShifts,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  createWorkShift,
} from '../lib/database';
import { showToast } from '../components/ui/Toast';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import type { Employee, WorkShift } from '../types';

export function Staff() {
  useLanguage(); // Ready for translations
  const { user, hasPermission } = useAuth();
  const canFullAccess = hasPermission('staff.full');

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(getWeekDates(new Date()));

  // Modal states
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showPayCalculator, setShowPayCalculator] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Pay calculator state
  const [payCalcEmployee, setPayCalcEmployee] = useState<number | null>(null);
  const [payCalcMonth, setPayCalcMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [monthShifts, setMonthShifts] = useState<WorkShift[]>([]);
  const [loadingPayCalc, setLoadingPayCalc] = useState(false);

  // Form states
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    role: '',
    hourly_rate: '',
    phone: '',
    email: '',
    active: true,
  });
  const [shiftForm, setShiftForm] = useState<{
    employee_id: number;
    date: string;
    start_time: string;
    end_time: string;
    shift_type: 'worked' | 'sick' | 'vacation' | 'other';
    notes: string;
  }>({
    employee_id: 0,
    date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '17:00',
    shift_type: 'worked',
    notes: '',
  });

  function getWeekDates(date: Date) {
    const week = [];
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay() + 1); // Monday

    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      week.push(day.toISOString().split('T')[0]);
    }
    return week;
  }

  function changeWeek(delta: number) {
    const newDate = new Date(currentWeek[0]);
    newDate.setDate(newDate.getDate() + delta * 7);
    setCurrentWeek(getWeekDates(newDate));
  }

  // Per staff: trova il proprio dipendente collegato
  const myEmployee = !canFullAccess && user?.employee_id
    ? employees.find(e => e.id === user.employee_id)
    : null;

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeek]);

  async function loadData() {
    try {
      const [emps, sh] = await Promise.all([
        getEmployees(),
        getWorkShifts(currentWeek[0], currentWeek[6]),
      ]);
      setEmployees(emps);
      setShifts(sh);
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Errore nel caricamento dati', 'error');
    } finally {
      setLoading(false);
    }
  }

  function openEmployeeModal(employee?: Employee) {
    if (employee) {
      setEditingEmployee(employee);
      setEmployeeForm({
        name: employee.name,
        role: employee.role,
        hourly_rate: employee.hourly_rate.toString(),
        phone: employee.phone || '',
        email: employee.email || '',
        active: employee.active,
      });
    } else {
      setEditingEmployee(null);
      setEmployeeForm({
        name: '',
        role: '',
        hourly_rate: '',
        phone: '',
        email: '',
        active: true,
      });
    }
    setShowEmployeeModal(true);
  }

  function openShiftModal(employeeId?: number, date?: string) {
    setShiftForm({
      employee_id: employeeId || employees[0]?.id || 0,
      date: date || new Date().toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '17:00',
      shift_type: 'worked',
      notes: '',
    });
    setShowShiftModal(true);
  }

  async function openPayCalculator(employeeId?: number) {
    // Se staff, forza il proprio employee_id
    const targetEmployeeId = canFullAccess
      ? (employeeId || employees[0]?.id || null)
      : user?.employee_id || null;

    setPayCalcEmployee(targetEmployeeId);
    setShowPayCalculator(true);

    if (targetEmployeeId) {
      await loadMonthShifts(targetEmployeeId, payCalcMonth);
    }
  }

  async function loadMonthShifts(employeeId: number, month: string) {
    setLoadingPayCalc(true);
    try {
      const [year, monthNum] = month.split('-').map(Number);
      const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
      const endDate = new Date(year, monthNum, 0).toISOString().split('T')[0];

      const allShifts = await getWorkShifts(startDate, endDate);
      const empShifts = allShifts.filter(s => s.employee_id === employeeId);
      setMonthShifts(empShifts);
    } catch (error) {
      console.error('Error loading month shifts:', error);
      showToast('Errore nel caricamento turni', 'error');
    } finally {
      setLoadingPayCalc(false);
    }
  }

  // Calcolo paga
  function calculatePay(employeeId: number, shiftsData: WorkShift[]) {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return { totalHours: 0, totalPay: 0, workedDays: 0, sickDays: 0, vacationDays: 0 };

    const workedShifts = shiftsData.filter(s => s.shift_type === 'worked' && s.status !== 'absent');
    const sickShifts = shiftsData.filter(s => s.shift_type === 'sick');
    const vacationShifts = shiftsData.filter(s => s.shift_type === 'vacation');

    const totalHours = workedShifts.reduce((sum, s) => sum + s.hours_worked, 0);
    const totalPay = totalHours * emp.hourly_rate;

    return {
      totalHours,
      totalPay,
      workedDays: workedShifts.length,
      sickDays: sickShifts.length,
      vacationDays: vacationShifts.length,
    };
  }

  async function handleSaveEmployee() {
    if (!employeeForm.name.trim() || !employeeForm.role.trim()) {
      showToast('Compila nome e ruolo', 'warning');
      return;
    }

    try {
      const data = {
        name: employeeForm.name.trim(),
        role: employeeForm.role.trim(),
        hourly_rate: parseFloat(employeeForm.hourly_rate) || 10,
        phone: employeeForm.phone || undefined,
        email: employeeForm.email || undefined,
        active: employeeForm.active,
      };

      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, data);
        showToast('Dipendente aggiornato', 'success');
      } else {
        await createEmployee(data as Omit<Employee, 'id'>);
        showToast('Dipendente aggiunto', 'success');
      }

      setShowEmployeeModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving employee:', error);
      showToast('Errore nel salvataggio', 'error');
    }
  }

  async function handleDeleteEmployee(id: number) {
    if (!confirm('Sei sicuro di voler eliminare questo dipendente?')) return;

    try {
      await deleteEmployee(id);
      showToast('Dipendente eliminato', 'success');
      loadData();
    } catch (error) {
      console.error('Error deleting employee:', error);
      showToast('Errore nell\'eliminazione', 'error');
    }
  }

  async function handleSaveShift() {
    if (!shiftForm.employee_id) {
      showToast('Seleziona un dipendente', 'warning');
      return;
    }

    try {
      // Calcolo ore lavorato con supporto turni notturni
      const [startHour, startMin] = shiftForm.start_time.split(':').map(Number);
      const [endHour, endMin] = shiftForm.end_time.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      let hoursWorked = (endMinutes - startMinutes) / 60;

      // Gestione turni notturni (fine < inizio)
      if (hoursWorked < 0) {
        hoursWorked += 24;
      }

      await createWorkShift({
        employee_id: shiftForm.employee_id,
        date: shiftForm.date,
        hours_worked: hoursWorked,
        status: 'scheduled',
        shift_type: shiftForm.shift_type,
        notes: shiftForm.notes || undefined,
        start_time: shiftForm.start_time,
        end_time: shiftForm.end_time,
      });

      showToast('Turno aggiunto', 'success');
      setShowShiftModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving shift:', error);
      showToast('Errore nel salvataggio', 'error');
    }
  }

  function getShiftForDay(employeeId: number, date: string): WorkShift | undefined {
    return shifts.find(s => s.employee_id === employeeId && s.date === date);
  }

  const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // Vista Staff (limitata)
  if (!canFullAccess) {
    if (!myEmployee) {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <User className="w-8 h-8 text-primary-400" />
              I Miei Turni
            </h1>
            <p className="text-dark-400 mt-1">Visualizza i tuoi turni e calcola la paga</p>
          </div>

          <div className="card p-8 text-center">
            <User className="w-16 h-16 mx-auto text-dark-500 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Account non collegato</h2>
            <p className="text-dark-400">
              Il tuo account non è collegato a nessun dipendente.<br />
              Contatta un amministratore per collegare il tuo profilo.
            </p>
          </div>
        </div>
      );
    }

    // Filtra solo i turni del dipendente corrente
    const myShifts = shifts.filter(s => s.employee_id === myEmployee.id);

    return (
      <div className="space-y-6">
        {/* Header Staff */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
              <User className="w-7 h-7 text-primary-400" />
              I Miei Turni
            </h1>
            <p className="text-dark-400 mt-1">Ciao {myEmployee.name}!</p>
          </div>
          <button
            onClick={() => openPayCalculator(myEmployee.id)}
            className="btn-primary"
          >
            <Calculator className="w-5 h-5" />
            Calcola Paga
          </button>
        </div>

        {/* Info dipendente */}
        <div className="card">
          <div className="card-body">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-500/20 flex items-center justify-center">
                <User className="w-8 h-8 text-primary-400" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-white">{myEmployee.name}</h2>
                <p className="text-primary-400">{myEmployee.role}</p>
                <div className="flex items-center gap-1 mt-1 text-sm text-dark-400">
                  <Euro className="w-4 h-4" />
                  {myEmployee.hourly_rate.toFixed(2)}/ora
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Calendario Turni Staff */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="font-semibold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              I Miei Turni
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => changeWeek(-1)}
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-dark-300 min-w-[140px] text-center">
                {new Date(currentWeek[0]).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
                {' - '}
                {new Date(currentWeek[6]).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
              </span>
              <button
                onClick={() => changeWeek(1)}
                className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-7 gap-2">
              {currentWeek.map((date, index) => {
                const shift = getShiftForDay(myEmployee.id, date);
                const isToday = date === new Date().toISOString().split('T')[0];

                return (
                  <div
                    key={date}
                    className={`p-3 rounded-xl text-center ${
                      isToday ? 'ring-2 ring-primary-500' : ''
                    } ${shift ? 'bg-dark-900' : 'bg-dark-800'}`}
                  >
                    <div className="text-xs text-dark-400 font-medium">{weekDays[index]}</div>
                    <div className={`text-lg font-bold ${isToday ? 'text-primary-400' : 'text-white'}`}>
                      {new Date(date).getDate()}
                    </div>
                    {shift ? (
                      <div
                        className={`mt-2 p-2 rounded-lg text-xs ${
                          shift.shift_type === 'worked'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : shift.shift_type === 'sick'
                            ? 'bg-red-500/20 text-red-400'
                            : shift.shift_type === 'vacation'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        <div className="font-medium">
                          {shift.start_time} - {shift.end_time}
                        </div>
                        <div className="text-[10px] opacity-75 mt-0.5">
                          {shift.hours_worked}h
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 p-2 text-xs text-dark-500">
                        Riposo
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Riepilogo settimana */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-4 text-center">
            <Clock className="w-6 h-6 mx-auto text-primary-400 mb-2" />
            <div className="text-2xl font-bold text-white">
              {myShifts.filter(s => s.shift_type === 'worked').reduce((sum, s) => sum + s.hours_worked, 0)}h
            </div>
            <div className="text-xs text-dark-400">Ore questa settimana</div>
          </div>
          <div className="card p-4 text-center">
            <CalendarDays className="w-6 h-6 mx-auto text-emerald-400 mb-2" />
            <div className="text-2xl font-bold text-white">
              {myShifts.filter(s => s.shift_type === 'worked').length}
            </div>
            <div className="text-xs text-dark-400">Giorni lavorativi</div>
          </div>
          <div className="card p-4 text-center">
            <Calendar className="w-6 h-6 mx-auto text-blue-400 mb-2" />
            <div className="text-2xl font-bold text-white">
              {myShifts.filter(s => s.shift_type === 'vacation').length}
            </div>
            <div className="text-xs text-dark-400">Ferie</div>
          </div>
          <div className="card p-4 text-center">
            <Euro className="w-6 h-6 mx-auto text-amber-400 mb-2" />
            <div className="text-2xl font-bold text-white">
              {(myShifts.filter(s => s.shift_type === 'worked').reduce((sum, s) => sum + s.hours_worked, 0) * myEmployee.hourly_rate).toFixed(0)}
            </div>
            <div className="text-xs text-dark-400">Paga settimana</div>
          </div>
        </div>

        {/* Pay Calculator Modal (Staff) */}
        <PayCalculatorModal
          isOpen={showPayCalculator}
          onClose={() => setShowPayCalculator(false)}
          employees={[myEmployee]}
          selectedEmployee={myEmployee.id}
          onEmployeeChange={() => {}}
          month={payCalcMonth}
          onMonthChange={async (m) => {
            setPayCalcMonth(m);
            await loadMonthShifts(myEmployee.id, m);
          }}
          shifts={monthShifts}
          loading={loadingPayCalc}
          calculatePay={calculatePay}
          canSelectEmployee={false}
        />
      </div>
    );
  }

  // Vista Admin/Superadmin (completa)
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Personale</h1>
          <p className="text-dark-400 mt-1">Gestisci dipendenti e turni</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => openPayCalculator()}
            className="btn-secondary"
          >
            <Calculator className="w-5 h-5" />
            <span className="hidden sm:inline">Calcola Paga</span>
          </button>
          <button onClick={() => openShiftModal()} className="btn-secondary">
            <Calendar className="w-5 h-5" />
            <span className="hidden sm:inline">Nuovo Turno</span>
          </button>
          <button onClick={() => openEmployeeModal()} className="btn-primary">
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Nuovo Dipendente</span>
          </button>
        </div>
      </div>

      {/* Employees List */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Dipendenti ({employees.length})
          </h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 md:grid-cols-3 gap-4">
            {employees.map((emp) => (
              <div
                key={emp.id}
                className={`bg-dark-900 rounded-xl p-4 ${!emp.active ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{emp.name}</h3>
                    <p className="text-sm text-primary-400">{emp.role}</p>
                    <div className="flex items-center gap-1 mt-2 text-sm text-dark-400">
                      <DollarSign className="w-4 h-4" />
                      €{emp.hourly_rate.toFixed(2)}/ora
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openPayCalculator(emp.id)}
                      className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                      title="Calcola paga"
                    >
                      <Calculator className="w-4 h-4 text-dark-400" />
                    </button>
                    <button
                      onClick={() => openEmployeeModal(emp)}
                      className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-dark-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteEmployee(emp.id)}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
                {!emp.active && (
                  <span className="badge-danger mt-2">Inattivo</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weekly Schedule */}
      <div className="card">
        <div className="card-header flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="font-semibold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Turni Settimanali
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeWeek(-1)}
              className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-dark-300 min-w-[140px] text-center">
              {new Date(currentWeek[0]).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
              {' - '}
              {new Date(currentWeek[6]).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}
            </span>
            <button
              onClick={() => changeWeek(1)}
              className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider bg-dark-900 sticky left-0">
                  Dipendente
                </th>
                {currentWeek.map((date, index) => (
                  <th
                    key={date}
                    className="px-4 py-3 text-center text-xs font-semibold text-dark-300 uppercase tracking-wider bg-dark-900 min-w-[90px]"
                  >
                    <div>{weekDays[index]}</div>
                    <div className="text-dark-500 font-normal">
                      {new Date(date).getDate()}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.filter(e => e.active).map((emp) => (
                <tr key={emp.id} className="border-b border-dark-700">
                  <td className="px-4 py-3 sticky left-0 bg-dark-800">
                    <p className="font-medium text-white">{emp.name}</p>
                    <p className="text-xs text-dark-400">{emp.role}</p>
                  </td>
                  {currentWeek.map((date) => {
                    const shift = getShiftForDay(emp.id, date);
                    return (
                      <td key={date} className="px-2 py-2 text-center">
                        {shift ? (
                          <div
                            className={`p-2 rounded-lg text-xs ${
                              shift.shift_type === 'worked'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : shift.shift_type === 'sick'
                                ? 'bg-red-500/20 text-red-400'
                                : shift.shift_type === 'vacation'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            <div className="font-medium">
                              {shift.start_time} - {shift.end_time}
                            </div>
                            <div className="text-[10px] opacity-75">
                              {shift.hours_worked}h
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => openShiftModal(emp.id, date)}
                            className="w-full p-2 rounded-lg border-2 border-dashed border-dark-600 hover:border-primary-500 hover:bg-dark-700 transition-colors text-dark-500 hover:text-primary-400"
                          >
                            <Plus className="w-4 h-4 mx-auto" />
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Modal */}
      <Modal
        isOpen={showEmployeeModal}
        onClose={() => {
          setShowEmployeeModal(false);
          setEditingEmployee(null);
          setEmployeeForm({
            name: '',
            role: '',
            hourly_rate: '',
            phone: '',
            email: '',
            active: true,
          });
        }}
        title={editingEmployee ? 'Modifica Dipendente' : 'Nuovo Dipendente'}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Nome *</label>
            <input
              type="text"
              value={employeeForm.name}
              onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
              className="input"
              placeholder="Nome completo"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Ruolo *</label>
              <input
                type="text"
                value={employeeForm.role}
                onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })}
                className="input"
                placeholder="Es. Cuoco"
              />
            </div>
            <div>
              <label className="label">Tariffa Oraria (€)</label>
              <input
                type="number"
                step="0.01"
                value={employeeForm.hourly_rate}
                onChange={(e) => setEmployeeForm({ ...employeeForm, hourly_rate: e.target.value })}
                className="input"
                placeholder="10.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Telefono</label>
              <input
                type="tel"
                value={employeeForm.phone}
                onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                className="input"
                placeholder="+39..."
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={employeeForm.email}
                onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                className="input"
                placeholder="email@esempio.com"
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-white">Attivo</span>
            <button
              type="button"
              onClick={() => setEmployeeForm({ ...employeeForm, active: !employeeForm.active })}
              className={`relative w-14 h-8 rounded-full transition-colors ${
                employeeForm.active ? 'bg-emerald-500' : 'bg-dark-600'
              }`}
            >
              <span
                className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-transform ${
                  employeeForm.active ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button onClick={handleSaveEmployee} className="btn-primary flex-1">
              {editingEmployee ? 'Salva' : 'Aggiungi'}
            </button>
            <button onClick={() => setShowEmployeeModal(false)} className="btn-secondary">
              Annulla
            </button>
          </div>
        </div>
      </Modal>

      {/* Shift Modal */}
      <Modal
        isOpen={showShiftModal}
        onClose={() => {
          setShowShiftModal(false);
          // Reset form to defaults
          setShiftForm({
            employee_id: employees[0]?.id || 0,
            date: new Date().toISOString().split('T')[0],
            start_time: '09:00',
            end_time: '17:00',
            shift_type: 'worked',
            notes: '',
          });
        }}
        title="Nuovo Turno"
        size="xl"
      >
        <div className="space-y-4">
          {/* Desktop: dipendente e data su stessa riga */}
          <div className="md:grid md:grid-cols-2 md:gap-4">
            <div>
              <label className="label">Dipendente *</label>
              <select
                value={shiftForm.employee_id}
                onChange={(e) => setShiftForm({ ...shiftForm, employee_id: parseInt(e.target.value) })}
                className="select"
              >
                {employees.filter(e => e.active).map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} - {emp.role}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-4 md:mt-0">
              <label className="label">Data *</label>
              <input
                type="date"
                value={shiftForm.date}
                onChange={(e) => setShiftForm({ ...shiftForm, date: e.target.value })}
                className="input"
              />
            </div>
          </div>

          {/* Orari e tipo turno */}
          <div className="md:grid md:grid-cols-4 md:gap-4">
            <div>
              <label className="label">Inizio</label>
              <input
                type="time"
                value={shiftForm.start_time}
                onChange={(e) => setShiftForm({ ...shiftForm, start_time: e.target.value })}
                className="input"
              />
            </div>
            <div className="mt-4 md:mt-0">
              <label className="label">Fine</label>
              <input
                type="time"
                value={shiftForm.end_time}
                onChange={(e) => setShiftForm({ ...shiftForm, end_time: e.target.value })}
                className="input"
              />
            </div>
            <div className="mt-4 md:mt-0 md:col-span-2">
              <label className="label">Tipo Turno</label>
              <select
                value={shiftForm.shift_type}
                onChange={(e) => setShiftForm({ ...shiftForm, shift_type: e.target.value as 'worked' | 'sick' | 'vacation' | 'other' })}
                className="select"
              >
                <option value="worked">Lavorativo</option>
                <option value="vacation">Ferie</option>
                <option value="sick">Malattia</option>
                <option value="other">Altro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Note</label>
            <textarea
              value={shiftForm.notes}
              onChange={(e) => setShiftForm({ ...shiftForm, notes: e.target.value })}
              className="input resize-none h-16"
              placeholder="Note opzionali..."
            />
          </div>

          <div className="flex items-center gap-3 pt-4">
            <button onClick={handleSaveShift} className="btn-primary flex-1">
              Salva Turno
            </button>
            <button onClick={() => setShowShiftModal(false)} className="btn-secondary">
              Annulla
            </button>
          </div>
        </div>
      </Modal>

      {/* Pay Calculator Modal */}
      <PayCalculatorModal
        isOpen={showPayCalculator}
        onClose={() => setShowPayCalculator(false)}
        employees={employees.filter(e => e.active)}
        selectedEmployee={payCalcEmployee}
        onEmployeeChange={async (id) => {
          setPayCalcEmployee(id);
          if (id) await loadMonthShifts(id, payCalcMonth);
        }}
        month={payCalcMonth}
        onMonthChange={async (m) => {
          setPayCalcMonth(m);
          if (payCalcEmployee) await loadMonthShifts(payCalcEmployee, m);
        }}
        shifts={monthShifts}
        loading={loadingPayCalc}
        calculatePay={calculatePay}
        canSelectEmployee={true}
      />
    </div>
  );
}

// Componente Modal Calcolatore Paga
interface PayCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  selectedEmployee: number | null;
  onEmployeeChange: (id: number) => void;
  month: string;
  onMonthChange: (month: string) => void;
  shifts: WorkShift[];
  loading: boolean;
  calculatePay: (employeeId: number, shifts: WorkShift[]) => {
    totalHours: number;
    totalPay: number;
    workedDays: number;
    sickDays: number;
    vacationDays: number;
  };
  canSelectEmployee: boolean;
}

function PayCalculatorModal({
  isOpen,
  onClose,
  employees,
  selectedEmployee,
  onEmployeeChange,
  month,
  onMonthChange,
  shifts,
  loading,
  calculatePay,
  canSelectEmployee,
}: PayCalculatorModalProps) {
  const selectedEmp = employees.find(e => e.id === selectedEmployee);
  const payData = selectedEmployee ? calculatePay(selectedEmployee, shifts) : null;

  const monthNames = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];

  const [year, monthNum] = month.split('-').map(Number);
  const monthLabel = `${monthNames[monthNum - 1]} ${year}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Calcola Paga"
      size="lg"
    >
      <div className="space-y-6">
        {/* Selettori */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {canSelectEmployee && (
            <div>
              <label className="label">Dipendente</label>
              <select
                value={selectedEmployee || ''}
                onChange={(e) => onEmployeeChange(parseInt(e.target.value))}
                className="select"
              >
                <option value="">Seleziona...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} - {emp.role}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className={canSelectEmployee ? '' : 'sm:col-span-2'}>
            <label className="label">Mese</label>
            <input
              type="month"
              value={month}
              onChange={(e) => onMonthChange(e.target.value)}
              className="input"
            />
          </div>
        </div>

        {/* Risultati */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : selectedEmp && payData ? (
          <>
            {/* Info dipendente */}
            <div className="bg-dark-900 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-500/20 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{selectedEmp.name}</h3>
                  <p className="text-sm text-dark-400">{selectedEmp.role} - €{selectedEmp.hourly_rate.toFixed(2)}/ora</p>
                </div>
              </div>
            </div>

            {/* Statistiche mese */}
            <div>
              <h3 className="text-sm font-medium text-dark-300 mb-3">{monthLabel}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-dark-900 rounded-xl p-4 text-center">
                  <Clock className="w-5 h-5 mx-auto text-primary-400 mb-2" />
                  <div className="text-xl font-bold text-white">{payData.totalHours.toFixed(1)}</div>
                  <div className="text-xs text-dark-400">Ore lavorate</div>
                </div>
                <div className="bg-dark-900 rounded-xl p-4 text-center">
                  <CalendarDays className="w-5 h-5 mx-auto text-emerald-400 mb-2" />
                  <div className="text-xl font-bold text-white">{payData.workedDays}</div>
                  <div className="text-xs text-dark-400">Giorni lavoro</div>
                </div>
                <div className="bg-dark-900 rounded-xl p-4 text-center">
                  <Calendar className="w-5 h-5 mx-auto text-blue-400 mb-2" />
                  <div className="text-xl font-bold text-white">{payData.vacationDays}</div>
                  <div className="text-xs text-dark-400">Giorni ferie</div>
                </div>
                <div className="bg-dark-900 rounded-xl p-4 text-center">
                  <Calendar className="w-5 h-5 mx-auto text-red-400 mb-2" />
                  <div className="text-xl font-bold text-white">{payData.sickDays}</div>
                  <div className="text-xs text-dark-400">Giorni malattia</div>
                </div>
              </div>
            </div>

            {/* Calcolo paga */}
            <div className="bg-gradient-to-br from-primary-500/20 to-primary-600/10 rounded-xl p-6 border border-primary-500/30">
              <h3 className="text-sm font-medium text-primary-300 mb-4">Calcolo Paga Lorda</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-dark-300">
                  <span>Ore lavorate</span>
                  <span className="text-white">{payData.totalHours.toFixed(1)} h</span>
                </div>
                <div className="flex justify-between text-dark-300">
                  <span>Tariffa oraria</span>
                  <span className="text-white">€ {selectedEmp.hourly_rate.toFixed(2)}</span>
                </div>
                <div className="border-t border-primary-500/30 my-3"></div>
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium text-white">Totale Lordo</span>
                  <span className="text-2xl font-bold text-primary-400">€ {payData.totalPay.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Dettaglio turni */}
            {shifts.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-dark-300 mb-3">Dettaglio Turni ({shifts.length})</h3>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {shifts.sort((a, b) => a.date.localeCompare(b.date)).map((shift) => (
                    <div
                      key={shift.id}
                      className="flex items-center justify-between p-3 bg-dark-900 rounded-lg text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${
                          shift.shift_type === 'worked' ? 'bg-emerald-500' :
                          shift.shift_type === 'sick' ? 'bg-red-500' :
                          shift.shift_type === 'vacation' ? 'bg-blue-500' : 'bg-amber-500'
                        }`} />
                        <span className="text-dark-400">
                          {new Date(shift.date).toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-white">{shift.start_time} - {shift.end_time}</span>
                      </div>
                      <span className="text-dark-300">{shift.hours_worked}h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8 text-dark-400">
            <Calculator className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Seleziona un dipendente e un mese per calcolare la paga</p>
          </div>
        )}

        <button onClick={onClose} className="btn-primary w-full">
          Chiudi
        </button>
      </div>
    </Modal>
  );
}

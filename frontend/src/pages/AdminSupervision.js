import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowRightLeft,
  Calendar,
  DollarSign,
  Eye,
  LogOut,
  Mail,
  Settings,
  Shield,
  Trash2,
  UserCheck,
  Users
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import BrandLogo from "../components/BrandLogo";

const API_BASE_URL = process.env.REACT_APP_API_URL;

const AdminSupervision = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [relationships, setRelationships] = useState([]);
  const [relationshipStats, setRelationshipStats] = useState({ total: 0, active: 0, inactive: 0, avgAttendance: 0 });
  const [paymentsOverview, setPaymentsOverview] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [assignReason, setAssignReason] = useState("");
  const [selectedTrainerSupervision, setSelectedTrainerSupervision] = useState(null);
  const [supervisionData, setSupervisionData] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    userId: "",
    amount: "",
    plan: "8pases",
    method: "efectivo",
    monthsPaid: 1,
    notes: ""
  });
  const [deactivateUserId, setDeactivateUserId] = useState("");
  const [deactivateReason, setDeactivateReason] = useState("");
  const [deactivateType, setDeactivateType] = useState("other");
  const [deactivateFinalPayment, setDeactivateFinalPayment] = useState(0);
  const [selectedUserHistoryId, setSelectedUserHistoryId] = useState("");
  const [userHistory, setUserHistory] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const authHeaders = useMemo(() => {
    const token = localStorage.getItem("bootcamp_token");
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : ""
    };
  }, []);

  const apiRequest = async (path, options = {}) => {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        ...authHeaders,
        ...(options.headers || {})
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Error de servidor");
    return data;
  };

  const loadInitial = async () => {
    setError("");
    try {
      const [relRes, payRes, trainersRes, usersRes] = await Promise.all([
        apiRequest("/admin/relationships"),
        apiRequest("/admin/payments/overview"),
        apiRequest("/admin/trainers/assignable"),
        apiRequest("/admin/users?role=user&limit=100")
      ]);
      setRelationships(relRes.relationships || []);
      setRelationshipStats(relRes.stats || { total: 0, active: 0, inactive: 0, avgAttendance: 0 });
      setPaymentsOverview(payRes || null);
      setTrainers(trainersRes.trainers || []);
      setStudents(usersRes.users || []);
    } catch (err) {
      setError(err.message || "No se pudo cargar supervision");
    }
  };

  useEffect(() => {
    loadInitial();
  }, []);

  const assignRelationship = async () => {
    try {
      setError("");
      setSuccess("");
      await apiRequest("/admin/relationships/assign", {
        method: "POST",
        body: JSON.stringify({
          trainerId: selectedTrainerId,
          studentId: selectedStudentId,
          reason: assignReason
        })
      });
      setSuccess("Relacion asignada correctamente");
      setSelectedStudentId("");
      setAssignReason("");
      await loadInitial();
    } catch (err) {
      setError(err.message || "No se pudo asignar");
    }
  };

  const removeRelationship = async (relationshipId) => {
    try {
      setError("");
      setSuccess("");
      await apiRequest(`/admin/relationships/${relationshipId}`, {
        method: "DELETE",
        body: JSON.stringify({ reason: "Remocion manual" })
      });
      setSuccess("Relacion removida");
      await loadInitial();
    } catch (err) {
      setError(err.message || "No se pudo remover");
    }
  };

  const loadSupervision = async () => {
    if (!selectedTrainerSupervision) return;
    try {
      setError("");
      const data = await apiRequest(`/admin/supervision/${selectedTrainerSupervision}`);
      setSupervisionData(data);
    } catch (err) {
      setError(err.message || "No se pudo cargar supervision de entrenador");
    }
  };

  const registerPayment = async () => {
    try {
      setError("");
      setSuccess("");
      await apiRequest("/admin/payments/register", {
        method: "POST",
        body: JSON.stringify({
          userId: paymentForm.userId,
          amount: Number(paymentForm.amount || 0),
          plan: paymentForm.plan,
          method: paymentForm.method,
          monthsPaid: Number(paymentForm.monthsPaid || 1),
          notes: paymentForm.notes
        })
      });
      setSuccess("Pago registrado");
      await loadInitial();
    } catch (err) {
      setError(err.message || "No se pudo registrar pago");
    }
  };

  const deactivateUser = async () => {
    try {
      setError("");
      setSuccess("");
      await apiRequest(`/admin/users/${deactivateUserId}/deactivate`, {
        method: "POST",
        body: JSON.stringify({
          reason: deactivateReason,
          type: deactivateType,
          finalPayment: Number(deactivateFinalPayment || 0)
        })
      });
      setSuccess("Usuario dado de baja");
      await loadInitial();
    } catch (err) {
      setError(err.message || "No se pudo dar de baja");
    }
  };

  const loadUserHistory = async () => {
    if (!selectedUserHistoryId) return;
    try {
      setError("");
      const data = await apiRequest(`/admin/users/${selectedUserHistoryId}/history`);
      setUserHistory(data);
    } catch (err) {
      setError(err.message || "No se pudo cargar historial");
    }
  };

  return (
    <div className="min-h-screen bg-bootcamp-black flex">
      <aside className="hidden lg:flex w-72 bg-bootcamp-gray border-r border-white/5 flex-col">
        <div className="p-6 border-b border-white/5">
          <BrandLogo size="sm" subtitle="Admin Panel" subtitleClassName="text-green-500" />
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {[
            { label: "Dashboard", icon: Activity, path: "/admin" },
            { label: "Clases", icon: Calendar, path: "/admin" },
            { label: "Landing", icon: Settings, path: "/admin" },
            { label: "Alumnos", icon: Users, path: "/admin" },
            { label: "Comunicaciones", icon: Mail, path: "/admin" },
            { label: "Supervision", icon: Shield, path: "/admin/supervision", active: true }
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left ${
                item.active ? "bg-bootcamp-orange text-white" : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/5">
          <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-500">
            <LogOut className="w-5 h-5" />
            <span>Cerrar Sesion</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-4 lg:p-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-3xl font-black uppercase text-white">Supervision Admin</h2>
            <p className="text-gray-400">Relaciones trainer-alumno, pagos y bajas</p>
          </div>

          {error ? <div className="p-3 border border-red-500/30 bg-red-500/10 text-red-300">{error}</div> : null}
          {success ? <div className="p-3 border border-green-500/30 bg-green-500/10 text-green-300">{success}</div> : null}

          <div className="flex gap-2 border-b border-white/10 overflow-x-auto">
            {[
              { id: "overview", label: "Resumen" },
              { id: "relationships", label: "Relaciones" },
              { id: "supervision", label: "Supervision trainer" },
              { id: "payments", label: "Pagos" },
              { id: "users", label: "Bajas e historial" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-bold uppercase whitespace-nowrap ${
                  activeTab === tab.id ? "text-bootcamp-orange border-b-2 border-bootcamp-orange" : "text-gray-400"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "overview" ? (
            <div className="grid md:grid-cols-4 gap-4">
              <div className="card-bootcamp p-6">
                <UserCheck className="w-8 h-8 text-blue-400 mb-2" />
                <div className="text-2xl font-bold">{relationshipStats.active}</div>
                <div className="text-xs text-gray-400 uppercase">Relaciones activas</div>
              </div>
              <div className="card-bootcamp p-6">
                <ArrowRightLeft className="w-8 h-8 text-bootcamp-orange mb-2" />
                <div className="text-2xl font-bold">{relationshipStats.total}</div>
                <div className="text-xs text-gray-400 uppercase">Total relaciones</div>
              </div>
              <div className="card-bootcamp p-6">
                <AlertCircle className="w-8 h-8 text-red-400 mb-2" />
                <div className="text-2xl font-bold">{paymentsOverview?.debts?.count || 0}</div>
                <div className="text-xs text-gray-400 uppercase">Usuarios con deuda</div>
              </div>
              <div className="card-bootcamp p-6">
                <DollarSign className="w-8 h-8 text-green-400 mb-2" />
                <div className="text-2xl font-bold">{paymentsOverview?.monthly?.total || 0}</div>
                <div className="text-xs text-gray-400 uppercase">Ingresos mes</div>
              </div>
            </div>
          ) : null}

          {activeTab === "relationships" ? (
            <div className="space-y-4">
              <div className="card-bootcamp p-4 grid md:grid-cols-4 gap-3">
                <select value={selectedTrainerId} onChange={(e) => setSelectedTrainerId(e.target.value)} className="input-bootcamp px-3 py-2">
                  <option value="">Trainer...</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="input-bootcamp px-3 py-2">
                  <option value="">Alumno...</option>
                  {students.map((s) => (
                    <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>
                  ))}
                </select>
                <input value={assignReason} onChange={(e) => setAssignReason(e.target.value)} placeholder="Motivo" className="input-bootcamp px-3 py-2" />
                <button onClick={assignRelationship} className="btn-bootcamp">Asignar</button>
              </div>

              <div className="space-y-2">
                {relationships.map((r) => (
                  <div key={r._id} className="card-bootcamp p-4 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{r.trainer?.name} -&gt; {r.student?.name}</div>
                      <div className="text-sm text-gray-400">{r.status} | Asistencia: {r.stats?.attendanceRate || 0}%</div>
                    </div>
                    <button onClick={() => removeRelationship(r._id)} className="px-3 py-2 border border-red-500/40 text-red-400">
                      <Trash2 className="w-4 h-4 inline-block mr-1" />
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeTab === "supervision" ? (
            <div className="space-y-4">
              <div className="card-bootcamp p-4 flex gap-3">
                <select value={selectedTrainerSupervision || ""} onChange={(e) => setSelectedTrainerSupervision(e.target.value)} className="input-bootcamp px-3 py-2">
                  <option value="">Seleccionar trainer...</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <button onClick={loadSupervision} className="btn-bootcamp">
                  <Eye className="w-4 h-4 inline-block mr-1" />
                  Ver gestion
                </button>
              </div>

              {supervisionData ? (
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="card-bootcamp p-4">Alumnos: {supervisionData.stats?.totalStudents || 0}</div>
                  <div className="card-bootcamp p-4">Clases: {supervisionData.stats?.totalClasses || 0}</div>
                  <div className="card-bootcamp p-4">Asistencias: {supervisionData.stats?.totalAttendances || 0}</div>
                  <div className="card-bootcamp p-4">Rate: {supervisionData.stats?.attendanceRate || 0}%</div>
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTab === "payments" ? (
            <div className="space-y-4">
              <div className="card-bootcamp p-4 grid md:grid-cols-3 gap-3">
                <select value={paymentForm.userId} onChange={(e) => setPaymentForm((p) => ({ ...p, userId: e.target.value }))} className="input-bootcamp px-3 py-2">
                  <option value="">Usuario...</option>
                  {students.map((s) => (
                    <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>
                  ))}
                </select>
                <input type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} placeholder="Monto" className="input-bootcamp px-3 py-2" />
                <select value={paymentForm.plan} onChange={(e) => setPaymentForm((p) => ({ ...p, plan: e.target.value }))} className="input-bootcamp px-3 py-2">
                  <option value="8pases">8pases</option>
                  <option value="12pases">12pases</option>
                  <option value="libre">libre</option>
                </select>
                <select value={paymentForm.method} onChange={(e) => setPaymentForm((p) => ({ ...p, method: e.target.value }))} className="input-bootcamp px-3 py-2">
                  <option value="efectivo">efectivo</option>
                  <option value="transferencia">transferencia</option>
                  <option value="mercadopago">mercadopago</option>
                  <option value="otro">otro</option>
                </select>
                <input type="number" min="1" value={paymentForm.monthsPaid} onChange={(e) => setPaymentForm((p) => ({ ...p, monthsPaid: e.target.value }))} placeholder="Meses" className="input-bootcamp px-3 py-2" />
                <input value={paymentForm.notes} onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notas" className="input-bootcamp px-3 py-2" />
              </div>
              <button onClick={registerPayment} className="btn-bootcamp">Registrar pago</button>
            </div>
          ) : null}

          {activeTab === "users" ? (
            <div className="space-y-4">
              <div className="card-bootcamp p-4 grid md:grid-cols-5 gap-3">
                <select value={deactivateUserId} onChange={(e) => setDeactivateUserId(e.target.value)} className="input-bootcamp px-3 py-2">
                  <option value="">Usuario...</option>
                  {students.map((s) => (
                    <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>
                  ))}
                </select>
                <select value={deactivateType} onChange={(e) => setDeactivateType(e.target.value)} className="input-bootcamp px-3 py-2">
                  <option value="voluntary">voluntary</option>
                  <option value="nonpayment">nonpayment</option>
                  <option value="disciplinary">disciplinary</option>
                  <option value="other">other</option>
                </select>
                <input value={deactivateReason} onChange={(e) => setDeactivateReason(e.target.value)} placeholder="Motivo" className="input-bootcamp px-3 py-2" />
                <input type="number" value={deactivateFinalPayment} onChange={(e) => setDeactivateFinalPayment(e.target.value)} placeholder="Pago final" className="input-bootcamp px-3 py-2" />
                <button onClick={deactivateUser} className="px-3 py-2 border border-red-500/40 text-red-400">Dar de baja</button>
              </div>

              <div className="card-bootcamp p-4 flex gap-3">
                <select value={selectedUserHistoryId} onChange={(e) => setSelectedUserHistoryId(e.target.value)} className="input-bootcamp px-3 py-2">
                  <option value="">Usuario historial...</option>
                  {students.map((s) => (
                    <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>
                  ))}
                </select>
                <button onClick={loadUserHistory} className="btn-bootcamp">Ver historial</button>
              </div>

              {userHistory ? (
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="card-bootcamp p-4">Acciones admin: {userHistory.adminHistory?.length || 0}</div>
                  <div className="card-bootcamp p-4">Pagos: {userHistory.payments?.length || 0}</div>
                  <div className="card-bootcamp p-4">Asistencias: {userHistory.attendances?.length || 0}</div>
                  <div className="card-bootcamp p-4">Relaciones trainer: {userHistory.trainerHistory?.length || 0}</div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
};

export default AdminSupervision;


"use client";

import React, { useEffect, useState } from "react";
import { apiFetch, getStoredUser } from "@/lib/api";
import { UserPlus, Trash2, X, Check, ShieldAlert } from "lucide-react";

export default function AdminRosterPage() {
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userActionMessage, setUserActionMessage] = useState("");

  // Add User Modal State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "PHYSICIAN"
  });

  // Delete User Confirmation Modal State
  const [deletingUser, setDeletingUser] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentUser = getStoredUser();

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const uData = await apiFetch("/admin/users");
      setUsersList(uData.users || []);
    } catch (err: any) {
      setError(err.message || "Failed to load staff roster");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingUser(true);
    setError("");
    setUserActionMessage("");

    try {
      await apiFetch("/admin/users", {
        method: "POST",
        body: JSON.stringify(newUserForm)
      });

      setUserActionMessage(`Successfully added ${newUserForm.name} (${newUserForm.role}).`);
      setIsAddUserOpen(false);
      setNewUserForm({ name: "", email: "", password: "", role: "PHYSICIAN" });
      loadUsers();
    } catch (err: any) {
      setError(err.message || "Failed to add employee");
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setIsDeleting(true);
    setError("");
    setUserActionMessage("");

    try {
      await apiFetch(`/admin/users/${deletingUser.id}`, {
        method: "DELETE"
      });

      setUserActionMessage(`Employee ${deletingUser.name} removed successfully.`);
      setDeletingUser(null);
      loadUsers();
    } catch (err: any) {
      setError(err.message || "Failed to delete employee");
    } finally {
      setIsDeleting(false);
    }
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-purple-50 text-purple-700 border-purple-200/80";
      case "PHYSICIAN":
        return "bg-blue-50 text-blue-700 border-blue-200/80";
      case "NURSE":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/80";
      case "FRONT_DESK":
        return "bg-amber-50 text-amber-700 border-amber-200/80";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#1d1d1f]">Staff Directory & Employee Roster</h2>
          <p className="text-xs text-[#86868b]">View, provision, and remove hospital employees and user accounts.</p>
        </div>

        <button
          onClick={() => setIsAddUserOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white font-semibold text-xs rounded-full shadow-xs transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Employee</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-medium rounded-xl">
          {error}
        </div>
      )}

      {userActionMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium rounded-xl flex items-center gap-2">
          <Check className="w-4 h-4" /> {userActionMessage}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-[#86868b] text-xs">Loading employee roster...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f5f5f7] border-b border-black/[0.04] text-[#86868b] font-medium">
              <tr>
                <th className="py-3 px-4">Employee Name</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Access Role</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.04] text-[#1d1d1f]">
              {usersList.map((u) => {
                const isSelf = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className="hover:bg-black/[0.02]">
                    <td className="py-3.5 px-4 font-medium">
                      {u.name}
                      {isSelf && <span className="ml-2 text-[10px] text-[#0071e3] font-normal">(You)</span>}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#86868b] text-[11px]">{u.email}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${getRoleBadgeClass(u.role)}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isSelf ? (
                        <span className="text-[11px] text-[#86868b] italic">Active Admin</span>
                      ) : (
                        <button
                          onClick={() => setDeletingUser(u)}
                          className="inline-flex items-center gap-1 px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium rounded-full border border-red-200 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* --- ADD EMPLOYEE MODAL --- */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-black/[0.08] shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-4 mb-4">
              <h3 className="text-lg font-semibold text-[#1d1d1f]">Provision New Employee</h3>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="text-[#86868b] hover:text-[#1d1d1f] p-1 rounded-lg hover:bg-black/[0.04]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[#1d1d1f] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Robert Vance, MD"
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.06] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-[#1d1d1f]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#1d1d1f] mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. rvance@hospital.org"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.06] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-[#1d1d1f]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#1d1d1f] mb-1">Temporary Password</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.06] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-[#1d1d1f]"
                />
              </div>

              <div>
                <label className="block font-medium text-[#1d1d1f] mb-1">System Role</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                  className="w-full px-3 py-2 bg-[#f5f5f7] border border-black/[0.06] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-[#1d1d1f]"
                >
                  <option value="PHYSICIAN">PHYSICIAN (Doctor)</option>
                  <option value="NURSE">NURSE (Clinical Staff)</option>
                  <option value="FRONT_DESK">FRONT_DESK (Demographics Only)</option>
                  <option value="ADMIN">ADMIN (System Administrator)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/[0.04]">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-4 py-2 bg-[#f5f5f7] hover:bg-black/[0.06] text-[#1d1d1f] font-medium rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingUser}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium rounded-xl transition disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{addingUser ? "Adding..." : "Provision Employee"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- DELETE CONFIRMATION MODAL --- */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-black/[0.08] shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-semibold text-[#1d1d1f]">Confirm Employee Removal</h3>
            </div>

            <p className="text-xs text-[#86868b] leading-relaxed mb-6">
              Are you sure you want to remove <strong className="text-[#1d1d1f]">{deletingUser.name}</strong> ({deletingUser.email}) from the hospital staff directory? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 bg-[#f5f5f7] hover:bg-black/[0.06] text-[#1d1d1f] font-medium text-xs rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteUser}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded-xl transition disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isDeleting ? "Removing..." : "Remove Employee"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

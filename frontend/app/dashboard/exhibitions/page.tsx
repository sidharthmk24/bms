"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { Loader2, Plus, Tent, CheckCircle, XCircle, Send, ArchiveRestore, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dropdown } from '@/components/Dropdown';
import { BranchInventoryExhibitionsView } from './BranchInventoryExhibitionsView';

export default function ExhibitionsPage() {
  const { user } = useAuth();
  const checkHasRole = (r: string) => {
    return user?.roles?.includes(r) || user?.role === r || user?.primaryRole === r;
  };
  const isAdmin = checkHasRole('SUPER_ADMIN') || checkHasRole('ADMIN');
  const isBranchManager = checkHasRole('BRANCH_MANAGER');
  const isBranchInventory = checkHasRole('BRANCH_INVENTORY') && !isBranchManager;
  const isBranchFrontOffice = checkHasRole('BRANCH_FRONT_OFFICE') && !isBranchManager;
  const isStaffOnly = (isBranchInventory || isBranchFrontOffice) && !isAdmin;
  const isBranch = (isBranchManager || isBranchInventory || isBranchFrontOffice) && !isAdmin;

  const { data: exhibitions, loading, error } = useApiData<any[]>('/exhibitions', []);
  const { data: catalog } = useApiData<any>('/catalog/books?limit=1000', []);
  const { data: usersResponse } = useApiData<any>('/users', []);
  const { data: branchesResponse } = useApiData<any>('/branches', []);
  
  const branchUsers = (usersResponse?.data || usersResponse || []).filter((u: any) => u.branchId === user?.branchId || u.branch?.id === user?.branchId);
  const branches = branchesResponse?.items || (Array.isArray(branchesResponse) ? branchesResponse : []);

  const isFinance = (user?.roles?.includes('FINANCE') || user?.primaryRole === 'FINANCE');
  const showFullHistory = isAdmin || isFinance;

  // History Report State
  const [viewingExhibitionHistory, setViewingExhibitionHistory] = useState<any | null>(null);
  const [historyData, setHistoryData] = useState<any | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleViewHistory = async (ex: any) => {
    setViewingExhibitionHistory(ex);
    setLoadingHistory(true);
    setHistoryData(null);
    try {
      const res = await api.get(`/exhibitions/${ex.id}/history`);
      if (res.success) {
        setHistoryData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch exhibition history:', err);
      alert('Failed to load exhibition details.');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Creation State
  const [isCreating, setIsCreating] = useState(false);
  const [eventName, setEventName] = useState('');
  const [location, setLocation] = useState('');
  const [createBranchId, setCreateBranchId] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cart, setCart] = useState<{bookId: string, quantityRequested: number, title?: string}[]>([]);
  
  const [bookInput, setBookInput] = useState('');
  const [qtyInput, setQtyInput] = useState(5);
  
  // Close/Reconciliation State
  const [closingExhibition, setClosingExhibition] = useState<any | null>(null);
  const [reconciliation, setReconciliation] = useState<any[]>([]);
  const [closeNote, setCloseNote] = useState('');
  
  // View Rejection Reason State
  const [viewingRejectionReason, setViewingRejectionReason] = useState<string | null>(null);

  // Edit & Assign State
  const [editingExhibition, setEditingExhibition] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', location: '', startDate: '', endDate: '' });
  
  const [assigningExhibition, setAssigningExhibition] = useState<any | null>(null);
  const [assignBranchId, setAssignBranchId] = useState('');
  const [assignUserId, setAssignUserId] = useState('');

  const activeSourceBranchId = isAdmin ? createBranchId : user?.branchId;
  const [branchInventory, setBranchInventory] = useState<any[]>([]);

  useEffect(() => {
    if (!activeSourceBranchId) {
      setBranchInventory([]);
      return;
    }
    api.get(`/inventory/branch/${activeSourceBranchId}?limit=10000`)
      .then(res => {
        if (res.success) {
          setBranchInventory(res.data.items || res.data || []);
        }
      })
      .catch(err => console.error('Failed to load branch inventory:', err));
  }, [activeSourceBranchId]);

  const getBookStockQty = (bookId: string) => {
    const item = branchInventory.find((bi: any) => bi.bookId === bookId || bi.book?.id === bookId);
    return item ? item.quantity : 0;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.patch(`/exhibitions/${editingExhibition.id}`, {
        name: editFormData.name,
        location: editFormData.location,
        startDate: new Date(editFormData.startDate).toISOString(),
        endDate: new Date(editFormData.endDate).toISOString(),
      });
      setEditingExhibition(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update exhibition');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.patch(`/exhibitions/${assigningExhibition.id}`, { assignedUserId: assignUserId || null });
      setAssigningExhibition(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to assign user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreate = async () => {
    try {
      setIsSubmitting(true);
      await api.post('/exhibitions', {
        name: eventName,
        location,
        sourceBranchId: createBranchId || undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        assignedUserId: assignedUserId || undefined,
        items: cart.map(i => ({ bookId: i.bookId, quantityTaken: i.quantityRequested }))
      });
      setIsCreating(false);
      setCart([]);
      setEventName(''); setLocation(''); setStartDate(''); setEndDate(''); setAssignedUserId(''); setCreateBranchId('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to request exhibition');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveReject = async (id: string, action: 'approve' | 'reject') => {
    try {
      setIsSubmitting(true);
      await api.post(`/exhibitions/${id}/review`, { 
        status: action === 'approve' ? 'APPROVED' : 'REJECTED' 
      });
    } catch (err: any) {
      alert(err.response?.data?.message || `Failed to ${action}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDispatch = async (id: string) => {
    try {
      setIsSubmitting(true);
      await api.post(`/exhibitions/${id}/dispatch`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to dispatch');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = async () => {
    if (!closingExhibition) return;
    
    // Validate that Sold + Returned + Damaged + Lost + Credit == Taken
    for (const rec of reconciliation) {
      const total = (rec.quantitySold || 0) + (rec.quantityReturned || 0) + (rec.quantityDamaged || 0) + (rec.quantityLost || 0) + (rec.quantityCredit || 0);
      if (total !== rec.quantityTaken) {
        alert(`Mismatch in "${rec.title}": Total accounted (${total}) does not equal quantity taken (${rec.quantityTaken}).`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await api.post(`/exhibitions/${closingExhibition.id}/close`, {
        note: closeNote || undefined,
        items: reconciliation.map(r => ({
          stockId: r.stockId,
          quantitySold: r.quantitySold || 0,
          quantityReturned: r.quantityReturned || 0,
          quantityDamaged: r.quantityDamaged || 0,
          quantityLost: r.quantityLost || 0,
          quantityCredit: r.quantityCredit || 0
        }))
      });
      setClosingExhibition(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to close exhibition');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (ex: any) => {
    switch (ex.status) {
      case 'REQUESTED': return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Requested</span>;
      case 'APPROVED': return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Approved</span>;
      case 'REJECTED': 
        if (ex.rejectionReason) {
          return (
            <button 
              onClick={() => setViewingRejectionReason(ex.rejectionReason)}
              className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors cursor-pointer inline-flex items-center"
            >
              Rejected <AlertCircle className="w-3 h-3 ml-1" />
            </button>
          );
        }
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Rejected</span>;
      case 'ONGOING': return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Ongoing</span>;
      case 'CLOSED': return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Closed</span>;
      default: return null;
    }
  };

  if (loading && (!exhibitions || exhibitions.length === 0)) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
  }

  if (isStaffOnly) {
    return <BranchInventoryExhibitionsView exhibitions={exhibitions || []} user={user} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Exhibitions & Events</h2>
          <p className="text-sm text-gray-500">Manage off-site book sales events.</p>
        </div>
        {(isBranch || isAdmin) && (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            {isAdmin ? 'Create Exhibition' : 'Request Exhibition'}
          </button>
        )}
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event / Branch</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
              <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(exhibitions || []).map((ex: any) => (
              <tr key={ex.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <button 
                    onClick={() => handleViewHistory(ex)}
                    className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors text-left"
                  >
                    {ex.name || ex.eventName}
                  </button>
                  <div className="text-xs text-gray-500">{ex.location} • {ex.branch?.name}</div>
                  {ex.assignedUser && <div className="text-xs text-blue-600 mt-1">Assigned: {ex.assignedUser.name}</div>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(ex.startDate).toLocaleDateString()} - {new Date(ex.endDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {getStatusBadge(ex)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button 
                    onClick={() => handleViewHistory(ex)}
                    className="text-blue-600 hover:text-blue-900 font-medium inline-block mr-3"
                  >
                    View Details
                  </button>
                  {isAdmin && ex.status === 'REQUESTED' && (
                    <div className="flex justify-end space-x-2 mt-2">
                      <button onClick={() => handleApproveReject(ex.id, 'reject')} className="text-red-600 hover:text-red-900">Reject</button>
                      <button onClick={() => handleApproveReject(ex.id, 'approve')} className="text-blue-600 hover:text-blue-900 font-bold">Approve</button>
                    </div>
                  )}
                  {isAdmin && ex.status !== 'CLOSED' && (
                    <button onClick={() => {
                      setAssigningExhibition(ex);
                      setAssignBranchId('');
                      setAssignUserId(ex.assignedUserId || '');
                    }} className="text-green-600 hover:text-green-900 flex items-center justify-end w-full mt-2">
                      Assign
                    </button>
                  )}
                  {ex.requestedById === user?.id && ex.status !== 'CLOSED' && ex.status !== 'ONGOING' && (
                    <button onClick={() => {
                      setEditingExhibition(ex);
                      setEditFormData({
                        name: ex.name || ex.eventName,
                        location: ex.location,
                        startDate: ex.startDate ? new Date(ex.startDate).toISOString().split('T')[0] : '',
                        endDate: ex.endDate ? new Date(ex.endDate).toISOString().split('T')[0] : ''
                      });
                    }} className="text-blue-600 hover:text-blue-900 flex items-center justify-end w-full mt-2">
                      Edit Event
                    </button>
                  )}
                  {isBranch && ex.status === 'APPROVED' && (
                    <button onClick={() => handleDispatch(ex.id)} className="text-purple-600 hover:text-purple-900 flex items-center justify-end w-full">
                      <Send className="w-4 h-4 mr-1" /> Dispatch Stock
                    </button>
                  )}
                  {isBranch && ex.status === 'ONGOING' && (
                    <button 
                      onClick={() => {
                        setClosingExhibition(ex);
                        setReconciliation(ex.stock.map((s: any) => ({
                          stockId: s.id,
                          title: s.book?.title,
                          quantityTaken: s.quantityTaken,
                          quantitySold: s.quantityTaken, // Default assume all sold
                          quantityReturned: 0,
                          quantityDamaged: 0,
                          quantityLost: 0,
                          quantityCredit: 0
                        })));
                      }} 
                      className="text-amber-600 hover:text-amber-900 flex items-center justify-end w-full"
                    >
                      <ArchiveRestore className="w-4 h-4 mr-1" /> Close & Reconcile
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {exhibitions?.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No exhibitions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Creation Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Tent className="w-5 h-5 mr-2"/> Request Exhibition</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                  <input type="text" value={eventName} onChange={e => setEventName(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-lg sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-lg sm:text-sm" />
                </div>
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Branch</label>
                    <Dropdown
                      value={createBranchId}
                      onChange={(val) => {
                        setCreateBranchId(val);
                        setAssignedUserId('');
                      }}
                      placeholder="Select a branch..."
                      options={branches.map((b: any) => ({ value: b.id, label: b.name }))}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Staff</label>
                  <Dropdown
                    value={assignedUserId}
                    onChange={(val) => setAssignedUserId(val)}
                    placeholder={isAdmin && !createBranchId ? "Select branch first..." : "Select staff member..."}
                    options={(usersResponse?.data || usersResponse || [])
                      .filter((u: any) => {
                        const targetBranchId = isAdmin ? createBranchId : user?.branchId;
                        return u.branchId === targetBranchId || u.branch?.id === targetBranchId;
                      })
                      .map((u: any) => ({
                        value: u.id,
                        label: `${u.name} (${u.roles?.map((r: any) => r.role).join(', ') || u.primaryRole})`
                      }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-lg sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-lg sm:text-sm" />
                </div>
              </div>

              <div className="border-t pt-4 mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Requested Stock</h4>
                <div className="flex space-x-2">
                  <div className="flex-1">
                    <Dropdown
                      searchable={true}
                      value={bookInput}
                      onChange={(val) => setBookInput(val)}
                      placeholder="Select a book..."
                      options={(catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : [])).map((b: any) => {
                        const stock = getBookStockQty(b.id);
                        return {
                          value: b.id,
                          label: b.title,
                          badge: `Stock: ${stock}`,
                          badgeClassName: stock > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                        };
                      })}
                    />
                  </div>
                  <input type="number" min="1" value={qtyInput} onChange={e => setQtyInput(Number(e.target.value))} placeholder="Qty" className="w-20 block px-3 py-2 border border-gray-300 rounded-lg sm:text-sm" />
                  <button 
                    onClick={() => {
                      if (bookInput && qtyInput > 0) {
                        const bookList = catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : []);
                        const book = bookList.find((b: any) => b.id === bookInput);
                        const existingItemIndex = cart.findIndex(i => i.bookId === bookInput);
                        if (existingItemIndex >= 0) {
                          const newCart = [...cart];
                          newCart[existingItemIndex].quantityRequested += qtyInput;
                          setCart(newCart);
                        } else {
                          setCart([...cart, { bookId: bookInput, quantityRequested: qtyInput, title: book?.title }]);
                        }
                        setBookInput('');
                      }
                    }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium"
                  >Add</button>
                </div>
              </div>

              <div className="border rounded-lg max-h-40 overflow-y-auto mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cart.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.title}</td>
                        <td className="px-4 py-2 text-sm text-right font-medium">{item.quantityRequested}</td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-red-500 text-xs">Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreate} disabled={cart.length === 0 || !eventName || isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reconciliation Modal */}
      <AnimatePresence>
        {closingExhibition && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Close & Reconcile Exhibition</h3>
              <p className="text-sm text-gray-500 mb-4">{closingExhibition.eventName}</p>
              
              <div className="bg-blue-50 text-blue-800 p-3 rounded-lg mb-4 text-sm flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                <p>You must account for every book taken. For each row: <strong>Sold + Returned + Damaged + Lost + Credit = Taken</strong>.</p>
              </div>

              <div className="max-h-96 overflow-y-auto mb-6 border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Book</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Taken</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Sold</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Returned</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-red-500">Damaged</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-red-500">Lost</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-rose-500">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reconciliation.map((rec: any, idx) => {
                      const total = (rec.quantitySold || 0) + (rec.quantityReturned || 0) + (rec.quantityDamaged || 0) + (rec.quantityLost || 0) + (rec.quantityCredit || 0);
                      const isBalanced = total === rec.quantityTaken;
                      
                      return (
                        <tr key={rec.stockId} className={!isBalanced ? 'bg-red-50' : ''}>
                          <td className="px-4 py-3 text-sm text-gray-900">{rec.title}</td>
                          <td className="px-4 py-3 text-sm text-center font-bold">{rec.quantityTaken}</td>
                          <td className="px-2 py-3 text-center">
                            <input type="number" min="0" value={rec.quantitySold} onChange={(e) => {
                              const newRec = [...reconciliation];
                              newRec[idx].quantitySold = Number(e.target.value);
                              setReconciliation(newRec);
                            }} className="w-16 text-center border rounded py-1" />
                          </td>
                          <td className="px-2 py-3 text-center">
                            <input type="number" min="0" value={rec.quantityReturned} onChange={(e) => {
                              const newRec = [...reconciliation];
                              newRec[idx].quantityReturned = Number(e.target.value);
                              setReconciliation(newRec);
                            }} className="w-16 text-center border rounded py-1" />
                          </td>
                          <td className="px-2 py-3 text-center">
                            <input type="number" min="0" value={rec.quantityDamaged} onChange={(e) => {
                              const newRec = [...reconciliation];
                              newRec[idx].quantityDamaged = Number(e.target.value);
                              setReconciliation(newRec);
                            }} className="w-16 text-center border border-red-300 rounded py-1" />
                          </td>
                          <td className="px-2 py-3 text-center">
                            <input type="number" min="0" value={rec.quantityLost} onChange={(e) => {
                              const newRec = [...reconciliation];
                              newRec[idx].quantityLost = Number(e.target.value);
                              setReconciliation(newRec);
                            }} className="w-16 text-center border border-red-300 rounded py-1" />
                          </td>
                          <td className="px-2 py-3 text-center">
                            <input type="number" min="0" value={rec.quantityCredit} onChange={(e) => {
                              const newRec = [...reconciliation];
                              newRec[idx].quantityCredit = Number(e.target.value);
                              setReconciliation(newRec);
                            }} className="w-16 text-center border border-rose-300 rounded py-1" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end space-x-3">
                <button onClick={() => setClosingExhibition(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                <button onClick={handleClose} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50">
                  {isSubmitting ? 'Processing...' : 'Confirm Reconciliation'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rejection Reason Modal */}
      <AnimatePresence>
        {viewingRejectionReason && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center text-red-600">
                <XCircle className="w-5 h-5 mr-2" />
                Exhibition Rejected
              </h3>
              <div className="bg-red-50 p-4 rounded-lg border border-red-100 text-sm text-red-800 whitespace-pre-wrap">
                {viewingRejectionReason}
              </div>
              <div className="flex justify-end mt-6">
                <button 
                  onClick={() => setViewingRejectionReason(null)} 
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Exhibition Modal */}
      <AnimatePresence>
        {editingExhibition && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Tent className="w-5 h-5 mr-2"/> Edit Exhibition Details</h3>
              <form onSubmit={handleEdit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                  <input required type="text" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} className="block w-full px-3 py-2 border rounded-lg sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input required type="text" value={editFormData.location} onChange={e => setEditFormData({...editFormData, location: e.target.value})} className="block w-full px-3 py-2 border rounded-lg sm:text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input required type="date" value={editFormData.startDate} onChange={e => setEditFormData({...editFormData, startDate: e.target.value})} className="block w-full px-3 py-2 border rounded-lg sm:text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input required type="date" value={editFormData.endDate} onChange={e => setEditFormData({...editFormData, endDate: e.target.value})} className="block w-full px-3 py-2 border rounded-lg sm:text-sm" />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                  <button type="button" onClick={() => setEditingExhibition(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign User Modal */}
      <AnimatePresence>
        {assigningExhibition && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">Assign Staff to Exhibition</h3>
              <form onSubmit={handleAssign} className="space-y-4">
                <p className="text-sm text-gray-500 mb-4">Assign a staff member to oversee the <strong>{assigningExhibition.name}</strong> event.</p>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Branch</label>
                  <Dropdown
                    value={assignBranchId}
                    onChange={(val) => {
                      setAssignBranchId(val);
                      setAssignUserId('');
                    }}
                    placeholder="Select a branch..."
                    options={branches.map((b: any) => ({ value: b.id, label: b.name }))}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Staff Member</label>
                  <Dropdown
                    value={assignUserId}
                    onChange={(val) => setAssignUserId(val)}
                    placeholder={assignBranchId ? "Select staff..." : "Select a branch first"}
                    options={(usersResponse?.data || usersResponse || [])
                      .filter((u: any) => u.branchId === assignBranchId || u.branch?.id === assignBranchId)
                      .map((u: any) => ({ value: u.id, label: `${u.name} (${u.roles?.map((r: any) => r.role).join(', ') || u.primaryRole})` }))}
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                  <button type="button" onClick={() => setAssigningExhibition(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Assign'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Exhibition Details & History Modal */}
      <AnimatePresence>
        {viewingExhibitionHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-6 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b pb-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <Tent className="w-5 h-5 mr-2 text-blue-600" />
                    {viewingExhibitionHistory.name || viewingExhibitionHistory.eventName}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Location: <strong className="text-gray-700">{viewingExhibitionHistory.location}</strong> • 
                    Source: <strong className="text-gray-700">{viewingExhibitionHistory.branch?.name || viewingExhibitionHistory.sourceBranchName}</strong>
                  </p>
                </div>
                <button 
                  onClick={() => setViewingExhibitionHistory(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {loadingHistory ? (
                <div className="py-24 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                  <p className="text-sm font-semibold text-slate-400">Loading exhibition report...</p>
                </div>
              ) : historyData ? (
                <div className="flex-1 overflow-y-auto pr-1 space-y-6">
                  {/* Basic Details card for everyone */}
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-semibold uppercase tracking-wider">Start Date</span>
                      <strong className="text-sm text-slate-700 block mt-0.5">{new Date(historyData.exhibition.startDate).toLocaleDateString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold uppercase tracking-wider">End Date</span>
                      <strong className="text-sm text-slate-700 block mt-0.5">{new Date(historyData.exhibition.endDate).toLocaleDateString()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold uppercase tracking-wider">Status</span>
                      <strong className="text-sm text-slate-700 block mt-0.5 capitalize">{historyData.exhibition.status.toLowerCase()}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold uppercase tracking-wider">Overseen By</span>
                      <strong className="text-sm text-slate-700 block mt-0.5">{historyData.exhibition.assignedUserName || 'Unassigned'}</strong>
                    </div>
                  </div>

                  {/* Financial Report Section (Point 1 - only for Finance, Admin, Super Admin) */}
                  {showFullHistory ? (
                    <div className="space-y-6">
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-l-4 border-blue-500 pl-2">Financial Summary</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 flex flex-col">
                          <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Total Cash/UPI Revenue</span>
                          <strong className="text-xl text-emerald-800 mt-1">₹{Number(historyData.metrics.totalRevenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 flex flex-col">
                          <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Total Credit Sales Amount</span>
                          <strong className="text-xl text-amber-800 mt-1">₹{Number(historyData.metrics.totalCreditAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex flex-col">
                          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Books Sold (From Invoices)</span>
                          <strong className="text-xl text-blue-800 mt-1">{historyData.metrics.totalBooksSoldFromBills} books</strong>
                        </div>
                      </div>

                      {/* Stock Reconciliation Summary Metrics */}
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 grid grid-cols-3 md:grid-cols-6 gap-3 text-center text-xs">
                        <div>
                          <span className="text-slate-400 font-semibold block">Taken</span>
                          <strong className="text-sm text-slate-700 block mt-0.5">{historyData.metrics.totalTaken}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold block">Sold (Reconciled)</span>
                          <strong className="text-sm text-slate-700 block mt-0.5">{historyData.metrics.totalSold}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold block">Returned</span>
                          <strong className="text-sm text-slate-700 block mt-0.5">{historyData.metrics.totalReturned}</strong>
                        </div>
                        <div>
                          <span className="text-red-500 font-semibold block">Damaged</span>
                          <strong className="text-sm text-red-700 block mt-0.5">{historyData.metrics.totalDamaged}</strong>
                        </div>
                        <div>
                          <span className="text-red-500 font-semibold block">Lost</span>
                          <strong className="text-sm text-red-700 block mt-0.5">{historyData.metrics.totalLost}</strong>
                        </div>
                        <div>
                          <span className="text-rose-500 font-semibold block">Credit Copy</span>
                          <strong className="text-sm text-rose-700 block mt-0.5">{historyData.metrics.totalCreditQty}</strong>
                        </div>
                      </div>

                      {/* Invoices List */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-l-4 border-blue-500 pl-2">Sales Invoice History ({historyData.bills.length})</h4>
                        {historyData.bills.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No invoices recorded for this exhibition.</p>
                        ) : (
                          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <table className="min-w-full divide-y divide-slate-100 text-left text-xs text-slate-600">
                              <thead className="bg-slate-50 font-bold uppercase text-[9px] text-slate-400 tracking-wider">
                                <tr>
                                  <th className="px-4 py-2.5">Invoice No</th>
                                  <th className="px-4 py-2.5">Customer</th>
                                  <th className="px-4 py-2.5">Payment Status</th>
                                  <th className="px-4 py-2.5">Mode</th>
                                  <th className="px-4 py-2.5">Date</th>
                                  <th className="px-4 py-2.5 text-right">Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {historyData.bills.map((bill: any) => (
                                  <tr key={bill.id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-2.5 font-semibold text-slate-800">{bill.billNumber}</td>
                                    <td className="px-4 py-2.5">
                                      <div>{bill.customerName || 'Walk-in Customer'}</div>
                                      {bill.customerPhone && <div className="text-[10px] text-slate-400">{bill.customerPhone}</div>}
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                        bill.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                      }`}>
                                        {bill.paymentStatus}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2.5 font-mono text-[10px]">{bill.paymentMode || 'N/A'}</td>
                                    <td className="px-4 py-2.5 text-slate-400">{new Date(bill.createdAt).toLocaleString()}</td>
                                    <td className="px-4 py-2.5 text-right font-bold text-slate-800">₹{Number(bill.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {/* Stock List (visible to everyone, but formatted nicely) */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-l-4 border-blue-500 pl-2">
                      {showFullHistory ? 'Reconciled Stock Detail' : 'Stock List'}
                    </h4>
                    {historyData.stock.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No stock registered for this exhibition.</p>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <table className="min-w-full divide-y divide-slate-100 text-left text-xs text-slate-600">
                          <thead className="bg-slate-50 font-bold uppercase text-[9px] text-slate-400 tracking-wider">
                            <tr>
                              <th className="px-4 py-2.5">Book Title</th>
                              <th className="px-4 py-2.5 text-center">Taken</th>
                              <th className="px-4 py-2.5 text-center">Sold</th>
                              {showFullHistory && (
                                <>
                                  <th className="px-4 py-2.5 text-center">Returned</th>
                                  <th className="px-4 py-2.5 text-center text-red-500">Damaged</th>
                                  <th className="px-4 py-2.5 text-center text-red-500">Lost</th>
                                  <th className="px-4 py-2.5 text-center text-rose-500">Credit</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {historyData.stock.map((s: any) => (
                              <tr key={s.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-2.5">
                                  <div className="font-semibold text-slate-800">{s.bookTitle}</div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{s.isbn}</div>
                                </td>
                                <td className="px-4 py-2.5 text-center font-bold text-slate-700">{s.quantityTaken}</td>
                                <td className="px-4 py-2.5 text-center font-semibold text-slate-700">{s.quantitySold}</td>
                                {showFullHistory && (
                                  <>
                                    <td className="px-4 py-2.5 text-center text-slate-500">{s.quantityReturned}</td>
                                    <td className="px-4 py-2.5 text-center text-red-600 font-medium">{s.quantityDamaged}</td>
                                    <td className="px-4 py-2.5 text-center text-red-600 font-medium">{s.quantityLost}</td>
                                    <td className="px-4 py-2.5 text-center text-rose-600 font-medium">{s.quantityCredit}</td>
                                  </>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-sm text-slate-400">Failed to load history metrics.</div>
              )}

              <div className="flex justify-end pt-4 border-t mt-4">
                <button 
                  onClick={() => setViewingExhibitionHistory(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition"
                >
                  Close Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


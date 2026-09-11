"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { 
  Loader2, Plus, Tent, CheckCircle, XCircle, Send, ArchiveRestore, 
  AlertCircle, Eye, Pencil, Trash2, BookOpen 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dropdown } from '@/components/Dropdown';
import { BranchInventoryExhibitionsView } from './BranchInventoryExhibitionsView';

export default function ExhibitionsPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const checkHasRole = (r: string) => {
    return user?.roles?.includes(r) || user?.role === r || user?.primaryRole === r;
  };
  const isAdmin = checkHasRole('SUPER_ADMIN') || checkHasRole('ADMIN');
  const isBranchManager = checkHasRole('BRANCH_MANAGER');
  const isBranchInventory = checkHasRole('BRANCH_INVENTORY') && !isBranchManager;
  const isBranchFrontOffice = checkHasRole('BRANCH_FRONT_OFFICE') && !isBranchManager;
  const isCentralManager = checkHasRole('CENTRAL_INVENTORY_MANAGER') && !isAdmin;
  const isStaffOnly = (isBranchInventory || isBranchFrontOffice) && !isAdmin;
  const isBranch = (isBranchManager || isBranchInventory || isBranchFrontOffice) && !isAdmin;

  const { data: exhibitions, loading, error } = useApiData<any[]>('/exhibitions', []);
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
  const [editingExhibition, setEditingExhibition] = useState<any | null>(null);
  const { data: catalog } = useApiData<any>(isCreating || editingExhibition ? '/catalog/books?limit=100' : null, []);
  const [eventName, setEventName] = useState('');
  const [location, setLocation] = useState('');
  const [createBranchId, setCreateBranchId] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cart, setCart] = useState<{
    bookId: string;
    quantityRequested: number;
    quantityFromBranch?: number;
    quantityFromCentral?: number;
    title?: string;
  }[]>([]);
  
  const [bookInput, setBookInput] = useState('');
  const [branchQtyInput, setBranchQtyInput] = useState(0);
  const [warehouseQtyInput, setWarehouseQtyInput] = useState(0);
  
  // Close/Reconciliation State
  const [closingExhibition, setClosingExhibition] = useState<any | null>(null);
  const [reconciliation, setReconciliation] = useState<any[]>([]);
  const [closeNote, setCloseNote] = useState('');
  
  // View Rejection Reason State
  const [viewingRejectionReason, setViewingRejectionReason] = useState<string | null>(null);

  // Edit & Assign State
  const [editFormData, setEditFormData] = useState({ name: '', location: '', startDate: '', endDate: '', assignedUserId: '' });
  const [editCart, setEditCart] = useState<{
    bookId: string;
    title: string;
    isbn?: string;
    barcode?: string;
    quantityRequested: number;
    quantityFromBranch?: number;
    quantityFromCentral?: number;
    originalQuantity?: number;
    originalFromBranch?: number;
    originalFromCentral?: number;
    quantitySold?: number;
  }[]>([]);
  const [editBookInput, setEditBookInput] = useState('');
  const [editBranchQtyInput, setEditBranchQtyInput] = useState(0);
  const [editWarehouseQtyInput, setEditWarehouseQtyInput] = useState(0);

  const [assigningExhibition, setAssigningExhibition] = useState<any | null>(null);
  const [assignBranchId, setAssignBranchId] = useState('');
  const [assignUserId, setAssignUserId] = useState('');

  const activeSourceBranchId = editingExhibition?.sourceBranchId || (isAdmin ? createBranchId : user?.branchId);
  const [branchInventory, setBranchInventory] = useState<any[]>([]);
  const [centralInventory, setCentralInventory] = useState<any[]>([]);

  useEffect(() => {
    // Load central warehouse stock for multi-source availability
    api.get('/inventory/central-stock?limit=10000')
      .then(res => {
        if (res.success) {
          setCentralInventory(res.data.items || res.data || []);
        }
      })
      .catch(err => console.error('Failed to load central inventory:', err));
  }, []);

  useEffect(() => {
    if (!activeSourceBranchId) {
      setBranchInventory([]);
      return;
    }
    const selectedBranch = branches.find((b: any) => b.id === activeSourceBranchId);
    const isWarehouse = selectedBranch?.type === 'WAREHOUSE';
    const endpoint = isWarehouse 
      ? '/inventory/central-stock?limit=10000' 
      : `/inventory/branch/${activeSourceBranchId}?limit=10000`;

    api.get(endpoint)
      .then(res => {
        if (res.success) {
          setBranchInventory(res.data.items || res.data || []);
        }
      })
      .catch(err => console.error('Failed to load branch inventory:', err));
  }, [activeSourceBranchId, branches]);

  const getBranchStockQty = (bookId: string) => {
    const item = branchInventory.find((bi: any) => bi.bookId === bookId || bi.book?.id === bookId);
    return item ? Number(item.quantity) : 0;
  };

  const getCentralStockQty = (bookId: string) => {
    const item = centralInventory.find((ci: any) => ci.bookId === bookId || ci.book?.id === bookId);
    return item ? Number(item.quantity) : 0;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenEdit = (ex: any) => {
    setEditingExhibition(ex);
    setEditFormData({
      name: ex.name || ex.eventName || '',
      location: ex.location || '',
      startDate: ex.startDate ? new Date(ex.startDate).toISOString().split('T')[0] : '',
      endDate: ex.endDate ? new Date(ex.endDate).toISOString().split('T')[0] : '',
      assignedUserId: ex.assignedUserId || '',
    });
    const items = (ex.stock || []).map((s: any) => ({
      bookId: s.bookId || s.book?.id,
      title: s.book?.title || 'Book Title',
      isbn: s.book?.isbn || '',
      barcode: s.book?.barcode || '',
      quantityRequested: Number(s.quantityTaken || 0),
      quantityFromBranch: Number(s.quantityFromBranch ?? 0),
      quantityFromCentral: Number(s.quantityFromCentral ?? 0),
      originalQuantity: Number(s.quantityTaken || 0),
      originalFromBranch: Number(s.quantityFromBranch ?? 0),
      originalFromCentral: Number(s.quantityFromCentral ?? 0),
      quantitySold: Number(s.quantitySold || 0),
    }));
    setEditCart(items);
    setEditBookInput('');
    setEditBranchQtyInput(0);
    setEditWarehouseQtyInput(0);
  };

  const handleEditQuantityChange = (idx: number, newQty: number) => {
    if (newQty < 0) return;
    const item = editCart[idx];
    if (item.quantitySold && newQty < item.quantitySold) {
      alert(`Cannot reduce quantity below ${item.quantitySold} because ${item.quantitySold} copies were already sold.`);
      return;
    }

    const updated = [...editCart];
    const isWarehouse = branches.find((b: any) => b.id === (editingExhibition?.sourceBranchId))?.type === 'WAREHOUSE';

    if (isWarehouse) {
      updated[idx] = {
        ...item,
        quantityRequested: newQty,
        quantityFromBranch: 0,
        quantityFromCentral: newQty,
      };
    } else {
      const origTotal = item.originalQuantity ?? item.quantityRequested;
      const origBranch = item.originalFromBranch ?? item.quantityFromBranch ?? 0;
      const origCentral = item.originalFromCentral ?? item.quantityFromCentral ?? 0;

      let newBranch = origBranch;
      let newCentral = origCentral;

      const diff = newQty - origTotal;
      if (diff > 0) {
        const availableShelf = getBranchStockQty(item.bookId);
        const addShelf = Math.min(availableShelf, diff);
        const addCentral = diff - addShelf;
        newBranch = origBranch + addShelf;
        newCentral = origCentral + addCentral;
      } else if (diff < 0) {
        let toReturn = Math.abs(diff);
        const returnCentral = Math.min(origCentral, toReturn);
        newCentral = origCentral - returnCentral;
        toReturn -= returnCentral;
        const returnBranch = Math.min(origBranch, toReturn);
        newBranch = origBranch - returnBranch;
      } else {
        newBranch = origBranch;
        newCentral = origCentral;
      }

      updated[idx] = {
        ...item,
        quantityRequested: newQty,
        quantityFromBranch: newBranch,
        quantityFromCentral: newCentral,
      };
    }

    setEditCart(updated);
  };

  const handleAddBookToEditCart = () => {
    if (!editBookInput) return;
    const existingIndex = editCart.findIndex(i => i.bookId === editBookInput);
    if (existingIndex >= 0) {
      alert('This book is already in the exhibition list. You can adjust its quantity in the table above.');
      return;
    }

    const totalQty = editBranchQtyInput + editWarehouseQtyInput;
    if (totalQty <= 0) {
      alert('Please enter a quantity greater than 0.');
      return;
    }

    const catalogList = catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : []);
    const book = catalogList.find((b: any) => b.id === editBookInput);

    setEditCart([
      ...editCart,
      {
        bookId: editBookInput,
        title: book?.title || 'Selected Book',
        isbn: book?.isbn,
        barcode: book?.barcode,
        quantityRequested: totalQty,
        quantityFromBranch: editBranchQtyInput,
        quantityFromCentral: editWarehouseQtyInput,
        originalQuantity: 0,
        originalFromBranch: 0,
        originalFromCentral: 0,
        quantitySold: 0,
      }
    ]);

    setEditBookInput('');
    setEditBranchQtyInput(0);
    setEditWarehouseQtyInput(0);
  };

  const handleRemoveFromEditCart = async (idx: number) => {
    const item = editCart[idx];
    if (item.quantitySold && item.quantitySold > 0) {
      alert(`Cannot remove "${item.title}" because ${item.quantitySold} copies have already been sold.`);
      return;
    }

    const ok = await confirm({
      title: "Remove Book from Exhibition",
      message: `Are you sure you want to remove "${item.title}" from this exhibition?`,
      confirmText: "Yes, Remove",
      cancelText: "No, Keep",
      variant: "danger",
    });
    if (!ok) return;

    setEditCart(editCart.filter((_, i) => i !== idx));
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExhibition) return;
    if (editCart.length === 0) {
      alert('The exhibition must contain at least one book.');
      return;
    }

    const ok = await confirm({
      title: "Update Exhibition",
      message: `Are you sure you want to save modifications to exhibition "${editFormData.name}"?`,
      confirmText: "Yes, Save Changes",
      cancelText: "No, Cancel",
      variant: "primary",
    });
    if (!ok) return;

    try {
      setIsSubmitting(true);
      const res = await api.patch(`/exhibitions/${editingExhibition.id}`, {
        name: editFormData.name,
        location: editFormData.location,
        startDate: new Date(editFormData.startDate).toISOString(),
        endDate: new Date(editFormData.endDate).toISOString(),
        assignedUserId: isAdmin ? (editFormData.assignedUserId || null) : undefined,
        items: editCart.map(i => ({
          bookId: i.bookId,
          quantityTaken: i.quantityRequested,
          quantityFromBranch: i.quantityFromBranch,
          quantityFromCentral: i.quantityFromCentral,
        })),
      });

      if (res.success) {
        setEditingExhibition(null);
        if (viewingExhibitionHistory?.id === editingExhibition.id) {
          handleViewHistory({ ...viewingExhibitionHistory, ...res.data });
        }
      }
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
    const totalItems = cart.reduce((acc, i) => acc + i.quantityRequested, 0);
    const ok = await confirm({
      title: "Create Exhibition Request",
      message: `Submit request for new exhibition "${eventName}" with ${cart.length} book titles (${totalItems} total copies)?`,
      confirmText: "Yes, Create Request",
      cancelText: "No, Cancel",
      variant: "primary",
    });
    if (!ok) return;

    try {
      setIsSubmitting(true);
      await api.post('/exhibitions', {
        name: eventName,
        location,
        sourceBranchId: createBranchId || undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        assignedUserId: assignedUserId || undefined,
        items: cart.map(i => ({ 
          bookId: i.bookId, 
          quantityTaken: i.quantityRequested,
          quantityFromBranch: i.quantityFromBranch,
          quantityFromCentral: i.quantityFromCentral,
        }))
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
    const ok = await confirm({
      title: `${action === 'approve' ? 'Approve' : 'Reject'} Exhibition`,
      message: `Are you sure you want to ${action} this exhibition event?`,
      confirmText: action === 'approve' ? 'Yes, Approve' : 'Yes, Reject',
      cancelText: 'No, Cancel',
      variant: action === 'approve' ? 'success' : 'danger',
    });
    if (!ok) return;

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
    const ok = await confirm({
      title: "Dispatch Exhibition Stock",
      message: "Are you sure you want to dispatch all stock allocated for this exhibition?",
      confirmText: "Yes, Dispatch Now",
      cancelText: "No, Cancel",
      variant: "primary",
    });
    if (!ok) return;

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

    const ok = await confirm({
      title: "Finalize & Close Exhibition",
      message: `Are you sure you want to finalize reconciliation and close exhibition "${closingExhibition.name || closingExhibition.eventName}"? This will return unsold stock to inventory.`,
      confirmText: "Yes, Finalize & Close",
      cancelText: "No, Review Entries",
      variant: "warning",
    });
    if (!ok) return;

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
      case 'REQUESTED': return <span className="bg-amber-50 text-amber-800 border border-amber-200 font-bold rounded-sm text-[11px] px-2.5 py-1">Requested</span>;
      case 'APPROVED': return <span className="bg-[#faedf5] text-[#7e2562] border border-[#7e2562]/30 font-bold rounded-sm text-[11px] px-2.5 py-1">Approved</span>;
      case 'REJECTED': 
        if (ex.rejectionReason) {
          return (
            <button 
              onClick={() => setViewingRejectionReason(ex.rejectionReason)}
              className="bg-[#fef5f2] text-[#e45e34] border border-[#e45e34]/30 hover:bg-[#fdeae3] font-bold rounded-sm text-[11px] px-2.5 py-1 transition-colors cursor-pointer inline-flex items-center"
            >
              Rejected <AlertCircle className="w-3 h-3 ml-1" />
            </button>
          );
        }
        return <span className="bg-[#fef5f2] text-[#e45e34] border border-[#e45e34]/30 font-bold rounded-sm text-[11px] px-2.5 py-1">Rejected</span>;
      case 'ONGOING': return <span className="bg-[#f0fbf5] text-[#3cb976] border border-[#3cb976]/30 font-bold rounded-sm text-[11px] px-2.5 py-1">Ongoing</span>;
      case 'CLOSED': return <span className="bg-zinc-100 text-zinc-700 border border-zinc-200 font-bold rounded-sm text-[11px] px-2.5 py-1">Closed</span>;
      case 'OVERDUE': return <span className="bg-[#fef5f2] text-[#e45e34] border border-[#e45e34]/40 font-bold rounded-sm text-[11px] px-2.5 py-1">Overdue</span>;
      case 'EXPIRED': return <span className="bg-zinc-100 text-zinc-700 border border-zinc-200 font-bold rounded-sm text-[11px] px-2.5 py-1">Expired</span>;
      default: return null;
    }
  };

  if (loading && (!exhibitions || exhibitions.length === 0)) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-[#7e2562]" /></div>;
  }

  return (
    <div className="space-y-6">
      {isStaffOnly ? (
        <BranchInventoryExhibitionsView 
          exhibitions={exhibitions || []} 
          user={user} 
          onEditExhibition={handleOpenEdit}
        />
      ) : (
        <>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">Exhibitions & Events</h2>
              <p className="text-sm text-gray-500">Manage off-site book sales events.</p>
            </div>
            {(isBranch || isAdmin) && (
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-[#7e2562] hover:bg-[#681b50] rounded-sm shadow-xs transition-all active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 mr-2" />
                {isAdmin ? 'Create Exhibition' : 'Request Exhibition'}
              </button>
            )}
          </div>

      <div className="bg-white shadow-sm border border-[#7e2562]/10 rounded-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-[#faf6f9]/70 text-[11px] font-bold text-[#7e2562] uppercase tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap">
            <tr>
              <th scope="col" className="px-6 py-3 text-left">Event / Branch</th>
              <th scope="col" className="px-6 py-3 text-left">Dates</th>
              <th scope="col" className="px-6 py-3 text-center">Status</th>
              <th scope="col" className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {(exhibitions || []).map((ex: any) => (
              <tr key={ex.id} className="hover:bg-[#faf6f9]/40 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <button 
                    onClick={() => handleViewHistory(ex)}
                    className="text-sm font-bold text-gray-900 hover:text-[#7e2562] transition-colors text-left"
                  >
                    {ex.name || ex.eventName}
                  </button>
                  <div className="text-xs text-gray-500">{ex.location} • {ex.branch?.name}</div>
                  {ex.assignedUser && <div className="text-xs text-[#7e2562] font-semibold mt-1">Assigned: {ex.assignedUser.name}</div>}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(ex.startDate).toLocaleDateString()} - {new Date(ex.endDate).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {getStatusBadge(ex)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex flex-col items-end gap-1.5">
                    {/* Line 1: Primary actions */}
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleViewHistory(ex)}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-[#faedf5] hover:text-[#7e2562] border border-gray-300 hover:border-[#7e2562]/30 rounded-sm shadow-xs transition-all active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1 text-gray-500" />
                        View Details
                      </button>

                      {isAdmin && ex.status === 'REQUESTED' && (
                        <button 
                          onClick={() => handleApproveReject(ex.id, 'approve')} 
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-white bg-[#3cb976] hover:bg-[#329e64] rounded-sm shadow-xs transition-colors"
                        >
                          Approve
                        </button>
                      )}

                      {ex.status !== 'CLOSED' && ex.status !== 'REJECTED' && (
                        isAdmin ||
                        ex.requestedById === user?.id ||
                        ex.assignedUserId === user?.id ||
                        (isBranchManager && ex.sourceBranchId === user?.branchId)
                      ) && (
                        <button 
                          onClick={() => handleOpenEdit(ex)} 
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-[#7e2562] bg-[#faedf5] hover:bg-[#f6dbe9] border border-[#7e2562]/20 rounded-sm transition-colors shadow-xs"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Edit / Manage Stock
                        </button>
                      )}

                      {(ex.status === 'APPROVED' || ex.status === 'EXPIRED') && (
                        isAdmin ||
                        (isBranch && ex.branch?.type !== 'WAREHOUSE') ||
                        (isCentralManager && ex.branch?.type === 'WAREHOUSE')
                      ) && (
                        <button 
                          onClick={() => handleDispatch(ex.id)} 
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-white bg-[#7e2562] hover:bg-[#681b50] rounded-sm transition-colors shadow-xs"
                        >
                          <Send className="w-3.5 h-3.5 mr-1" /> Dispatch Stock
                        </button>
                      )}

                      {(isAdmin || isBranch) && (ex.status === 'ONGOING' || ex.status === 'OVERDUE') && (
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
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-sm transition-colors shadow-xs"
                        >
                          <ArchiveRestore className="w-3.5 h-3.5 mr-1" /> Close & Reconcile
                        </button>
                      )}
                    </div>

                    {/* Line 2: Assign and Reject */}
                    {((isAdmin && ex.status === 'REQUESTED') || (isAdmin && ex.status !== 'CLOSED')) && (
                      <div className="flex items-center justify-end gap-2">
                        {isAdmin && ex.status !== 'CLOSED' && (
                          <button 
                            onClick={() => {
                              setAssigningExhibition(ex);
                              setAssignBranchId('');
                              setAssignUserId(ex.assignedUserId || '');
                            }} 
                            className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-[#3cb976] bg-[#f0fbf5] hover:bg-[#e0f7eb] border border-[#3cb976]/30 rounded-sm transition-colors"
                          >
                            Assign
                          </button>
                        )}

                        {isAdmin && ex.status === 'REQUESTED' && (
                          <button 
                            onClick={() => handleApproveReject(ex.id, 'reject')} 
                            className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-[#e45e34] bg-[#fef5f2] hover:bg-[#fdeae3] border border-[#e45e34]/30 rounded-sm transition-colors"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {exhibitions?.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No exhibitions found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )}

      {/* Creation Modal */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-sm shadow-xl w-full max-w-2xl p-6 border border-[#7e2562]/10">
              <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center"><Tent className="w-5 h-5 mr-2 text-[#7e2562]"/> {isAdmin ? 'Create Exhibition' : 'Request Exhibition'}</h3>
              
              <div className="mb-4 bg-[#faedf5] border border-[#7e2562]/20 rounded-sm p-3 text-xs text-[#7e2562] flex items-start">
                <AlertCircle className="w-4 h-4 mr-2 text-[#7e2562] shrink-0 mt-0.5" />
                <span>
                  <strong>Immediate Inventory Check-Out:</strong> Selecting books for this event will immediately deduct them from the branch shelf inventory so they cannot be sold to walk-in customers while away at the exhibition.
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Event Name</label>
                  <input type="text" value={eventName} onChange={e => setEventName(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Location</label>
                  <input type="text" value={location} onChange={e => setLocation(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" />
                </div>
                {isAdmin && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Select Branch</label>
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Assigned Staff</label>
                  <Dropdown
                    value={assignedUserId}
                    onChange={(val) => setAssignedUserId(val)}
                    placeholder={isAdmin && !createBranchId ? "Select branch first..." : "Select staff member..."}
                    options={(usersResponse?.data || usersResponse || [])
                      .filter((u: any) => {
                        const targetBranchId = isAdmin ? createBranchId : user?.branchId;
                        if (!targetBranchId) return false;
                        const selectedBranch = branches.find((b: any) => b.id === targetBranchId);
                        if (selectedBranch?.type === 'WAREHOUSE') {
                          return !u.branchId && !u.branch?.id;
                        }
                        return u.branchId === targetBranchId || u.branch?.id === targetBranchId;
                      })
                      .map((u: any) => ({
                        value: u.id,
                        label: `${u.name} (${u.roles?.map((r: any) => r.role).join(', ') || u.primaryRole})`
                      }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" />
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 mb-4">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Requested Stock</h4>
                <div className="space-y-3">
                  <div>
                    <Dropdown
                      searchable={true}
                      value={bookInput}
                      onChange={(val) => {
                        setBookInput(val);
                        if (val) {
                          const bStock = getBranchStockQty(val);
                          const cStock = getCentralStockQty(val);
                          const selectedBranch = branches.find((br: any) => br.id === activeSourceBranchId);
                          const isWarehouse = selectedBranch?.type === 'WAREHOUSE';
                          if (isWarehouse) {
                            setBranchQtyInput(0);
                            setWarehouseQtyInput(Math.min(5, cStock));
                          } else {
                            const defaultTotal = 5;
                            const defaultBranch = Math.min(defaultTotal, bStock);
                            const defaultWarehouse = Math.min(Math.max(0, defaultTotal - defaultBranch), cStock);
                            setBranchQtyInput(defaultBranch);
                            setWarehouseQtyInput(defaultWarehouse);
                          }
                        } else {
                          setBranchQtyInput(0);
                          setWarehouseQtyInput(0);
                        }
                      }}
                      placeholder="Search by title, ISBN, or barcode..."
                      options={(catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : [])).map((b: any) => {
                        const bStock = getBranchStockQty(b.id);
                        const cStock = getCentralStockQty(b.id);
                        const selectedBranch = branches.find((br: any) => br.id === activeSourceBranchId);
                        const isWarehouse = selectedBranch?.type === 'WAREHOUSE';
                        const totalStock = isWarehouse ? cStock : (bStock + cStock);
                        const badgeText = isWarehouse 
                          ? `Wh: ${cStock}` 
                          : `Branch: ${bStock} | Wh: ${cStock} (Total: ${totalStock})`;

                        return {
                          value: b.id,
                          label: b.title,
                          isbn: b.isbn,
                          barcode: b.barcode,
                          sublabel: `ISBN: ${b.isbn || 'N/A'}${b.barcode ? ` • Barcode: ${b.barcode}` : ''}`,
                          badge: badgeText,
                          badgeClassName: totalStock > 0 ? 'bg-[#faedf5] text-[#7e2562] border border-[#7e2562]/30' : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                        };
                      })}
                    />
                  </div>

                  {bookInput && (
                    <div className="p-3 bg-[#faf6f9]/60 border border-[#7e2562]/15 rounded-sm space-y-3">
                      <div className="flex flex-wrap items-center justify-between text-xs text-neutral-600 gap-2">
                        <span className="font-semibold text-gray-800">Customize Source Split:</span>
                        <div className="flex items-center gap-3 font-semibold">
                          <span className="text-[#7e2562]">🏪 Branch Shelf: {getBranchStockQty(bookInput)}</span>
                          <span className="text-[#9b3179]">🏭 Warehouse: {getCentralStockQty(bookInput)}</span>
                          <span className="text-gray-900 font-bold">Total Available: {getBranchStockQty(bookInput) + getCentralStockQty(bookInput)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                            From Branch Shelf (Max: {getBranchStockQty(bookInput)})
                          </label>
                          <input 
                            type="number" 
                            min="0" 
                            max={getBranchStockQty(bookInput)}
                            value={branchQtyInput} 
                            onChange={e => setBranchQtyInput(Math.max(0, Number(e.target.value)))} 
                            className="block w-full px-3 py-1.5 border border-gray-300 rounded-sm text-sm font-semibold focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562] bg-white" 
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-neutral-700 mb-1">
                            From Warehouse (Max: {getCentralStockQty(bookInput)})
                          </label>
                          <input 
                            type="number" 
                            min="0" 
                            max={getCentralStockQty(bookInput)}
                            value={warehouseQtyInput} 
                            onChange={e => setWarehouseQtyInput(Math.max(0, Number(e.target.value)))} 
                            className="block w-full px-3 py-1.5 border border-gray-300 rounded-sm text-sm font-semibold focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562] bg-white" 
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-white border border-[#7e2562]/20 rounded-sm px-3 py-1 text-center shadow-xs">
                            <div className="text-[10px] uppercase font-bold text-neutral-400">Total</div>
                            <div className="text-base font-bold text-gray-900">{branchQtyInput + warehouseQtyInput}</div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              const bStock = getBranchStockQty(bookInput);
                              const cStock = getCentralStockQty(bookInput);
                              const totalToTake = branchQtyInput + warehouseQtyInput;

                              if (totalToTake <= 0) {
                                alert('Please enter at least 1 book to take.');
                                return;
                              }
                              if (branchQtyInput > bStock) {
                                alert(`Cannot take ${branchQtyInput} from branch. Branch only has ${bStock} available.`);
                                return;
                              }
                              if (warehouseQtyInput > cStock) {
                                alert(`Cannot take ${warehouseQtyInput} from warehouse. Warehouse only has ${cStock} available.`);
                                return;
                              }

                              const bookList = catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : []);
                              const book = bookList.find((b: any) => b.id === bookInput);

                              const existingItemIndex = cart.findIndex(i => i.bookId === bookInput);
                              if (existingItemIndex >= 0) {
                                const newCart = [...cart];
                                const newB = (newCart[existingItemIndex].quantityFromBranch || 0) + branchQtyInput;
                                const newC = (newCart[existingItemIndex].quantityFromCentral || 0) + warehouseQtyInput;
                                if (newB > bStock) {
                                  alert(`Total from branch would be ${newB}, exceeding branch stock of ${bStock}.`);
                                  return;
                                }
                                if (newC > cStock) {
                                  alert(`Total from warehouse would be ${newC}, exceeding warehouse stock of ${cStock}.`);
                                  return;
                                }
                                newCart[existingItemIndex].quantityFromBranch = newB;
                                newCart[existingItemIndex].quantityFromCentral = newC;
                                newCart[existingItemIndex].quantityRequested = newB + newC;
                                setCart(newCart);
                              } else {
                                setCart([...cart, { 
                                  bookId: bookInput, 
                                  quantityRequested: totalToTake, 
                                  quantityFromBranch: branchQtyInput,
                                  quantityFromCentral: warehouseQtyInput,
                                  title: book?.title 
                                }]);
                              }
                              setBookInput('');
                              setBranchQtyInput(0);
                              setWarehouseQtyInput(0);
                            }}
                            disabled={(branchQtyInput + warehouseQtyInput) <= 0}
                            className="px-4 py-2 bg-[#7e2562] hover:bg-[#681b50] disabled:opacity-40 text-white rounded-sm text-xs font-bold transition-all shrink-0 shadow-xs active:scale-95"
                          >
                            Add to Event
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="border border-[#7e2562]/10 rounded-sm max-h-48 overflow-y-auto mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#faf6f9]/70 text-[11px] font-bold text-[#7e2562] uppercase tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap">
                    <tr>
                      <th className="px-4 py-2 text-left">Book</th>
                      <th className="px-4 py-2 text-right">Total Qty</th>
                      <th className="px-4 py-2 text-left">Stock Allocation</th>
                      <th className="px-4 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 text-xs">
                    {cart.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 font-medium text-gray-900">{item.title}</td>
                        <td className="px-4 py-2 text-right font-bold text-gray-900">{item.quantityRequested}</td>
                        <td className="px-4 py-2 text-gray-600">
                          {(item.quantityFromBranch ?? 0) > 0 && (item.quantityFromCentral ?? 0) > 0 ? (
                            <span className="inline-flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-sm bg-[#faedf5] text-[#7e2562] font-semibold border border-[#7e2562]/20">Branch: {item.quantityFromBranch}</span>
                              <span className="px-2 py-0.5 rounded-sm bg-purple-50 text-purple-700 font-semibold border border-purple-200">Warehouse: {item.quantityFromCentral}</span>
                            </span>
                          ) : (item.quantityFromCentral ?? 0) > 0 ? (
                            <span className="px-2 py-0.5 rounded-sm bg-purple-50 text-purple-700 font-semibold border border-purple-200">Warehouse: {item.quantityFromCentral}</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-sm bg-[#faedf5] text-[#7e2562] font-semibold border border-[#7e2562]/20">Branch: {item.quantityFromBranch ?? item.quantityRequested}</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="text-[#e45e34] hover:text-[#c74c25] font-semibold text-xs">Remove</button>
                        </td>
                      </tr>
                    ))}
                    {cart.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-gray-400 italic">No books added yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreate} disabled={cart.length === 0 || !eventName || isSubmitting} className="px-4 py-2 text-sm font-semibold text-white bg-[#7e2562] hover:bg-[#681b50] rounded-sm disabled:opacity-50 shadow-xs transition-all active:scale-[0.98]">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-sm shadow-xl w-full max-w-4xl p-6 border border-[#7e2562]/10">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Close & Reconcile Exhibition</h3>
              <p className="text-sm text-gray-500 mb-4">{closingExhibition.eventName}</p>
              
              <div className="bg-[#faedf5] text-[#7e2562] border border-[#7e2562]/20 p-3 rounded-sm mb-4 text-sm flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 text-[#7e2562]" />
                <p>You must account for every book taken. For each row: <strong>Sold + Not Sold + Damaged + Lost + Credit = Taken</strong>.</p>
              </div>

              <div className="max-h-96 overflow-y-auto mb-6 border border-[#7e2562]/10 rounded-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#faf6f9]/70 text-[11px] font-bold text-[#7e2562] uppercase tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap">
                    <tr>
                      <th className="px-4 py-2 text-left">Book</th>
                      <th className="px-4 py-2 text-center">Taken</th>
                      <th className="px-4 py-2 text-center text-[#3cb976]">Sold</th>
                      <th className="px-4 py-2 text-center text-[#7e2562]">Not Sold</th>
                      <th className="px-4 py-2 text-center text-[#e45e34]">Damaged</th>
                      <th className="px-4 py-2 text-center text-[#e45e34]">Lost</th>
                      <th className="px-4 py-2 text-center text-purple-700">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reconciliation.map((rec: any, idx) => {
                      const total = (rec.quantitySold || 0) + (rec.quantityReturned || 0) + (rec.quantityDamaged || 0) + (rec.quantityLost || 0) + (rec.quantityCredit || 0);
                      const isBalanced = total === rec.quantityTaken;
                      
                      return (
                        <tr key={rec.stockId} className={!isBalanced ? 'bg-[#fef5f2]' : ''}>
                          <td className="px-4 py-3 text-sm text-gray-900">{rec.title}</td>
                          <td className="px-4 py-3 text-sm text-center font-bold">{rec.quantityTaken}</td>
                          <td className="px-2 py-3 text-center">
                            <input type="number" min="0" value={rec.quantitySold} onChange={(e) => {
                              const newRec = [...reconciliation];
                              newRec[idx].quantitySold = Number(e.target.value);
                              setReconciliation(newRec);
                            }} className="w-16 text-center border border-gray-300 rounded-sm py-1 font-semibold text-[#3cb976]" />
                          </td>
                          <td className="px-2 py-3 text-center">
                            <input type="number" min="0" value={rec.quantityReturned} onChange={(e) => {
                              const newRec = [...reconciliation];
                              newRec[idx].quantityReturned = Number(e.target.value);
                              setReconciliation(newRec);
                            }} className="w-16 text-center border border-gray-300 rounded-sm py-1 font-semibold text-[#7e2562]" />
                          </td>
                          <td className="px-2 py-3 text-center">
                            <input type="number" min="0" value={rec.quantityDamaged} onChange={(e) => {
                              const newRec = [...reconciliation];
                              newRec[idx].quantityDamaged = Number(e.target.value);
                              setReconciliation(newRec);
                            }} className="w-16 text-center border border-[#e45e34]/40 rounded-sm py-1 font-semibold text-[#e45e34]" />
                          </td>
                          <td className="px-2 py-3 text-center">
                            <input type="number" min="0" value={rec.quantityLost} onChange={(e) => {
                              const newRec = [...reconciliation];
                              newRec[idx].quantityLost = Number(e.target.value);
                              setReconciliation(newRec);
                            }} className="w-16 text-center border border-[#e45e34]/40 rounded-sm py-1 font-semibold text-[#e45e34]" />
                          </td>
                          <td className="px-2 py-3 text-center">
                            <input type="number" min="0" value={rec.quantityCredit} onChange={(e) => {
                              const newRec = [...reconciliation];
                              newRec[idx].quantityCredit = Number(e.target.value);
                              setReconciliation(newRec);
                            }} className="w-16 text-center border border-purple-300 rounded-sm py-1 font-semibold text-purple-700" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end space-x-3">
                <button onClick={() => setClosingExhibition(null)} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50">Cancel</button>
                <button onClick={handleClose} disabled={isSubmitting} className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-sm hover:bg-amber-700 disabled:opacity-50 shadow-xs transition-all active:scale-95">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-sm shadow-xl w-full max-w-md p-6 border border-[#e45e34]/20">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center text-[#e45e34]">
                <XCircle className="w-5 h-5 mr-2" />
                Exhibition Rejected
              </h3>
              <div className="bg-[#fef5f2] p-4 rounded-sm border border-[#e45e34]/20 text-sm text-[#e45e34] whitespace-pre-wrap font-medium">
                {viewingRejectionReason}
              </div>
              <div className="flex justify-end mt-6">
                <button 
                  onClick={() => setViewingRejectionReason(null)} 
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Exhibition & Manage Stock Modal */}
      <AnimatePresence>
        {editingExhibition && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-sm shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden border border-[#7e2562]/10"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-[#7e2562]/10 bg-gradient-to-r from-[#faedf5]/70 to-[#faf6f9] flex justify-between items-center shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-[#7e2562] text-white rounded-sm shadow-xs">
                    <Tent className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      Edit Exhibition & Manage Stock
                    </h3>
                    <p className="text-xs text-gray-500">
                      Adjust event details, reduce or increase book quantities, or allocate new titles.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingExhibition(null)} 
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-sm hover:bg-gray-100 transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form id="edit-exhibition-form" onSubmit={handleEdit} className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 1. Basic Details Card */}
                <div className="bg-[#faf6f9]/50 border border-[#7e2562]/10 rounded-sm p-4 space-y-4">
                  <h4 className="text-xs font-bold text-[#7e2562] uppercase tracking-wider">Event Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Event Name</label>
                      <input 
                        required 
                        type="text" 
                        value={editFormData.name} 
                        onChange={e => setEditFormData({...editFormData, name: e.target.value})} 
                        className="block w-full px-3 py-2 border border-gray-300 rounded-sm text-sm bg-white focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Location</label>
                      <input 
                        required 
                        type="text" 
                        value={editFormData.location} 
                        onChange={e => setEditFormData({...editFormData, location: e.target.value})} 
                        className="block w-full px-3 py-2 border border-gray-300 rounded-sm text-sm bg-white focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
                      <input 
                        required 
                        type="date" 
                        value={editFormData.startDate} 
                        onChange={e => setEditFormData({...editFormData, startDate: e.target.value})} 
                        className="block w-full px-3 py-2 border border-gray-300 rounded-sm text-sm bg-white focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
                      <input 
                        required 
                        type="date" 
                        value={editFormData.endDate} 
                        onChange={e => setEditFormData({...editFormData, endDate: e.target.value})} 
                        className="block w-full px-3 py-2 border border-gray-300 rounded-sm text-sm bg-white focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" 
                      />
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="pt-2 border-t border-gray-200">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Assigned Staff</label>
                      <Dropdown
                        value={editFormData.assignedUserId}
                        onChange={(val) => setEditFormData({ ...editFormData, assignedUserId: val })}
                        placeholder="Select assigned staff..."
                        options={(usersResponse?.data || usersResponse || [])
                          .map((u: any) => ({
                            value: u.id,
                            label: `${u.name} (${u.roles?.map((r: any) => r.role).join(', ') || u.primaryRole})`
                          }))}
                      />
                    </div>
                  )}
                </div>

                {/* 2. Stock Allocation Table */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#7e2562]" />
                        Allocated Books & Quantities
                      </h4>
                      <p className="text-xs text-gray-500">
                        Total {editCart.length} titles • {editCart.reduce((acc, curr) => acc + (curr.quantityRequested || 0), 0)} copies allocated
                      </p>
                    </div>

                    <div className="text-xs text-[#7e2562] bg-[#faedf5] px-3 py-1 rounded-sm border border-[#7e2562]/20 font-medium">
                      💡 Lowering a quantity returns excess books to shelf/warehouse automatically.
                    </div>
                  </div>

                  <div className="border border-[#7e2562]/10 rounded-sm overflow-hidden shadow-xs">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-[#faf6f9]/70 text-[11px] font-bold text-[#7e2562] uppercase tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap">
                        <tr>
                          <th className="px-4 py-3 text-left">Book Title & ISBN</th>
                          <th className="px-3 py-3 text-center">Current Qty</th>
                          <th className="px-4 py-3 text-center">New Quantity</th>
                          <th className="px-4 py-3 text-left">Stock Adjustment Status</th>
                          <th className="px-3 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 text-xs">
                        {editCart.map((item, idx) => {
                          const orig = item.originalQuantity ?? item.quantityRequested;
                          const delta = item.quantityRequested - orig;
                          const isSold = (item.quantitySold || 0) > 0;

                          return (
                            <tr key={idx} className="hover:bg-[#faf6f9]/40 transition-colors">
                              <td className="px-4 py-3">
                                <div className="font-semibold text-gray-900">{item.title}</div>
                                <div className="text-[11px] text-gray-500">
                                  {item.isbn && <span>ISBN: {item.isbn}</span>}
                                  {item.barcode && <span className="ml-2">• Barcode: {item.barcode}</span>}
                                </div>
                                {isSold && (
                                  <div className="text-[11px] text-amber-600 font-medium mt-0.5">
                                    ★ {item.quantitySold} copies already sold (minimum required: {item.quantitySold})
                                  </div>
                                )}
                              </td>

                              <td className="px-3 py-3 text-center font-bold text-gray-700 text-sm">
                                {orig}
                              </td>

                              <td className="px-4 py-3">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleEditQuantityChange(idx, Math.max((item.quantitySold || 0), item.quantityRequested - 1))}
                                    disabled={item.quantityRequested <= (item.quantitySold || 0)}
                                    className="w-7 h-7 rounded-sm border border-gray-300 bg-gray-50 hover:bg-gray-100 flex items-center justify-center font-bold text-gray-700 disabled:opacity-40"
                                  >
                                    -
                                  </button>
                                  <input
                                    type="number"
                                    min={item.quantitySold || 0}
                                    value={item.quantityRequested}
                                    onChange={(e) => handleEditQuantityChange(idx, Number(e.target.value))}
                                    className="w-16 px-2 py-1 text-center font-bold text-sm border border-gray-300 rounded-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleEditQuantityChange(idx, item.quantityRequested + 1)}
                                    className="w-7 h-7 rounded-sm border border-gray-300 bg-gray-50 hover:bg-gray-100 flex items-center justify-center font-bold text-gray-700"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>

                              <td className="px-4 py-3">
                                {delta < 0 ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-bold bg-[#fef5f2] text-[#e45e34] border border-[#e45e34]/30">
                                    ↓ Returning {Math.abs(delta)} to stock
                                  </span>
                                ) : delta > 0 ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-bold bg-[#f0fbf5] text-[#3cb976] border border-[#3cb976]/30">
                                    ↑ Taking +{delta} from stock
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-sm text-[11px] font-medium bg-gray-100 text-gray-600">
                                    No change
                                  </span>
                                )}
                              </td>

                              <td className="px-3 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFromEditCart(idx)}
                                  disabled={isSold}
                                  title={isSold ? "Cannot remove book with recorded sales" : "Remove book from exhibition"}
                                  className="text-[#e45e34] hover:text-[#c74c25] p-1.5 hover:bg-[#fef5f2] rounded-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                        {editCart.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-gray-400 italic">
                              No books currently added. Please add at least one book below.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 3. Add Books Section */}
                <div className="bg-[#faf6f9]/50 border border-[#7e2562]/10 rounded-sm p-4 space-y-3">
                  <h4 className="text-xs font-bold text-[#7e2562] uppercase tracking-wider flex items-center">
                    <Plus className="w-4 h-4 mr-1.5 text-[#7e2562]" />
                    Add More Books to Exhibition
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-6">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Select Book from Catalog</label>
                      <Dropdown
                        searchable={true}
                        value={editBookInput}
                        onChange={(val) => {
                          setEditBookInput(val);
                          if (val) {
                            const bStock = getBranchStockQty(val);
                            const cStock = getCentralStockQty(val);
                            const selectedBranch = branches.find((br: any) => br.id === (editingExhibition?.sourceBranchId));
                            const isWarehouse = selectedBranch?.type === 'WAREHOUSE';
                            if (isWarehouse) {
                              setEditBranchQtyInput(0);
                              setEditWarehouseQtyInput(Math.min(5, cStock));
                            } else {
                              const defaultTotal = 5;
                              const defaultBranch = Math.min(defaultTotal, bStock);
                              const defaultWarehouse = Math.min(Math.max(0, defaultTotal - defaultBranch), cStock);
                              setEditBranchQtyInput(defaultBranch);
                              setEditWarehouseQtyInput(defaultWarehouse);
                            }
                          } else {
                            setEditBranchQtyInput(0);
                            setEditWarehouseQtyInput(0);
                          }
                        }}
                        placeholder="Search title, ISBN, or barcode..."
                        options={(catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : [])).map((b: any) => {
                          const bStock = getBranchStockQty(b.id);
                          const cStock = getCentralStockQty(b.id);
                          const selectedBranch = branches.find((br: any) => br.id === (editingExhibition?.sourceBranchId));
                          const isWarehouse = selectedBranch?.type === 'WAREHOUSE';
                          const totalStock = isWarehouse ? cStock : (bStock + cStock);
                          const badgeText = isWarehouse 
                            ? `Wh: ${cStock}` 
                            : `Branch: ${bStock} | Wh: ${cStock} (Total: ${totalStock})`;

                          return {
                            value: b.id,
                            label: b.title,
                            isbn: b.isbn,
                            barcode: b.barcode,
                            sublabel: `ISBN: ${b.isbn || 'N/A'}${b.barcode ? ` • Barcode: ${b.barcode}` : ''}`,
                            badge: badgeText,
                            badgeClassName: totalStock > 0 ? 'bg-[#faedf5] text-[#7e2562] border border-[#7e2562]/30' : 'bg-neutral-100 text-neutral-500 border border-neutral-200'
                          };
                        })}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Branch Shelf ({getBranchStockQty(editBookInput)})
                      </label>
                      <input 
                        type="number" 
                        min="0" 
                        value={editBranchQtyInput} 
                        onChange={e => setEditBranchQtyInput(Math.max(0, Number(e.target.value)))}
                        disabled={!editBookInput || branches.find((b: any) => b.id === editingExhibition?.sourceBranchId)?.type === 'WAREHOUSE'}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-sm text-sm bg-white disabled:bg-gray-100 focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" 
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Warehouse ({getCentralStockQty(editBookInput)})
                      </label>
                      <input 
                        type="number" 
                        min="0" 
                        value={editWarehouseQtyInput} 
                        onChange={e => setEditWarehouseQtyInput(Math.max(0, Number(e.target.value)))}
                        disabled={!editBookInput}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-sm text-sm bg-white disabled:bg-gray-100 focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" 
                      />
                    </div>

                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={handleAddBookToEditCart}
                        disabled={!editBookInput || (editBranchQtyInput + editWarehouseQtyInput <= 0)}
                        className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-[#7e2562] hover:bg-[#681b50] disabled:opacity-50 rounded-sm shadow-xs transition-colors active:scale-95"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add
                      </button>
                    </div>
                  </div>
                </div>
              </form>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
                <div className="text-xs text-gray-500">
                  Total Titles: <strong className="text-gray-900">{editCart.length}</strong> • Total Copies: <strong className="text-gray-900">{editCart.reduce((acc, curr) => acc + (curr.quantityRequested || 0), 0)}</strong>
                </div>

                <div className="flex items-center space-x-3">
                  <button 
                    type="button" 
                    onClick={() => setEditingExhibition(null)} 
                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    form="edit-exhibition-form"
                    disabled={isSubmitting || editCart.length === 0} 
                    className="inline-flex items-center px-5 py-2 text-sm font-semibold text-white bg-[#7e2562] hover:bg-[#681b50] disabled:opacity-50 rounded-sm shadow-xs transition-colors active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving Changes...
                      </>
                    ) : (
                      'Save Changes & Adjust Stock'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Assign User Modal */}
      <AnimatePresence>
        {assigningExhibition && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-sm shadow-xl w-full max-w-lg p-6 border border-[#7e2562]/10">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">Assign Staff to Exhibition</h3>
              <form onSubmit={handleAssign} className="space-y-4">
                <p className="text-sm text-gray-500 mb-4">Assign a staff member to oversee the <strong>{assigningExhibition.name}</strong> event.</p>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Select Branch</label>
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
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Select Staff Member</label>
                  <Dropdown
                    value={assignUserId}
                    onChange={(val) => setAssignUserId(val)}
                    placeholder={assignBranchId ? "Select staff..." : "Select a branch first"}
                    options={(usersResponse?.data || usersResponse || [])
                      .filter((u: any) => {
                        if (!assignBranchId) return false;
                        const selectedBranch = branches.find((b: any) => b.id === assignBranchId);
                        if (selectedBranch?.type === 'WAREHOUSE') {
                          return !u.branchId && !u.branch?.id;
                        }
                        return u.branchId === assignBranchId || u.branch?.id === assignBranchId;
                      })
                      .map((u: any) => ({ value: u.id, label: `${u.name} (${u.roles?.map((r: any) => r.role).join(', ') || u.primaryRole})` }))}
                  />
                </div>

                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                  <button type="button" onClick={() => setAssigningExhibition(null)} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="inline-flex items-center px-4 py-2 text-sm font-semibold text-white bg-[#3cb976] hover:bg-[#329e64] rounded-sm disabled:opacity-50 shadow-xs transition-colors active:scale-[0.98]">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-sm shadow-xl w-full max-w-4xl p-6 overflow-hidden flex flex-col max-h-[90vh] border border-[#7e2562]/10"
            >
              {/* Header */}
              <div className="flex justify-between items-start border-b border-gray-200 pb-4 mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 flex items-center">
                    <Tent className="w-5 h-5 mr-2 text-[#7e2562]" />
                    {viewingExhibitionHistory.name || viewingExhibitionHistory.eventName}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Location: <strong className="text-gray-700">{viewingExhibitionHistory.location}</strong> • 
                    Source: <strong className="text-gray-700">{viewingExhibitionHistory.branch?.name || viewingExhibitionHistory.sourceBranchName}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {viewingExhibitionHistory.status !== 'CLOSED' && viewingExhibitionHistory.status !== 'REJECTED' && (
                    <button
                      onClick={() => handleOpenEdit(viewingExhibitionHistory)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-[#7e2562] bg-[#faedf5] hover:bg-[#f6dbe9] border border-[#7e2562]/20 rounded-sm transition-colors shadow-xs"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Edit Exhibition & Stock
                    </button>
                  )}
                  <button 
                    onClick={() => setViewingExhibitionHistory(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-sm text-slate-400 hover:text-slate-600 transition"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {loadingHistory ? (
                <div className="py-24 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-10 h-10 animate-spin text-[#7e2562]" />
                  <p className="text-sm font-semibold text-slate-400">Loading exhibition report...</p>
                </div>
              ) : historyData ? (
                <div className="flex-1 overflow-y-auto pr-1 space-y-6">
                  {/* Basic Details card for everyone */}
                  <div className="bg-[#faf6f9]/60 border border-[#7e2562]/10 rounded-sm p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
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

                  {/* Financial Report Section */}
                  {showFullHistory ? (
                    <div className="space-y-6">
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-l-4 border-[#7e2562] pl-2">Financial Summary</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-[#f0fbf5] border border-[#3cb976]/20 rounded-sm p-4 flex flex-col">
                          <span className="text-[10px] font-bold text-[#3cb976] uppercase tracking-wider">Total Cash/UPI Revenue</span>
                          <strong className="text-xl text-emerald-800 mt-1">₹{Number(historyData.metrics.totalRevenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <div className="bg-amber-50/70 border border-amber-200 rounded-sm p-4 flex flex-col">
                          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Total Credit Sales Amount</span>
                          <strong className="text-xl text-amber-900 mt-1">₹{Number(historyData.metrics.totalCreditAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <div className="bg-[#faedf5] border border-[#7e2562]/20 rounded-sm p-4 flex flex-col">
                          <span className="text-[10px] font-bold text-[#7e2562] uppercase tracking-wider">Books Sold (From Invoices)</span>
                          <strong className="text-xl text-[#7e2562] mt-1">{historyData.metrics.totalBooksSoldFromBills} books</strong>
                        </div>
                      </div>

                      {/* Stock Reconciliation Summary Metrics */}
                      <div className="bg-[#faf6f9]/60 border border-[#7e2562]/10 rounded-sm p-4 grid grid-cols-3 md:grid-cols-6 gap-3 text-center text-xs">
                        <div>
                          <span className="text-slate-400 font-semibold block">Taken</span>
                          <strong className="text-sm text-slate-700 block mt-0.5">{historyData.metrics.totalTaken}</strong>
                        </div>
                        <div>
                          <span className="text-[#3cb976] font-semibold block">Sold (Reconciled)</span>
                          <strong className="text-sm text-[#3cb976] block mt-0.5">{historyData.metrics.totalSold}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 font-semibold block">Not Sold</span>
                          <strong className="text-sm text-slate-700 block mt-0.5">{historyData.metrics.totalReturned}</strong>
                        </div>
                        <div>
                          <span className="text-[#e45e34] font-semibold block">Damaged</span>
                          <strong className="text-sm text-[#e45e34] block mt-0.5">{historyData.metrics.totalDamaged}</strong>
                        </div>
                        <div>
                          <span className="text-[#e45e34] font-semibold block">Lost</span>
                          <strong className="text-sm text-[#e45e34] block mt-0.5">{historyData.metrics.totalLost}</strong>
                        </div>
                        <div>
                          <span className="text-purple-600 font-semibold block">Credit Copy</span>
                          <strong className="text-sm text-purple-700 block mt-0.5">{historyData.metrics.totalCreditQty}</strong>
                        </div>
                      </div>

                      {/* Invoices List */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-l-4 border-[#7e2562] pl-2">Sales Invoice History ({historyData.bills.length})</h4>
                        {historyData.bills.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No invoices recorded for this exhibition.</p>
                        ) : (
                          <div className="border border-[#7e2562]/10 rounded-sm overflow-hidden shadow-xs">
                            <table className="min-w-full divide-y divide-slate-100 text-left text-xs text-slate-600">
                              <thead className="bg-[#faf6f9]/70 font-bold uppercase text-[10px] text-[#7e2562] tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap">
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
                                  <tr key={bill.id} className="hover:bg-[#faf6f9]/30">
                                    <td className="px-4 py-2.5 font-semibold text-slate-800">{bill.billNumber}</td>
                                    <td className="px-4 py-2.5">
                                      <div>{bill.customerName || 'Walk-in Customer'}</div>
                                      {bill.customerPhone && <div className="text-[10px] text-slate-400">{bill.customerPhone}</div>}
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold ${
                                        bill.paymentStatus === 'PAID' ? 'bg-[#f0fbf5] text-[#3cb976] border border-[#3cb976]/30' : 'bg-amber-50 text-amber-700 border border-amber-200'
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

                  {/* Stock List */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-l-4 border-[#7e2562] pl-2">
                      {showFullHistory ? 'Reconciled Stock Detail' : 'Stock List'}
                    </h4>
                    {historyData.stock.length === 0 ? (
                      <p className="text-xs text-slate-400 italic">No stock registered for this exhibition.</p>
                    ) : (
                      <div className="border border-[#7e2562]/10 rounded-sm overflow-hidden shadow-xs">
                        <table className="min-w-full divide-y divide-slate-100 text-left text-xs text-slate-600">
                          <thead className="bg-[#faf6f9]/70 font-bold uppercase text-[10px] text-[#7e2562] tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap">
                            <tr>
                              <th className="px-4 py-2.5">Book Title</th>
                              <th className="px-4 py-2.5 text-center">Taken</th>
                              <th className="px-4 py-2.5 text-center text-[#3cb976]">Sold</th>
                              {showFullHistory && (
                                <>
                                  <th className="px-4 py-2.5 text-center">Not Sold</th>
                                  <th className="px-4 py-2.5 text-center text-[#e45e34]">Damaged</th>
                                  <th className="px-4 py-2.5 text-center text-[#e45e34]">Lost</th>
                                  <th className="px-4 py-2.5 text-center text-purple-600">Credit</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {historyData.stock.map((s: any) => (
                              <tr key={s.id} className="hover:bg-[#faf6f9]/30">
                                <td className="px-4 py-2.5">
                                  <div className="font-semibold text-slate-800">{s.bookTitle}</div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{s.isbn}</div>
                                </td>
                                <td className="px-4 py-2.5 text-center font-bold text-slate-700">{s.quantityTaken}</td>
                                <td className="px-4 py-2.5 text-center font-semibold text-[#3cb976]">{s.quantitySold}</td>
                                {showFullHistory && (
                                  <>
                                    <td className="px-4 py-2.5 text-center text-slate-500">{s.quantityReturned}</td>
                                    <td className="px-4 py-2.5 text-center text-[#e45e34] font-medium">{s.quantityDamaged}</td>
                                    <td className="px-4 py-2.5 text-center text-[#e45e34] font-medium">{s.quantityLost}</td>
                                    <td className="px-4 py-2.5 text-center text-purple-600 font-medium">{s.quantityCredit}</td>
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

              <div className="flex justify-end pt-4 border-t border-gray-200 mt-4">
                <button 
                  onClick={() => setViewingExhibitionHistory(null)}
                  className="px-4 py-2 bg-[#faedf5] hover:bg-[#f6dbe9] text-[#7e2562] border border-[#7e2562]/20 rounded-sm text-sm font-semibold transition"
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


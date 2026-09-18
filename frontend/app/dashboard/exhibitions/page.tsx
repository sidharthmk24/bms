"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { 
  Loader2, Plus, Tent, CheckCircle, XCircle, Send, ArchiveRestore, 
  AlertCircle, AlertTriangle, Eye, Pencil, Trash2, BookOpen, Warehouse, Store, Layers, GitFork, Building2,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dropdown } from '@/components/Dropdown';
import { BranchInventoryExhibitionsView } from './BranchInventoryExhibitionsView';

export interface ExhibitionBookItem {
  bookId: string;
  title: string;
  isbn?: string;
  quantityRequested: number;
  sourceMode: 'SINGLE' | 'SPLIT';
  selectedSource: string; // 'WAREHOUSE' | 'BRANCH_<id>' | 'SPLIT'
  sourceSplits: Record<string, number>;
  isSplitExpanded?: boolean;
  originalQuantity?: number;
  originalFromBranch?: number;
  originalFromCentral?: number;
  quantitySold?: number;
}

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
  const canManageStockSources = isAdmin || isCentralManager;

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
    setHistoryData(null);
    setLoadingHistory(true);
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
  const [cart, setCart] = useState<ExhibitionBookItem[]>([]);
  
  // Close/Reconciliation State
  const [closingExhibition, setClosingExhibition] = useState<any | null>(null);
  const [reconciliation, setReconciliation] = useState<any[]>([]);
  const [closeNote, setCloseNote] = useState('');
  
  // View Rejection Reason State
  const [viewingRejectionReason, setViewingRejectionReason] = useState<string | null>(null);

  // Edit & Assign State
  const [editFormData, setEditFormData] = useState({ name: '', location: '', startDate: '', endDate: '', assignedUserId: '' });
  const [editCart, setEditCart] = useState<ExhibitionBookItem[]>([]);

  // Approve & Stock Allocation State (Central Inventory Manager / Super Admin / Admin)
  const [approvingExhibition, setApprovingExhibition] = useState<any | null>(null);
  const [approveCart, setApproveCart] = useState<ExhibitionBookItem[]>([]);
  const [approveNote, setApproveNote] = useState('');

  const [assigningExhibition, setAssigningExhibition] = useState<any | null>(null);
  const [assignBranchId, setAssignBranchId] = useState('');
  const [assignUserId, setAssignUserId] = useState('');

  const activeSourceBranchId = approvingExhibition?.sourceBranchId || editingExhibition?.sourceBranchId || (isAdmin ? createBranchId : user?.branchId);
  const [centralInventory, setCentralInventory] = useState<any[]>([]);
  const [allBranchInventories, setAllBranchInventories] = useState<Record<string, any[]>>({});

  useEffect(() => {
    // Load central warehouse stock for multi-source availability
    api.get('/inventory/central-stock?limit=10000')
      .then((res) => {
        if (res.success) {
          setCentralInventory(res.data.items || res.data || []);
        }
      })
      .catch((err) => console.error('Failed to load central inventory:', err));
  }, []);

  useEffect(() => {
    if (!branches || branches.length === 0) return;
    branches.forEach((br: any) => {
      if (br.type !== 'WAREHOUSE') {
        api.get(`/inventory/branch/${br.id}?limit=10000`)
          .then((res) => {
            if (res.success) {
              setAllBranchInventories((prev) => ({
                ...prev,
                [br.id]: res.data?.items || res.data || [],
              }));
            }
          })
          .catch(() => {});
      }
    });
  }, [branches]);

  const getBranchStockQty = (branchId: string, bookId: string) => {
    const list = allBranchInventories[branchId] || [];
    const item = list.find((bi: any) => bi.bookId === bookId || bi.book?.id === bookId);
    return item ? Number(item.quantity) : 0;
  };

  const getCentralStockQty = (bookId: string) => {
    const item = centralInventory.find((ci: any) => ci.bookId === bookId || ci.book?.id === bookId);
    return item ? Number(item.quantity) : 0;
  };

  const getActiveBranchStockQty = (bookId: string) => {
    if (!activeSourceBranchId) return 0;
    return getBranchStockQty(activeSourceBranchId, bookId);
  };

  const getItemBranchCentralQuantities = (item: ExhibitionBookItem) => {
    if (item.sourceMode === 'SINGLE') {
      if (item.selectedSource === 'WAREHOUSE') {
        return { branch: 0, central: item.quantityRequested };
      } else {
        return { branch: item.quantityRequested, central: 0 };
      }
    }

    const splits = item.sourceSplits || {};
    const central = splits['WAREHOUSE'] || 0;
    let branch = 0;
    Object.keys(splits).forEach((key) => {
      if (key !== 'WAREHOUSE') {
        branch += Number(splits[key]) || 0;
      }
    });

    return { branch, central };
  };

  const getSourceAvailableQty = (sourceKey: string, bookId: string, item?: ExhibitionBookItem, isEdit?: boolean) => {
    if (sourceKey === 'WAREHOUSE') {
      const base = getCentralStockQty(bookId);
      return isEdit ? base + (item?.originalFromCentral || 0) : base;
    }
    if (sourceKey.startsWith('BRANCH_')) {
      const bId = sourceKey.replace('BRANCH_', '');
      const base = getBranchStockQty(bId, bookId);
      const isOriginalSource = isEdit && bId === editingExhibition?.sourceBranchId;
      return isOriginalSource ? base + (item?.originalFromBranch || 0) : base;
    }
    return 0;
  };

  const getRowSourceOptions = (bookId: string, item?: ExhibitionBookItem, isEdit?: boolean) => {
    const cStock = getCentralStockQty(bookId) + (isEdit ? (item?.originalFromCentral || 0) : 0);
    const opts: any[] = [
      {
        value: 'WAREHOUSE',
        label: `Central Warehouse (${cStock} avail)`,
        icon: <Warehouse className="w-4 h-4 text-blue-600" />,
      },
    ];

    (branches || [])
      .filter((b: any) => b.type !== 'WAREHOUSE')
      .forEach((b: any) => {
        const bQty = getBranchStockQty(b.id, bookId) + (isEdit && b.id === editingExhibition?.sourceBranchId ? (item?.originalFromBranch || 0) : 0);
        opts.push({
          value: `BRANCH_${b.id}`,
          label: `${b.name} (${bQty} avail)`,
          icon: <Store className="w-4 h-4 text-amber-600" />,
        });
      });

    opts.push({
      value: 'SPLIT',
      label: 'Custom Multi-Branch Split',
      icon: <GitFork className="w-4 h-4 text-purple-600" />,
    });

    return opts;
  };

  // Quantity stepper
  const handleCreateQuantityChange = (bookId: string, newQty: number) => {
    if (newQty < 1) return;
    setCart((prev) =>
      prev.map((item) => {
        if (item.bookId !== bookId) return item;
        if (item.sourceMode === 'SINGLE') {
          return {
            ...item,
            quantityRequested: newQty,
            sourceSplits: { [item.selectedSource]: newQty },
          };
        } else {
          return { ...item, quantityRequested: newQty };
        }
      })
    );
  };

  // Source dropdown change
  const handleCreateSourceChange = (bookId: string, sourceVal: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.bookId !== bookId) return item;
        if (sourceVal === 'SPLIT') {
          const currentSplits = item.sourceSplits && Object.keys(item.sourceSplits).length > 0
            ? item.sourceSplits
            : { 'WAREHOUSE': item.quantityRequested };
          return {
            ...item,
            sourceMode: 'SPLIT',
            selectedSource: 'SPLIT',
            sourceSplits: currentSplits,
            isSplitExpanded: true,
          };
        } else {
          return {
            ...item,
            sourceMode: 'SINGLE',
            selectedSource: sourceVal,
            sourceSplits: { [sourceVal]: item.quantityRequested },
            isSplitExpanded: false,
          };
        }
      })
    );
  };

  // Split individual source input change
  const handleCreateSplitQtyChange = (bookId: string, sourceKey: string, val: number) => {
    const safeVal = Math.max(0, isNaN(val) ? 0 : val);
    setCart((prev) =>
      prev.map((item) => {
        if (item.bookId !== bookId) return item;
        const newSplits = { ...item.sourceSplits, [sourceKey]: safeVal };
        const newTotal = Object.values(newSplits).reduce((sum, q) => sum + (Number(q) || 0), 0);
        return {
          ...item,
          sourceMode: 'SPLIT',
          selectedSource: 'SPLIT',
          sourceSplits: newSplits,
          quantityRequested: newTotal,
        };
      })
    );
  };

  const handleToggleCreateSplitExpand = (bookId: string) => {
    setCart((prev) =>
      prev.map((item) =>
        item.bookId === bookId ? { ...item, isSplitExpanded: !item.isSplitExpanded } : item
      )
    );
  };

  // Edit Modal Handlers
  const handleEditQuantityChange = (bookId: string, newQty: number) => {
    if (newQty < 1) return;
    const existing = editCart.find((i) => i.bookId === bookId);
    if (existing?.quantitySold && newQty < existing.quantitySold) {
      alert(`Cannot reduce quantity below ${existing.quantitySold} because ${existing.quantitySold} copies were already sold.`);
      return;
    }
    setEditCart((prev) =>
      prev.map((item) => {
        if (item.bookId !== bookId) return item;
        if (item.sourceMode === 'SINGLE') {
          return {
            ...item,
            quantityRequested: newQty,
            sourceSplits: { [item.selectedSource]: newQty },
          };
        } else {
          return { ...item, quantityRequested: newQty };
        }
      })
    );
  };

  const handleEditSourceChange = (bookId: string, sourceVal: string) => {
    setEditCart((prev) =>
      prev.map((item) => {
        if (item.bookId !== bookId) return item;
        if (sourceVal === 'SPLIT') {
          const currentSplits = item.sourceSplits && Object.keys(item.sourceSplits).length > 0
            ? item.sourceSplits
            : { 'WAREHOUSE': item.quantityRequested };
          return {
            ...item,
            sourceMode: 'SPLIT',
            selectedSource: 'SPLIT',
            sourceSplits: currentSplits,
            isSplitExpanded: true,
          };
        } else {
          return {
            ...item,
            sourceMode: 'SINGLE',
            selectedSource: sourceVal,
            sourceSplits: { [sourceVal]: item.quantityRequested },
            isSplitExpanded: false,
          };
        }
      })
    );
  };

  const handleEditSplitQtyChange = (bookId: string, sourceKey: string, val: number) => {
    const safeVal = Math.max(0, isNaN(val) ? 0 : val);
    setEditCart((prev) =>
      prev.map((item) => {
        if (item.bookId !== bookId) return item;
        const newSplits = { ...item.sourceSplits, [sourceKey]: safeVal };
        const newTotal = Object.values(newSplits).reduce((sum, q) => sum + (Number(q) || 0), 0);
        if (item.quantitySold && newTotal < item.quantitySold) {
          alert(`Cannot reduce total quantity below ${item.quantitySold} because ${item.quantitySold} copies were already sold.`);
          return item;
        }
        return {
          ...item,
          sourceMode: 'SPLIT',
          selectedSource: 'SPLIT',
          sourceSplits: newSplits,
          quantityRequested: newTotal,
        };
      })
    );
  };

  const handleToggleEditSplitExpand = (bookId: string) => {
    setEditCart((prev) =>
      prev.map((item) =>
        item.bookId === bookId ? { ...item, isSplitExpanded: !item.isSplitExpanded } : item
      )
    );
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

  // Approve & Stock Allocation Handlers (Central Inventory Manager / Super Admin / Admin)
  const handleOpenApproveModal = (ex: any) => {
    setApprovingExhibition(ex);
    setApproveNote('');
    const isWarehouse = branches.find((b: any) => b.id === ex.sourceBranchId)?.type === 'WAREHOUSE';

    const items: ExhibitionBookItem[] = (ex.stock || []).map((s: any) => {
      const bookId = s.bookId || s.book?.id;
      const title = s.book?.title || 'Book Title';
      const isbn = s.book?.isbn || '';
      const totalQty = Number(s.quantityTaken || 0);
      const fromBranch = Number(s.quantityFromBranch ?? 0);
      const fromCentral = Number(s.quantityFromCentral ?? 0);
      const sold = Number(s.quantitySold || 0);

      let splits: Record<string, number> = {};
      let selectedSource = 'WAREHOUSE';
      let sourceMode: 'SINGLE' | 'SPLIT' = 'SINGLE';

      if (s.sourceSplits && typeof s.sourceSplits === 'object' && Object.keys(s.sourceSplits).length > 0) {
        splits = { ...s.sourceSplits };
        const activeKeys = Object.keys(splits).filter((k) => (splits[k] || 0) > 0);
        if (activeKeys.length > 1) {
          sourceMode = 'SPLIT';
          selectedSource = 'SPLIT';
        } else if (activeKeys.length === 1) {
          sourceMode = 'SINGLE';
          selectedSource = activeKeys[0];
        } else {
          sourceMode = 'SINGLE';
          selectedSource = isWarehouse ? 'WAREHOUSE' : (ex.sourceBranchId ? `BRANCH_${ex.sourceBranchId}` : 'WAREHOUSE');
          splits[selectedSource] = totalQty;
        }
      } else {
        const isSplit = fromBranch > 0 && fromCentral > 0;
        if (isSplit) {
          sourceMode = 'SPLIT';
          selectedSource = 'SPLIT';
          splits['WAREHOUSE'] = fromCentral;
          if (ex.sourceBranchId) {
            splits[`BRANCH_${ex.sourceBranchId}`] = fromBranch;
          }
        } else if (fromCentral > 0 || isWarehouse) {
          sourceMode = 'SINGLE';
          selectedSource = 'WAREHOUSE';
          splits['WAREHOUSE'] = totalQty;
        } else {
          sourceMode = 'SINGLE';
          selectedSource = ex.sourceBranchId ? `BRANCH_${ex.sourceBranchId}` : 'WAREHOUSE';
          splits[selectedSource] = totalQty;
        }
      }

      return {
        bookId,
        title,
        isbn,
        quantityRequested: totalQty,
        sourceMode,
        selectedSource,
        sourceSplits: splits,
        isSplitExpanded: false,
        originalQuantity: totalQty,
        originalFromBranch: fromBranch,
        originalFromCentral: fromCentral,
        quantitySold: sold,
      };
    });

    setApproveCart(items);
  };

  const handleApproveQuantityChange = (bookId: string, newQty: number) => {
    if (newQty < 1) return;
    setApproveCart((prev) =>
      prev.map((item) => {
        if (item.bookId !== bookId) return item;
        if (item.sourceMode === 'SINGLE') {
          return {
            ...item,
            quantityRequested: newQty,
            sourceSplits: { [item.selectedSource]: newQty },
          };
        } else {
          return { ...item, quantityRequested: newQty };
        }
      })
    );
  };

  const handleApproveSourceChange = (bookId: string, sourceVal: string) => {
    setApproveCart((prev) =>
      prev.map((item) => {
        if (item.bookId !== bookId) return item;
        if (sourceVal === 'SPLIT') {
          const currentSplits = item.sourceSplits && Object.keys(item.sourceSplits).length > 0
            ? item.sourceSplits
            : { 'WAREHOUSE': item.quantityRequested };
          return {
            ...item,
            sourceMode: 'SPLIT',
            selectedSource: 'SPLIT',
            sourceSplits: currentSplits,
            isSplitExpanded: true,
          };
        } else {
          return {
            ...item,
            sourceMode: 'SINGLE',
            selectedSource: sourceVal,
            sourceSplits: { [sourceVal]: item.quantityRequested },
            isSplitExpanded: false,
          };
        }
      })
    );
  };

  const handleApproveSplitQtyChange = (bookId: string, sourceKey: string, val: number) => {
    const safeVal = Math.max(0, isNaN(val) ? 0 : val);
    setApproveCart((prev) =>
      prev.map((item) => {
        if (item.bookId !== bookId) return item;
        const newSplits = { ...item.sourceSplits, [sourceKey]: safeVal };
        const newTotal = Object.values(newSplits).reduce((sum, q) => sum + (Number(q) || 0), 0);
        return {
          ...item,
          sourceMode: 'SPLIT',
          selectedSource: 'SPLIT',
          sourceSplits: newSplits,
          quantityRequested: newTotal,
        };
      })
    );
  };

  const handleToggleApproveSplitExpand = (bookId: string) => {
    setApproveCart((prev) =>
      prev.map((item) =>
        item.bookId === bookId ? { ...item, isSplitExpanded: !item.isSplitExpanded } : item
      )
    );
  };

  const handleConfirmApproveAndAllocate = async () => {
    if (!approvingExhibition) return;
    
    // Validate split sums if in SPLIT mode
    for (const item of approveCart) {
      if (item.sourceMode === 'SPLIT') {
        const splits = item.sourceSplits || {};
        const sum = Object.values(splits).reduce((a, b) => a + (Number(b) || 0), 0);
        if (sum !== item.quantityRequested) {
          alert(`For "${item.title}", the branch and warehouse split copies (${sum}) do not match the total quantity (${item.quantityRequested}).`);
          return;
        }
      }
    }

    const ok = await confirm({
      title: "Approve Exhibition & Allocate Stock",
      message: `Approve exhibition "${approvingExhibition.name || approvingExhibition.eventName}" with the selected stock source allocations?`,
      confirmText: "Yes, Approve & Allocate",
      cancelText: "No, Go Back",
      variant: "success",
    });
    if (!ok) return;

    try {
      setIsSubmitting(true);
      // 1. Update exhibition stock allocation items
      await api.patch(`/exhibitions/${approvingExhibition.id}`, {
        items: approveCart.map((i) => {
          const { branch, central } = getItemBranchCentralQuantities(i);
          const splits = i.sourceMode === 'SPLIT' 
            ? (i.sourceSplits || {}) 
            : { [i.selectedSource]: i.quantityRequested };
          return {
            bookId: i.bookId,
            quantityTaken: i.quantityRequested,
            quantityFromBranch: branch,
            quantityFromCentral: central,
            sourceSplits: splits,
          };
        }),
      });

      // 2. Approve exhibition
      await api.post(`/exhibitions/${approvingExhibition.id}/review`, {
        status: 'APPROVED',
        note: approveNote || undefined,
      });

      setApprovingExhibition(null);
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to approve exhibition');
    } finally {
      setIsSubmitting(false);
    }
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

    const isWarehouse = branches.find((b: any) => b.id === ex.sourceBranchId)?.type === 'WAREHOUSE';

    const items: ExhibitionBookItem[] = (ex.stock || []).map((s: any) => {
      const bookId = s.bookId || s.book?.id;
      const title = s.book?.title || 'Book Title';
      const isbn = s.book?.isbn || '';
      const totalQty = Number(s.quantityTaken || 0);
      const fromBranch = Number(s.quantityFromBranch ?? 0);
      const fromCentral = Number(s.quantityFromCentral ?? 0);
      const sold = Number(s.quantitySold || 0);

      const isSplit = fromBranch > 0 && fromCentral > 0;
      let splits: Record<string, number> = {};
      let selectedSource = 'WAREHOUSE';
      let sourceMode: 'SINGLE' | 'SPLIT' = 'SINGLE';

      if (s.sourceSplits && typeof s.sourceSplits === 'object' && Object.keys(s.sourceSplits).length > 0) {
        splits = { ...s.sourceSplits };
        const activeKeys = Object.keys(splits).filter((k) => (splits[k] || 0) > 0);
        if (activeKeys.length > 1) {
          sourceMode = 'SPLIT';
          selectedSource = 'SPLIT';
        } else if (activeKeys.length === 1) {
          sourceMode = 'SINGLE';
          selectedSource = activeKeys[0];
        } else {
          sourceMode = 'SINGLE';
          selectedSource = isWarehouse ? 'WAREHOUSE' : (ex.sourceBranchId ? `BRANCH_${ex.sourceBranchId}` : 'WAREHOUSE');
          splits[selectedSource] = totalQty;
        }
      } else {
        const isSplit = fromBranch > 0 && fromCentral > 0;
        if (isSplit) {
          sourceMode = 'SPLIT';
          selectedSource = 'SPLIT';
          splits['WAREHOUSE'] = fromCentral;
          if (ex.sourceBranchId) {
            splits[`BRANCH_${ex.sourceBranchId}`] = fromBranch;
          }
        } else if (fromCentral > 0 || isWarehouse) {
          sourceMode = 'SINGLE';
          selectedSource = 'WAREHOUSE';
          splits['WAREHOUSE'] = totalQty;
        } else {
          sourceMode = 'SINGLE';
          selectedSource = ex.sourceBranchId ? `BRANCH_${ex.sourceBranchId}` : 'WAREHOUSE';
          splits[selectedSource] = totalQty;
        }
      }

      return {
        bookId,
        title,
        isbn,
        quantityRequested: totalQty,
        sourceMode,
        selectedSource,
        sourceSplits: splits,
        isSplitExpanded: false,
        originalQuantity: totalQty,
        originalFromBranch: fromBranch,
        originalFromCentral: fromCentral,
        quantitySold: sold,
      };
    });

    setEditCart(items);
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
        items: editCart.map((i) => {
          const { branch, central } = getItemBranchCentralQuantities(i);
          const splits = i.sourceMode === 'SPLIT' 
            ? (i.sourceSplits || {}) 
            : { [i.selectedSource]: i.quantityRequested };
          return {
            bookId: i.bookId,
            quantityTaken: i.quantityRequested,
            quantityFromBranch: branch,
            quantityFromCentral: central,
            sourceSplits: splits,
          };
        }),
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
    const totalItems = cart.reduce((acc, i) => acc + (Number(i.quantityRequested) || 0), 0);
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
        items: cart.map((i) => {
          const { branch, central } = getItemBranchCentralQuantities(i);
          const splits = i.sourceMode === 'SPLIT' 
            ? (i.sourceSplits || {}) 
            : { [i.selectedSource]: i.quantityRequested };
          return {
            bookId: i.bookId,
            quantityTaken: i.quantityRequested,
            quantityFromBranch: branch,
            quantityFromCentral: central,
            sourceSplits: splits,
          };
        }),
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
            {(isBranch || isAdmin || isCentralManager) && (
              <button
                onClick={() => setIsCreating(true)}
                className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-[#7e2562] hover:bg-[#681b50] rounded-sm shadow-xs transition-all active:scale-[0.98]"
              >
                <Plus className="w-4 h-4 mr-2" />
                {canManageStockSources ? 'Create Exhibition' : 'Request Exhibition'}
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

                      {canManageStockSources && (ex.status === 'REQUESTED' || ex.status === 'EXPIRED') && (
                        <button 
                          onClick={() => handleOpenApproveModal(ex)} 
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-white bg-[#3cb976] hover:bg-[#329e64] rounded-sm shadow-xs transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                          Approve & Allocate Stock
                        </button>
                      )}

                      {ex.status !== 'CLOSED' && ex.status !== 'REJECTED' && (
                        isAdmin ||
                        isCentralManager ||
                        ex.requestedById === user?.id ||
                        ex.assignedUserId === user?.id ||
                        (isBranchManager && ex.sourceBranchId === user?.branchId)
                      ) && (
                        <button 
                          onClick={() => handleOpenEdit(ex)} 
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-[#7e2562] bg-[#faedf5] hover:bg-[#f6dbe9] border border-[#7e2562]/20 rounded-sm transition-colors shadow-xs"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" /> {canManageStockSources ? 'Edit / Manage Stock' : 'Edit Book Request'}
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

                      {(isAdmin || isBranch || isCentralManager) && (ex.status === 'ONGOING' || ex.status === 'OVERDUE') && (
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
                    {((canManageStockSources && (ex.status === 'REQUESTED' || ex.status === 'EXPIRED')) || (isAdmin && ex.status !== 'CLOSED')) && (
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

                        {canManageStockSources && (ex.status === 'REQUESTED' || ex.status === 'EXPIRED') && (
                          <button 
                            onClick={() => handleApproveReject(ex.id, 'reject')} 
                            className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-[#e45e34] bg-[#fef5f2] hover:bg-[#fdeae3] border border-[#e45e34]/30 rounded-sm transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-sm shadow-xl w-full max-w-2xl max-h-[92dvh] flex flex-col overflow-hidden border border-[#7e2562]/10"
            >
              {/* Header */}
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[#7e2562]/10 bg-gradient-to-r from-[#faedf5]/70 to-[#faf6f9] flex justify-between items-center shrink-0">
                <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center">
                  <Tent className="w-5 h-5 mr-2 text-[#7e2562]"/> 
                  {canManageStockSources ? 'Create Exhibition' : 'Request Exhibition'}
                </h3>
                <button 
                  onClick={() => setIsCreating(false)} 
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-sm hover:bg-gray-100 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              {/* Scrollable Body */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                <div className="bg-[#faedf5] border border-[#7e2562]/20 rounded-sm p-3 text-xs text-[#7e2562] flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 text-[#7e2562] shrink-0 mt-0.5" />
                  <span>
                    {canManageStockSources ? (
                      <>
                        <strong>Immediate Inventory Allocation:</strong> As an administrator / central inventory manager, you can directly designate stock sources (Central Warehouse or Branches) for this exhibition.
                      </>
                    ) : (
                      <>
                        <strong>Exhibition Book Request:</strong> Select the book titles and requested quantities for your exhibition. The Central Inventory Manager or Administrator will allocate stock sources upon approving your request.
                      </>
                    )}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                  <div className="col-span-1 sm:col-span-2">
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
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      {canManageStockSources ? 'Select & Allocate Books' : 'Select Books & Quantities'}
                    </h4>
                    <span className="text-[11px] text-gray-500">
                      Click <strong className="text-[#7e2562]">+ Add</strong> on books to include them in the exhibition.
                    </span>
                  </div>

                  <div className="mb-3">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Search & Select Books</label>
                    <MultiSelectBookDropdown
                      books={catalogBooks}
                      onSelectBook={handleSelectBookForCreate}
                      placeholder="Type book title or ISBN to add..."
                      options={catalogBooks.map((b: any) => ({
                        value: b.id,
                        label: b.title,
                        isbn: b.isbn,
                        isSelected: cart.some((i) => i.bookId === b.id),
                      }))}
                    />
                  </div>
                </div>

                <div className="border border-[#7e2562]/10 rounded-sm max-h-80 overflow-y-auto overflow-x-auto mb-2 shadow-xs">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-[#faf6f9]/70 text-[11px] font-bold text-[#7e2562] uppercase tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap sticky top-0 z-10">
                      <tr>
                        <th className={`px-4 py-2.5 text-left ${canManageStockSources ? 'w-1/4 min-w-[160px]' : 'w-1/2 min-w-[200px]'}`}>Book Title & ISBN</th>
                        {canManageStockSources && (
                          <th className="px-4 py-2.5 text-left w-1/2 min-w-[260px]">Stock Source & Allocation</th>
                        )}
                        <th className={`px-4 py-2.5 text-center ${canManageStockSources ? 'w-1/6 min-w-[120px]' : 'w-1/4 min-w-[120px]'}`}>
                          {canManageStockSources ? 'Total Quantity' : 'Requested Quantity'}
                        </th>
                        <th className="px-4 py-2.5 text-right min-w-[80px]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-xs">
                      {cart.map((item) => {
                        const isSplit = item.sourceMode === 'SPLIT';
                        const selectedAvail = canManageStockSources 
                          ? getSourceAvailableQty(item.selectedSource, item.bookId) 
                          : getActiveBranchStockQty(item.bookId);
                        const isSingleOver = !isSplit && (item.quantityRequested || 0) > selectedAvail;

                        return (
                          <tr key={item.bookId} className="hover:bg-gray-50/75 transition-colors">
                            <td className="px-4 py-3 align-top">
                              <div className="font-semibold text-gray-900">{item.title}</div>
                              {/* {item.isbn && (
                                <div className="text-[11px] text-gray-400 font-mono mt-0.5">{item.isbn}</div>
                              )} */}
                              {!canManageStockSources && (
                                <div className="text-[11px] text-gray-500 mt-1">
                                  Your branch stock: <strong className="text-gray-800">{getActiveBranchStockQty(item.bookId)}</strong>
                                </div>
                              )}
                            </td>

                            {canManageStockSources && (
                              <td className="px-4 py-3 align-top">
                                <div className="space-y-2">
                                  <Dropdown
                                    value={item.selectedSource}
                                    onChange={(val) => handleCreateSourceChange(item.bookId, val)}
                                    options={getRowSourceOptions(item.bookId, item, false)}
                                    selectClassName="text-xs py-1.5 px-2.5 bg-white border border-[#7e2562]/20"
                                    menuClassName="w-72"
                                  />

                                  {isSplit && (
                                    <div className="space-y-1.5">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleCreateSplitExpand(item.bookId)}
                                          className="inline-flex items-center text-[11px] font-semibold text-[#7e2562] bg-[#faedf5] hover:bg-[#f6dfef] px-2 py-0.5 rounded-sm border border-[#7e2562]/20 transition-colors"
                                        >
                                          <Layers className="w-3 h-3 mr-1 text-[#7e2562]" />
                                          {item.isSplitExpanded ? 'Hide Branch Inputs' : 'Configure Branch Quantities'}
                                          {item.isSplitExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                                        </button>

                                        {!item.isSplitExpanded && (
                                          <div className="flex flex-wrap gap-1 text-[10px]">
                                            {(item.sourceSplits?.['WAREHOUSE'] || 0) > 0 && (() => {
                                              const wAvail = getCentralStockQty(item.bookId);
                                              const wQty = item.sourceSplits?.['WAREHOUSE'] || 0;
                                              const isOver = wQty > wAvail;
                                              return (
                                                <span className={`font-medium px-1.5 py-0.5 rounded border ${
                                                  isOver 
                                                    ? 'bg-red-50 text-red-700 border-red-300 font-bold' 
                                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                                }`}>
                                                  Warehouse: {wQty}
                                                  {isOver && <span className="ml-1 text-[9px] text-red-500 font-normal">({wAvail} avail)</span>}
                                                </span>
                                              );
                                            })()}
                                            {branches.filter((b: any) => b.type !== 'WAREHOUSE').map((b: any) => {
                                              const qty = item.sourceSplits?.[`BRANCH_${b.id}`] || 0;
                                              if (qty <= 0) return null;
                                              const bAvail = getBranchStockQty(b.id, item.bookId);
                                              const isOver = qty > bAvail;
                                              return (
                                                <span key={b.id} className={`font-medium px-1.5 py-0.5 rounded border ${
                                                  isOver 
                                                    ? 'bg-red-50 text-red-700 border-red-300 font-bold' 
                                                    : 'bg-amber-50 text-amber-800 border-amber-200'
                                                }`}>
                                                  {b.name}: {qty}
                                                  {isOver && <span className="ml-1 text-[9px] text-red-500 font-normal">({bAvail} avail)</span>}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </div>

                                      {item.isSplitExpanded && (
                                        <div className="p-2.5 bg-[#faf6f9] border border-[#7e2562]/20 rounded-sm space-y-2 mt-2">
                                          <div className="text-[11px] font-bold text-[#7e2562] flex items-center justify-between">
                                            <span>Enter copies from each source:</span>
                                            <span className="text-gray-700 font-normal">Sum: <strong className="text-[#7e2562]">{item.quantityRequested}</strong> copies</span>
                                          </div>

                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {/* Warehouse */}
                                            {(() => {
                                              const wAvail = getCentralStockQty(item.bookId);
                                              const wVal = item.sourceSplits?.['WAREHOUSE'] ?? 0;
                                              const isOver = wVal > wAvail;
                                              return (
                                                <div className={`flex items-center justify-between bg-white px-2.5 py-1.5 rounded-sm border ${
                                                  isOver ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
                                                }`}>
                                                  <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                                    <Warehouse className={`w-3.5 h-3.5 shrink-0 ${isOver ? 'text-red-600' : 'text-blue-600'}`} />
                                                    <div className="text-xs text-gray-800 font-medium truncate">
                                                      Central Warehouse
                                                      <span className={`text-[10px] block ${isOver ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                                                        ({wAvail} avail)
                                                      </span>
                                                    </div>
                                                  </div>
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    value={item.sourceSplits?.['WAREHOUSE'] ?? 0}
                                                    onChange={(e) => handleCreateSplitQtyChange(item.bookId, 'WAREHOUSE', Number(e.target.value))}
                                                    className={`w-16 px-1.5 py-1 text-center font-bold text-xs border rounded transition-colors ${
                                                      isOver 
                                                        ? 'text-red-600 bg-red-50 border-red-400 focus:ring-1 focus:ring-red-500 focus:border-red-500' 
                                                        : 'text-gray-900 border-gray-300 focus:ring-1 focus:ring-[#7e2562]'
                                                    }`}
                                                  />
                                                </div>
                                              );
                                            })()}

                                            {/* Branches */}
                                            {branches.filter((b: any) => b.type !== 'WAREHOUSE').map((b: any) => {
                                              const bAvail = getBranchStockQty(b.id, item.bookId);
                                              const bVal = item.sourceSplits?.[`BRANCH_${b.id}`] ?? 0;
                                              const isOver = bVal > bAvail;
                                              return (
                                                <div key={b.id} className={`flex items-center justify-between bg-white px-2.5 py-1.5 rounded-sm border ${
                                                  isOver ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
                                                }`}>
                                                  <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                                    <Store className={`w-3.5 h-3.5 shrink-0 ${isOver ? 'text-red-600' : 'text-amber-600'}`} />
                                                    <div className="text-xs text-gray-800 font-medium truncate">
                                                      {b.name}
                                                      <span className={`text-[10px] block ${isOver ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                                                        ({bAvail} avail)
                                                      </span>
                                                    </div>
                                                  </div>
                                                  <input
                                                    type="number"
                                                    min="0"
                                                    value={item.sourceSplits?.[`BRANCH_${b.id}`] ?? 0}
                                                    onChange={(e) => handleCreateSplitQtyChange(item.bookId, `BRANCH_${b.id}`, Number(e.target.value))}
                                                    className={`w-16 px-1.5 py-1 text-center font-bold text-xs border rounded transition-colors ${
                                                      isOver 
                                                        ? 'text-red-600 bg-red-50 border-red-400 focus:ring-1 focus:ring-red-500 focus:border-red-500' 
                                                        : 'text-gray-900 border-gray-300 focus:ring-1 focus:ring-[#7e2562]'
                                                    }`}
                                                  />
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </td>
                            )}

                            <td className="px-4 py-3 align-top text-center">
                              {isSplit ? (
                                <div className="inline-flex items-center justify-center font-bold text-sm text-[#7e2562] bg-[#faedf5] px-2.5 py-1 rounded-sm border border-[#7e2562]/20">
                                  {item.quantityRequested} copies
                                </div>
                              ) : (
                                <div className="inline-flex flex-col items-center">
                                  <div className="inline-flex items-center border border-gray-300 rounded-sm">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const current = item.quantityRequested || 1;
                                        if (current > 1) {
                                          handleCreateSingleQtyChange(item.bookId, current - 1);
                                        }
                                      }}
                                      className="w-7 h-7 rounded-sm border border-gray-300 bg-gray-50 hover:bg-gray-100 flex items-center justify-center font-bold text-gray-700"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.quantityRequested}
                                      onChange={(e) => handleCreateSingleQtyChange(item.bookId, Number(e.target.value))}
                                      className="w-12 text-center text-xs font-bold border-0 focus:ring-0 py-1"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const current = item.quantityRequested || 1;
                                        handleCreateSingleQtyChange(item.bookId, current + 1);
                                      }}
                                      className="w-7 h-7 rounded-sm border border-gray-300 bg-gray-50 hover:bg-gray-100 flex items-center justify-center font-bold text-gray-700"
                                    >
                                      +
                                    </button>
                                  </div>
                                  {isSingleOver && (
                                    <span className="text-[10px] text-red-600 font-bold mt-1 block whitespace-nowrap">
                                      Exceeds stock ({selectedAvail} avail)
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>

                            <td className="px-4 py-3 text-right align-top">
                              <button
                                type="button"
                                onClick={() => setCart(cart.filter((i) => i.bookId !== item.bookId))}
                                className="text-[#e45e34] hover:text-[#c74c25] font-semibold text-xs p-1 hover:bg-[#fef5f2] rounded-sm transition-colors"
                                title="Remove book"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                      {cart.length === 0 && (
                        <tr>
                          <td colSpan={canManageStockSources ? 4 : 3} className="px-4 py-8 text-center text-gray-400 italic">No books added yet. Search and select books above.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Footer */}
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-200 bg-gray-50/60 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 shrink-0">
                <button onClick={() => setIsCreating(false)} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50">Cancel</button>
                <button onClick={handleCreate} disabled={cart.length === 0 || !eventName || isSubmitting} className="px-4 py-2 text-sm font-semibold text-white bg-[#7e2562] hover:bg-[#681b50] rounded-sm disabled:opacity-50 shadow-xs transition-all active:scale-[0.98]">
                  {isSubmitting ? 'Submitting...' : canManageStockSources ? 'Create Exhibition' : 'Submit Request'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reconciliation Modal */}
      <AnimatePresence>
        {closingExhibition && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-sm shadow-xl w-full max-w-4xl max-h-[92dvh] flex flex-col overflow-hidden border border-[#7e2562]/10"
            >
              {/* Header */}
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[#7e2562]/10 bg-gradient-to-r from-[#faedf5]/70 to-[#faf6f9] flex justify-between items-center shrink-0">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-gray-900">Close & Reconcile Exhibition</h3>
                  <p className="text-xs text-gray-500">{closingExhibition.eventName}</p>
                </div>
                <button 
                  onClick={() => setClosingExhibition(null)} 
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-sm hover:bg-gray-100 transition-colors"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              
              {/* Scrollable Body */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
                <div className="bg-[#faedf5] text-[#7e2562] border border-[#7e2562]/20 p-3 rounded-sm text-xs flex items-start">
                  <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 text-[#7e2562] mt-0.5" />
                  <p>You must account for every book taken. For each row: <strong>Sold + Not Sold + Damaged + Lost + Credit = Taken</strong>.</p>
                </div>

                <div className="overflow-x-auto border border-[#7e2562]/10 rounded-sm">
                  <table className="min-w-[640px] w-full divide-y divide-gray-200">
                    <thead className="bg-[#faf6f9]/70 text-[11px] font-bold text-[#7e2562] uppercase tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap">
                      <tr>
                        <th className="px-4 py-2.5 text-left">Book</th>
                        <th className="px-3 py-2.5 text-center">Taken</th>
                        <th className="px-3 py-2.5 text-center text-[#3cb976]">Sold</th>
                        <th className="px-3 py-2.5 text-center text-[#7e2562]">Not Sold</th>
                        <th className="px-3 py-2.5 text-center text-[#e45e34]">Damaged</th>
                        <th className="px-3 py-2.5 text-center text-[#e45e34]">Lost</th>
                        <th className="px-3 py-2.5 text-center text-purple-700">Credit</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-xs">
                      {reconciliation.map((rec: any, idx) => {
                        const total = (rec.quantitySold || 0) + (rec.quantityReturned || 0) + (rec.quantityDamaged || 0) + (rec.quantityLost || 0) + (rec.quantityCredit || 0);
                        const isBalanced = total === rec.quantityTaken;
                        
                        return (
                          <tr key={rec.stockId} className={!isBalanced ? 'bg-[#fef5f2]' : ''}>
                            <td className="px-4 py-3 font-semibold text-gray-900">{rec.title}</td>
                            <td className="px-3 py-3 text-center font-bold">{rec.quantityTaken}</td>
                            <td className="px-2 py-3 text-center">
                              <input type="number" min="0" value={rec.quantitySold} onChange={(e) => {
                                const newRec = [...reconciliation];
                                newRec[idx].quantitySold = Number(e.target.value);
                                setReconciliation(newRec);
                              }} className="w-14 sm:w-16 text-center border border-gray-300 rounded-sm py-1 font-semibold text-[#3cb976]" />
                            </td>
                            <td className="px-2 py-3 text-center">
                              <input type="number" min="0" value={rec.quantityReturned} onChange={(e) => {
                                const newRec = [...reconciliation];
                                newRec[idx].quantityReturned = Number(e.target.value);
                                setReconciliation(newRec);
                              }} className="w-14 sm:w-16 text-center border border-gray-300 rounded-sm py-1 font-semibold text-[#7e2562]" />
                            </td>
                            <td className="px-2 py-3 text-center">
                              <input type="number" min="0" value={rec.quantityDamaged} onChange={(e) => {
                                const newRec = [...reconciliation];
                                newRec[idx].quantityDamaged = Number(e.target.value);
                                setReconciliation(newRec);
                              }} className="w-14 sm:w-16 text-center border border-[#e45e34]/40 rounded-sm py-1 font-semibold text-[#e45e34]" />
                            </td>
                            <td className="px-2 py-3 text-center">
                              <input type="number" min="0" value={rec.quantityLost} onChange={(e) => {
                                const newRec = [...reconciliation];
                                newRec[idx].quantityLost = Number(e.target.value);
                                setReconciliation(newRec);
                              }} className="w-14 sm:w-16 text-center border border-[#e45e34]/40 rounded-sm py-1 font-semibold text-[#e45e34]" />
                            </td>
                            <td className="px-2 py-3 text-center">
                              <input type="number" min="0" value={rec.quantityCredit} onChange={(e) => {
                                const newRec = [...reconciliation];
                                newRec[idx].quantityCredit = Number(e.target.value);
                                setReconciliation(newRec);
                              }} className="w-14 sm:w-16 text-center border border-purple-300 rounded-sm py-1 font-semibold text-purple-700" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-200 bg-gray-50/60 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 shrink-0">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-sm shadow-xl w-full max-w-md p-4 sm:p-6 max-h-[92dvh] overflow-y-auto border border-[#e45e34]/20">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center text-[#e45e34]">
                <XCircle className="w-5 h-5 mr-2" />
                Exhibition Rejected
              </h3>
              <div className="bg-[#fef5f2] p-4 rounded-sm border border-[#e45e34]/20 text-xs sm:text-sm text-[#e45e34] whitespace-pre-wrap font-medium">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-sm shadow-2xl w-full max-w-4xl max-h-[92dvh] flex flex-col overflow-hidden border border-[#7e2562]/10"
            >
              {/* Header */}
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-[#7e2562]/10 bg-gradient-to-r from-[#faedf5]/70 to-[#faf6f9] flex justify-between items-center shrink-0">
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 pr-2">
                  <div className="p-1.5 sm:p-2 bg-[#7e2562] text-white rounded-sm shadow-xs shrink-0">
                    <Tent className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-lg font-bold text-gray-900 truncate">
                      Edit Exhibition & Manage Stock
                    </h3>
                    <p className="text-[11px] sm:text-xs text-gray-500 truncate">
                      Adjust event details, reduce or increase book quantities, or allocate new titles.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingExhibition(null)} 
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-sm hover:bg-gray-100 transition-colors shrink-0"
                >
                  <XCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <form id="edit-exhibition-form" onSubmit={handleEdit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 sm:space-y-6">
                {/* 1. Basic Details Card */}
                <div className="bg-[#faf6f9]/50 border border-[#7e2562]/10 rounded-sm p-3.5 sm:p-4 space-y-3 sm:space-y-4">
                  <h4 className="text-xs font-bold text-[#7e2562] uppercase tracking-wider">Event Details</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                        Total {editCart.length} titles • {editCart.reduce((acc, curr) => acc + (Number(curr.quantityRequested) || 0), 0)} copies allocated
                      </p>
                    </div>
                  </div>

                  <div className="border border-[#7e2562]/10 rounded-sm overflow-hidden shadow-xs max-h-80 overflow-y-auto overflow-x-auto">
                    <table className="min-w-[640px] w-full divide-y divide-gray-200">
                      <thead className="bg-[#faf6f9]/70 text-[11px] font-bold text-[#7e2562] uppercase tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap sticky top-0 z-10">
                        <tr>
                          <th className={`px-4 py-3 text-left ${canManageStockSources ? 'w-1/4 min-w-[160px]' : 'w-1/2 min-w-[200px]'}`}>Book Title & ISBN</th>
                          {canManageStockSources && (
                            <th className="px-4 py-3 text-left w-1/2 min-w-[260px]">Stock Source & Allocation</th>
                          )}
                          <th className={`px-4 py-3 text-center ${canManageStockSources ? 'w-1/6 min-w-[120px]' : 'w-1/4 min-w-[120px]'}`}>
                            {canManageStockSources ? 'Total Quantity' : 'Requested Quantity'}
                          </th>
                          <th className="px-3 py-3 text-right min-w-[80px]">Action</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 text-xs">
                        {editCart.map((item, idx) => {
                          const orig = item.originalQuantity ?? item.quantityRequested;
                          const isSold = (item.quantitySold || 0) > 0;
                          const isSplit = item.sourceMode === 'SPLIT';
                          const selectedAvail = canManageStockSources
                            ? getSourceAvailableQty(item.selectedSource, item.bookId, item, true)
                            : (getBranchStockQty(editingExhibition?.sourceBranchId || '', item.bookId) + (item.originalFromBranch || 0));
                          const isSingleOver = !isSplit && (item.quantityRequested || 0) > selectedAvail;

                          return (
                            <tr key={item.bookId} className="hover:bg-[#faf6f9]/40 transition-colors">
                              <td className="px-4 py-3 align-top">
                                <div className="font-semibold text-gray-900">{item.title}</div>
                                {/* {item.isbn && (
                                  <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                                    ISBN: {item.isbn}
                                  </div>
                                )} */}
                                {orig > 0 && (
                                  <div className="text-[11px] text-gray-500 font-medium mt-1">
                                    Requested: <strong className="text-gray-900 font-bold">{orig}</strong> copies
                                  </div>
                                )}
                                {isSold && (
                                  <div className="text-[11px] text-amber-700 font-medium mt-1">
                                    • {item.quantitySold} copies already sold (min required: {item.quantitySold})
                                  </div>
                                )}
                              </td>

                              {canManageStockSources && (
                                <td className="px-4 py-3 align-top">
                                  <div className="space-y-2">
                                    <Dropdown
                                      value={item.selectedSource}
                                      onChange={(val) => handleEditSourceChange(item.bookId, val)}
                                      options={getRowSourceOptions(item.bookId, item, true)}
                                      selectClassName="text-xs py-1.5 px-2.5 bg-white border border-[#7e2562]/20"
                                      menuClassName="w-72"
                                    />

                                    {!isSplit && (orig > selectedAvail || isSingleOver) && (
                                      <div className="text-[11px] text-red-600 font-semibold bg-red-50/80 border border-red-200 px-2 py-1 rounded-sm flex items-center gap-1.5">
                                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                        <span>Selected source has only <strong>{selectedAvail}</strong> in stock (Requested: <strong>{orig}</strong>)</span>
                                      </div>
                                    )}

                                    {isSplit && (
                                      <div className="space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => handleToggleEditSplitExpand(item.bookId)}
                                            className="inline-flex items-center text-[11px] font-semibold text-[#7e2562] bg-[#faedf5] hover:bg-[#f6dfef] px-2 py-0.5 rounded-sm border border-[#7e2562]/20 transition-colors"
                                          >
                                            <Layers className="w-3 h-3 mr-1 text-[#7e2562]" />
                                            {item.isSplitExpanded ? 'Hide Branch Inputs' : 'Configure Branch Quantities'}
                                            {item.isSplitExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                                          </button>

                                          {!item.isSplitExpanded && (
                                            <div className="flex flex-wrap gap-1 text-[10px]">
                                              {(item.sourceSplits?.['WAREHOUSE'] || 0) > 0 && (() => {
                                                const wAvail = getCentralStockQty(item.bookId) + (item.originalFromCentral || 0);
                                                const wQty = item.sourceSplits?.['WAREHOUSE'] || 0;
                                                const isOver = wQty > wAvail;
                                                return (
                                                  <span className={`font-medium px-1.5 py-0.5 rounded border ${
                                                    isOver 
                                                      ? 'bg-red-50 text-red-700 border-red-300 font-bold' 
                                                      : 'bg-blue-50 text-blue-700 border-blue-200'
                                                  }`}>
                                                    Warehouse: {wQty}
                                                    {isOver && <span className="ml-1 text-[9px] text-red-500 font-normal">({wAvail} avail)</span>}
                                                  </span>
                                                );
                                              })()}
                                              {branches.filter((b: any) => b.type !== 'WAREHOUSE').map((b: any) => {
                                                const qty = item.sourceSplits?.[`BRANCH_${b.id}`] || 0;
                                                if (qty <= 0) return null;
                                                const bAvail = getBranchStockQty(b.id, item.bookId) + (b.id === editingExhibition?.sourceBranchId ? (item.originalFromBranch || 0) : 0);
                                                const isOver = qty > bAvail;
                                                return (
                                                  <span key={b.id} className={`font-medium px-1.5 py-0.5 rounded border ${
                                                    isOver 
                                                      ? 'bg-red-50 text-red-700 border-red-300 font-bold' 
                                                      : 'bg-amber-50 text-amber-800 border-amber-200'
                                                  }`}>
                                                    {b.name}: {qty}
                                                    {isOver && <span className="ml-1 text-[9px] text-red-500 font-normal">({bAvail} avail)</span>}
                                                  </span>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>

                                        {item.isSplitExpanded && (
                                          <div className="p-2.5 bg-[#faf6f9] border border-[#7e2562]/20 rounded-sm space-y-2 mt-2">
                                            <div className="text-[11px] font-bold text-[#7e2562] flex items-center justify-between">
                                              <span>Enter copies from each source:</span>
                                              <span className="text-gray-700 font-normal">Sum: <strong className="text-[#7e2562]">{item.quantityRequested}</strong> copies</span>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                              {/* Warehouse */}
                                              {(() => {
                                                const wAvail = getCentralStockQty(item.bookId) + (item.originalFromCentral || 0);
                                                const wVal = item.sourceSplits?.['WAREHOUSE'] ?? 0;
                                                const isOver = wVal > wAvail;
                                                return (
                                                  <div className={`flex items-center justify-between bg-white px-2.5 py-1.5 rounded-sm border ${
                                                    isOver ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
                                                  }`}>
                                                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                                      <Warehouse className={`w-3.5 h-3.5 shrink-0 ${isOver ? 'text-red-600' : 'text-blue-600'}`} />
                                                      <div className="text-xs text-gray-800 font-medium truncate">
                                                        Central Warehouse
                                                        <span className={`text-[10px] block ${isOver ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                                                          ({wAvail} avail)
                                                        </span>
                                                      </div>
                                                    </div>
                                                    <input
                                                      type="number"
                                                      min="0"
                                                      value={item.sourceSplits?.['WAREHOUSE'] ?? 0}
                                                      onChange={(e) => handleEditSplitQtyChange(item.bookId, 'WAREHOUSE', Number(e.target.value))}
                                                      className={`w-16 px-1.5 py-1 text-center font-bold text-xs border rounded transition-colors ${
                                                        isOver 
                                                          ? 'text-red-600 bg-red-50 border-red-400 focus:ring-1 focus:ring-red-500 focus:border-red-500' 
                                                          : 'text-gray-900 border-gray-300 focus:ring-1 focus:ring-[#7e2562]'
                                                      }`}
                                                    />
                                                  </div>
                                                );
                                              })()}

                                              {/* Branches */}
                                              {branches.filter((b: any) => b.type !== 'WAREHOUSE').map((b: any) => {
                                                const bAvail = getBranchStockQty(b.id, item.bookId) + (b.id === editingExhibition?.sourceBranchId ? (item.originalFromBranch || 0) : 0);
                                                const bVal = item.sourceSplits?.[`BRANCH_${b.id}`] ?? 0;
                                                const isOver = bVal > bAvail;
                                                return (
                                                  <div key={b.id} className={`flex items-center justify-between bg-white px-2.5 py-1.5 rounded-sm border ${
                                                    isOver ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
                                                  }`}>
                                                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                                      <Store className={`w-3.5 h-3.5 shrink-0 ${isOver ? 'text-red-600' : 'text-amber-600'}`} />
                                                      <div className="text-xs text-gray-800 font-medium truncate">
                                                        {b.name}
                                                        <span className={`text-[10px] block ${isOver ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                                                          ({bAvail} avail)
                                                        </span>
                                                      </div>
                                                    </div>
                                                    <input
                                                      type="number"
                                                      min="0"
                                                      value={item.sourceSplits?.[`BRANCH_${b.id}`] ?? 0}
                                                      onChange={(e) => handleEditSplitQtyChange(item.bookId, `BRANCH_${b.id}`, Number(e.target.value))}
                                                      className={`w-16 px-1.5 py-1 text-center font-bold text-xs border rounded transition-colors ${
                                                        isOver 
                                                          ? 'text-red-600 bg-red-50 border-red-400 focus:ring-1 focus:ring-red-500 focus:border-red-500' 
                                                          : 'text-gray-900 border-gray-300 focus:ring-1 focus:ring-[#7e2562]'
                                                      }`}
                                                    />
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              )}

                              <td className="px-4 py-3 align-top text-center">
                                {isSplit ? (
                                  <div className="inline-flex items-center justify-center font-bold text-sm text-[#7e2562] bg-[#faedf5] px-2.5 py-1 rounded-sm border border-[#7e2562]/20">
                                    {item.quantityRequested} copies
                                  </div>
                                ) : (
                                  <div className="inline-flex flex-col items-center">
                                    <div className="inline-flex items-center border border-gray-300 rounded-sm">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const min = item.quantitySold || 1;
                                          const current = item.quantityRequested || 1;
                                          if (current > min) {
                                            handleEditSingleQtyChange(item.bookId, current - 1);
                                          }
                                        }}
                                        className="w-7 h-7 rounded-sm border border-gray-300 bg-gray-50 hover:bg-gray-100 flex items-center justify-center font-bold text-gray-700"
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min={item.quantitySold || 1}
                                        value={item.quantityRequested}
                                        onChange={(e) => handleEditSingleQtyChange(item.bookId, Number(e.target.value))}
                                        className="w-12 text-center text-xs font-bold border-0 focus:ring-0 py-1"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const current = item.quantityRequested || 1;
                                          handleEditSingleQtyChange(item.bookId, current + 1);
                                        }}
                                        className="w-7 h-7 rounded-sm border border-gray-300 bg-gray-50 hover:bg-gray-100 flex items-center justify-center font-bold text-gray-700"
                                      >
                                        +
                                      </button>
                                    </div>
                                    {isSingleOver && (
                                      <span className="text-[10px] text-red-600 font-bold mt-1 block whitespace-nowrap">
                                        Exceeds stock ({selectedAvail} avail)
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>

                              <td className="px-3 py-3 text-right align-top">
                                {isSold ? (
                                  <span className="text-[11px] text-gray-400 italic">Sold copies lock</span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setEditCart(editCart.filter((i) => i.bookId !== item.bookId))}
                                    className="text-[#e45e34] hover:text-[#c74c25] font-semibold text-xs p-1 hover:bg-[#fef5f2] rounded-sm transition-colors"
                                    title="Remove book"
                                  >
                                    Remove
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {editCart.length === 0 && (
                          <tr>
                            <td colSpan={canManageStockSources ? 4 : 3} className="px-4 py-8 text-center text-gray-400 italic">
                              No books allocated. Search and add books below.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Add New Book Row */}
                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Add More Books to Exhibition</label>
                    <Dropdown
                      searchable={true}
                      isMulti={true}
                      closeOnSelect={false}
                      actionType="plus"
                      value={editCart.map((i) => i.bookId)}
                      onChange={() => {}}
                      onItemToggle={(opt, willSelect) => {
                        if (willSelect) {
                          const bookList = catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : []);
                          const book = bookList.find((b: any) => b.id === opt.value);
                          const title = book?.title || opt.label || 'Selected Book';
                          const isbn = book?.isbn || opt.isbn;

                          const defaultSource = editingExhibition?.sourceBranchId ? `BRANCH_${editingExhibition.sourceBranchId}` : 'WAREHOUSE';
                          const defaultQty = 5;

                          setEditCart((prev) => {
                            if (prev.some((i) => i.bookId === opt.value)) return prev;
                            return [
                              ...prev,
                              {
                                bookId: opt.value,
                                title,
                                isbn,
                                quantityRequested: defaultQty,
                                sourceMode: 'SINGLE',
                                selectedSource: defaultSource,
                                sourceSplits: { [defaultSource]: defaultQty },
                                isSplitExpanded: false,
                                isNew: true,
                                originalQuantity: 0,
                                originalFromBranch: 0,
                                originalFromCentral: 0,
                                quantitySold: 0,
                              }
                            ];
                          });
                        } else {
                          const existing = editCart.find((i) => i.bookId === opt.value);
                          if (existing && (existing.quantitySold || 0) > 0) {
                            alert(`Cannot remove "${existing.title}" because ${existing.quantitySold} copies have already been sold.`);
                            return;
                          }
                          setEditCart((prev) => prev.filter((i) => i.bookId !== opt.value));
                        }
                      }}
                      placeholder="Search title or ISBN to add books..."
                      options={(catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : [])).map((b: any) => ({
                        value: b.id,
                        label: b.title,
                        isbn: b.isbn,
                        isSelected: editCart.some((i) => i.bookId === b.id),
                      }))}
                    />
                  </div>
                </div>
              </form>

              {/* Footer */}
              <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-200 bg-gray-50 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                <div className="text-xs text-gray-500 text-center sm:text-left">
                  Total Titles: <strong className="text-gray-900">{editCart.length}</strong> • Total Copies: <strong className="text-gray-900">{editCart.reduce((acc, curr) => acc + (Number(curr.quantityRequested) || 0), 0)}</strong>
                </div>

                <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto justify-end">
                  <button 
                    type="button" 
                    onClick={() => setEditingExhibition(null)} 
                    className="flex-1 sm:flex-initial px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    form="edit-exhibition-form"
                    disabled={isSubmitting || editCart.length === 0} 
                    className="flex-1 sm:flex-initial inline-flex items-center justify-center px-4 sm:px-5 py-2 text-sm font-semibold text-white bg-[#7e2562] hover:bg-[#681b50] disabled:opacity-50 rounded-sm shadow-xs transition-colors active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                      </>
                    ) : (
                      canManageStockSources ? 'Save Changes' : 'Save Request'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Approve & Allocate Stock Modal for Central Inventory Manager, Super Admin & Admin */}
      <AnimatePresence>
        {approvingExhibition && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-sm shadow-2xl w-full max-w-4xl max-h-[92dvh] flex flex-col overflow-hidden border border-[#3cb976]/20"
            >
              {/* Header */}
              <div className="p-4 sm:px-6 sm:py-4 border-b border-[#3cb976]/20 bg-gradient-to-r from-[#f0fbf5] to-[#faf6f9] flex justify-between items-center shrink-0">
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <div className="p-2 bg-[#3cb976] text-white rounded-sm shadow-xs shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 truncate">
                      Review & Allocate Stock for Exhibition
                    </h3>
                    <p className="text-xs text-gray-500 hidden sm:block">
                      Decide and configure which branches or warehouse fulfill the requested books before approval.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setApprovingExhibition(null)} 
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-sm hover:bg-gray-100 transition-colors shrink-0"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* Scrollable Modal Body */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
                {/* Event Summary Banner */}
                <div className="bg-[#faf6f9]/80 border border-[#7e2562]/10 rounded-sm p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-gray-400 block font-semibold uppercase tracking-wider">Event Name</span>
                    <strong className="text-sm text-gray-800 block mt-0.5">{approvingExhibition.name || approvingExhibition.eventName}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-semibold uppercase tracking-wider">Requested By / Branch</span>
                    <strong className="text-sm text-gray-800 block mt-0.5">{approvingExhibition.branch?.name || 'Central'}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-semibold uppercase tracking-wider">Location</span>
                    <strong className="text-sm text-gray-800 block mt-0.5">{approvingExhibition.location}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-semibold uppercase tracking-wider">Event Duration</span>
                    <strong className="text-sm text-gray-800 block mt-0.5">
                      {new Date(approvingExhibition.startDate).toLocaleDateString()} - {new Date(approvingExhibition.endDate).toLocaleDateString()}
                    </strong>
                  </div>
                </div>

                {/* Stock Allocation Instructions */}
                <div className="bg-[#f0fbf5] border border-[#3cb976]/30 rounded-sm p-3 sm:p-3.5 text-xs text-emerald-900 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-[#3cb976] shrink-0 mt-0.5" />
                  <div>
                    <strong>Stock Fulfillment Decision:</strong> For each requested title below, select whether copies are supplied from the <strong>Central Warehouse</strong>, a <strong>Branch Shelf</strong>, or a <strong>Custom Multi-Branch Split</strong>.
                  </div>
                </div>

                {/* Stock Allocation Table */}
                <div className="border border-[#7e2562]/10 rounded-sm overflow-x-auto shadow-xs">
                  <table className="min-w-[650px] w-full divide-y divide-gray-200">
                    <thead className="bg-[#faf6f9]/70 text-[11px] font-bold text-[#7e2562] uppercase tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left w-1/4">Book Title & ISBN</th>
                        <th className="px-4 py-3 text-left w-1/2">Stock Source & Allocation</th>
                        <th className="px-4 py-3 text-center w-1/6">Allocated Copies</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-xs">
                      {approveCart.map((item) => {
                        const isSplit = item.sourceMode === 'SPLIT';
                        const reqQty = item.originalQuantity ?? item.quantityRequested;
                        const selectedAvail = !isSplit ? getSourceAvailableQty(item.selectedSource, item.bookId, item) : 0;
                        const isSingleOverStock = !isSplit && (item.quantityRequested || 0) > selectedAvail;
                        const isSingleStockShortForReq = !isSplit && reqQty > selectedAvail;
                        const isFulfilledOrExceeded = item.quantityRequested >= reqQty;
                        const isExceeded = item.quantityRequested > reqQty;

                        const warehouseAvail = getCentralStockQty(item.bookId);
                        const isWarehouseOver = (item.sourceSplits?.['WAREHOUSE'] || 0) > warehouseAvail;
                        const isAnyBranchOver = branches.some((b: any) => (item.sourceSplits?.[`BRANCH_${b.id}`] || 0) > getBranchStockQty(b.id, item.bookId));
                        const hasSplitOverStock = isWarehouseOver || isAnyBranchOver;

                        return (
                          <tr key={item.bookId} className="hover:bg-[#faf6f9]/40 transition-colors">
                            <td className="px-4 py-3 align-top">
                              <div className="font-semibold text-gray-900">{item.title}</div>
                              {item.isbn && (
                                <div className="text-[11px] text-gray-500 font-mono mt-0.5">
                                  ISBN: {item.isbn}
                                </div>
                              )}
                              <div className="text-[11px] text-gray-500 font-medium mt-1">
                                Requested: <strong className="text-gray-900 font-bold">{reqQty}</strong> copies
                              </div>
                            </td>

                            <td className="px-4 py-3 align-top">
                              <div className="space-y-2">
                                <Dropdown
                                  value={item.selectedSource}
                                  onChange={(val) => handleApproveSourceChange(item.bookId, val)}
                                  options={getRowSourceOptions(item.bookId, item)}
                                  selectClassName="text-xs py-1.5 px-2.5 bg-white border border-[#7e2562]/20"
                                  menuClassName="w-72"
                                />

                                {!isSplit && isSingleStockShortForReq && (
                                  <div className="text-[11px] text-red-600 font-semibold bg-red-50/80 border border-red-200 px-2 py-1 rounded-sm flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                    <span>Selected branch has only <strong>{selectedAvail}</strong> in stock (Requested: <strong>{reqQty}</strong>)</span>
                                  </div>
                                )}

                                {isSplit && (
                                  <div className="space-y-1.5">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleApproveSplitExpand(item.bookId)}
                                        className="inline-flex items-center text-[11px] font-semibold text-[#7e2562] bg-[#faedf5] hover:bg-[#f6dfef] px-2 py-0.5 rounded-sm border border-[#7e2562]/20 transition-colors"
                                      >
                                        <Layers className="w-3 h-3 mr-1 text-[#7e2562]" />
                                        {item.isSplitExpanded ? 'Hide Branch Inputs' : 'Configure Branch Quantities'}
                                        {item.isSplitExpanded ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                                      </button>

                                      {!item.isSplitExpanded && (
                                        <div className="flex flex-wrap gap-1 text-[10px]">
                                          {(item.sourceSplits?.['WAREHOUSE'] || 0) > 0 && (() => {
                                            const wQty = item.sourceSplits?.['WAREHOUSE'] || 0;
                                            const isOver = wQty > warehouseAvail;
                                            return (
                                              <span className={`font-medium px-1.5 py-0.5 rounded border ${
                                                isOver 
                                                  ? 'bg-red-50 text-red-700 border-red-300 font-bold' 
                                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                                              }`}>
                                                Warehouse: {wQty}
                                                {isOver && <span className="ml-1 text-[9px] text-red-500 font-normal">({warehouseAvail} avail)</span>}
                                              </span>
                                            );
                                          })()}
                                          {branches.filter((b: any) => b.type !== 'WAREHOUSE').map((b: any) => {
                                            const qty = item.sourceSplits?.[`BRANCH_${b.id}`] || 0;
                                            if (qty <= 0) return null;
                                            const bAvail = getBranchStockQty(b.id, item.bookId);
                                            const isOver = qty > bAvail;
                                            return (
                                              <span key={b.id} className={`font-medium px-1.5 py-0.5 rounded border ${
                                                isOver 
                                                  ? 'bg-red-50 text-red-700 border-red-300 font-bold' 
                                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                                              }`}>
                                                {b.name}: {qty}
                                                {isOver && <span className="ml-1 text-[9px] text-red-500 font-normal">({bAvail} avail)</span>}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>

                                    {item.isSplitExpanded && (
                                      <div className="p-2.5 bg-[#faf6f9] border border-[#7e2562]/20 rounded-sm space-y-2 mt-2">
                                        <div className="text-[11px] font-bold text-[#7e2562] flex items-center justify-between">
                                          <span>Enter copies from each source:</span>
                                          <span className="text-gray-700 font-normal">
                                            Sum: <strong className={isFulfilledOrExceeded ? "text-emerald-600 font-bold" : "text-[#7e2562] font-bold"}>{item.quantityRequested}</strong> / {reqQty} requested
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                          {/* Warehouse */}
                                          {(() => {
                                            const wVal = item.sourceSplits?.['WAREHOUSE'] ?? 0;
                                            const isOver = wVal > warehouseAvail;
                                            return (
                                              <div className={`flex items-center justify-between bg-white px-2.5 py-1.5 rounded-sm border ${
                                                isOver ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
                                              }`}>
                                                <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                                  <Warehouse className={`w-3.5 h-3.5 shrink-0 ${isOver ? 'text-red-600' : 'text-blue-600'}`} />
                                                  <div className="text-xs text-gray-800 font-medium truncate">
                                                    Central Warehouse
                                                    <span className={`text-[10px] block ${isOver ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                                                      ({warehouseAvail} avail)
                                                    </span>
                                                  </div>
                                                </div>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  value={item.sourceSplits?.['WAREHOUSE'] ?? 0}
                                                  onChange={(e) => handleApproveSplitQtyChange(item.bookId, 'WAREHOUSE', Number(e.target.value))}
                                                  className={`w-16 px-1.5 py-1 text-center font-bold text-xs border rounded transition-colors ${
                                                    isOver 
                                                      ? 'text-red-600 bg-red-50 border-red-400 focus:ring-1 focus:ring-red-500 focus:border-red-500' 
                                                      : 'text-gray-900 border-gray-300 focus:ring-1 focus:ring-[#7e2562]'
                                                  }`}
                                                />
                                              </div>
                                            );
                                          })()}

                                          {/* Branches */}
                                          {branches.filter((b: any) => b.type !== 'WAREHOUSE').map((b: any) => {
                                            const bAvail = getBranchStockQty(b.id, item.bookId);
                                            const bVal = item.sourceSplits?.[`BRANCH_${b.id}`] ?? 0;
                                            const isOver = bVal > bAvail;
                                            return (
                                              <div key={b.id} className={`flex items-center justify-between bg-white px-2.5 py-1.5 rounded-sm border ${
                                                isOver ? 'border-red-300 bg-red-50/30' : 'border-gray-200'
                                              }`}>
                                                <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                                  <Store className={`w-3.5 h-3.5 shrink-0 ${isOver ? 'text-red-600' : 'text-amber-600'}`} />
                                                  <div className="text-xs text-gray-800 font-medium truncate">
                                                    {b.name}
                                                    <span className={`text-[10px] block ${isOver ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                                                      ({bAvail} avail)
                                                    </span>
                                                  </div>
                                                </div>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  value={item.sourceSplits?.[`BRANCH_${b.id}`] ?? 0}
                                                  onChange={(e) => handleApproveSplitQtyChange(item.bookId, `BRANCH_${b.id}`, Number(e.target.value))}
                                                  className={`w-16 px-1.5 py-1 text-center font-bold text-xs border rounded transition-colors ${
                                                    isOver 
                                                      ? 'text-red-600 bg-red-50 border-red-400 focus:ring-1 focus:ring-red-500 focus:border-red-500' 
                                                      : 'text-gray-900 border-gray-300 focus:ring-1 focus:ring-[#7e2562]'
                                                  }`}
                                                />
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>

                            <td className="px-4 py-3 align-top text-center">
                              {isSplit ? (
                                <div className="flex flex-col items-center justify-center">
                                  <span className={`inline-flex items-center px-2.5 py-1 rounded-sm text-sm font-bold border transition-colors ${
                                    hasSplitOverStock
                                      ? 'bg-red-50 text-red-700 border-red-300'
                                      : isFulfilledOrExceeded 
                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
                                        : 'bg-[#faedf5] text-[#7e2562] border-[#7e2562]/20'
                                  }`}>
                                    {item.quantityRequested}
                                  </span>
                                  <span className="text-[10px] text-gray-400 mt-0.5">Sum of splits</span>
                                  {hasSplitOverStock ? (
                                    <span className="text-[10px] text-red-600 font-bold mt-1 inline-flex items-center gap-0.5 whitespace-nowrap">
                                      <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" /> Exceeds stock in split
                                    </span>
                                  ) : isFulfilledOrExceeded ? (
                                    <span className="text-[10px] text-emerald-600 font-bold mt-1 inline-flex items-center gap-0.5 whitespace-nowrap">
                                      ✓ {isExceeded ? `Exceeds req (${reqQty})` : `Fulfills req (${reqQty})`}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-amber-600 font-semibold mt-1 whitespace-nowrap">
                                      Req: {reqQty}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleApproveQuantityChange(item.bookId, Math.max(1, item.quantityRequested - 1))}
                                      className="w-7 h-7 rounded-sm border border-gray-300 bg-gray-50 hover:bg-gray-100 flex items-center justify-center font-bold text-gray-700"
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      min="1"
                                      value={item.quantityRequested}
                                      onChange={(e) => handleApproveQuantityChange(item.bookId, Number(e.target.value))}
                                      className={`w-16 px-2 py-1 text-center font-bold text-sm border rounded-sm transition-colors ${
                                        isSingleOverStock
                                          ? 'text-red-600 bg-red-50 border-red-400 focus:ring-1 focus:ring-red-500 focus:border-red-500'
                                          : isFulfilledOrExceeded 
                                            ? 'text-emerald-700 bg-emerald-50 border-emerald-400 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500' 
                                            : 'text-gray-900 border-gray-300 focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]'
                                      }`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleApproveQuantityChange(item.bookId, item.quantityRequested + 1)}
                                      className="w-7 h-7 rounded-sm border border-gray-300 bg-gray-50 hover:bg-gray-100 flex items-center justify-center font-bold text-gray-700"
                                    >
                                      +
                                    </button>
                                  </div>
                                  {isSingleOverStock ? (
                                    <span className="text-[10px] text-red-600 font-bold mt-1 inline-flex items-center gap-0.5 whitespace-nowrap">
                                      <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" /> Exceeds stock ({selectedAvail} avail)
                                    </span>
                                  ) : isFulfilledOrExceeded ? (
                                    <span className="text-[10px] text-emerald-600 font-bold mt-1 inline-flex items-center gap-0.5 whitespace-nowrap">
                                      ✓ {isExceeded ? `Exceeds req (${reqQty})` : `Fulfills req (${reqQty})`}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-amber-600 font-semibold mt-1 whitespace-nowrap">
                                      Requested: {reqQty}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Optional Approval Note */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Approval Note (Optional)</label>
                  <input
                    type="text"
                    value={approveNote}
                    onChange={(e) => setApproveNote(e.target.value)}
                    placeholder="E.g., Approved with central warehouse allocation..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-sm text-xs focus:ring-1 focus:ring-[#3cb976] focus:border-[#3cb976]"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 sm:px-6 sm:py-4 border-t border-gray-200 bg-gray-50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const exId = approvingExhibition.id;
                    setApprovingExhibition(null);
                    handleApproveReject(exId, 'reject');
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-[#e45e34] bg-[#fef5f2] hover:bg-[#fdeae3] border border-[#e45e34]/30 rounded-sm transition-colors text-center"
                >
                  Reject Request
                </button>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-3">
                  <button 
                    type="button" 
                    onClick={() => setApprovingExhibition(null)} 
                    className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50 text-center"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={handleConfirmApproveAndAllocate}
                    disabled={isSubmitting || approveCart.length === 0} 
                    className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2 text-sm font-semibold text-white bg-[#3cb976] hover:bg-[#329e64] disabled:opacity-50 rounded-sm shadow-xs transition-colors active:scale-[0.98]"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Approving & Allocating...
                      </>
                    ) : (
                      'Confirm & Approve Exhibition'
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-sm shadow-xl w-full max-w-lg max-h-[92dvh] flex flex-col overflow-hidden border border-[#7e2562]/10"
            >
              <div className="p-4 sm:p-6 overflow-y-auto flex-1">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-base sm:text-lg font-bold text-gray-900 flex items-center">Assign Staff to Exhibition</h3>
                  <button 
                    onClick={() => setAssigningExhibition(null)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>
                <form id="assign-staff-form" onSubmit={handleAssign} className="space-y-4">
                  <p className="text-sm text-gray-500 mb-4">Assign a staff member to oversee the <strong>{assigningExhibition.name || assigningExhibition.eventName}</strong> event.</p>
                  
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
                </form>
              </div>

              <div className="p-4 sm:px-6 sm:py-3 border-t border-gray-200 bg-gray-50 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:space-x-3 shrink-0">
                <button type="button" onClick={() => setAssigningExhibition(null)} className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50 text-center">Cancel</button>
                <button form="assign-staff-form" type="submit" disabled={isSubmitting} className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-[#3cb976] hover:bg-[#329e64] rounded-sm disabled:opacity-50 shadow-xs transition-colors active:scale-[0.98]">
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Assign'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Exhibition Details & History Modal */}
      <AnimatePresence>
        {viewingExhibitionHistory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-sm shadow-xl w-full max-w-4xl max-h-[92dvh] flex flex-col overflow-hidden border border-[#7e2562]/10"
            >
              {/* Header */}
              <div className="p-4 sm:p-6 border-b border-gray-200 shrink-0 flex flex-col sm:flex-row justify-between items-start gap-3">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 flex items-center">
                    <Tent className="w-5 h-5 mr-2 text-[#7e2562]" />
                    {viewingExhibitionHistory.name || viewingExhibitionHistory.eventName}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Location: <strong className="text-gray-700">{viewingExhibitionHistory.location}</strong> • 
                    Source: <strong className="text-gray-700">{viewingExhibitionHistory.branch?.name || viewingExhibitionHistory.sourceBranchName}</strong>
                  </p>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
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
                <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-5 sm:space-y-6">
                  {/* Basic Details card for everyone */}
                  <div className="bg-[#faf6f9]/60 border border-[#7e2562]/10 rounded-sm p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
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
                    <div className="space-y-5 sm:space-y-6">
                      <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-l-4 border-[#7e2562] pl-2">Financial Summary</h4>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <div className="bg-[#f0fbf5] border border-[#3cb976]/20 rounded-sm p-3 sm:p-4 flex flex-col">
                          <span className="text-[10px] font-bold text-[#3cb976] uppercase tracking-wider">Total Cash/UPI Revenue</span>
                          <strong className="text-lg sm:text-xl text-emerald-800 mt-1">₹{Number(historyData.metrics.totalRevenue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <div className="bg-amber-50/70 border border-amber-200 rounded-sm p-3 sm:p-4 flex flex-col">
                          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Total Credit Sales Amount</span>
                          <strong className="text-lg sm:text-xl text-amber-900 mt-1">₹{Number(historyData.metrics.totalCreditAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                        </div>
                        <div className="bg-[#faedf5] border border-[#7e2562]/20 rounded-sm p-3 sm:p-4 flex flex-col">
                          <span className="text-[10px] font-bold text-[#7e2562] uppercase tracking-wider">Books Sold (From Invoices)</span>
                          <strong className="text-lg sm:text-xl text-[#7e2562] mt-1">{historyData.metrics.totalBooksSoldFromBills} books</strong>
                        </div>
                      </div>

                      {/* Stock Reconciliation Summary Metrics */}
                      <div className="bg-[#faf6f9]/60 border border-[#7e2562]/10 rounded-sm p-3 sm:p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 text-center text-xs">
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
                          <div className="border border-[#7e2562]/10 rounded-sm overflow-x-auto shadow-xs">
                            <table className="min-w-[550px] w-full divide-y divide-slate-100 text-left text-xs text-slate-600">
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
                                     <td className="px-4 py-2.5 whitespace-nowrap">
                                       {bill.paymentMode === 'CREDIT' ? (
                                         <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm border bg-[#faedf5] text-[#7e2562] border-[#7e2562]/20">
                                           CREDIT COPY
                                         </span>
                                       ) : bill.paymentMode === 'UPI' ? (
                                         <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm border bg-blue-50 text-blue-700 border-blue-200">
                                           UPI
                                         </span>
                                       ) : (
                                         <span className="text-[10px] font-bold px-2 py-0.5 rounded-sm border bg-emerald-50 text-emerald-700 border-emerald-200">
                                           {bill.paymentMode || 'CASH'}
                                         </span>
                                       )}
                                     </td>
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
                      <div className="border border-[#7e2562]/10 rounded-sm overflow-x-auto shadow-xs">
                        <table className="min-w-[550px] w-full divide-y divide-slate-100 text-left text-xs text-slate-600">
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

              <div className="p-4 sm:px-6 sm:py-3 border-t border-gray-200 bg-gray-50 flex justify-end shrink-0">
                <button 
                  onClick={() => setViewingExhibitionHistory(null)}
                  className="w-full sm:w-auto px-4 py-2 bg-[#faedf5] hover:bg-[#f6dbe9] text-[#7e2562] border border-[#7e2562]/20 rounded-sm text-sm font-semibold transition text-center"
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


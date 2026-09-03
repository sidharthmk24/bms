"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { 
  Loader2, 
  Plus, 
  AlertCircle, 
  CheckCircle, 
  CheckCircle2,
  XCircle, 
  Send, 
  ArchiveRestore,
  Eye,
  ClipboardCheck,
  RefreshCw,
  Search,
  X,
  Package,
  PackageCheck,
  Clock,
  Building2,
  ShoppingCart,
  Check,
  CheckCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dropdown } from '@/components/Dropdown';
import { Pagination } from '@/components/Pagination';

export default function RestockRequestsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isCentral = (user?.roles?.some(r => ['SUPER_ADMIN', 'ADMIN', 'CENTRAL_INVENTORY_MANAGER'].includes(r)) || false);
  const isAdminOrSuper = (user?.roles?.some(r => ['SUPER_ADMIN', 'ADMIN'].includes(r)) || false);
  
  const { data: requestsResponse, loading, error, refetch } = useApiData<any>('/restock', []);
  const requests = requestsResponse?.items || (Array.isArray(requestsResponse) ? requestsResponse : []);
  const { data: catalog } = useApiData<any>('/catalog/books?limit=1000', []);

  // PO Requests Data
  const { data: poRequestsResponse, refetch: refetchPoRequests } = useApiData<any>('/procurement/requests', []);
  const poRequests = Array.isArray(poRequestsResponse) ? poRequestsResponse : (poRequestsResponse?.items || []);

  // Filter and Search State
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Creation State (Branch)
  const [isCreating, setIsCreating] = useState(false);
  const [cart, setCart] = useState<{bookId: string, quantity: number, title?: string, isbn?: string}[]>([]);
  const [selectedBook, setSelectedBook] = useState('');
  const [quantity, setQuantity] = useState(5);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  
  // Review State (Central)
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewData, setReviewData] = useState<any[]>([]); // [{itemId, bookId, approvedQuantity}]
  const [reviewNote, setReviewNote] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // View Details Modal State
  const [viewingReq, setViewingReq] = useState<any | null>(null);

  // PO Request Modal State
  const [requestingPoItem, setRequestingPoItem] = useState<{ req: any; item: any } | null>(null);
  const [poReqQuantity, setPoReqQuantity] = useState<number>(10);
  const [poReqReason, setPoReqReason] = useState<string>('');
  const [isSubmittingPoReq, setIsSubmittingPoReq] = useState(false);

  // Action Loading State for row actions (Dispatch / Receive)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refetch(), refetchPoRequests()]);
    setTimeout(() => setIsRefreshing(false), 400);
  };

  const handleCreate = async () => {
    if (cart.length === 0) return;
    try {
      setIsSubmittingCreate(true);
      await api.post('/restock', {
        items: cart.map(i => ({ bookId: i.bookId, quantity: i.quantity }))
      });
      setIsCreating(false);
      setCart([]);
      await refetch();
      alert('Restock request submitted successfully');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleReview = async (status: 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED') => {
    if (!reviewingId) return;
    try {
      setIsSubmittingReview(true);
      await api.patch(`/restock/${reviewingId}/review`, {
        status,
        note: reviewNote,
        items: reviewData.map(r => ({
          bookId: r.bookId,
          quantityApproved: r.approvedQuantity
        }))
      });
      setReviewingId(null);
      setReviewNote('');
      await refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to review request');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDispatch = async (id: string) => {
    try {
      setActionLoadingId(id);
      await api.post(`/restock/${id}/dispatch`);
      await refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to dispatch');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReceive = async (id: string) => {
    try {
      setActionLoadingId(id);
      await api.post(`/restock/${id}/receive`);
      await refetch();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to receive');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Submit PO Request to Admin / Super Admin
  const handleSubmitPoRequest = async () => {
    if (!requestingPoItem) return;
    try {
      setIsSubmittingPoReq(true);
      await api.post('/procurement/requests', {
        bookId: requestingPoItem.item.bookId,
        quantity: poReqQuantity,
        restockRequestId: requestingPoItem.req.id,
        restockRequestItemId: requestingPoItem.item.id,
        estimatedCost: requestingPoItem.item.book?.costPrice || undefined,
        reason: poReqReason.trim() || `Required for Branch restock request #${requestingPoItem.req.id.split('-')[0]} (${requestingPoItem.req.branch?.name || 'Branch'})`,
      });
      alert('Purchase order request sent to Admin and Super Admin for approval.');
      setRequestingPoItem(null);
      setPoReqReason('');
      await refetchPoRequests();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit PO request');
    } finally {
      setIsSubmittingPoReq(false);
    }
  };

  // Quick review PO request from inside Restock page (for Admin / Super Admin)
  const handleReviewPoRequest = async (requestId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.patch(`/procurement/requests/${requestId}/review`, { status });
      await refetchPoRequests();
      alert(`PO Request ${status.toLowerCase()} successfully.`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to review PO request');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Pending
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            Approved
          </span>
        );
      case 'PARTIALLY_APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            Partially Approved
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Rejected
          </span>
        );
      case 'FULFILLED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            Dispatched
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Received
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
            {status}
          </span>
        );
    }
  };

  // Filter requests by status & search
  const filteredRequests = (requests || []).filter((req: any) => {
    if (statusFilter && req.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const idMatch = req.id?.toLowerCase().includes(term);
      const branchMatch = req.branch?.name?.toLowerCase().includes(term);
      const booksMatch = req.items?.some((i: any) => i.book?.title?.toLowerCase().includes(term));
      return idMatch || branchMatch || booksMatch;
    }
    return true;
  });

  if (loading && (!requests || requests.length === 0)) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Render PO status or Request PO action for a book item
  const renderItemPoControl = (req: any, item: any) => {
    if (!isCentral) return null;

    const existingPoReq = poRequests.find((pr: any) => 
      (pr.restockRequestItemId === item.id || (pr.restockRequestId === req?.id && pr.bookId === item.bookId)) &&
      pr.status !== 'REJECTED'
    );

    if (existingPoReq) {
      if (existingPoReq.status === 'PENDING') {
        return (
          <div className="flex items-center gap-1.5 justify-end">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-amber-700 bg-amber-50 rounded-lg border border-amber-200">
              <Clock className="w-3 h-3 text-amber-500 animate-pulse" />
              <span>PO Requested ({existingPoReq.quantity})</span>
            </span>
            {isAdminOrSuper && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleReviewPoRequest(existingPoReq.id, 'APPROVED')}
                  className="px-2 py-0.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md shadow-sm active:scale-95 transition"
                  title="Approve PO Request"
                >
                  Approve
                </button>
                <button
                  onClick={() => handleReviewPoRequest(existingPoReq.id, 'REJECTED')}
                  className="px-2 py-0.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md active:scale-95 transition"
                  title="Reject PO Request"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        );
      }

      if (existingPoReq.status === 'APPROVED') {
        return (
          <button
            onClick={() => {
              router.push(`/dashboard/purchase-orders?tab=requests&poRequestId=${existingPoReq.id}&bookId=${existingPoReq.bookId}&qty=${existingPoReq.quantity}`);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg shadow-sm shadow-emerald-500/10 transition-all"
            title="PO approved by Admin. Click to create purchase order."
          >
            <ShoppingCart className="w-3 h-3" />
            <span>Create PO ({existingPoReq.quantity})</span>
          </button>
        );
      }

      if (existingPoReq.status === 'ORDERED') {
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-purple-700 bg-purple-50 rounded-lg border border-purple-200">
            <PackageCheck className="w-3 h-3 text-purple-600" />
            <span>PO Placed</span>
          </span>
        );
      }
    }

    // If no existing active PO request, check if central stock is 0 or less than requested
    const stockQty = item.centralStock?.quantity || 0;
    if (stockQty < item.quantityRequested) {
      return (
        <button
          onClick={() => {
            setRequestingPoItem({ req, item });
            setPoReqQuantity(Math.max(item.quantityRequested - stockQty, item.quantityRequested));
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-300/80 rounded-lg shadow-sm transition-all active:scale-95"
          title="Out of stock in warehouse. Request purchase order from Admin."
        >
          <ShoppingCart className="w-3.5 h-3.5 text-amber-600" />
          <span>Request PO</span>
        </button>
      );
    }

    return <span className="text-xs text-gray-400">Stock in HQ</span>;
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Restock Requests</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {isCentral ? 'Triage, approve, and dispatch branch stock replenishment requests.' : 'Request book inventory restocks from the central warehouse.'}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl text-gray-600 hover:text-gray-900 shadow-sm active:scale-95 transition-all"
            title="Refresh requests"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          {!isCentral && (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-500/10 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Request</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white border border-gray-200/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { value: '', label: 'All' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'PARTIALLY_APPROVED', label: 'Partially Approved' },
            { value: 'FULFILLED', label: 'Dispatched' },
            { value: 'RECEIVED', label: 'Received' },
            { value: 'REJECTED', label: 'Rejected' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition whitespace-nowrap active:scale-95 ${
                statusFilter === tab.value
                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-500/10'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search branch, ID, book..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-4 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50/50"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">ID / Branch</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Items</th>
                <th scope="col" className="px-6 py-3.5 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((req: any) => (
                <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold font-mono text-gray-900">#{req.id.split('-')[0]}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <Building2 className="w-3 h-3 text-gray-400" />
                      <span>{req.branch?.name || 'Central'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{new Date(req.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-gray-400" />
                      <span>{req.items?.length || 0} books requested</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {getStatusBadge(req.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {/* View Details Button - Always visible as a clean styled button */}
                      <button
                        onClick={() => setViewingReq(req)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 hover:text-slate-900 active:scale-95 rounded-lg shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-400/20"
                        title="View request details and warehouse availability"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Details</span>
                      </button>

                      {/* Central: Review Button when PENDING */}
                      {isCentral && req.status === 'PENDING' && (
                        <button
                          onClick={() => {
                            setReviewingId(req.id);
                            setReviewData(req.items.map((i: any) => ({ 
                              itemId: i.id, 
                              bookId: i.bookId, 
                              approvedQuantity: i.quantityRequested 
                            })));
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-lg shadow-sm shadow-blue-500/10 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          title="Review and approve/reject request"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </button>
                      )}

                      {/* Central: Dispatch Button when APPROVED or PARTIALLY_APPROVED */}
                      {isCentral && (req.status === 'APPROVED' || req.status === 'PARTIALLY_APPROVED') && (
                        <button 
                          onClick={() => handleDispatch(req.id)}
                          disabled={actionLoadingId === req.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 rounded-lg shadow-sm shadow-purple-500/10 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/20 disabled:opacity-50"
                          title="Dispatch approved books to branch"
                        >
                          {actionLoadingId === req.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>Dispatch</span>
                        </button>
                      )}

                      {/* Branch: Mark Received Button when FULFILLED */}
                      {!isCentral && req.status === 'FULFILLED' && (
                        <button 
                          onClick={() => handleReceive(req.id)}
                          disabled={actionLoadingId === req.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-lg shadow-sm shadow-emerald-500/10 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-50"
                          title="Confirm stock received at branch"
                        >
                          {actionLoadingId === req.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <ArchiveRestore className="w-3.5 h-3.5" />
                          )}
                          <span>Mark Received</span>
                        </button>
                      )}

                      {/* Completed / Terminal state indicators */}
                      {req.status === 'RECEIVED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200/60">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Received</span>
                        </span>
                      )}

                      {req.status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 rounded-lg border border-rose-200/60">
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          <span>Rejected</span>
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-sm">
                    No restock requests found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredRequests.length}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* View Details Modal */}
      <AnimatePresence>
        {viewingReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }} 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 rounded-xl">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">
                        Restock Request #{viewingReq.id.split('-')[0]}
                      </h3>
                      {getStatusBadge(viewingReq.status)}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Branch: <span className="font-semibold text-gray-700">{viewingReq.branch?.name || 'Central'}</span> • Created {new Date(viewingReq.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingReq(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-4">
                {viewingReq.note && (
                  <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-xl text-xs text-amber-800">
                    <span className="font-semibold">Reviewer Note:</span> {viewingReq.note}
                  </div>
                )}

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Requested Books & Inventory Status</h4>
                  <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                        <tr>
                          <th className="px-4 py-3 text-left">Book</th>
                          <th className="px-4 py-3 text-center">Requested</th>
                          <th className="px-4 py-3 text-center">Approved</th>
                          {isCentral && <th className="px-4 py-3 text-center">Warehouse Stock</th>}
                          {isCentral && <th className="px-4 py-3 text-right">Procurement / PO</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {viewingReq.items?.map((item: any) => (
                          <tr key={item.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-gray-900">{item.book?.title || 'Book Title'}</div>
                              <div className="text-xs text-gray-400 font-mono">
                                ISBN: {item.book?.isbn || 'N/A'} {item.book?.barcode ? `• Barcode: ${item.book.barcode}` : ''}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-gray-700">
                              {item.quantityRequested}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {viewingReq.status === 'PENDING' ? (
                                <span className="text-xs text-gray-400 italic">Pending review</span>
                              ) : (
                                <span className="font-bold text-blue-600">{item.quantityApproved ?? '-'}</span>
                              )}
                            </td>
                            {isCentral && (
                              <td className="px-4 py-3 text-center font-bold">
                                {item.centralStock?.quantity !== undefined ? (
                                  <span className={item.centralStock.quantity === 0 ? 'text-rose-600' : 'text-purple-600'}>
                                    {item.centralStock.quantity}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            )}
                            {isCentral && (
                              <td className="px-4 py-3 text-right">
                                {renderItemPoControl(viewingReq, item)}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Modal Footer with Actions */}
              <div className="px-6 py-4 border-t border-gray-100 bg-slate-50/50 flex items-center justify-between">
                <button
                  onClick={() => setViewingReq(null)}
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 active:scale-95 transition-all"
                >
                  Close
                </button>

                <div className="flex items-center gap-2">
                  {/* Action inside modal if Central and PENDING */}
                  {isCentral && viewingReq.status === 'PENDING' && (
                    <button
                      onClick={() => {
                        const reqToReview = viewingReq;
                        setViewingReq(null);
                        setReviewingId(reqToReview.id);
                        setReviewData(reqToReview.items.map((i: any) => ({
                          itemId: i.id,
                          bookId: i.bookId,
                          approvedQuantity: i.quantityRequested
                        })));
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-xl shadow-md shadow-blue-500/10 transition-all"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      <span>Review Request</span>
                    </button>
                  )}

                  {/* Action inside modal if Central and APPROVED/PARTIALLY_APPROVED */}
                  {isCentral && (viewingReq.status === 'APPROVED' || viewingReq.status === 'PARTIALLY_APPROVED') && (
                    <button
                      onClick={async () => {
                        const reqId = viewingReq.id;
                        setViewingReq(null);
                        await handleDispatch(reqId);
                      }}
                      disabled={actionLoadingId === viewingReq.id}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 rounded-xl shadow-md shadow-purple-500/10 transition-all disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>Dispatch Stock</span>
                    </button>
                  )}

                  {/* Action inside modal if Branch and FULFILLED */}
                  {!isCentral && viewingReq.status === 'FULFILLED' && (
                    <button
                      onClick={async () => {
                        const reqId = viewingReq.id;
                        setViewingReq(null);
                        await handleReceive(reqId);
                      }}
                      disabled={actionLoadingId === viewingReq.id}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-md shadow-emerald-500/10 transition-all disabled:opacity-50"
                    >
                      <ArchiveRestore className="w-4 h-4" />
                      <span>Confirm Received</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Review Modal (Central) */}
      <AnimatePresence>
        {reviewingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-6 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Review Restock Request</h3>
                  <p className="text-xs text-gray-500">Approve or adjust quantities according to warehouse availability, or request PO from Admin.</p>
                </div>
                <button 
                  onClick={() => setReviewingId(null)} 
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto mb-6 border border-gray-200 rounded-xl shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Book</th>
                      <th className="px-4 py-2.5 text-right">Available (HQ)</th>
                      <th className="px-4 py-2.5 text-right">Requested</th>
                      <th className="px-4 py-2.5 text-right">Approved</th>
                      <th className="px-4 py-2.5 text-right">Procurement</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {requests?.find((r: any) => r.id === reviewingId)?.items.map((item: any) => {
                      const currentReq = requests?.find((r: any) => r.id === reviewingId);
                      const availHq = item.centralStock?.quantity !== undefined ? item.centralStock.quantity : 999999;
                      return (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                            {item.book?.title}
                            <div className="text-xs text-gray-400 font-mono">ISBN: {item.book?.isbn || 'N/A'}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-bold">
                            <span className={item.centralStock?.quantity === 0 ? 'text-rose-600' : 'text-blue-600'}>
                              {item.centralStock?.quantity !== undefined ? item.centralStock.quantity : '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-medium text-gray-700">{item.quantityRequested}</td>
                          <td className="px-4 py-3 text-right">
                            <input 
                              type="number" 
                              min="0" 
                              max={Math.min(item.quantityRequested, availHq)}
                              value={reviewData.find(r => r.itemId === item.id)?.approvedQuantity ?? 0}
                              onChange={(e) => setReviewData(prev => prev.map(r => r.itemId === item.id ? { ...r, approvedQuantity: Number(e.target.value) } : r))}
                              className="w-24 text-right px-2.5 py-1.5 border border-gray-300 rounded-lg font-bold text-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            {renderItemPoControl(currentReq, item)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">
                  Review Notes (Optional)
                </label>
                <textarea 
                  value={reviewNote} 
                  onChange={e => setReviewNote(e.target.value)}
                  placeholder="Add any instructions or remarks for the branch..."
                  className="w-full border border-gray-300 rounded-xl p-3 sm:text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" 
                  rows={2}
                />
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                <button 
                  onClick={() => setReviewingId(null)} 
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <div className="flex items-center space-x-3">
                  <button 
                    onClick={() => handleReview('REJECTED')} 
                    disabled={isSubmittingReview}
                    className="px-4 py-2 text-sm font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 rounded-xl active:scale-95 transition-all disabled:opacity-50"
                  >
                    Reject Request
                  </button>
                  <button 
                    onClick={() => handleReview('APPROVED')} 
                    disabled={isSubmittingReview}
                    className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-500/10 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmittingReview && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Approve Request</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Request Purchase Order Approval Modal */}
      <AnimatePresence>
        {requestingPoItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 10 }} 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                    <ShoppingCart className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Request Purchase Order</h3>
                    <p className="text-xs text-gray-500">Send procurement request to Admin & Super Admin for approval</p>
                  </div>
                </div>
                <button 
                  onClick={() => setRequestingPoItem(null)} 
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/60 mb-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Book Title:</span>
                  <span className="font-bold text-gray-900 text-right">{requestingPoItem.item.book?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ISBN:</span>
                  <span className="font-mono text-gray-700">{requestingPoItem.item.book?.isbn || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Central Warehouse Stock:</span>
                  <span className="font-bold text-rose-600">{requestingPoItem.item.centralStock?.quantity || 0} copies</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Branch Request:</span>
                  <span className="font-semibold text-gray-700">
                    {requestingPoItem.req?.branch?.name || 'Branch'} (#{requestingPoItem.req?.id.split('-')[0]})
                  </span>
                </div>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Quantity to Procure
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    value={poReqQuantity}
                    onChange={(e) => setPoReqQuantity(Math.max(1, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl font-bold text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Branch requested {requestingPoItem.item.quantityRequested} copies. Adjust to warehouse order size if required.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Reason / Justification for Management
                  </label>
                  <textarea 
                    value={poReqReason}
                    onChange={(e) => setPoReqReason(e.target.value)}
                    placeholder="E.g., Out of stock in central warehouse for branch restock request. Essential inventory."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                <button 
                  onClick={() => setRequestingPoItem(null)} 
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSubmitPoRequest}
                  disabled={isSubmittingPoReq || poReqQuantity <= 0}
                  className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-md shadow-amber-500/10 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingPoReq && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Submit PO Request</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Creation Modal (Branch) */}
      <AnimatePresence>
        {isCreating && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">New Restock Request</h3>
                <button 
                  onClick={() => setIsCreating(false)} 
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex space-x-2 mb-6">
                <div className="flex-1">
                  <Dropdown
                    searchable
                    value={selectedBook}
                    onChange={(val) => setSelectedBook(val)}
                    placeholder="Search by title, ISBN, or barcode..."
                    options={(catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : [])).map((b: any) => ({
                      value: b.id,
                      label: b.title,
                      isbn: b.isbn,
                      barcode: b.barcode,
                      sublabel: `ISBN: ${b.isbn || 'N/A'}${b.barcode ? ` • Barcode: ${b.barcode}` : ''}`,
                    }))}
                  />
                </div>
                <input 
                  type="number" 
                  min="1" 
                  value={quantity} 
                  onChange={e => setQuantity(Number(e.target.value))} 
                  className="w-24 block px-3 py-2 border border-gray-300 rounded-xl sm:text-sm font-semibold text-center focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" 
                />
                <button 
                  onClick={() => {
                    if (selectedBook && quantity > 0) {
                      const bookList = catalog?.books || catalog?.items || catalog?.data || (Array.isArray(catalog) ? catalog : []);
                      const book = bookList.find((b: any) => b.id === selectedBook);
                      setCart([...cart, { bookId: selectedBook, quantity, title: book?.title, isbn: book?.isbn }]);
                      setSelectedBook('');
                    }
                  }}
                  className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-semibold rounded-xl text-sm transition active:scale-95"
                >
                  Add
                </button>
              </div>

              <div className="border border-gray-200 rounded-xl max-h-60 overflow-y-auto mb-6 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                    <tr>
                      <th className="px-4 py-2 text-left">Book Title</th>
                      <th className="px-4 py-2 text-right">Qty</th>
                      <th className="px-4 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {cart.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2.5 text-sm text-gray-900 font-medium">{item.title}</td>
                        <td className="px-4 py-2.5 text-sm text-right font-bold text-gray-700">{item.quantity}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button 
                            onClick={() => setCart(cart.filter((_, i) => i !== idx))} 
                            className="text-rose-500 hover:text-rose-700 text-xs font-semibold px-2 py-1 rounded hover:bg-rose-50 transition"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {cart.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-xs text-gray-400 italic">
                          No items added yet. Select a book above and click Add.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button 
                  onClick={() => setIsCreating(false)} 
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreate} 
                  disabled={cart.length === 0 || isSubmittingCreate} 
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-md shadow-blue-500/10 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmittingCreate && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Submit Request</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

import React, { useState } from 'react';
import { Tent, Calendar, MapPin, Search, Package, Book, CheckCircle, XCircle, Eye, ArchiveRestore, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '@/lib/api';

export function BranchInventoryExhibitionsView({ 
  exhibitions, 
  user,
  onEditExhibition 
}: { 
  exhibitions: any[], 
  user: any,
  onEditExhibition?: (ex: any) => void 
}) {
  const [viewingExhibition, setViewingExhibition] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PAST'>('ACTIVE');

  const myExhibitions = (exhibitions || []).filter(ex => ex.assignedUserId === user?.id || ex.assignedUserId === user?.userId);
  const activeExhibitions = myExhibitions.filter(ex => ['REQUESTED', 'APPROVED', 'ONGOING', 'OVERDUE'].includes(ex.status));
  const pastExhibitions = myExhibitions.filter(ex => ['CLOSED', 'REJECTED', 'EXPIRED'].includes(ex.status));

  const displayList = activeTab === 'ACTIVE' ? activeExhibitions : pastExhibitions;

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [closingExhibition, setClosingExhibition] = useState<any | null>(null);
  const [reconciliation, setReconciliation] = useState<any[]>([]);
  const [closeNote, setCloseNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAction = async (id: string, action: 'approve' | 'reject', note?: string) => {
    try {
      await api.patch(`/exhibitions/${id}/${action}`, { note });
      setRejectingId(null);
      setRejectReason('');
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.message || `Failed to ${action}`);
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
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to close exhibition');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'REQUESTED': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'APPROVED': return 'bg-[#faedf5] text-[#7e2562] border-[#7e2562]/30';
      case 'ONGOING': return 'bg-[#f0fbf5] text-[#3cb976] border-[#3cb976]/30';
      case 'CLOSED': return 'bg-zinc-100 text-zinc-700 border-zinc-200';
      case 'REJECTED': return 'bg-[#fef5f2] text-[#e45e34] border-[#e45e34]/30';
      case 'OVERDUE': return 'bg-[#fef5f2] text-[#e45e34] border-[#e45e34]/40';
      case 'EXPIRED': return 'bg-zinc-100 text-zinc-700 border-zinc-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">My Assigned Exhibitions</h2>
          <p className="text-sm text-gray-500">View and manage events you are assigned to run.</p>
        </div>
      </div>

      <div className="border-b border-[#7e2562]/10">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-semibold text-sm transition-colors ${
              activeTab === 'ACTIVE'
                ? 'border-[#7e2562] text-[#7e2562]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Active & Upcoming ({activeExhibitions.length})
          </button>
          <button
            onClick={() => setActiveTab('PAST')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-semibold text-sm transition-colors ${
              activeTab === 'PAST'
                ? 'border-[#7e2562] text-[#7e2562]'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Past Events ({pastExhibitions.length})
          </button>
        </nav>
      </div>

      {displayList.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-sm border border-[#7e2562]/10 border-dashed">
          <Tent className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">No Exhibitions</h3>
          <p className="mt-1 text-sm text-gray-500">You don't have any {activeTab.toLowerCase()} exhibitions assigned.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayList.map(ex => (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={ex.id}
              onClick={() => setViewingExhibition(ex)}
              className="bg-white rounded-sm border border-[#7e2562]/10 shadow-sm overflow-hidden hover:shadow-md hover:border-[#7e2562]/30 transition-all cursor-pointer group"
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold text-gray-900 group-hover:text-[#7e2562] transition-colors">{ex.name || ex.eventName}</h3>
                  <span className={`px-2.5 py-0.5 rounded-sm text-[11px] font-bold border ${getStatusColor(ex.status)}`}>
                    {ex.status}
                  </span>
                </div>
                {ex.status === 'REJECTED' && ex.rejectionReason && (
                  <div className="mb-4 text-xs text-[#e45e34] bg-[#fef5f2] p-2 rounded-sm border border-[#e45e34]/20 font-medium">
                    <span className="font-bold">Reason:</span> {ex.rejectionReason}
                  </div>
                )}
                
                <div className="space-y-3">
                  <div className="flex items-start text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 mt-0.5 text-[#7e2562] shrink-0" />
                    <span>{ex.location}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="w-4 h-4 mr-2 text-[#7e2562] shrink-0" />
                    <span>
                      {new Date(ex.startDate).toLocaleDateString()} - {new Date(ex.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Package className="w-4 h-4 mr-2 text-[#7e2562] shrink-0" />
                    <span>{ex.stock?.length || 0} unique titles</span>
                  </div>
                </div>
              </div>
              <div className="bg-[#faf6f9]/50 px-5 py-3 border-t border-[#7e2562]/10 flex justify-between items-center text-sm" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={() => setViewingExhibition(ex)} 
                    className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-[#faedf5] hover:text-[#7e2562] border border-gray-300 hover:border-[#7e2562]/30 rounded-sm shadow-xs transition-all active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
                    View Details
                  </button>

                  {ex.status !== 'CLOSED' && ex.status !== 'REJECTED' && onEditExhibition && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditExhibition(ex);
                      }} 
                      className="inline-flex items-center px-2.5 py-1.5 text-xs font-semibold text-[#7e2562] bg-[#faedf5] hover:bg-[#f6dbe9] border border-[#7e2562]/20 rounded-sm shadow-xs transition-all active:scale-95"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" />
                      Edit Books & Details
                    </button>
                  )}
                </div>
                <div className="flex space-x-3 items-center">
                  {(ex.status === 'ONGOING' || ex.status === 'OVERDUE') && (
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
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
                      className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-sm shadow-xs transition-colors active:scale-95 ml-3"
                    >
                      <ArchiveRestore className="w-3.5 h-3.5 mr-1.5" />
                      Close & Reconcile
                    </button>
                  )}
                  {ex.status !== 'REQUESTED' && ex.status !== 'ONGOING' && <span className="text-gray-400 text-xs">ID: {ex.id.substring(0, 8)}</span>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-sm shadow-xl w-full max-w-md p-6 border border-[#e45e34]/20">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><XCircle className="w-5 h-5 mr-2 text-[#e45e34]"/> Reject Assignment</h3>
              <p className="text-sm text-gray-500 mb-4">Please provide a reason for rejecting this exhibition assignment.</p>
              <textarea 
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full border border-gray-300 rounded-sm p-3 text-sm focus:ring-1 focus:ring-[#e45e34] focus:border-[#e45e34]"
                rows={3}
                placeholder="E.g., I am unavailable on those dates..."
              />
              <div className="flex justify-end space-x-3 mt-4">
                <button onClick={() => setRejectingId(null)} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50">Cancel</button>
                <button 
                  onClick={() => handleAction(rejectingId, 'reject', rejectReason)}
                  disabled={!rejectReason.trim()}
                  className="px-4 py-2 text-sm font-semibold text-white bg-[#e45e34] hover:bg-[#c74c25] rounded-sm disabled:opacity-50 transition-colors shadow-xs active:scale-[0.98]"
                >Submit Rejection</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Close & Reconcile Modal */}
      <AnimatePresence>
        {closingExhibition && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-sm shadow-xl w-full max-w-4xl p-6 max-h-[90vh] flex flex-col border border-[#7e2562]/10">
              <div className="mb-4 shrink-0">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2 text-amber-600"/> Reconcile & Close Event
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  For each book, record how many were sold, not sold, damaged, or lost. The total must equal the quantity taken.
                </p>
              </div>
              
              <div className="flex-1 overflow-y-auto mb-4 border border-[#7e2562]/10 rounded-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#faf6f9]/70 sticky top-0 z-10 shadow-xs text-[11px] font-bold text-[#7e2562] uppercase tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap">
                    <tr>
                      <th className="px-4 py-3 text-left">Book Title</th>
                      <th className="px-3 py-3 text-center">Taken</th>
                      <th className="px-3 py-3 text-center text-[#3cb976]">Sold</th>
                      <th className="px-3 py-3 text-center text-[#7e2562]">Not Sold</th>
                      <th className="px-3 py-3 text-center text-[#e45e34]">Damaged</th>
                      <th className="px-3 py-3 text-center text-[#e45e34]">Lost</th>
                      <th className="px-3 py-3 text-center text-purple-600">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200 text-xs">
                    {reconciliation.map((rec, idx) => {
                      const total = (rec.quantitySold || 0) + (rec.quantityReturned || 0) + (rec.quantityDamaged || 0) + (rec.quantityLost || 0) + (rec.quantityCredit || 0);
                      const isBalanced = total === rec.quantityTaken;
                      return (
                        <tr key={rec.stockId} className={!isBalanced ? 'bg-[#fef5f2]' : ''}>
                          <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate" title={rec.title}>
                            {rec.title}
                            {!isBalanced && <div className="text-[10px] text-[#e45e34] font-bold mt-1">Count mismatch: {total} vs {rec.quantityTaken}</div>}
                          </td>
                          <td className="px-3 py-3 text-center font-bold text-gray-700">{rec.quantityTaken}</td>
                          <td className="px-2 py-2">
                            <input type="number" min="0" value={rec.quantitySold} onChange={(e) => {
                              const newRec = [...reconciliation];
                              newRec[idx].quantitySold = Number(e.target.value);
                              setReconciliation(newRec);
                            }} className="w-full px-2 py-1.5 text-xs font-semibold text-[#3cb976] border border-gray-300 rounded-sm text-center focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min="0" value={rec.quantityReturned} onChange={(e) => {
                              const newRec = [...reconciliation];
                              newRec[idx].quantityReturned = Number(e.target.value);
                              setReconciliation(newRec);
                            }} className="w-full px-2 py-1.5 text-xs font-semibold text-[#7e2562] border border-gray-300 rounded-sm text-center focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min="0" value={rec.quantityDamaged} onChange={(e) => {
                              const newRec = [...reconciliation];
                              newRec[idx].quantityDamaged = Number(e.target.value);
                              setReconciliation(newRec);
                            }} className="w-full px-2 py-1.5 text-xs font-semibold text-[#e45e34] border border-[#e45e34]/30 rounded-sm text-center focus:ring-1 focus:ring-[#e45e34] focus:border-[#e45e34]" />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min="0" value={rec.quantityLost} onChange={(e) => {
                              const newRec = [...reconciliation];
                              newRec[idx].quantityLost = Number(e.target.value);
                              setReconciliation(newRec);
                            }} className="w-full px-2 py-1.5 text-xs font-semibold text-[#e45e34] border border-[#e45e34]/30 rounded-sm text-center focus:ring-1 focus:ring-[#e45e34] focus:border-[#e45e34]" />
                          </td>
                          <td className="px-2 py-2">
                            <input type="number" min="0" value={rec.quantityCredit} onChange={(e) => {
                              const newRec = [...reconciliation];
                              newRec[idx].quantityCredit = Number(e.target.value);
                              setReconciliation(newRec);
                            }} className="w-full px-2 py-1.5 text-xs font-semibold text-purple-700 border border-purple-300 rounded-sm text-center focus:ring-1 focus:ring-purple-600 focus:border-purple-600" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="shrink-0 mb-4">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Closing Notes (Optional)</label>
                <textarea 
                  value={closeNote}
                  onChange={(e) => setCloseNote(e.target.value)}
                  className="w-full border border-gray-300 rounded-sm p-2 text-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]"
                  rows={2}
                  placeholder="Any final remarks about the exhibition..."
                />
              </div>

              <div className="flex justify-end space-x-3 shrink-0">
                <button onClick={() => setClosingExhibition(null)} disabled={isSubmitting} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50">Cancel</button>
                <button 
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-sm hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center shadow-xs active:scale-[0.98]"
                >
                  {isSubmitting ? 'Processing...' : 'Submit Reconciliation'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detailed View Modal */}
      <AnimatePresence>
        {viewingExhibition && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-white rounded-sm shadow-xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden border border-[#7e2562]/10"
            >
              {/* Header */}
              <div className="p-6 border-b border-[#7e2562]/10 bg-gradient-to-r from-[#faedf5]/70 to-[#faf6f9] flex justify-between items-start shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">{viewingExhibition.name || viewingExhibition.eventName}</h3>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span className="flex items-center"><MapPin className="w-4 h-4 mr-1 text-[#7e2562]" /> {viewingExhibition.location}</span>
                    <span className="flex items-center"><Calendar className="w-4 h-4 mr-1 text-[#7e2562]" /> {new Date(viewingExhibition.startDate).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {viewingExhibition.status !== 'CLOSED' && viewingExhibition.status !== 'REJECTED' && onEditExhibition && (
                    <button 
                      onClick={() => {
                        const target = viewingExhibition;
                        setViewingExhibition(null);
                        onEditExhibition(target);
                      }} 
                      className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-[#7e2562] bg-[#faedf5] hover:bg-[#f6dbe9] border border-[#7e2562]/20 rounded-sm shadow-xs transition-all active:scale-95"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      Edit Books & Details
                    </button>
                  )}
                  <button 
                    onClick={() => setViewingExhibition(null)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto">
                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
                  <Book className="w-4 h-4 mr-2 text-[#7e2562]" />
                  Stock Details
                </h4>

                <div className="border border-[#7e2562]/10 rounded-sm overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-[#faf6f9]/70 text-[11px] font-bold text-[#7e2562] uppercase tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap">
                      <tr>
                        <th className="px-6 py-3 text-left">Book Title</th>
                        <th className="px-4 py-3 text-right">Taken</th>
                        {viewingExhibition.status === 'CLOSED' && (
                          <>
                            <th className="px-4 py-3 text-right text-[#3cb976]">Sold</th>
                            <th className="px-4 py-3 text-right text-[#7e2562]">Not Sold</th>
                            <th className="px-4 py-3 text-right text-[#e45e34]">Damaged</th>
                            <th className="px-4 py-3 text-right text-[#e45e34]">Lost</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200 text-xs">
                      {(viewingExhibition.stock || []).map((s: any) => (
                        <tr key={s.id} className="hover:bg-[#faf6f9]/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {s.book?.title}
                            <div className="text-xs text-gray-400 mt-0.5 font-mono">{s.book?.isbn}</div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-right text-gray-600 font-bold">{s.quantityTaken}</td>
                          {viewingExhibition.status === 'CLOSED' && (
                            <>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-bold text-[#3cb976]">{s.quantitySold}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold text-[#7e2562]">{s.quantityReturned}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold text-[#e45e34]">{s.quantityDamaged}</td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-semibold text-[#e45e34]">{s.quantityLost}</td>
                            </>
                          )}
                        </tr>
                      ))}
                      {(!viewingExhibition.stock || viewingExhibition.stock.length === 0) && (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">
                            No stock records found for this exhibition.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

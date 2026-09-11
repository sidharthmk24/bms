"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { Loader2, Plus, Book, Users, Tag, Building2, Pencil, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dropdown } from '@/components/Dropdown';
import { Pagination } from '@/components/Pagination';

export default function CatalogManagementPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const isAdmin = (user?.roles?.some(r => ['SUPER_ADMIN', 'ADMIN', 'CENTRAL_INVENTORY_MANAGER'].includes(r)) || false);

  const [activeTab, setActiveTab] = useState<'BOOKS' | 'AUTHORS' | 'CATEGORIES' | 'PUBLISHERS'>('BOOKS');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState('');
  const [sortBy, setSortBy] = useState('title');
  const [order, setOrder] = useState('ASC');

  const booksUrl = `/catalog/books?page=${page}&limit=${pageSize}`
    + (searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '')
    + (selectedCategory ? `&categoryId=${selectedCategory}` : '')
    + (selectedAuthor ? `&authorId=${selectedAuthor}` : '')
    + `&sortBy=${sortBy}&order=${order}`;

  const { data: booksResponse, loading: booksLoading } = useApiData<any>(booksUrl, []);
  const { data: authors, loading: authorsLoading } = useApiData<any[]>('/catalog/authors', []);
  const { data: categories, loading: categoriesLoading } = useApiData<any[]>('/catalog/categories', []);
  const { data: publishers, loading: pubLoading } = useApiData<any[]>('/catalog/publishers', []);

  const books = booksResponse?.books || (Array.isArray(booksResponse) ? booksResponse : []);

  // General Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Author/Category/Publisher State
  const [nameInput, setNameInput] = useState('');
  const [descInput, setDescInput] = useState('');

  // Book State
  const [bookForm, setBookForm] = useState({
    title: '', isbn: '', barcode: '', description: '', price: 0, costPrice: 0,
    authorId: '', publisherId: '', categoryId: ''
  });
  const [customAuthorName, setCustomAuthorName] = useState('');
  const [customPublisherName, setCustomPublisherName] = useState('');
  const [customCategoryName, setCustomCategoryName] = useState('');

  if (!isAdmin) {
    return <div className="p-8 text-center text-red-600 font-bold">Access Denied. Admins only.</div>;
  }

  const openModal = (item?: any) => {
    setEditingId(item?.id || null);
    if (activeTab === 'BOOKS') {
      setBookForm({
        title: item?.title || '',
        isbn: item?.isbn || '',
        barcode: item?.barcode || '',
        description: item?.description || '',
        price: item?.price || 0,
        costPrice: item?.costPrice || 0,
        authorId: item?.author?.id || '',
        publisherId: item?.publisher?.id || '',
        categoryId: item?.category?.id || ''
      });
      setCustomAuthorName(item?.author?.name || '');
      setCustomPublisherName(item?.publisher?.name || '');
      setCustomCategoryName('');
    } else {
      setNameInput(item?.name || '');
      setDescInput(item?.description || item?.biography || '');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setNameInput(''); setDescInput('');
    setBookForm({ title: '', isbn: '', barcode: '', description: '', price: 0, costPrice: 0, authorId: '', publisherId: '', categoryId: '' });
    setCustomAuthorName('');
    setCustomPublisherName('');
    setCustomCategoryName('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const endpointMap = {
        'BOOKS': '/catalog/books', 'AUTHORS': '/catalog/authors', 'CATEGORIES': '/catalog/categories', 'PUBLISHERS': '/catalog/publishers'
      };
      
      let payload: any = {};
      
      if (activeTab === 'BOOKS') {
        let finalAuthorId = bookForm.authorId;
        let finalPublisherId = bookForm.publisherId;
        let finalCategoryId = bookForm.categoryId;

        if (customAuthorName) {
          const existing = authors?.find((a: any) => a.name.toLowerCase() === customAuthorName.toLowerCase());
          if (existing) {
            finalAuthorId = existing.id;
          } else {
            const res = await api.post('/catalog/authors', { name: customAuthorName });
            finalAuthorId = res.data?.data?.id || res.data?.id;
          }
        }
        
        if (customPublisherName) {
          const existing = publishers?.find((p: any) => p.name.toLowerCase() === customPublisherName.toLowerCase());
          if (existing) {
            finalPublisherId = existing.id;
          } else {
            const res = await api.post('/catalog/publishers', { name: customPublisherName });
            finalPublisherId = res.data?.data?.id || res.data?.id;
          }
        }

        if (finalCategoryId === 'OTHER' && customCategoryName) {
          const existing = categories?.find((c: any) => c.name.toLowerCase() === customCategoryName.toLowerCase());
          if (existing) {
            finalCategoryId = existing.id;
          } else {
            const res = await api.post('/catalog/categories', { name: customCategoryName });
            finalCategoryId = res.data?.data?.id || res.data?.id;
          }
        }

        payload = {
          ...bookForm,
          authorId: finalAuthorId,
          publisherId: finalPublisherId,
          categoryId: finalCategoryId
        };
      } else {
        payload = {
          name: nameInput,
          ...(activeTab === 'AUTHORS' ? { biography: descInput } : { description: descInput })
        };
      }

      if (editingId) {
        await api.patch(`${endpointMap[activeTab]}/${editingId}`, payload);
      } else {
        await api.post(endpointMap[activeTab], payload);
      }
      window.dispatchEvent(new Event('app:data-mutated'));
      closeModal();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Save failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBook = async (id: string, title: string) => {
    const ok = await confirm({
      title: "Delete Book",
      message: `Are you sure you want to permanently delete "${title}" from the catalog? This cannot be undone.`,
      confirmText: "Yes, Delete",
      cancelText: "No, Keep",
      variant: "danger",
    });
    if (!ok) return;

    try {
      await api.delete(`/catalog/books/${id}`);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete book');
    }
  };

  const getSingularLabel = () => {
    if (activeTab === 'BOOKS') return 'book';
    if (activeTab === 'AUTHORS') return 'author';
    if (activeTab === 'CATEGORIES') return 'category';
    if (activeTab === 'PUBLISHERS') return 'publisher';
    return 'item';
  };

  const handleDeleteEntity = async (id: string, name: string) => {
    const typeLabel = getSingularLabel();
    const ok = await confirm({
      title: `Delete ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}`,
      message: `Are you sure you want to delete the ${typeLabel} "${name}"?`,
      confirmText: "Yes, Delete",
      cancelText: "No, Keep",
      variant: "danger",
    });
    if (!ok) return;

    try {
      const endpointMap = {
        'AUTHORS': '/catalog/authors',
        'CATEGORIES': '/catalog/categories',
        'PUBLISHERS': '/catalog/publishers'
      };
      await api.delete(`${endpointMap[activeTab as 'AUTHORS' | 'CATEGORIES' | 'PUBLISHERS']}/${id}`);
    } catch (err: any) {
      alert(err.response?.data?.message || `Failed to delete ${typeLabel}`);
    }
  };

  const isLoading = booksLoading || authorsLoading || categoriesLoading || pubLoading;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">Catalog Management</h2>
          <p className="text-sm text-gray-500">Manage books, authors, publishers, and categories.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-[#7e2562] hover:bg-[#681b50] rounded-sm shadow-xs transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add {getSingularLabel().replace(/^\w/, c => c.toUpperCase())}
        </button>
      </div>

      <div className="flex space-x-1 border-b border-[#7e2562]/10">
        {[
          { id: 'BOOKS', icon: Book, label: 'Books' },
          { id: 'AUTHORS', icon: Users, label: 'Authors' },
          { id: 'CATEGORIES', icon: Tag, label: 'Categories' },
          { id: 'PUBLISHERS', icon: Building2, label: 'Publishers' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-2 px-4 text-sm font-semibold border-b-2 outline-none flex items-center transition-colors ${activeTab === tab.id ? 'border-[#7e2562] text-[#7e2562]' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <tab.icon className="w-4 h-4 mr-2" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white shadow-sm border border-[#7e2562]/10 rounded-sm overflow-hidden">
        {activeTab === 'BOOKS' && (
          <div className="p-4 border-b border-[#7e2562]/10 flex flex-col sm:flex-row gap-4 bg-[#faf6f9]/50 items-start sm:items-center">
            <div className="flex-1 w-full">
              <input 
                type="text" 
                placeholder="Search title, ISBN, or barcode..." 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562] bg-white"
              />
            </div>
            <div className="w-48 text-left z-20">
              <Dropdown
                value={selectedCategory}
                onChange={(val) => { setSelectedCategory(val); setPage(1); }}
                placeholder="All Categories"
                options={[
                  { value: '', label: 'All Categories' },
                  ...(categories?.map((c: any) => ({ value: c.id, label: c.name })) || [])
                ]}
              />
            </div>
            <div className="w-48 text-left z-10">
              <Dropdown
                value={selectedAuthor}
                onChange={(val) => { setSelectedAuthor(val); setPage(1); }}
                placeholder="All Authors"
                options={[
                  { value: '', label: 'All Authors' },
                  ...(authors?.map((a: any) => ({ value: a.id, label: a.name })) || [])
                ]}
              />
            </div>
            <div className="w-48 text-left">
              <Dropdown
                value={`${sortBy}-${order}`}
                onChange={(val) => {
                  const [s, o] = val.split('-');
                  setSortBy(s); setOrder(o); setPage(1);
                }}
                placeholder="Sort By..."
                options={[
                  { value: 'title-ASC', label: 'Title (A-Z)' },
                  { value: 'title-DESC', label: 'Title (Z-A)' },
                  { value: 'price-ASC', label: 'Price (Low-High)' },
                  { value: 'price-DESC', label: 'Price (High-Low)' },
                  { value: 'createdAt-DESC', label: 'Newest First' },
                  { value: 'createdAt-ASC', label: 'Oldest First' },
                ]}
              />
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-[#7e2562]"/></div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'BOOKS' && (
              <>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-[#faf6f9]/70 text-[11px] font-bold text-[#7e2562] uppercase tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap">
                    <tr>
                      <th className="px-6 py-3 text-left">Title</th>
                      <th className="px-6 py-3 text-left">Author</th>
                      <th className="px-6 py-3 text-left">Category</th>
                      <th className="px-6 py-3 text-right">Price</th>
                      <th className="px-6 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {books.map((b: any) => (
                      <tr key={b.id} className="hover:bg-[#faf6f9]/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{b.title}<br/><span className="text-xs text-gray-500 font-mono font-normal">{b.isbn}</span></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{b.author?.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          <span className="px-2 py-0.5 rounded-sm bg-[#faedf5] text-[#7e2562] text-xs font-semibold border border-[#7e2562]/20">{b.category?.name || 'General'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-bold">₹{b.price}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openModal(b)} className="p-1.5 rounded-sm text-[#7e2562] hover:bg-[#faedf5] transition-colors" title="Edit book">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDeleteBook(b.id, b.title)} className="p-1.5 rounded-sm text-[#e45e34] hover:bg-[#fef5f2] transition-colors" title="Delete book">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Pagination
                  currentPage={page}
                  totalItems={booksResponse?.total ?? (booksResponse?.books?.length || 0)}
                  pageSize={pageSize}
                  onPageChange={(p) => setPage(p)}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              </>
            )}

            {activeTab !== 'BOOKS' && (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#faf6f9]/70 text-[11px] font-bold text-[#7e2562] uppercase tracking-wider border-b border-[#7e2562]/10 whitespace-nowrap">
                  <tr>
                    <th className="px-6 py-3 text-left">Name</th>
                    <th className="px-6 py-3 text-left">Description</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(activeTab === 'AUTHORS' ? authors : activeTab === 'CATEGORIES' ? categories : publishers)?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-[#faf6f9]/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{item.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-md">{item.description || item.biography || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openModal(item)} className="p-1.5 rounded-sm text-[#7e2562] hover:bg-[#faedf5] transition-colors" title={`Edit ${getSingularLabel()}`}>
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteEntity(item.id, item.name)} className="p-1.5 rounded-sm text-[#e45e34] hover:bg-[#fef5f2] transition-colors" title={`Delete ${getSingularLabel()}`}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-sm shadow-xl w-full max-w-2xl p-6 border border-[#7e2562]/10">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{editingId ? 'Edit' : 'Create'} {getSingularLabel().replace(/^\w/, c => c.toUpperCase())}</h3>
              
              <form onSubmit={handleSave} className="space-y-4">
                {activeTab === 'BOOKS' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Title *</label>
                        <input required type="text" value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})} className="block w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">ISBN *</label>
                        <input required type="text" value={bookForm.isbn} onChange={e => setBookForm({...bookForm, isbn: e.target.value})} className="block w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Price *</label>
                        <input required type="number" step="0.01" min="0" value={bookForm.price} onChange={e => setBookForm({...bookForm, price: Number(e.target.value)})} className="block w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Cost Price</label>
                        <input type="number" step="0.01" min="0" value={bookForm.costPrice} onChange={e => setBookForm({...bookForm, costPrice: Number(e.target.value)})} className="block w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Author *</label>
                        <input 
                          required 
                          type="text" 
                          placeholder="Author Name"
                          value={customAuthorName} 
                          onChange={e => setCustomAuthorName(e.target.value)} 
                          className="block w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" 
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Category *</label>
                          <Dropdown
                            required
                            value={bookForm.categoryId}
                            onChange={(val) => setBookForm({...bookForm, categoryId: val})}
                            placeholder="Select..."
                            options={[
                              ...(categories || []).map((c: any) => ({ value: c.id, label: c.name })),
                              { value: 'OTHER', label: '+ Other...' }
                            ]}
                          />
                        </div>
                        {bookForm.categoryId === 'OTHER' && (
                          <div>
                            <input 
                              required 
                              type="text" 
                              placeholder="New Category Name"
                              value={customCategoryName} 
                              onChange={e => setCustomCategoryName(e.target.value)} 
                              className="block w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" 
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Publisher *</label>
                        <input 
                          required 
                          type="text" 
                          placeholder="Publisher Name"
                          value={customPublisherName} 
                          onChange={e => setCustomPublisherName(e.target.value)} 
                          className="block w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" 
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Name *</label>
                      <input required type="text" value={nameInput} onChange={e => setNameInput(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Description / Bio</label>
                      <textarea rows={3} value={descInput} onChange={e => setDescInput(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-sm text-sm focus:ring-1 focus:ring-[#7e2562] focus:border-[#7e2562]" />
                    </div>
                  </>
                )}

                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
                  <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-sm hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex items-center px-4 py-2 text-sm font-semibold text-white bg-[#7e2562] hover:bg-[#681b50] rounded-sm disabled:opacity-50 shadow-xs transition-colors active:scale-[0.98]">
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useApiData } from '@/hooks/useApiData';
import { api } from '@/lib/api';
import { Loader2, Plus, Book, Users, Tag, Building2, Pencil } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dropdown } from '@/components/Dropdown';

export default function CatalogManagementPage() {
  const { user } = useAuth();
  const isAdmin = (user?.roles?.some(r => ['SUPER_ADMIN', 'ADMIN', 'CENTRAL_INVENTORY_MANAGER'].includes(r)) || false);

  const [activeTab, setActiveTab] = useState<'BOOKS' | 'AUTHORS' | 'CATEGORIES' | 'PUBLISHERS'>('BOOKS');
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState('');
  const [sortBy, setSortBy] = useState('title');
  const [order, setOrder] = useState('ASC');

  const booksUrl = `/books?page=${page}&limit=50`
    + (searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : '')
    + (selectedCategory ? `&categoryId=${selectedCategory}` : '')
    + (selectedAuthor ? `&authorId=${selectedAuthor}` : '')
    + `&sortBy=${sortBy}&order=${order}`;

  const { data: booksResponse, loading: booksLoading } = useApiData<any>(booksUrl, []);
  const { data: authors, loading: authorsLoading } = useApiData<any[]>('/authors', []);
  const { data: categories, loading: categoriesLoading } = useApiData<any[]>('/categories', []);
  const { data: publishers, loading: pubLoading } = useApiData<any[]>('/publishers', []);

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
        'BOOKS': '/books', 'AUTHORS': '/authors', 'CATEGORIES': '/categories', 'PUBLISHERS': '/publishers'
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
            const res = await api.post('/authors', { name: customAuthorName });
            finalAuthorId = res.data?.data?.id || res.data?.id;
          }
        }
        
        if (customPublisherName) {
          const existing = publishers?.find((p: any) => p.name.toLowerCase() === customPublisherName.toLowerCase());
          if (existing) {
            finalPublisherId = existing.id;
          } else {
            const res = await api.post('/publishers', { name: customPublisherName });
            finalPublisherId = res.data?.data?.id || res.data?.id;
          }
        }

        if (finalCategoryId === 'OTHER' && customCategoryName) {
          const existing = categories?.find((c: any) => c.name.toLowerCase() === customCategoryName.toLowerCase());
          if (existing) {
            finalCategoryId = existing.id;
          } else {
            const res = await api.post('/categories', { name: customCategoryName });
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
          className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add {activeTab.slice(0,-1).toLowerCase().replace(/^\w/, c => c.toUpperCase())}
        </button>
      </div>

      <div className="flex space-x-1 border-b border-gray-200">
        {[
          { id: 'BOOKS', icon: Book, label: 'Books' },
          { id: 'AUTHORS', icon: Users, label: 'Authors' },
          { id: 'CATEGORIES', icon: Tag, label: 'Categories' },
          { id: 'PUBLISHERS', icon: Building2, label: 'Publishers' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-2 px-4 text-sm font-medium border-b-2 outline-none flex items-center ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <tab.icon className="w-4 h-4 mr-2" /> {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600"/></div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'BOOKS' && (
              <>
                <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 bg-gray-50 items-start sm:items-center">
                  <div className="flex-1 w-full">
                    <input 
                      type="text" 
                      placeholder="Search titles, ISBNs..." 
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg sm:text-sm focus:ring-blue-500 focus:border-blue-500"
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
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {books.map((b: any) => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{b.title}<br/><span className="text-xs text-gray-500 font-normal">{b.isbn}</span></td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{b.author?.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{b.category?.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 font-medium">₹{b.price}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button onClick={() => openModal(b)} className="text-blue-600 hover:text-blue-900"><Pencil className="w-4 h-4"/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {booksResponse?.totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center bg-gray-50 rounded-b-xl">
                    <button 
                      disabled={page === 1}
                      onClick={() => setPage(page - 1)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600 font-medium">
                      Page {page} of {booksResponse.totalPages}
                    </span>
                    <button 
                      disabled={page === booksResponse.totalPages}
                      onClick={() => setPage(page + 1)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}

            {activeTab !== 'BOOKS' && (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(activeTab === 'AUTHORS' ? authors : activeTab === 'CATEGORIES' ? categories : publishers)?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-md">{item.description || item.biography || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button onClick={() => openModal(item)} className="text-blue-600 hover:text-blue-900"><Pencil className="w-4 h-4"/></button>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{editingId ? 'Edit' : 'Create'} {activeTab.slice(0,-1).toLowerCase().replace(/^\w/, c => c.toUpperCase())}</h3>
              
              <form onSubmit={handleSave} className="space-y-4">
                {activeTab === 'BOOKS' ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                        <input required type="text" value={bookForm.title} onChange={e => setBookForm({...bookForm, title: e.target.value})} className="block w-full px-3 py-2 border rounded-lg sm:text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ISBN *</label>
                        <input required type="text" value={bookForm.isbn} onChange={e => setBookForm({...bookForm, isbn: e.target.value})} className="block w-full px-3 py-2 border rounded-lg sm:text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Price *</label>
                        <input required type="number" step="0.01" min="0" value={bookForm.price} onChange={e => setBookForm({...bookForm, price: Number(e.target.value)})} className="block w-full px-3 py-2 border rounded-lg sm:text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
                        <input type="number" step="0.01" min="0" value={bookForm.costPrice} onChange={e => setBookForm({...bookForm, costPrice: Number(e.target.value)})} className="block w-full px-3 py-2 border rounded-lg sm:text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Author *</label>
                        <input 
                          required 
                          type="text" 
                          placeholder="Author Name"
                          value={customAuthorName} 
                          onChange={e => setCustomAuthorName(e.target.value)} 
                          className="block w-full px-3 py-2 border rounded-lg sm:text-sm" 
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
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
                              className="block w-full px-3 py-2 border rounded-lg sm:text-sm" 
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Publisher *</label>
                        <input 
                          required 
                          type="text" 
                          placeholder="Publisher Name"
                          value={customPublisherName} 
                          onChange={e => setCustomPublisherName(e.target.value)} 
                          className="block w-full px-3 py-2 border rounded-lg sm:text-sm" 
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                      <input required type="text" value={nameInput} onChange={e => setNameInput(e.target.value)} className="block w-full px-3 py-2 border rounded-lg sm:text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description / Bio</label>
                      <textarea rows={3} value={descInput} onChange={e => setDescInput(e.target.value)} className="block w-full px-3 py-2 border rounded-lg sm:text-sm" />
                    </div>
                  </>
                )}

                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                  <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
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

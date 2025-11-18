'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Dialog } from '@headlessui/react';
import NavBar from '@/components/NavBar';

export default function PeoplePage() {
  const router = useRouter();
  const [people, setPeople] = useState<any[]>([]);
  const [filteredPeople, setFilteredPeople] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  // New member modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPeople();
  }, []);

  async function loadPeople() {
    setLoading(true);
    const { data, error } = await supabase
      .from('members')
      .select('id, name, created_at, notes(count)');
    if (!error && data) {
      setPeople(data);
      setFilteredPeople(data);
    }
    setLoading(false);
  }

  // Simple date formatter
  function formatDate(date: string) {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  // Filter handler
  useEffect(() => {
    let result = people;

    if (search.trim()) {
      result = result.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (activityFilter !== 'All') {
      result = result.filter(
        (p) => p.activity_type?.toLowerCase() === activityFilter.toLowerCase()
      );
    }

    setFilteredPeople(result);
  }, [search, activityFilter, people]);

  // Add new member
  async function handleAddMember() {
    if (!newMemberName.trim()) return;
    setSaving(true);

    const { data, error } = await supabase
      .from('members')
      .insert([{ name: newMemberName.trim() }])
      .select()
      .single();

    if (error) {
      console.error('Error adding member:', error);
      alert('Failed to add member');
    } else if (data) {
      setPeople((prev) => [data, ...prev]);
      setFilteredPeople((prev) => [data, ...prev]);
      setShowAddModal(false);
      setNewMemberName('');
    }
    setSaving(false);
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <div className="pt-20 pb-4">
        <div className="p-3 sm:p-4 md:p-6 lg:p-8 w-full">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold" style={{ color: '#333333' }}>People & Notes</h1>
          <div className="flex gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-md text-sm whitespace-nowrap transition"
              style={{ 
                backgroundColor: '#000000', 
                color: '#ffffff',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333333'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#000000'}
            >
              + Add Member
            </button>
          </div>
        </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 rounded-md text-sm focus:outline-none w-full sm:w-auto border"
            style={{ 
              borderColor: '#e0e0e0',
              backgroundColor: '#ffffff',
              color: '#333333'
            }}
          />
          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-md text-sm focus:outline-none w-full sm:w-auto border"
            style={{ 
              borderColor: '#e0e0e0',
              backgroundColor: '#ffffff',
              color: '#333333'
            }}
          >
            <option value="All">All Activities</option>
            <option value="Yoga">Yoga</option>
            <option value="Life Skills">Life Skills</option>
            <option value="Job Coaching">Job Coaching</option>
            <option value="Music Therapy">Music Therapy</option>
          </select>
        </div>
      </div>

      {/* Summary Info */}
      <div className="mb-6 text-xs sm:text-sm flex flex-wrap gap-4 sm:gap-6" style={{ color: '#333333' }}>
        <div>
          Total Members: <b>{people.length}</b>
        </div>
        <div>
          Total Notes:{' '}
          <b>
            {people.reduce((acc, p) => acc + (p.notes?.[0]?.count || 0), 0)}
          </b>
        </div>
        <div>
          Active Activities:{' '}
          <b>
            {
              Array.from(
                new Set(
                  people
                    .map((p) => p.activity_type)
                    .filter((t) => t && t.length > 0)
                )
              ).length
            }
          </b>
        </div>
      </div>

      {/* Members grid */}
      {loading ? (
        <p style={{ color: '#555555' }}>Loading members...</p>
      ) : filteredPeople.length === 0 ? (
        <p style={{ color: '#555555' }}>No members found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPeople.map((person) => (
            <div
              key={person.id}
              className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
              style={{ borderColor: '#e0e0e0' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center font-medium"
                    style={{ backgroundColor: '#c0e0ff', color: '#333333' }}
                  >
                    {person.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-medium text-lg" style={{ color: '#333333' }}>
                      {person.name}
                    </h2>
                    <p className="text-sm" style={{ color: '#555555' }}>
                      Joined {formatDate(person.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-sm mb-4" style={{ color: '#333333' }}>
                Notes recorded: <b>{person.notes?.[0]?.count || 0}</b>
              </div>

              <button
                onClick={() => router.push(`/people/${person.id}`)}
                className="w-full text-sm px-3 py-2 rounded-md transition"
                style={{ 
                  backgroundColor: '#000000', 
                  color: '#ffffff'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333333'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#000000'}
              >
                View Notes
              </button>
            </div>
          ))}
        </div>
      )}

          <footer className="mt-12 text-xs" style={{ color: '#555555' }}>
            © 2025 Janakiram (Ram)
          </footer>

          {/* Add Member Modal */}
          <Dialog
            open={showAddModal}
            onClose={() => setShowAddModal(false)}
            className="relative z-50"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
            <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4">
              <Dialog.Panel className="bg-white w-full max-w-md rounded-lg shadow-lg p-4 sm:p-6" style={{ borderColor: '#e0e0e0' }}>
                <Dialog.Title className="text-lg font-semibold mb-4" style={{ color: '#333333' }}>
                  Add New Member
                </Dialog.Title>

                <input
                  type="text"
                  placeholder="Enter member name"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm mb-6 focus:outline-none"
                  style={{ 
                    borderColor: '#e0e0e0',
                    backgroundColor: '#ffffff',
                    color: '#333333'
                  }}
                />

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-3">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-sm border rounded-md w-full sm:w-auto transition"
                    style={{ 
                      borderColor: '#e0e0e0',
                      backgroundColor: '#ffffff',
                      color: '#333333'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f0f8ff'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddMember}
                    disabled={saving || !newMemberName.trim()}
                    className="px-4 py-2 rounded-md text-sm disabled:opacity-60 w-full sm:w-auto transition"
                    style={{ 
                      backgroundColor: saving || !newMemberName.trim() ? '#cccccc' : '#000000', 
                      color: '#ffffff'
                    }}
                    onMouseEnter={(e) => {
                      if (!saving && newMemberName.trim()) {
                        e.currentTarget.style.backgroundColor = '#333333';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!saving && newMemberName.trim()) {
                        e.currentTarget.style.backgroundColor = '#000000';
                      }
                    }}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </Dialog.Panel>
            </div>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Dialog } from '@headlessui/react';

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
    <div className="p-8 w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">People & Notes</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
          >
            + Add Member
          </button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border px-3 py-1.5 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
          />
          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            className="border px-3 py-1.5 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-300"
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
      <div className="mb-6 text-sm text-gray-600 flex gap-6">
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
        <p className="text-gray-500">Loading members...</p>
      ) : filteredPeople.length === 0 ? (
        <p className="text-gray-500">No members found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPeople.map((person) => (
            <div
              key={person.id}
              className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-medium">
                    {person.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h2 className="font-medium text-lg text-gray-800">
                      {person.name}
                    </h2>
                    <p className="text-gray-500 text-sm">
                      Joined {formatDate(person.created_at)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-sm text-gray-600 mb-4">
                Notes recorded: <b>{person.notes?.[0]?.count || 0}</b>
              </div>

              <button
                onClick={() => router.push(`/people/${person.id}`)}
                className="w-full text-sm px-3 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition"
              >
                View Notes
              </button>
            </div>
          ))}
        </div>
      )}

      <footer className="mt-12 text-xs text-gray-400">
        © 2025 Kibu Prototype
      </footer>

      {/* Add Member Modal */}
      <Dialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white w-full max-w-md rounded-lg shadow-lg p-6">
            <Dialog.Title className="text-lg font-semibold mb-4">
              Add New Member
            </Dialog.Title>

            <input
              type="text"
              placeholder="Enter member name"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm mb-6 focus:outline-none focus:ring-1 focus:ring-gray-300"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={saving || !newMemberName.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
"use client";

import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import { Command } from 'cmdk';
import { X, MapPin, Check, ChevronsUpDown, Loader2, Search } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useDebounce } from 'use-debounce';

const DynamicMap = dynamic(() => import('./DynamicLeafletMap'), { 
  ssr: false,
  loading: () => <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400">Loading Map...</div>
});

interface Technician {
  id: string;
  name: string;
  role: string;
}

const TECHNICIANS: Technician[] = [
  { id: 't1', name: 'Andrew Silva', role: 'Senior Tech' },
  { id: 't2', name: 'Sasha Petrova', role: 'Specialist' },
  { id: 't3', name: 'Mark Lee', role: 'Junior' },
  { id: 't4', name: 'Jane Smith', role: 'Field Rep' },
  { id: 't5', name: 'Alex Chen', role: 'Specialist' },
  { id: 't6', name: 'Maria Garcia', role: 'Senior Tech' },
  { id: 't7', name: 'John Doe', role: 'Junior' },
];

// Helper to generate 15-minute intervals
const generateTimeSlots = () => {
  const slots = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      const period = h >= 12 ? 'PM' : 'AM';
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      const displayMin = m.toString().padStart(2, '0');
      slots.push(`${displayHour.toString().padStart(2, '0')}:${displayMin} ${period}`);
    }
  }
  return slots;
};
const timeSlots = generateTimeSlots();

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export default function CreateDispatchModal({ 
  isOpen, 
  onClose,
  preselectedTech,
  preselectedDate
}: { 
  isOpen: boolean; 
  onClose: () => void;
  preselectedTech?: Technician | null;
  preselectedDate?: Date | null;
}) {
  const [isPacitaHQ, setIsPacitaHQ] = useState(false);
  const [showManualCoords, setShowManualCoords] = useState(false);
  
  // Map & Search State
  const [lat, setLat] = useState(14.3541);
  const [lng, setLng] = useState(121.0504);
  const [radius, setRadius] = useState(200);
  
  const [locationSearch, setLocationSearch] = useState('');
  const [debouncedLocation] = useDebounce(locationSearch, 1000);
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Combobox State
  const [openCombobox, setOpenCombobox] = useState(false);
  const [selectedTechs, setSelectedTechs] = useState<Technician[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Date State
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');

  // Handle Pre-population when modal opens
  useEffect(() => {
    if (isOpen) {
      if (preselectedTech) {
        // Only set if not already in the list
        setSelectedTechs(prev => prev.find(t => t.id === preselectedTech.id) ? prev : [...prev, preselectedTech]);
      } else {
        setSelectedTechs([]); // Clear if opening blank
      }

      if (preselectedDate) {
        // Format to YYYY-MM-DD for the native date input
        const yyyy = preselectedDate.getFullYear();
        const mm = String(preselectedDate.getMonth() + 1).padStart(2, '0');
        const dd = String(preselectedDate.getDate()).padStart(2, '0');
        const formatted = `${yyyy}-${mm}-${dd}`;
        setStartDateStr(formatted);
        setEndDateStr(formatted);
      } else {
        setStartDateStr('');
        setEndDateStr('');
      }
    }
  }, [isOpen, preselectedTech, preselectedDate]);

  // Nominatim Fetching
  useEffect(() => {
    if (!debouncedLocation || debouncedLocation.length < 3) {
      setSearchResults([]);
      return;
    }

    const fetchCoords = async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(debouncedLocation)}`);
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Geocode fetch failed", err);
      } finally {
        setIsSearching(false);
      }
    };
    fetchCoords();
  }, [debouncedLocation]);

  const handleSelectLocation = (loc: NominatimResult) => {
    setLat(parseFloat(loc.lat));
    setLng(parseFloat(loc.lon));
    setLocationSearch(loc.display_name); // Set input to full name
    setSearchResults([]); // close dropdown
  };

  const toggleTech = (tech: Technician) => {
    setSelectedTechs(prev => 
      prev.find(t => t.id === tech.id) 
        ? prev.filter(t => t.id !== tech.id)
        : [...prev, tech]
    );
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 animate-smooth-fade" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl bg-white rounded-2xl shadow-2xl z-50 p-0 overflow-hidden flex flex-col max-h-[90vh] animate-smooth-pop">
          
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border bg-slate-50">
            <div>
              <Dialog.Title className="text-xl font-bold text-slate-900">Create Dispatch</Dialog.Title>
              <Dialog.Description className="text-sm text-slate-500 mt-1">Assign technicians to a new field operation.</Dialog.Description>
            </div>
            <Dialog.Close className="p-2 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
              <X className="w-5 h-5 text-slate-500" />
            </Dialog.Close>
          </div>

          {/* Two-Column Body */}
          <div className="flex flex-col md:flex-row flex-1 overflow-y-auto">
            
            {/* LEFT COLUMN: Where & What */}
            <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-border bg-white flex flex-col gap-6">
              
              {/* HQ Toggle Macro (Prominent) */}
              <button 
                onClick={() => setIsPacitaHQ(!isPacitaHQ)}
                className={`w-full font-bold px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm border ${
                  isPacitaHQ 
                    ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700 shadow-blue-600/20' 
                    : 'bg-white text-slate-600 border-border hover:bg-slate-50'
                }`}
              >
                <MapPin className={`w-5 h-5 ${isPacitaHQ ? 'text-white' : 'text-slate-400'}`} />
                {isPacitaHQ ? 'Pacita HQ Deployment Active' : 'Deploy to Pacita HQ'}
              </button>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">
                    {isPacitaHQ ? 'Office Task / Department' : 'Job Title / Client Name'}
                  </label>
                  <input type="text" placeholder={isPacitaHQ ? "e.g. Inventory Audit" : "e.g. Server Maintenance"} className="w-full border border-border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                
                {!isPacitaHQ && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Location Search</label>
                    <div className="relative mb-3 z-20">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                      </div>
                      <input 
                        type="text" 
                        value={locationSearch}
                        onChange={(e) => setLocationSearch(e.target.value)}
                        placeholder="Type address... (auto-searches)" 
                        className="w-full border border-border rounded-lg pl-10 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" 
                      />
                      {isSearching && (
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                          <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                        </div>
                      )}
                      
                      {/* Search Results Dropdown */}
                      {searchResults.length > 0 && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-border rounded-lg shadow-xl overflow-hidden">
                          {searchResults.map(res => (
                            <div 
                              key={res.place_id} 
                              onClick={() => handleSelectLocation(res)}
                              className="px-4 py-3 text-sm hover:bg-slate-50 cursor-pointer border-b border-border last:border-b-0 truncate flex items-center gap-2"
                            >
                              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              {res.display_name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="h-64 rounded-lg overflow-hidden border border-border z-10 relative">
                      <DynamicMap lat={lat} lng={lng} radius={radius} />
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <select 
                        value={radius} 
                        onChange={(e) => setRadius(Number(e.target.value))}
                        className="text-sm border border-border rounded-md px-3 py-1.5 bg-white font-medium text-slate-700 cursor-pointer outline-none"
                      >
                        <option value={50}>Radius: 50m</option>
                        <option value={200}>Radius: 200m</option>
                        <option value={500}>Radius: 500m</option>
                        <option value={1000}>Radius: 1km</option>
                      </select>

                      <button 
                        onClick={() => setShowManualCoords(!showManualCoords)}
                        className="text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
                      >
                        {showManualCoords ? 'Hide Coordinates' : 'Advanced: Manual Coordinates'}
                      </button>
                    </div>

                    {showManualCoords && (
                      <div className="flex gap-4 mt-3 bg-slate-50 p-3 rounded-lg border border-border">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">Latitude</label>
                          <input type="number" value={lat} onChange={e => setLat(Number(e.target.value))} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-slate-500 mb-1">Longitude</label>
                          <input type="number" value={lng} onChange={e => setLng(Number(e.target.value))} className="w-full border border-border rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: Who & When */}
            <div className="flex-1 p-6 bg-slate-50 flex flex-col z-10">
              <h3 className="font-bold text-slate-900 mb-6">Who & When</h3>
              
              <div className="space-y-5 flex-1">
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Start</label>
                    <div className="flex gap-2">
                      <input 
                        type="date" 
                        value={startDateStr}
                        onChange={(e) => setStartDateStr(e.target.value)}
                        className="w-3/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" 
                      />
                      <select className="w-2/5 border border-border rounded-lg px-2 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer">
                        {timeSlots.map(time => <option key={`start-${time}`} value={time}>{time}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">End</label>
                    <div className="flex gap-2">
                      <input 
                        type="date" 
                        value={endDateStr}
                        onChange={(e) => setEndDateStr(e.target.value)}
                        className="w-3/5 border border-border rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white" 
                      />
                      <select className="w-2/5 border border-border rounded-lg px-2 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer" defaultValue="05:00 PM">
                        {timeSlots.map(time => <option key={`end-${time}`} value={time}>{time}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {!isPacitaHQ && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Job Type</label>
                    <select className="w-full border border-border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white cursor-pointer">
                      <option>Standard On-Site</option>
                      <option>Out of Town / VIP</option>
                      <option>Urgent / Emergency</option>
                    </select>
                  </div>
                )}

                {/* Combobox: Multi-Select Personnel */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Assign Technicians</label>
                  
                  <Popover.Root open={openCombobox} onOpenChange={setOpenCombobox}>
                    <Popover.Trigger asChild>
                      <button className="w-full min-h-[44px] border border-border rounded-lg px-3 py-2 text-sm bg-white flex items-center justify-between hover:bg-slate-50 transition-colors text-left outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                        <div className="flex flex-wrap gap-1.5">
                          {selectedTechs.length > 0 ? (
                            selectedTechs.map(tech => (
                              <span key={tech.id} className="bg-slate-100 border border-border text-slate-800 text-xs font-bold px-2 py-1 rounded-md flex items-center gap-1">
                                {tech.name}
                                <div 
                                  onClick={(e) => { e.stopPropagation(); toggleTech(tech); }}
                                  className="hover:bg-slate-200 rounded-full p-0.5 cursor-pointer"
                                >
                                  <X className="w-3 h-3 text-slate-500" />
                                </div>
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400">Select technicians...</span>
                          )}
                        </div>
                        <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
                      </button>
                    </Popover.Trigger>
                    
                    <Popover.Portal>
                      <Popover.Content className="w-[var(--radix-popover-trigger-width)] bg-white rounded-lg border border-border shadow-lg p-0 z-[60] overflow-hidden" align="start" sideOffset={4}>
                        <Command className="w-full flex flex-col bg-white">
                          <Command.Input 
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                            placeholder="Search by name or role..." 
                            className="w-full px-4 py-3 text-sm border-b border-border outline-none placeholder:text-slate-400" 
                          />
                          <Command.List className="max-h-64 overflow-y-auto p-1">
                            <Command.Empty className="py-6 text-center text-sm text-slate-500">No technician found.</Command.Empty>
                            {TECHNICIANS.map(tech => {
                              const isSelected = selectedTechs.some(t => t.id === tech.id);
                              return (
                                <Command.Item 
                                  key={tech.id} 
                                  value={`${tech.name} ${tech.role}`}
                                  onSelect={() => toggleTech(tech)}
                                  className="flex items-center justify-between px-3 py-2 text-sm rounded-md hover:bg-slate-100 cursor-pointer aria-selected:bg-slate-100 data-[selected=true]:bg-slate-100 outline-none"
                                >
                                  <div>
                                    <p className="font-bold text-slate-900">{tech.name}</p>
                                    <p className="text-xs text-slate-500">{tech.role}</p>
                                  </div>
                                  {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                                </Command.Item>
                              );
                            })}
                          </Command.List>
                        </Command>
                      </Popover.Content>
                    </Popover.Portal>
                  </Popover.Root>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-border">
                <button 
                  onClick={onClose}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all text-lg cursor-pointer"
                >
                  Confirm Dispatch
                </button>
              </div>
            </div>
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

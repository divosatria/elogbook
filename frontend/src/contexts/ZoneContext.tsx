import React, { createContext, useContext, useState, ReactNode } from 'react';

interface HarborZone {
  id: string;
  name: string;
  coordinates: { lat: number; lng: number };
  radius: number;
  type: 'harbor' | 'anchorage' | 'restricted';
  status: 'active' | 'inactive';
  description: string;
  capacity: number;
  facilities: string[];
}

interface ZoneContextType {
  zones: HarborZone[];
  setZones: (zones: HarborZone[]) => void;
  addZone: (zone: HarborZone) => void;
  updateZone: (id: string, zone: HarborZone) => void;
  deleteZone: (id: string) => void;
  getActiveZones: () => HarborZone[];
}

const ZoneContext = createContext<ZoneContextType | undefined>(undefined);

export const useZones = () => {
  const context = useContext(ZoneContext);
  if (!context) {
    throw new Error('useZones must be used within a ZoneProvider');
  }
  return context;
};

export const ZoneProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [zones, setZones] = useState<HarborZone[]>([
    {
      id: '1',
      name: 'Pelabuhan Muara Baru',
      coordinates: { lat: -6.1075, lng: 106.7803 },
      radius: 2.5,
      type: 'harbor',
      status: 'active',
      description: 'Pelabuhan utama untuk kapal nelayan besar',
      capacity: 150,
      facilities: ['Dermaga', 'Cold Storage', 'Fuel Station', 'Repair Shop']
    },
    {
      id: '2', 
      name: 'Zona Berlabuh Teluk Jakarta',
      coordinates: { lat: -6.0889, lng: 106.7378 },
      radius: 1.8,
      type: 'anchorage',
      status: 'active',
      description: 'Area berlabuh sementara untuk kapal menunggu',
      capacity: 80,
      facilities: ['Anchorage', 'Emergency Services']
    },
    {
      id: '3',
      name: 'Zona Terlarang TNI AL',
      coordinates: { lat: -6.1234, lng: 106.8012 },
      radius: 3.0,
      type: 'restricted',
      status: 'active',
      description: 'Area terlarang untuk kapal sipil',
      capacity: 0,
      facilities: ['Military Zone']
    }
  ]);

  const addZone = (zone: HarborZone) => {
    setZones(prev => [...prev, zone]);
  };

  const updateZone = (id: string, updatedZone: HarborZone) => {
    setZones(prev => prev.map(z => z.id === id ? updatedZone : z));
  };

  const deleteZone = (id: string) => {
    setZones(prev => prev.filter(z => z.id !== id));
  };

  const getActiveZones = () => {
    return zones.filter(z => z.status === 'active');
  };

  return (
    <ZoneContext.Provider value={{
      zones,
      setZones,
      addZone,
      updateZone,
      deleteZone,
      getActiveZones
    }}>
      {children}
    </ZoneContext.Provider>
  );
};

export type { HarborZone };
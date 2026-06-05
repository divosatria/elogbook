import React, { useRef } from 'react';
import { X } from 'lucide-react';

interface CatchReport {
  _id: string;
  vesselId: string;
  vesselName: string;
  date: string;
  fishType: string;
  weightKg: number;
  weightMobile?: number | null;
  weightIot?: number | null;
  pricePerKg?: number;
  location?: { lat: number; lng: number };
  method?: string;
  weather?: string;
  notes?: string;
  createdAt?: string;
  tripId?: string;
  tripCaptainName?: string;
  tripCrew?: { nama: string; noTelepon?: string }[];
  tripCrewCount?: number;
  tripDepartureDate?: string;
  tripArrivalDate?: string;
  tripArea?: any;
  tripTargetFish?: string;
  tripDuration?: number;
  vesselRegistration?: string;
  vesselGT?: number;
  vesselLength?: number;
  vesselOwner?: string;
  vesselFishingGear?: string;
  vesselHomePort?: string;
}

interface LogbookKKPModalProps {
  reports: CatchReport[];
  vesselIdFilter?: string;
  onClose: () => void;
}

// ── Styles ────────────────────────────────────────────────────
const cell: React.CSSProperties = {
  border: '1px solid #000',
  padding: '2px 3px',
  verticalAlign: 'middle',
  fontSize: '8px',
  lineHeight: '1.2',
};

const hCell: React.CSSProperties = {
  ...cell,
  background: '#d4d4d4',
  fontWeight: 'bold',
  textAlign: 'center',
  fontSize: '7.5px',
};

const sCell: React.CSSProperties = {
  ...cell,
  background: '#e8e8e8',
  fontWeight: 'bold',
  textAlign: 'center',
  fontSize: '7px',
};

const lbl: React.CSSProperties = {
  fontSize: '7px',
  color: '#444',
  display: 'block',
  marginBottom: '2px',
};

const val: React.CSSProperties = {
  width: '100%',
  borderBottom: '1px solid #999',
  fontSize: '9px',
  fontFamily: 'Arial, sans-serif',
  padding: '1px 0',
  display: 'block',
  minHeight: '14px',
};

// ── Helpers ───────────────────────────────────────────────────
const fmtCoord = (n: number | undefined | null) => {
  if (n == null) return '';
  const abs = Math.abs(n);
  const deg = Math.floor(abs);
  const min = ((abs - deg) * 60).toFixed(1);
  return `${deg}°${min}'`;
};

const areaName = (a: any): string => {
  if (!a) return '';
  if (typeof a === 'string') return a;
  return a.nama || a.name || '';
};

const berat = (r: CatchReport) =>
  r.weightKg || r.weightMobile || r.weightIot || 0;

// ── Component ─────────────────────────────────────────────────
const LogbookKKP: React.FC<LogbookKKPModalProps> = ({ reports, vesselIdFilter, onClose }) => {
  const printRef = useRef<HTMLDivElement>(null);

  const target = vesselIdFilter
    ? reports.filter(r => String(r.vesselId) === String(vesselIdFilter))
    : reports;

  // Group by vessel
  const byVessel: Record<string, CatchReport[]> = {};
  target.forEach(r => {
    const k = `${r.vesselId}||${r.vesselName}`;
    if (!byVessel[k]) byVessel[k] = [];
    byVessel[k].push(r);
  });

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .logbook-overlay { position: static !important; background: none !important; }
          .logbook-box { box-shadow: none !important; max-height: none !important;
                         overflow: visible !important; border-radius: 0 !important;
                         margin-top: 0 !important; }
          body { margin: 0; }
          @page { size: A3 landscape; margin: 8mm; }
        }
      `}</style>

      <div
        className="logbook-overlay"
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
          zIndex: 9999, display: 'flex', alignItems: 'flex-start',
          justifyContent: 'center', padding: '16px', overflowY: 'auto',
        }}
      >
        {/* Toolbar */}
        <div
          className="no-print"
          style={{ position: 'fixed', top: 16, right: 16, zIndex: 10000, display: 'flex', gap: '8px' }}
        >
          <button
            onClick={() => window.print()}
            style={{
              padding: '8px 18px', background: '#117a65', color: '#fff',
              border: 'none', borderRadius: '6px', cursor: 'pointer',
              fontSize: '13px', fontWeight: 'bold',
            }}
          >
            🖨️ Cetak Logbook KKP
          </button>
          <button
            onClick={onClose}
            style={{ padding: '8px', background: '#e74c3c', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Print area */}
        <div
          ref={printRef}
          className="logbook-box"
          style={{
            background: '#fff', padding: '12px',
            fontFamily: 'Arial, sans-serif', fontSize: '10px',
            width: '100%', maxWidth: '1200px', marginTop: '56px',
            boxShadow: '0 4px 32px rgba(0,0,0,0.3)', borderRadius: '8px',
          }}
        >
          {/* ════════════════════════════════════════════════════
              MODE: SEMUA KAPAL — 1 tabel, kolom kapal di kiri
              ════════════════════════════════════════════════════ */}
          {!vesselIdFilter ? (() => {
            const allFishTypes: string[] = Array.from(
              new Set(target.map(r => r.fishType?.trim()).filter(Boolean))
            ).sort();
            const grandTotal = target.reduce((s, r) => s + berat(r), 0);
            const totalByFish: Record<string, number> = {};
            allFishTypes.forEach(ft => {
              totalByFish[ft] = target.filter(r => r.fishType?.trim() === ft).reduce((s, r) => s + berat(r), 0);
            });

            // Build rows with rowspan info
            const rows: Array<{ r: CatchReport; isFirst: boolean; span: number }> = [];
            Object.entries(byVessel).forEach(([, vr]) => {
              vr.forEach((r, i) => rows.push({ r, isFirst: i === 0, span: vr.length }));
            });

            return (
              <>
                {/* Title */}
                <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '12px' }}>LOG BOOK PENANGKAPAN IKAN</div>
                  <div style={{ fontWeight: 'bold', fontSize: '11px' }}>KEMENTERIAN KELAUTAN DAN PERIKANAN REPUBLIK INDONESIA</div>
                  <div style={{ fontSize: '9px', color: '#555', marginTop: '2px' }}>
                    Semua Kapal &mdash; {target.length} catatan &mdash; {Object.keys(byVessel).length} kapal
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000' }}>
                    <thead>
                      <tr>
                        <td rowSpan={3} style={{ ...hCell, background: '#1e3a5f', color: '#fff', width: '8%' }}>KAPAL</td>
                        <td rowSpan={3} style={{ ...hCell, width: '3%' }}>TANGGAL<br />AKTIVITAS<br /><span style={{ fontSize: '6.5px' }}>(20)</span></td>
                        <td colSpan={2} style={hCell}>KODE<br />AKTIVITAS<br /><span style={{ fontSize: '6.5px' }}>(21)</span></td>
                        <td colSpan={6} style={hCell}>POSISI AKTIVITAS <span style={{ fontSize: '6.5px' }}>(24)</span></td>
                        <td colSpan={3} style={hCell}>WAKTU MULAI<br />SETTING</td>
                        <td colSpan={2} style={hCell}>JUMLAH<br />MATA PANCING</td>
                        <td colSpan={2} style={hCell}>JARAK ANTAR<br />MATA PANCING</td>
                        <td colSpan={allFishTypes.length * 2 || 2} style={hCell}>KOMPOSISI HASIL TANGKAPAN <span style={{ fontSize: '6.5px' }}>(28)</span></td>
                        <td colSpan={6} style={hCell}>SPESIES TERKAIT SECARA EKOLOGI (ERS) <span style={{ fontSize: '6.5px' }}>(29)</span></td>
                      </tr>
                      <tr>
                        <td rowSpan={2} style={sCell}>TGL</td>
                        <td rowSpan={2} style={sCell}>BLN</td>
                        <td colSpan={2} style={sCell}>LINTANG U</td>
                        <td colSpan={2} style={sCell}>LINTANG S</td>
                        <td colSpan={2} style={sCell}>BUJUR T</td>
                        <td rowSpan={2} style={sCell}>JAM</td>
                        <td rowSpan={2} style={sCell}>MENIT</td>
                        <td rowSpan={2} style={sCell}>DETIK</td>
                        <td rowSpan={2} style={sCell}>HOOK</td>
                        <td rowSpan={2} style={sCell}>—</td>
                        <td rowSpan={2} style={sCell}>JARAK<br />(m)</td>
                        <td rowSpan={2} style={sCell}>—</td>
                        {allFishTypes.length > 0
                          ? allFishTypes.map(ft => <td key={ft} colSpan={2} style={{ ...sCell, textTransform: 'uppercase' }}>{ft}</td>)
                          : <td colSpan={2} style={sCell}>HASIL TANGKAPAN</td>}
                        <td colSpan={2} style={sCell}>BURUNG LAUT</td>
                        <td colSpan={2} style={sCell}>PENYU</td>
                        <td colSpan={2} style={sCell}>HIU</td>
                      </tr>
                      <tr>
                        <td style={sCell}>DD°MM'</td><td style={sCell}>B</td>
                        <td style={sCell}>DD°MM'</td><td style={sCell}>B</td>
                        <td style={sCell}>DD°MM'</td><td style={sCell}>B</td>
                        {allFishTypes.length > 0
                          ? allFishTypes.map(ft => <React.Fragment key={ft}><td style={sCell}>EKOR</td><td style={sCell}>KG</td></React.Fragment>)
                          : <><td style={sCell}>EKOR</td><td style={sCell}>KG</td></>}
                        <td style={sCell}>KODE/<br />NAMA</td><td style={sCell}>EKOR</td>
                        <td style={sCell}>KODE/<br />NAMA</td><td style={sCell}>EKOR</td>
                        <td style={sCell}>KODE/<br />NAMA</td><td style={sCell}>EKOR</td>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(({ r, isFirst, span }) => {
                        const d = new Date(r.date);
                        const t = new Date(r.createdAt || r.date);
                        const lat = r.location?.lat;
                        const lng = r.location?.lng;
                        const isNorth = lat != null && lat >= 0;
                        const kg = berat(r);
                        const thisFish = r.fishType?.trim();
                        return (
                          <tr key={r._id} style={{ height: '20px' }}>
                            {isFirst && (
                              <td rowSpan={span} style={{ ...cell, fontWeight: 'bold', fontSize: '8px', textAlign: 'center', verticalAlign: 'middle', background: '#f0f4ff', wordBreak: 'break-word' }}>
                                {r.vesselName}
                              </td>
                            )}
                            <td style={{ ...cell, textAlign: 'center' }}>{String(d.getDate()).padStart(2,'0')}/{String(d.getMonth()+1).padStart(2,'0')}</td>
                            <td style={{ ...cell, textAlign: 'center' }}>{String(d.getDate()).padStart(2,'0')}</td>
                            <td style={{ ...cell, textAlign: 'center' }}>{String(d.getMonth()+1).padStart(2,'0')}</td>
                            <td style={{ ...cell, textAlign: 'center' }}>{isNorth ? fmtCoord(lat) : ''}</td>
                            <td style={{ ...cell, textAlign: 'center' }}>{isNorth ? 'U' : ''}</td>
                            <td style={{ ...cell, textAlign: 'center' }}>{!isNorth ? fmtCoord(lat) : ''}</td>
                            <td style={{ ...cell, textAlign: 'center' }}>{!isNorth ? 'S' : ''}</td>
                            <td style={{ ...cell, textAlign: 'center' }}>{lng != null ? fmtCoord(lng) : ''}</td>
                            <td style={{ ...cell, textAlign: 'center' }}>{lng != null ? 'T' : ''}</td>
                            <td style={{ ...cell, textAlign: 'center' }}>{String(t.getHours()).padStart(2,'0')}</td>
                            <td style={{ ...cell, textAlign: 'center' }}>{String(t.getMinutes()).padStart(2,'0')}</td>
                            <td style={{ ...cell, textAlign: 'center' }}>00</td>
                            <td style={cell}></td><td style={cell}></td>
                            <td style={cell}></td><td style={cell}></td>
                            {allFishTypes.length > 0
                              ? allFishTypes.map(ft => (
                                  <React.Fragment key={ft}>
                                    <td style={{ ...cell, textAlign: 'center' }}>{thisFish === ft && kg > 0 ? '1' : ''}</td>
                                    <td style={{ ...cell, textAlign: 'center' }}>{thisFish === ft && kg > 0 ? kg.toLocaleString('id-ID') : ''}</td>
                                  </React.Fragment>
                                ))
                              : <><td style={cell}></td><td style={cell}></td></>}
                            <td style={cell}></td><td style={cell}></td>
                            <td style={cell}></td><td style={cell}></td>
                            <td style={cell}></td><td style={cell}></td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan={17} style={{ ...hCell, textAlign: 'right' }}>TOTAL KESELURUHAN</td>
                        {allFishTypes.length > 0
                          ? allFishTypes.map(ft => (
                              <React.Fragment key={ft}>
                                <td style={{ ...hCell }}>{target.filter(r => r.fishType?.trim() === ft).length}</td>
                                <td style={{ ...hCell }}>{totalByFish[ft].toLocaleString('id-ID')} Kg</td>
                              </React.Fragment>
                            ))
                          : <><td style={hCell}>{target.length}</td><td style={hCell}>{grandTotal.toLocaleString('id-ID')} Kg</td></>}
                        <td colSpan={6} style={hCell}></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Tanda tangan */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '8px' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '4px', width: '35%' }}>
                        <div style={{ fontSize: '7.5px', marginBottom: '2px' }}>NAMA DAN TANDA TANGAN NAKHODA (34):</div>
                        <div style={{ minHeight: '30px' }} />
                      </td>
                      <td style={{ border: '1px solid #000', padding: '4px', width: '35%' }}>
                        <div style={{ fontSize: '7.5px', marginBottom: '2px' }}>NAMA DAN TANDA TANGAN PETUGAS (35):</div>
                        <div style={{ minHeight: '30px' }} />
                      </td>
                      <td style={{ border: '1px solid #000', padding: '4px', width: '30%' }}>
                        <div style={{ fontSize: '7.5px', marginBottom: '2px' }}>TANGGAL PENYERAHAN (36):</div>
                        <div style={{ fontSize: '9px' }}>{new Date().toLocaleDateString('id-ID')}</div>
                        <div style={{ minHeight: '30px' }} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </>
            );
          })() :

          /* ════════════════════════════════════════════════════
             MODE: 1 KAPAL — format asli per kapal
             ════════════════════════════════════════════════════ */
          Object.entries(byVessel).map(([vesselKey, vReports], pageIdx) => {
            const [, vesselName] = vesselKey.split('||');
            const first = vReports[0];

            // ── Dynamic fish types for this vessel ──────────────
            const fishTypes: string[] = Array.from(
              new Set(vReports.map(r => r.fishType?.trim()).filter(Boolean))
            ).sort();

            // Totals per fish type
            const totalByFish: Record<string, number> = {};
            fishTypes.forEach(ft => {
              totalByFish[ft] = vReports
                .filter(r => r.fishType?.trim() === ft)
                .reduce((s, r) => s + berat(r), 0);
            });
            const grandTotal = Object.values(totalByFish).reduce((s, v) => s + v, 0);

            const tglBerangkat = first.tripDepartureDate
              ? new Date(first.tripDepartureDate).toLocaleDateString('id-ID') : '';
            const tglKembali = first.tripArrivalDate
              ? new Date(first.tripArrivalDate).toLocaleDateString('id-ID') : '';
            const crewNames = first.tripCrew?.map(c => c.nama).join(', ') || '';

            // colspan for KOMPOSISI section = fishTypes.length * 2 (EKOR + KG each)
            const fishColSpan = fishTypes.length * 2 || 2;

            return (
              <div
                key={vesselKey}
                style={{ pageBreakAfter: pageIdx < Object.keys(byVessel).length - 1 ? 'always' : 'auto' }}
              >
                {/* Title */}
                <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '12px', letterSpacing: '0.5px' }}>
                    LOG BOOK PENANGKAPAN IKAN
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '11px' }}>
                    KEMENTERIAN KELAUTAN DAN PERIKANAN REPUBLIK INDONESIA
                  </div>
                </div>

                {/* ── Header Info ─────────────────────────────── */}
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', marginBottom: '4px' }}>
                  <tbody>
                    <tr>
                      {[
                        { l: '(1) NAMA KAPAL', v: vesselName },
                        { l: '(2) NAMA PEMILIK/OPERATOR KAPAL', v: first.vesselOwner || '' },
                        { l: '(3) NOMOR PERIZINAN BERUSAHA SUBSEKTOR PENANGKAPAN IKAN', v: first.vesselRegistration || '', w: '22%' },
                        { l: '(4) TRANSMITTER SPKP', v: '' },
                        { l: '(5) TAHUN', v: String(new Date().getFullYear()) },
                        { l: '(6) TRIP KE- DALAM TAHUN INI', v: first.tripId ? `#${first.tripId}` : '' },
                      ].map(({ l, v, w }) => (
                        <td key={l} style={{ border: '1px solid #000', padding: '3px 4px', verticalAlign: 'top', width: w }}>
                          <span style={lbl}>{l}</span>
                          <span style={val}>{v}</span>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      {[
                        { l: '(7) JENIS/KODE ALAT PENANGKAPAN IKAN', v: first.vesselFishingGear || '' },
                        { l: '(8) GROSS TONNASE', v: first.vesselGT ? `${first.vesselGT} GT` : '' },
                        { l: '(9) PANJANG KAPAL/LOA', v: first.vesselLength ? `${first.vesselLength} m` : '' },
                        { l: '(10) DAYA MESIN', v: '' },
                        { l: '(11) RADIO PANGGIL / WPPNRI', v: areaName(first.tripArea) },
                      ].map(({ l, v }) => (
                        <td key={l} style={{ border: '1px solid #000', padding: '3px 4px', verticalAlign: 'top' }}>
                          <span style={lbl}>{l}</span>
                          <span style={val}>{v}</span>
                        </td>
                      ))}
                      <td style={{ border: '1px solid #000', padding: '3px 4px', verticalAlign: 'top' }}>
                        <span style={lbl}>(12) PELABUHAN KEBERANGKATAN</span>
                        <span style={val}>{first.vesselHomePort || ''}</span>
                        <span style={{ ...lbl, marginTop: '4px' }}>(13) TANGGAL KEBERANGKATAN</span>
                        <span style={val}>{tglBerangkat}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '3px 4px', verticalAlign: 'top' }}>
                        <span style={lbl}>(14) TANDA PENGENAL KAPAL PERIKANAN</span>
                        <span style={val}>{first.vesselRegistration || ''}</span>
                      </td>
                      <td colSpan={2} style={{ border: '1px solid #000', padding: '3px 4px', verticalAlign: 'top' }}>
                        <span style={lbl}>(15) AWAK KAPAL PERIKANAN / NAKHODA</span>
                        <span style={val}>
                          {first.tripCaptainName || ''}
                          {crewNames ? ` | ABK: ${crewNames}` : ''}
                        </span>
                      </td>
                      <td style={{ border: '1px solid #000', padding: '3px 4px', verticalAlign: 'top' }}>
                        <span style={lbl}>(16) DAERAH PENANGKAPAN</span>
                        <span style={val}>{areaName(first.tripArea)}</span>
                      </td>
                      <td colSpan={2} style={{ border: '1px solid #000', padding: '3px 4px', verticalAlign: 'top' }}>
                        <span style={lbl}>(17) PELABUHAN PENDARATAN</span>
                        <span style={val}>{first.vesselHomePort || ''}</span>
                        <span style={{ ...lbl, marginTop: '4px' }}>(18) TANGGAL KEDATANGAN</span>
                        <span style={val}>{tglKembali}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* ── Main Data Table ──────────────────────────── */}
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000' }}>
                    <thead>
                      {/* Row 1 — group headers */}
                      <tr>
                        <td rowSpan={3} style={{ ...hCell, width: '3%' }}>
                          TANGGAL<br />AKTIVITAS<br /><span style={{ fontSize: '6.5px' }}>(20)</span>
                        </td>
                        <td colSpan={2} style={hCell}>
                          KODE<br />AKTIVITAS<br /><span style={{ fontSize: '6.5px' }}>(21)</span>
                        </td>
                        <td colSpan={6} style={hCell}>
                          POSISI AKTIVITAS <span style={{ fontSize: '6.5px' }}>(24)</span>
                        </td>
                        <td colSpan={3} style={hCell}>WAKTU MULAI<br />SETTING</td>
                        <td colSpan={2} style={hCell}>JUMLAH<br />MATA PANCING</td>
                        <td colSpan={2} style={hCell}>JARAK ANTAR<br />MATA PANCING</td>
                        {/* Dynamic fish type columns */}
                        <td colSpan={fishColSpan} style={hCell}>
                          KOMPOSISI HASIL TANGKAPAN <span style={{ fontSize: '6.5px' }}>(28)</span>
                        </td>
                        <td colSpan={6} style={hCell}>
                          SPESIES TERKAIT SECARA EKOLOGI (ERS) <span style={{ fontSize: '6.5px' }}>(29)</span>
                        </td>
                      </tr>

                      {/* Row 2 — sub-group headers */}
                      <tr>
                        <td rowSpan={2} style={sCell}>TGL</td>
                        <td rowSpan={2} style={sCell}>BLN</td>
                        <td colSpan={2} style={sCell}>LINTANG U</td>
                        <td colSpan={2} style={sCell}>LINTANG S</td>
                        <td colSpan={2} style={sCell}>BUJUR T</td>
                        <td rowSpan={2} style={sCell}>JAM</td>
                        <td rowSpan={2} style={sCell}>MENIT</td>
                        <td rowSpan={2} style={sCell}>DETIK</td>
                        <td rowSpan={2} style={sCell}>HOOK</td>
                        <td rowSpan={2} style={sCell}>—</td>
                        <td rowSpan={2} style={sCell}>JARAK<br />(m)</td>
                        <td rowSpan={2} style={sCell}>—</td>
                        {/* One column-pair per fish type */}
                        {fishTypes.length > 0
                          ? fishTypes.map(ft => (
                              <td key={ft} colSpan={2} style={{ ...sCell, textTransform: 'uppercase' }}>
                                {ft}
                              </td>
                            ))
                          : <td colSpan={2} style={sCell}>HASIL TANGKAPAN</td>
                        }
                        <td colSpan={2} style={sCell}>BURUNG LAUT</td>
                        <td colSpan={2} style={sCell}>PENYU</td>
                        <td colSpan={2} style={sCell}>HIU</td>
                      </tr>

                      {/* Row 3 — leaf headers */}
                      <tr>
                        <td style={sCell}>DD°MM'</td><td style={sCell}>B</td>
                        <td style={sCell}>DD°MM'</td><td style={sCell}>B</td>
                        <td style={sCell}>DD°MM'</td><td style={sCell}>B</td>
                        {fishTypes.length > 0
                          ? fishTypes.map(ft => (
                              <React.Fragment key={ft}>
                                <td style={sCell}>EKOR</td>
                                <td style={sCell}>KG</td>
                              </React.Fragment>
                            ))
                          : <><td style={sCell}>EKOR</td><td style={sCell}>KG</td></>
                        }
                        <td style={sCell}>KODE/<br />NAMA</td><td style={sCell}>EKOR</td>
                        <td style={sCell}>KODE/<br />NAMA</td><td style={sCell}>EKOR</td>
                        <td style={sCell}>KODE/<br />NAMA</td><td style={sCell}>EKOR</td>
                      </tr>
                    </thead>

                    <tbody>
                      {vReports.map((r, i) => {
                        const d = new Date(r.date);
                        const t = new Date(r.createdAt || r.date);
                        const lat = r.location?.lat;
                        const lng = r.location?.lng;
                        const isNorth = lat != null && lat >= 0;
                        const kg = berat(r);
                        const thisFish = r.fishType?.trim();

                        return (
                          <tr key={r._id} style={{ height: '20px' }}>
                            {/* Tanggal aktivitas */}
                            <td style={{ ...cell, textAlign: 'center' }}>
                              {String(d.getDate()).padStart(2, '0')}/{String(d.getMonth() + 1).padStart(2, '0')}
                            </td>
                            {/* Kode aktivitas: TGL + BLN */}
                            <td style={{ ...cell, textAlign: 'center' }}>{String(d.getDate()).padStart(2, '0')}</td>
                            <td style={{ ...cell, textAlign: 'center' }}>{String(d.getMonth() + 1).padStart(2, '0')}</td>
                            {/* Posisi: Lintang U */}
                            <td style={{ ...cell, textAlign: 'center' }}>{isNorth ? fmtCoord(lat) : ''}</td>
                            <td style={{ ...cell, textAlign: 'center' }}>{isNorth ? 'U' : ''}</td>
                            {/* Lintang S */}
                            <td style={{ ...cell, textAlign: 'center' }}>{!isNorth ? fmtCoord(lat) : ''}</td>
                            <td style={{ ...cell, textAlign: 'center' }}>{!isNorth ? 'S' : ''}</td>
                            {/* Bujur T */}
                            <td style={{ ...cell, textAlign: 'center' }}>{lng != null ? fmtCoord(lng) : ''}</td>
                            <td style={{ ...cell, textAlign: 'center' }}>{lng != null ? 'T' : ''}</td>
                            {/* Waktu */}
                            <td style={{ ...cell, textAlign: 'center' }}>{String(t.getHours()).padStart(2, '0')}</td>
                            <td style={{ ...cell, textAlign: 'center' }}>{String(t.getMinutes()).padStart(2, '0')}</td>
                            <td style={{ ...cell, textAlign: 'center' }}>00</td>
                            {/* Jumlah hook + separator */}
                            <td style={cell}></td>
                            <td style={cell}></td>
                            {/* Jarak + separator */}
                            <td style={cell}></td>
                            <td style={cell}></td>
                            {/* Dynamic fish columns — only fill matching fish type */}
                            {fishTypes.length > 0
                              ? fishTypes.map(ft => (
                                  <React.Fragment key={ft}>
                                    <td style={{ ...cell, textAlign: 'center' }}>
                                      {thisFish === ft && kg > 0 ? '1' : ''}
                                    </td>
                                    <td style={{ ...cell, textAlign: 'center' }}>
                                      {thisFish === ft && kg > 0 ? kg.toLocaleString('id-ID') : ''}
                                    </td>
                                  </React.Fragment>
                                ))
                              : <><td style={cell}></td><td style={cell}></td></>
                            }
                            {/* ERS: Burung, Penyu, Hiu */}
                            <td style={cell}></td><td style={cell}></td>
                            <td style={cell}></td><td style={cell}></td>
                            <td style={cell}></td><td style={cell}></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ── Bottom Section ───────────────────────────── */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '4px' }}>
                  <tbody>
                    <tr>
                      {/* Kode aktivitas legend */}
                      <td style={{ width: '55%', verticalAlign: 'top', paddingRight: '6px' }}>
                        <div style={{ border: '1px solid #000', padding: '5px', fontSize: '7.5px' }}>
                          <strong>KODE AKTIVITAS (22):</strong><br />
                          1. SETTING PANCING (HANYA UNTUK ALAT PENANGKAPAN IKAN JENIS RAWAI TUNA)<br />
                          2. PENANGKAPAN PANCING (HANYA UNTUK ALAT PENANGKAPAN IKAN JENIS PANCING ULUR TUNA)<br />
                          3. SINGGAH (TIDAK ADA AKTIVITAS PENANGKAPAN)<br />
                          4. PEMINDAHAN HASIL TANGKAPAN KE KAPAL LAIN (DILAJUT)<br />
                          5. DI PELABUHAN (TULISKAN NAMA PELABUHAN)
                        </div>
                      </td>
                      {/* Totals */}
                      <td style={{ width: '45%', verticalAlign: 'top' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px' }}>
                          <tbody>
                            <tr>
                              <td style={{ border: '1px solid #000', padding: '3px' }}>
                                <strong>JUMLAH TANGKAPAN PER HALAMAN (31):</strong><br />
                                {fishTypes.map(ft => (
                                  <span key={ft} style={{ marginRight: '8px' }}>
                                    {ft}: <strong>{totalByFish[ft].toLocaleString('id-ID')} Kg</strong>
                                  </span>
                                ))}
                              </td>
                            </tr>
                            <tr>
                              <td style={{ border: '1px solid #000', padding: '3px' }}>
                                <strong>JUMLAH TOTAL TANGKAPAN (32):</strong><br />
                                <span style={{ fontWeight: 'bold', fontSize: '9px' }}>
                                  {grandTotal.toLocaleString('id-ID')} Kg ({vReports.length} catatan)
                                </span>
                              </td>
                            </tr>
                            <tr>
                              <td style={{ border: '1px solid #000', padding: '3px' }}>
                                <strong>CATATAN NAKHODA (33):</strong> Juga diisi untuk deskripsi aktivitas di pelabuhan (Kode Aktivitas: 5)<br />
                                <div style={{ minHeight: '30px', borderTop: '1px solid #ccc', marginTop: '4px', fontSize: '8px' }}>
                                  {vReports.filter(r => r.notes).map(r => r.notes).join('; ')}
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* ── Signature Row ────────────────────────────── */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '6px' }}>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '4px', width: '35%' }}>
                        <div style={{ fontSize: '7.5px', marginBottom: '2px' }}>NAMA DAN TANDA TANGAN NAKHODA (34):</div>
                        <div style={{ fontSize: '9px', fontWeight: 'bold', borderBottom: '1px solid #999', paddingBottom: '2px' }}>
                          {first.tripCaptainName || ''}
                        </div>
                        <div style={{ minHeight: '30px' }} />
                      </td>
                      <td style={{ border: '1px solid #000', padding: '4px', width: '35%' }}>
                        <div style={{ fontSize: '7.5px', marginBottom: '2px' }}>NAMA DAN TANDA TANGAN PETUGAS (35):</div>
                        <div style={{ borderBottom: '1px solid #999', minHeight: '14px' }} />
                        <div style={{ minHeight: '30px' }} />
                      </td>
                      <td style={{ border: '1px solid #000', padding: '4px', width: '30%' }}>
                        <div style={{ fontSize: '7.5px', marginBottom: '2px' }}>TANGGAL PENYERAHAN (36):</div>
                        <div style={{ fontSize: '9px', borderBottom: '1px solid #999', paddingBottom: '2px' }}>
                          {new Date().toLocaleDateString('id-ID')}
                        </div>
                        <div style={{ minHeight: '30px' }} />
                      </td>
                    </tr>
                  </tbody>
                </table>

                {pageIdx < Object.keys(byVessel).length - 1 && (
                  <div style={{ borderTop: '2px dashed #ccc', margin: '16px 0' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default LogbookKKP;

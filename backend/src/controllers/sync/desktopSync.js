const { sequelize } = require('../../config/database');

// GET /api/edge/sync/data - Fetch data for desktop
exports.getSyncData = async (req, res) => {
  try {
    const lastSyncDate = req.query.lastSync || '1970-01-01T00:00:00.000Z';
    
    // Convert to Date object safely
    const parsedDate = new Date(lastSyncDate);
    const safeDateStr = isNaN(parsedDate.getTime()) ? '1970-01-01 00:00:00' : parsedDate.toISOString().slice(0, 19).replace('T', ' ');

    // Fetch updated edge_data (LoRa packets)
    const [loraPackets] = await sequelize.query(`
      SELECT * 
      FROM edge_data 
      WHERE updated_at >= :lastSync
    `, {
      replacements: { lastSync: safeDateStr }
    });

    res.status(200).json({
      success: true,
      message: 'Sync data retrieved successfully',
      data: {
        lora_packets: loraPackets || [],
        lastSync: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Sync GET Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve sync data',
      error: error.message
    });
  }
};

// POST /api/edge/sync/data - Push data from desktop
exports.postSyncData = async (req, res) => {
  // Use transaction to ensure data integrity
  const t = await sequelize.transaction();
  
  try {
    const syncData = req.body;
    
    // Tambahkan log payload masuk agar kita tahu desktop kirim apa
    console.log('[SYNC POST] Payload masuk dari desktop:', JSON.stringify(syncData, null, 2));
    
    if (!syncData) {
      await t.rollback();
      return res.status(400).json({
        success: false,
        message: 'No data provided for synchronization'
      });
    }

    let processedTrips = 0;
    let processedHasilTangkap = 0;
    let processedLoradata = 0;

    // Process Trips data from edge
    if (syncData.trips && Array.isArray(syncData.trips)) {
      for (const trip of syncData.trips) {
        if (!trip.uuid) continue; // Skip invalid records without UUID

        // Use exact received_at or created_at from edge if available
        const edgeCreatedAt = trip.received_at || trip.created_at || new Date().toISOString();
        const edgeUpdatedAt = trip.updated_at || new Date().toISOString();

        // Upsert trip using UPSERT / INSERT ON DUPLICATE KEY UPDATE in Sequelize Raw Query
        await sequelize.query(`
          INSERT INTO trips (
            id, uuid, user_id, vessel_id, status, start_time, end_time,
            created_at, updated_at
          ) VALUES (
            :id, :uuid, :user_id, :vessel_id, :status, :start_time, :end_time,
            :created_at, :updated_at
          ) ON DUPLICATE KEY UPDATE 
            user_id = VALUES(user_id),
            vessel_id = VALUES(vessel_id),
            status = VALUES(status),
            start_time = VALUES(start_time),
            end_time = VALUES(end_time),
            updated_at = VALUES(updated_at)
        `, {
          replacements: {
            id: trip.id || null,
            uuid: trip.uuid,
            user_id: trip.user_id || null,
            vessel_id: trip.vessel_id || null,
            status: trip.status || 'draft',
            start_time: trip.start_time || null,
            end_time: trip.end_time || null,
            created_at: edgeCreatedAt,
            updated_at: edgeUpdatedAt
          },
          transaction: t
        });
        processedTrips++;
      }
    }

    // Process Hasil Tangkap data from edge
    if (syncData.hasil_tangkap && Array.isArray(syncData.hasil_tangkap)) {
      for (const ht of syncData.hasil_tangkap) {
        if (!ht.uuid) continue;

        const edgeCreatedAt = ht.received_at || ht.created_at || new Date().toISOString();
        const edgeUpdatedAt = ht.updated_at || new Date().toISOString();

        await sequelize.query(`
          INSERT INTO hasil_tangkap (
            id, uuid, trip_id, species_id, weight, count,
            created_at, updated_at
          ) VALUES (
            :id, :uuid, :trip_id, :species_id, :weight, :count,
            :created_at, :updated_at
          ) ON DUPLICATE KEY UPDATE 
            trip_id = VALUES(trip_id),
            species_id = VALUES(species_id),
            weight = VALUES(weight),
            count = VALUES(count),
            updated_at = VALUES(updated_at)
        `, {
          replacements: {
            id: ht.id || null,
            uuid: ht.uuid,
            trip_id: ht.trip_id || null,
            species_id: ht.species_id || null,
            weight: ht.weight || 0,
            count: ht.count || 0,
            created_at: edgeCreatedAt,
            updated_at: edgeUpdatedAt
          },
          transaction: t
        });
        processedHasilTangkap++;
      }
    }

    // Process LoRa packet data from edge (new format)
    if (syncData.packets && Array.isArray(syncData.packets)) {
      for (const packet of syncData.packets) {
        if (!packet.uuid) continue;

        // Insert directly into edge_data so it appears in Raw Data (IoT Edge)
        const parsedData = JSON.stringify({
          jenis_ikan: packet.jenis_ikan || null,
          id_ikan: packet.id_ikan || null,
          trail: packet.trail || null,
          lat: packet.lat || null,
          lng: packet.lng || null,
          suhu_air: packet.suhu_air || null,
          suhu_kelembaban: packet.suhu_kelembaban || null,
          berat: packet.berat || null,
          interval: packet.interval || null
        });

        await sequelize.query(`
          INSERT INTO edge_data (
            uuid, source, raw_data, parsed_data, packet_type, received_at,
            trail, lat, lng, suhu_air, suhu_kelembaban, berat,
            \`interval\`, created_at, updated_at
          ) VALUES (
            :uuid, 'lora_desktop_sync', :raw_data, :parsed_data, :packet_type, :received_at,
            :trail, :lat, :lng, :suhu_air, :suhu_kelembaban, :berat,
            :interval, :received_at, :received_at
          ) ON DUPLICATE KEY UPDATE 
            raw_data = VALUES(raw_data),
            parsed_data = VALUES(parsed_data),
            packet_type = VALUES(packet_type),
            received_at = VALUES(received_at),
            updated_at = VALUES(updated_at)
        `, {
          replacements: {
            uuid: packet.uuid,
            raw_data: packet.raw_data || null,
            parsed_data: parsedData,
            packet_type: packet.packet_type || 'rx',
            received_at: packet.received_at || new Date().toISOString(),
            trail: packet.trail || null,
            lat: packet.lat || null,
            lng: packet.lng || null,
            suhu_air: packet.suhu_air || null,
            suhu_kelembaban: packet.suhu_kelembaban || null,
            berat: packet.berat || null,
            interval: packet.interval || null
          },
          transaction: t
        }).catch(err => {
          // Log error but continue to next packet
          console.error('[SYNC POST] DB Insert Error for packet', packet.uuid, err.message);
        });
        processedLoradata++;
      }
    }

    // Commit transaction
    await t.commit();
    
    res.status(200).json({
      success: true,
      message: 'Data synchronized successfully from edge',
      processed: {
        trips: processedTrips,
        hasil_tangkap: processedHasilTangkap,
        lora_packets: processedLoradata
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    // Rollback if any error occurs
    await t.rollback();
    console.error('Sync POST Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to synchronize data',
      error: error.message
    });
  }
};

// GET /api/edge/sync/status - Check sync status
exports.getSyncStatus = async (req, res) => {
  try {
    await sequelize.authenticate();
    
    res.status(200).json({
      success: true,
      message: 'Sync endpoint is online and database is connected',
      status: 'online',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sync Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Sync endpoint is online but database is unreachable',
      status: 'database_error',
      error: error.message
    });
  }
};
const { EdgeData } = require('../../models');

const edgeController = {
  /**
   * Menerima payload batch dari LoRa Edge dan menyimpannya ke database.
   */
  async syncData(req, res) {
    try {
      const { source, timestamp, count, packets } = req.body;

      if (!packets || !Array.isArray(packets)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid payload: packets array is missing'
        });
      }

      console.log(`📡 [Edge Sync] Menerima ${packets.length} data dari ${source || 'unknown'} (Timestamp Edge: ${timestamp})`);

      if (packets.length === 0) {
        return res.status(200).json({
          success: true,
          message: 'No packets to sync'
        });
      }

      // Memetakan data dari payload ke format model EdgeData
      const bulkData = packets.map(packet => ({
        uuid: packet.uuid,
        source: source || 'lora_edge',
        raw_data: packet.raw_data,
        parsed_data: packet.parsed_data,
        rssi: packet.rssi,
        snr: packet.snr,
        packet_type: packet.packet_type,
        lat: packet.lat,
        lng: packet.lng,
        suhu_air: packet.suhu_air,
        suhu_kelembaban: packet.suhu_kelembaban,
        berat: packet.berat,
        interval: packet.interval,
        trail: packet.trail,
        received_at: packet.received_at
      }));

      // Menyimpan data secara bulk. updateOnDuplicate memastikan bahwa jika uuid yang sama dikirim ulang,
      // datanya hanya akan diperbarui, bukan menyebabkan duplicate key error.
      await EdgeData.bulkCreate(bulkData, {
        updateOnDuplicate: [
          'source', 'raw_data', 'parsed_data', 'rssi', 'snr', 
          'packet_type', 'lat', 'lng', 'suhu_air', 'suhu_kelembaban', 
          'berat', 'interval', 'trail', 'received_at', 'updatedAt'
        ]
      });

      console.log(`✅ [Edge Sync] Berhasil menyimpan ${bulkData.length} paket.`);

      // Trigger WebSockets agar frontend langsung me-refresh tabel secara real-time
      const io = req.app.get('io');
      if (io) {
        io.emit('edge_data_updated', {
          source: source || 'lora_edge',
          count: bulkData.length,
          timestamp: new Date().toISOString()
        });
      }

      // Harus mengembalikan 200/201 agar Edge App memberi tanda "synced = 1"
      return res.status(201).json({
        success: true,
        message: 'Data successfully synced',
        synced_count: bulkData.length
      });

    } catch (error) {
      console.error('❌ [Edge Sync] Error saving edge data:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while syncing edge data',
        error: error.message
      });
    }
  },

  /**
   * Mengambil data raw IoT dari database untuk ditampilkan di Frontend
   */
  async getRawData(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;
      const offset = (page - 1) * limit;

      const { count, rows } = await EdgeData.findAndCountAll({
        order: [['received_at', 'DESC']],
        limit,
        offset
      });

      return res.status(200).json({
        success: true,
        data: rows,
        pagination: {
          total: count,
          page,
          totalPages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('❌ [Edge Sync] Error fetching raw edge data:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error while fetching edge data',
        error: error.message
      });
    }
  }
};

module.exports = edgeController;

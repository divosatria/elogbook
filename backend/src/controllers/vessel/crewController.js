const { User, Kapal, VesselCrew, Trip } = require('../../models');
const { Op } = require('sequelize');

// Get available nahkoda (captains) - those not currently assigned to active trips
exports.getAvailableNahkoda = async (req, res) => {
  try {
    // Get all nahkoda users
    const allNahkoda = await User.findAll({
      where: {
        role: 'nahkoda',
        isActive: true
      },
      attributes: ['id', 'username', 'nama', 'noTelepon', 'email']
    });

    // Get nahkoda currently on active trips
    const activeTrips = await Trip.findAll({
      where: {
        status: {
          [Op.in]: ['disetujui', 'sedang_melaut']
        }
      },
      attributes: ['nahkodaId']
    });

    const busyNahkodaIds = activeTrips.map(trip => trip.nahkodaId).filter(id => id);

    // Filter available nahkoda
    const availableNahkoda = allNahkoda.filter(nahkoda => 
      !busyNahkodaIds.includes(nahkoda.id)
    );

    res.json({
      success: true,
      data: {
        total: allNahkoda.length,
        available: availableNahkoda.length,
        busy: busyNahkodaIds.length,
        nahkoda: availableNahkoda
      }
    });
  } catch (error) {
    console.error('Get available nahkoda error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat data nahkoda tersedia: ' + error.message
    });
  }
};

// Get available ABK - those not currently assigned to active trips
exports.getAvailableABK = async (req, res) => {
  try {
    // Get all ABK users
    const allABK = await User.findAll({
      where: {
        role: 'abk',
        isActive: true
      },
      attributes: ['id', 'username', 'nama', 'noTelepon', 'email']
    });

    // Get ABK currently on active trips through vessel crew assignments
    const activeTrips = await Trip.findAll({
      where: {
        status: {
          [Op.in]: ['disetujui', 'sedang_melaut']
        }
      },
      attributes: ['kapalId']
    });

    const activeVesselIds = activeTrips.map(trip => trip.kapalId).filter(id => id);

    const busyABK = await VesselCrew.findAll({
      where: {
        kapalId: { [Op.in]: activeVesselIds },
        role: 'abk',
        isActive: true
      },
      attributes: ['userId']
    });

    const busyABKIds = busyABK.map(crew => crew.userId);

    // Filter available ABK
    const availableABK = allABK.filter(abk => 
      !busyABKIds.includes(abk.id)
    );

    res.json({
      success: true,
      data: {
        total: allABK.length,
        available: availableABK.length,
        busy: busyABKIds.length,
        abk: availableABK
      }
    });
  } catch (error) {
    console.error('Get available ABK error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat data ABK tersedia: ' + error.message
    });
  }
};

// Get vessel with its assigned crew
exports.getVesselWithCrew = async (req, res) => {
  try {
    const { id } = req.params;

    const vessel = await Kapal.findByPk(id, {
      include: [
        {
          model: User,
          as: 'nahkoda',
          attributes: ['id', 'username', 'nama', 'noTelepon', 'email'],
          required: false
        }
      ]
    });

    if (!vessel) {
      return res.status(404).json({
        success: false,
        message: 'Kapal tidak ditemukan'
      });
    }

    // Get ABK crew
    const abkCrew = await VesselCrew.findAll({
      where: {
        kapalId: id,
        role: 'abk',
        isActive: true
      },
      include: [{
        model: User,
        as: 'User',
        attributes: ['id', 'username', 'nama', 'noTelepon', 'email']
      }]
    });

    const vesselData = vessel.toJSON();
    vesselData.abk = abkCrew.map(crew => crew.User).filter(user => user);

    res.json({
      success: true,
      data: vesselData
    });
  } catch (error) {
    console.error('Get vessel with crew error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat data kapal dan crew: ' + error.message
    });
  }
};

// Get crew suggestions for trip assignment
exports.getCrewSuggestions = async (req, res) => {
  try {
    const { kapalId } = req.query;

    let suggestions = {
      nahkoda: null,
      abk: [],
      availableNahkoda: [],
      availableABK: []
    };

    // If vessel is specified, get its assigned crew first
    if (kapalId) {
      const vessel = await Kapal.findByPk(kapalId, {
        include: [{
          model: User,
          as: 'nahkoda',
          attributes: ['id', 'username', 'nama', 'noTelepon', 'email'],
          required: false
        }]
      });

      if (vessel) {
        suggestions.nahkoda = vessel.nahkoda;

        // Get assigned ABK
        const abkCrew = await VesselCrew.findAll({
          where: {
            kapalId: kapalId,
            role: 'abk',
            isActive: true
          },
          include: [{
            model: User,
            as: 'User',
            attributes: ['id', 'username', 'nama', 'noTelepon', 'email']
          }]
        });

        suggestions.abk = abkCrew.map(crew => crew.User).filter(user => user);
      }
    }

    // Get all available nahkoda
    const allNahkoda = await User.findAll({
      where: {
        role: 'nahkoda',
        isActive: true
      },
      attributes: ['id', 'username', 'nama', 'noTelepon', 'email']
    });

    const activeTrips = await Trip.findAll({
      where: {
        status: {
          [Op.in]: ['disetujui', 'sedang_melaut']
        }
      },
      attributes: ['nahkodaId']
    });

    const busyNahkodaIds = activeTrips.map(trip => trip.nahkodaId).filter(id => id);
    suggestions.availableNahkoda = allNahkoda.filter(nahkoda => 
      !busyNahkodaIds.includes(nahkoda.id)
    );

    // Get all available ABK
    const allABK = await User.findAll({
      where: {
        role: 'abk',
        isActive: true
      },
      attributes: ['id', 'username', 'nama', 'noTelepon', 'email']
    });

    const activeVesselIds = activeTrips.map(trip => trip.kapalId).filter(id => id);
    const busyABK = await VesselCrew.findAll({
      where: {
        kapalId: { [Op.in]: activeVesselIds },
        role: 'abk',
        isActive: true
      },
      attributes: ['userId']
    });

    const busyABKIds = busyABK.map(crew => crew.userId);
    suggestions.availableABK = allABK.filter(abk => 
      !busyABKIds.includes(abk.id)
    );

    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    console.error('Get crew suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal memuat saran crew: ' + error.message
    });
  }
};
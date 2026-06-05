const { POI, HarborZone } = require('../../models');

exports.getAllPOIs = async (req, res) => {
  try {
    const pois = await POI.findAll({
      include: [{
        model: HarborZone,
        as: 'harborZone',
        attributes: ['id', 'name', 'type']
      }],
      where: { is_active: true }
    });

    res.json({
      success: true,
      data: pois
    });
  } catch (error) {
    console.error('Error fetching POIs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch POIs'
    });
  }
};

exports.createPOI = async (req, res) => {
  try {
    const { name, type, coordinates, description, contact, operating_hours, services, harbor_zone_id } = req.body;
    
    if (!name || !type || !coordinates) {
      return res.status(400).json({
        success: false,
        message: 'Name, type, and coordinates are required'
      });
    }

    const poi = await POI.create({
      name,
      type,
      coordinates,
      description,
      contact,
      operating_hours,
      services,
      harbor_zone_id
    });

    res.status(201).json({
      success: true,
      data: poi
    });
  } catch (error) {
    console.error('Error creating POI:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create POI'
    });
  }
};

exports.updatePOI = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const poi = await POI.findByPk(id);
    if (!poi) {
      return res.status(404).json({
        success: false,
        message: 'POI not found'
      });
    }

    await poi.update(updateData);

    res.json({
      success: true,
      data: poi
    });
  } catch (error) {
    console.error('Error updating POI:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update POI'
    });
  }
};

exports.deletePOI = async (req, res) => {
  try {
    const { id } = req.params;

    const poi = await POI.findByPk(id);
    if (!poi) {
      return res.status(404).json({
        success: false,
        message: 'POI not found'
      });
    }

    await poi.update({ is_active: false });

    res.json({
      success: true,
      message: 'POI deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting POI:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete POI'
    });
  }
};
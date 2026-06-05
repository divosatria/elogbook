const CatchPolygon = require('../../models/trip/CatchPolygon');

// Helper transform
const transform = (polygon) => {
  const data = polygon.toJSON ? polygon.toJSON() : polygon;
  return {
    ...data,
    zoneType: data.zone_type,
    fishTypes: data.fish_types || [],
    maxVessels: data.max_vessels,
    seasonalRestrictions: data.seasonal_restrictions,
    isActive: data.is_active,
    minGt: data.min_gt !== undefined ? data.min_gt : null,
    maxGt: data.max_gt !== undefined ? data.max_gt : null,
  };
};

exports.getAllCatchPolygons = async (req, res) => {
  try {
    const polygons = await CatchPolygon.findAll({ order: [['created_at', 'DESC']] });
    res.json({ success: true, data: polygons.map(transform) });
  } catch (error) {
    console.error('❌ Error getting catch polygons:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCatchPolygon = async (req, res) => {
  try {
    const { name, description, coordinates, fishTypes, zoneType, maxVessels, color, regulations, seasonalRestrictions, minGt, maxGt } = req.body;
    
    const polygon = await CatchPolygon.create({
      name,
      description,
      coordinates,
      zone_type: zoneType,
      fish_types: fishTypes || [],
      max_vessels: maxVessels,
      color: color || '#3b82f6',
      regulations,
      seasonal_restrictions: seasonalRestrictions,
      min_gt: minGt !== undefined && minGt !== '' ? parseFloat(minGt) : null,
      max_gt: maxGt !== undefined && maxGt !== '' ? parseFloat(maxGt) : null,
      is_active: true,
      created_by: req.user?.id
    });
    
    res.status(201).json({ success: true, data: transform(polygon) });
  } catch (error) {
    console.error('❌ Error creating catch polygon:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCatchPolygon = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, coordinates, fishTypes, zoneType, maxVessels, color, isActive, regulations, seasonalRestrictions, minGt, maxGt } = req.body;
    
    const [updated] = await CatchPolygon.update({
      name,
      description,
      coordinates,
      zone_type: zoneType,
      fish_types: fishTypes,
      max_vessels: maxVessels,
      color,
      regulations,
      seasonal_restrictions: seasonalRestrictions,
      is_active: isActive,
      min_gt: minGt !== undefined && minGt !== '' ? parseFloat(minGt) : null,
      max_gt: maxGt !== undefined && maxGt !== '' ? parseFloat(maxGt) : null,
    }, { where: { id } });
    
    if (!updated) return res.status(404).json({ success: false, message: 'Polygon not found' });
    
    const polygon = await CatchPolygon.findByPk(id);
    res.json({ success: true, data: transform(polygon) });
  } catch (error) {
    console.error('❌ Error updating catch polygon:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCatchPolygon = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await CatchPolygon.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.togglePolygonStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const polygon = await CatchPolygon.findByPk(id);
    if (!polygon) return res.status(404).json({ success: false, message: 'Polygon not found' });
    polygon.is_active = !polygon.is_active;
    await polygon.save();
    res.json({ success: true, data: transform(polygon) });
  } catch (error) {
    console.error('❌ Error toggling polygon status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Point-in-polygon (ray casting) — koordinat {lat,lng}
function isPointInPolygon(lat, lng, coords) {
  let inside = false;
  for (let i = 0, j = coords.length - 1; i < coords.length; j = i++) {
    const xi = coords[i].lng, yi = coords[i].lat;
    const xj = coords[j].lng, yj = coords[j].lat;
    if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

exports.checkPointInPolygon = async (req, res) => {
  try {
    const { latitude, longitude, vesselGt } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude are required' });
    }
    
    const polygons = await CatchPolygon.findAll({ where: { is_active: true } });
    const zones = [];
    const violations = [];
    let isInRestrictedZone = false;
    let isInFishingZone = false;
    
    for (const polygon of polygons) {
      if (!polygon.coordinates || !Array.isArray(polygon.coordinates) || polygon.coordinates.length < 3) continue;

      if (isPointInPolygon(parseFloat(latitude), parseFloat(longitude), polygon.coordinates)) {
        zones.push({
          id: polygon.id,
          name: polygon.name,
          zoneType: polygon.zone_type,
          fishTypes: polygon.fish_types || [],
          regulations: polygon.regulations,
          minGt: polygon.min_gt,
          maxGt: polygon.max_gt,
        });
        
        if (polygon.zone_type === 'restricted') isInRestrictedZone = true;
        if (polygon.zone_type === 'fishing') isInFishingZone = true;

        // Validasi GT kapal vs aturan zona
        if (vesselGt !== undefined && vesselGt !== null) {
          const gt = parseFloat(vesselGt);
          const minGt = polygon.min_gt !== null ? parseFloat(polygon.min_gt) : null;
          const maxGt = polygon.max_gt !== null ? parseFloat(polygon.max_gt) : null;

          if (polygon.zone_type === 'restricted') {
            violations.push({
              zoneId: polygon.id,
              zoneName: polygon.name,
              type: 'restricted_zone',
              severity: 'critical',
              message: `Kapal masuk zona terlarang: ${polygon.name}`
            });
          } else if (minGt !== null && gt < minGt) {
            violations.push({
              zoneId: polygon.id,
              zoneName: polygon.name,
              type: 'gt_too_small',
              severity: 'warning',
              message: `GT kapal (${gt} GT) terlalu kecil untuk zona ${polygon.name} (min: ${minGt} GT)`
            });
          } else if (maxGt !== null && gt > maxGt) {
            violations.push({
              zoneId: polygon.id,
              zoneName: polygon.name,
              type: 'gt_too_large',
              severity: 'warning',
              message: `GT kapal (${gt} GT) melebihi batas zona ${polygon.name} (max: ${maxGt} GT)`
            });
          }
        }
      }
    }
    
    res.json({ 
      success: true, 
      data: { zones, violations, hasViolation: violations.length > 0, isInRestrictedZone, isInFishingZone, totalZones: zones.length }
    });
  } catch (error) {
    console.error('❌ Error checking point in polygon:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

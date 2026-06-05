const User = require('./User');
const Nahkoda = require('./Nahkoda');
const Nelayan = require('./Nelayan');
const Kapal = require('./Kapal');
const Trip = require('./Trip');
const TripTask = require('./TripTask');
const OperationalTask = require('./OperationalTask');
const VesselCrew = require('./VesselCrew');
const Emergency = require('./Emergency');
const HasilTangkap = require('./HasilTangkap');
const CatchPolygon = require('./CatchPolygon');
const Weather = require('./Weather');
const FishPrice = require('./FishPrice');
const EmailSetting = require('./EmailSetting');
const HarborZone = require('./HarborZone');
const POI = require('./POI');
const Perangkat = require('./Perangkat');
const FishingPoint = require('./FishingPoint');
const EdgeData = require('./EdgeData');

// Define associations
// Removed pemilik association since it's now a string field
// Nahkoda.hasMany(Kapal, { foreignKey: 'pemilik', as: 'kapals' });
// Kapal.belongsTo(Nahkoda, { foreignKey: 'pemilik', as: 'pemilik' });

// Kapal - User associations
User.hasMany(Kapal, { foreignKey: 'nahkodaId', as: 'vesselAsNahkoda' });
Kapal.belongsTo(User, { foreignKey: 'nahkodaId', as: 'nahkoda' });

// VesselCrew associations
Kapal.hasMany(VesselCrew, { foreignKey: 'kapalId', as: 'crewMembers' });
VesselCrew.belongsTo(Kapal, { foreignKey: 'kapalId', as: 'vessel' });

User.hasMany(VesselCrew, { foreignKey: 'userId', as: 'vesselAssignments' });
VesselCrew.belongsTo(User, { foreignKey: 'userId', as: 'User' });

Kapal.hasMany(Trip, { foreignKey: 'kapalId', as: 'trips' });
Trip.belongsTo(Kapal, { foreignKey: 'kapalId', as: 'kapal' });

// TripTask associations - temporarily disabled
// Trip.hasMany(TripTask, { foreignKey: 'tripId', as: 'tasks' });
// TripTask.belongsTo(Trip, { foreignKey: 'tripId', as: 'trip' });

// User.hasMany(TripTask, { foreignKey: 'completedBy', as: 'completedTasks' });
// TripTask.belongsTo(User, { foreignKey: 'completedBy', as: 'completedByUser' });

// CatchPolygon - TripTask associations - temporarily disabled
// CatchPolygon.hasMany(TripTask, { foreignKey: 'catchPolygonId', as: 'tasks' });
// TripTask.belongsTo(CatchPolygon, { foreignKey: 'catchPolygonId', as: 'catchPolygon' });

// Vessel - TripTask associations - temporarily disabled
// Kapal.hasMany(TripTask, { foreignKey: 'vesselId', as: 'tasks' });
// TripTask.belongsTo(Kapal, { foreignKey: 'vesselId', as: 'vessel' });

// Nahkoda - TripTask associations - temporarily disabled
// User.hasMany(TripTask, { foreignKey: 'nahkodaId', as: 'assignedTasks' });
// TripTask.belongsTo(User, { foreignKey: 'nahkodaId', as: 'assignedNahkoda' });

User.hasMany(Trip, { foreignKey: 'nahkodaId', as: 'tripsAsNahkoda' });
Trip.belongsTo(User, { foreignKey: 'nahkodaId', as: 'nahkoda' });

// Emergency associations
Kapal.hasMany(Emergency, { foreignKey: 'vesselId', as: 'emergencies' });
Emergency.belongsTo(Kapal, { foreignKey: 'vesselId', as: 'vessel' });

// HasilTangkap associations
Kapal.hasMany(HasilTangkap, { foreignKey: 'kapalId', as: 'hasilTangkap' });
HasilTangkap.belongsTo(Kapal, { foreignKey: 'kapalId', as: 'kapal' });

Trip.hasMany(HasilTangkap, { foreignKey: 'tripId', as: 'hasilTangkap' });
HasilTangkap.belongsTo(Trip, { foreignKey: 'tripId', as: 'trip' });

// CatchPolygon associations
User.hasMany(CatchPolygon, { foreignKey: 'createdBy', as: 'createdPolygons' });
CatchPolygon.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// OperationalTask associations
CatchPolygon.hasMany(OperationalTask, { foreignKey: 'catchPolygonId', as: 'operationalTasks' });
OperationalTask.belongsTo(CatchPolygon, { foreignKey: 'catchPolygonId', as: 'catchPolygon' });

Kapal.hasMany(OperationalTask, { foreignKey: 'vesselId', as: 'operationalTasks' });
OperationalTask.belongsTo(Kapal, { foreignKey: 'vesselId', as: 'vessel' });

User.hasMany(OperationalTask, { foreignKey: 'nahkodaId', as: 'assignedOperationalTasks' });
OperationalTask.belongsTo(User, { foreignKey: 'nahkodaId', as: 'nahkoda' });

// OperationalTask - Trip association
OperationalTask.hasOne(Trip, { foreignKey: 'taskId', as: 'generatedTrip' });
Trip.belongsTo(OperationalTask, { foreignKey: 'taskId', as: 'originalTask' });

// HarborZone associations
HarborZone.hasMany(Trip, { foreignKey: 'harborZoneId', as: 'trips' });
Trip.belongsTo(HarborZone, { foreignKey: 'harborZoneId', as: 'harborZone' });

// Kapal - HarborZone (pelabuhan asal)
HarborZone.hasMany(Kapal, { foreignKey: 'pelabuhanAsalId', as: 'kapals' });
Kapal.belongsTo(HarborZone, { foreignKey: 'pelabuhanAsalId', as: 'pelabuhanAsalZone' });

// HarborZone.hasMany(TripTask, { foreignKey: 'harborZoneId', as: 'tripTasks' });
// TripTask.belongsTo(HarborZone, { foreignKey: 'harborZoneId', as: 'harborZone' });

HarborZone.hasMany(OperationalTask, { foreignKey: 'harborZoneId', as: 'operationalTasks' });
OperationalTask.belongsTo(HarborZone, { foreignKey: 'harborZoneId', as: 'harborZone' });

// POI associations
HarborZone.hasMany(POI, { foreignKey: 'harbor_zone_id', as: 'pois' });
POI.belongsTo(HarborZone, { foreignKey: 'harbor_zone_id', as: 'harborZone' });

// Perangkat associations
Kapal.hasMany(Perangkat, { foreignKey: 'kapalId', as: 'perangkats' });
Perangkat.belongsTo(Kapal, { foreignKey: 'kapalId', as: 'kapal' });

// GPS Device association (separate from general equipment)
Kapal.belongsTo(Perangkat, { foreignKey: 'gpsDeviceId', as: 'gpsDevice' });

User.hasMany(Perangkat, { foreignKey: 'createdBy', as: 'createdPerangkats' });
Perangkat.belongsTo(User, { foreignKey: 'createdBy', as: 'creator' });

// FishingPoint associations
Trip.hasMany(FishingPoint, { foreignKey: 'tripId', as: 'fishingPoints' });
FishingPoint.belongsTo(Trip, { foreignKey: 'tripId', as: 'trip' });
Kapal.hasMany(FishingPoint, { foreignKey: 'kapalId', as: 'fishingPoints' });
FishingPoint.belongsTo(Kapal, { foreignKey: 'kapalId', as: 'kapal' });
FishingPoint.belongsTo(HasilTangkap, { foreignKey: 'hasilTangkapId', as: 'hasilTangkap' });
HasilTangkap.hasOne(FishingPoint, { foreignKey: 'hasilTangkapId', as: 'fishingPoint' });

module.exports = {
  User,
  Nahkoda,
  Nelayan,
  Kapal,
  Trip,
  // TripTask, // Temporarily disabled
  OperationalTask,
  VesselCrew,
  Emergency,
  HasilTangkap,
  CatchPolygon,
  Weather,
  FishPrice,
  EmailSetting,
  HarborZone,
  POI,
  Perangkat,
  FishingPoint,
  EdgeData
};
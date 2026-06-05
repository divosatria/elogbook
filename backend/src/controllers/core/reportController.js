const hasilTangkapController = require('../trip/hasilTangkapController');

exports.getCatchReports = hasilTangkapController.getAll;
exports.createCatchReport = hasilTangkapController.create;
const hasilTangkapController = require('./hasilTangkapController');

exports.getCatchReports = hasilTangkapController.getAll;
exports.createCatchReport = hasilTangkapController.create;
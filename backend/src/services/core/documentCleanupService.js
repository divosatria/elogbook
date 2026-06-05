const cron = require('node-cron');
const { User } = require('../../models');
const uploadHelper = require('../../utils/uploadHelper');

class DocumentCleanupService {
  constructor() {
    this.isRunning = false;
  }

  // Start the cleanup scheduler
  start() {
    if (this.isRunning) return;
    
    // Run every hour to check for expired rejected documents
    cron.schedule('0 * * * *', async () => {
      await this.cleanupRejectedDocuments();
    });
    
    this.isRunning = true;
    console.log('📋 Document cleanup service started');
  }

  async cleanupRejectedDocuments() {
    try {
      console.log('🧹 Starting rejected document cleanup...');
      
      const users = await User.findAll({
        where: {
          role: ['nahkoda', 'abk']
        }
      });

      let deletedCount = 0;
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      for (const user of users) {
        if (!user.dokumen || !Array.isArray(user.dokumen)) continue;

        const originalCount = user.dokumen.length;
        const updatedDokumen = [];

        for (const doc of user.dokumen) {
          // Check if document is rejected and older than 1 day
          if (doc.status === 'rejected' && doc.verifiedAt) {
            const rejectedDate = new Date(doc.verifiedAt);
            
            if (rejectedDate < oneDayAgo) {
              // Delete file from disk
              if (doc.filePath) {
                try {
                  await uploadHelper.deleteFile(doc.filePath);
                  console.log(`🗑️ Deleted file: ${doc.fileName}`);
                } catch (fileError) {
                  console.warn(`⚠️ Failed to delete file ${doc.fileName}:`, fileError.message);
                }
              }
              deletedCount++;
              console.log(`🗑️ Removed rejected document: ${doc.jenisDokumen} for user ${user.nama}`);
            } else {
              updatedDokumen.push(doc);
            }
          } else {
            updatedDokumen.push(doc);
          }
        }

        // Update user if documents were removed
        if (updatedDokumen.length !== originalCount) {
          user.dokumen = updatedDokumen;
          user.changed('dokumen', true);
          await user.save();
        }
      }

      if (deletedCount > 0) {
        console.log(`✅ Cleanup completed: ${deletedCount} rejected documents removed`);
      } else {
        console.log('✅ Cleanup completed: No expired rejected documents found');
      }

    } catch (error) {
      console.error('❌ Error during document cleanup:', error);
    }
  }

  // Manual cleanup trigger
  async triggerCleanup() {
    await this.cleanupRejectedDocuments();
  }
}

module.exports = new DocumentCleanupService();
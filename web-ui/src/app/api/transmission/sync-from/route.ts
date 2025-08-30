import { transmissionSyncService } from '@/lib/services/TransmissionSyncService';

export async function POST() {
  try {
    await transmissionSyncService.initialize();
    const result = await transmissionSyncService.syncFromTransmission();
    
    return Response.json(result, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to sync from transmission:', error);
    
    return Response.json(
      {
        success: false,
        conflicts: [],
        syncedFields: [],
        errors: [error instanceof Error ? error.message : 'Sync from transmission failed'],
      },
      { status: 500 }
    );
  }
}
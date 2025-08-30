import { transmissionSyncService } from '@/lib/services/TransmissionSyncService';

export async function POST() {
  try {
    await transmissionSyncService.initialize();
    const result = await transmissionSyncService.syncToTransmission();
    
    return Response.json(result, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to sync to transmission:', error);
    
    return Response.json(
      {
        success: false,
        conflicts: [],
        syncedFields: [],
        errors: [error instanceof Error ? error.message : 'Sync to transmission failed'],
      },
      { status: 500 }
    );
  }
}
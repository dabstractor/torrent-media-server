import { transmissionSyncService } from '@/lib/services/TransmissionSyncService';

export async function POST() {
  try {
    await transmissionSyncService.initialize();
    const result = await transmissionSyncService.syncBidirectional();
    
    return Response.json(result, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to perform bidirectional sync:', error);
    
    return Response.json(
      {
        success: false,
        conflicts: [],
        syncedFields: [],
        errors: [error instanceof Error ? error.message : 'Bidirectional sync failed'],
      },
      { status: 500 }
    );
  }
}
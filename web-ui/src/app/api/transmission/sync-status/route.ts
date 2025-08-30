import { transmissionSyncService } from '@/lib/services/TransmissionSyncService';

export async function GET() {
  try {
    await transmissionSyncService.initialize();
    const status = await transmissionSyncService.getSyncStatus();
    
    return Response.json(status, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to get transmission sync status:', error);
    
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to get sync status' },
      { status: 500 }
    );
  }
}
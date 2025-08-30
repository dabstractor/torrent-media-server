import { transmissionSyncService } from '@/lib/services/TransmissionSyncService';

export async function POST() {
  try {
    await transmissionSyncService.initialize();
    await transmissionSyncService.startAutoSync();
    
    return Response.json({ success: true }, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to start auto-sync:', error);
    
    return Response.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to start auto-sync' 
      },
      { status: 500 }
    );
  }
}
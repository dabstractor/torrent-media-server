import { transmissionSyncService } from '@/lib/services/TransmissionSyncService';

export async function POST() {
  try {
    await transmissionSyncService.initialize();
    const result = await transmissionSyncService.testConnection();
    
    return Response.json(result, {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Failed to test transmission connection:', error);
    
    return Response.json(
      { 
        connected: false,
        error: error instanceof Error ? error.message : 'Connection test failed' 
      },
      { status: 500 }
    );
  }
}
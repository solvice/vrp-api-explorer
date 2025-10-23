'use client';

import { useEffect, useMemo } from 'react';
import { ChatKit, useChatKit } from '@openai/chatkit-react';
import { Vrp } from 'solvice-vrp-solver/resources/vrp/vrp';
import { toast } from 'sonner';
import { API_URL, generateSessionId } from '@/lib/api-config';
import { searchEntities, formatEntityPreview } from '@/lib/vrp-entities';
import { generateStartScreen } from '@/lib/chatkit-prompts';

interface VrpChatKitProps {
  vrpData?: Vrp.VrpSyncSolveParams;
  solution?: Vrp.OnRouteResponse | null;
  onError?: (error: Error) => void;
}

export function VrpChatKit({ vrpData, solution, onError }: VrpChatKitProps) {
  // Get or generate session ID
  const sessionId = generateSessionId();

  // Store VRP context whenever data changes
  useEffect(() => {
    if (vrpData) {
      fetch(`${API_URL}/vrp/context`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-ID': sessionId,
        },
        body: JSON.stringify({
          sessionId,
          request: vrpData,
          solution: solution || null,
        }),
      })
        .then(() => {
          console.log('✅ VRP context stored in Python backend');
        })
        .catch((error) => {
          console.error('Failed to store VRP context:', error);
        });
    }
  }, [vrpData, solution, sessionId]);

  // Generate dynamic start screen based on VRP context
  const startScreenConfig = useMemo(
    () => generateStartScreen(vrpData, solution),
    [vrpData, solution]
  );

  // Configure ChatKit to use Python backend
  // Using domainKey approach for custom backend (no session API needed)
  const { control } = useChatKit({
    api: {
      url: `${API_URL}/chatkit`,
      // Use domain key for custom backend authentication
      // For local development, use placeholder. For production, register domain at:
      // https://platform.openai.com/settings/organization/security/domain-allowlist
      domainKey: 'domain_pk_localhost_dev',
      fetch(url, options) {
        // Add session ID to all requests for VRP context injection
        return fetch(url, {
          ...options,
          headers: {
            ...options?.headers,
            'X-Session-ID': sessionId,
          },
        });
      },
    },
    startScreen: startScreenConfig,
    entities: {
      onTagSearch: async (query: string) => {
        // Search for jobs and resources matching the query
        return searchEntities(query, vrpData);
      },
      onRequestPreview: async (entity) => {
        // Return preview widget based on entity type
        return formatEntityPreview(entity);
      },
      onClick: (entity) => {
        // Optional: Could highlight entity on map or in UI
        console.log('Entity clicked:', entity);
      },
    },
  });

  return (
    <div className="h-full w-full flex flex-col">
      <ChatKit
        control={control}
        className="flex-1"
      />
    </div>
  );
}

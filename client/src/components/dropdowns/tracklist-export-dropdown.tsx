import { useState } from 'react';
import { toast } from 'sonner';

import { SpinnerButton } from '../buttons/spinner-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { exportTracklistFile, exportTracklistJson } from '@/api/exports';
import { getApiErrorMessage } from '@/api/client';

// --- Types ---
export type TracklistExportFormat = 'plaintext' | 'json' | 'csv';

interface TracklistExportDropdownProps {
  /** The unique identifier for the room (ObjectId) */
  roomId: string;
  /** The user-friendly name of the room for the file name */
  roomName: string;
  /** Optional: Change the button's appearance */
  variant?: 'default' | 'secondary' | 'outline';
}

// --- Download Logic Utility ---
const downloadFile = (data: Blob | string, filename: string, type: string) => {
  const blob = data instanceof Blob ? data : new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const getSafeFilename = (name: string) =>
  name.trim().replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '') || 'room';

export function TracklistExportDropdown({
  roomId,
  roomName,
  variant = 'default',
}: TracklistExportDropdownProps) {
  const [exportingFormat, setExportingFormat] =
    useState<TracklistExportFormat | null>(null);
  const isLoading = exportingFormat !== null;

  const handleExport = async (format: TracklistExportFormat) => {
    if (!roomId) return toast.error("Oops! Something went wrong.", { description: 'We messed up on our end, please try again.' });

    try {
      setExportingFormat(format);
      const filenameBase = `${getSafeFilename(roomName)}_tracklist`;

      if (format === 'json') {
        const result = await exportTracklistJson(roomId);

        downloadFile(
          JSON.stringify(result, null, 2),
          `${filenameBase}.json`,
          'application/json'
        );
      } else if (format === 'csv') {
        const data = await exportTracklistFile(roomId, 'csv');
        downloadFile(data, `${filenameBase}.csv`, 'text/csv');
      } else if (format === 'plaintext') {
        const data = await exportTracklistFile(roomId, 'txt');
        downloadFile(data, `${filenameBase}.txt`, 'text/plain');
      }

      toast.success("Success!", { description: `You have successfully exported the tracklist as ${format}.` })
    } catch (err) {
      console.error(`There was an error attempting to export:`, err);
      toast.error('Oops! Export failed.', {
        description: getApiErrorMessage(
          err,
          'Something went wrong, and you are unable to download this tracklist. Please try again soon.'
        ),
      });
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SpinnerButton
          variant={variant}
          size="sm"
          isLoading={isLoading}
          loadingText={
            exportingFormat ? `Exporting ${exportingFormat}...` : 'Exporting...'
          }
        >
          Export Tracklist
        </SpinnerButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          disabled={isLoading}
          onSelect={() => void handleExport('plaintext')}
        >
          Plaintext
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isLoading}
          onSelect={() => void handleExport('json')}
        >
          JSON
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={isLoading}
          onSelect={() => void handleExport('csv')}
        >
          CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

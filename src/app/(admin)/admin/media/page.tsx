'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadDropzone } from '@/components/media/UploadDropzone';
import { MediaGrid } from '@/components/media/MediaGrid';

export default function MediaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Media library</h1>
        <p className="text-sm text-muted-foreground">
          Upload, browse and delete media used by your content.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <UploadDropzone />
        </CardContent>
      </Card>
      <MediaGrid pageSize={48} />
    </div>
  );
}

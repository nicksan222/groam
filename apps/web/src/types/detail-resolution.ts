export type ResolutionMedia = {
  contentType: string;
  id: string;
  name: string;
  size: number;
  url?: string | null;
};
export type ResolutionRow = {
  key: string;
  label: string;
  mine: string;
  shared: string;
  mineMedia: ResolutionMedia[];
  sharedMedia: ResolutionMedia[];
  media: boolean;
};

import { useParams as useRouterParams } from '@tanstack/react-router';
import { useContext } from 'react';
import { ReferenceContext } from '@/features/workspace/hooks/reference-context';

export const useParams: typeof useRouterParams = (options) => {
  const params = useRouterParams(options);
  const resolved = useContext(ReferenceContext);
  return resolved ? { ...params, ...resolved } : params;
};

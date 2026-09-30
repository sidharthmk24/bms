"use client";

import React, { createContext, useContext } from 'react';

export interface ExhibitionContextType {
  exhibitionId: string;
  data: any;
  exhibition: any;
  metrics: any;
  loading: boolean;
  error: string;
  fetchWorkspaceData: () => Promise<void>;
  isLead: boolean;
}

export const ExhibitionContext = createContext<ExhibitionContextType | null>(null);

export const useExhibitionWorkspace = () => {
  const context = useContext(ExhibitionContext);
  if (!context) {
    throw new Error('useExhibitionWorkspace must be used within ExhibitionLayout');
  }
  return context;
};

import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { WorldSignalMap } from '../../features/detective/WorldSignalMap';

export const ExplorerPage: React.FC = () => {
  const context = useOutletContext<{ tourStep: number | null }>() || {
    tourStep: null,
  };

  return (
    <div className="flex-1 w-full flex flex-col">
      <WorldSignalMap highlightTour={context.tourStep === 4} />
    </div>
  );
};

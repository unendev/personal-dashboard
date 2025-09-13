'use client'

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import CreateLogFormWithCards from './CreateLogFormWithCards';

interface CreateLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogSaved?: () => void;
  onAddToTimer?: (taskName: string, categoryPath: string, initialTime?: number, instanceTagNames?: string) => void;
}

const CreateLogModal: React.FC<CreateLogModalProps> = ({ 
  isOpen, 
  onClose, 
  onLogSaved, 
  onAddToTimer 
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            📝 创建事物
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          <CreateLogFormWithCards 
            onLogSaved={onLogSaved}
            onAddToTimer={onAddToTimer}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateLogModal;

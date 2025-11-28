"use client";

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FloatingToolbar, ToolbarAction } from './FloatingToolbar';
import { useTTS } from '../../hooks/use-tts';
import { AiExplanationModal } from './AiExplanationModal';
import { NoteCardCreator } from './NoteCardCreator';

interface TextInteractionWrapperProps {
  children: React.ReactNode;
}

interface ToolbarState {
  show: boolean;
  top: number;
  left: number;
  selectedText: string;
}

const LONG_PRESS_THRESHOLD = 300; // milliseconds

export function TextInteractionWrapper({ children }: TextInteractionWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { speak, cancel } = useTTS({ lang: 'ru-RU' });
  const [toolbar, setToolbar] = useState<ToolbarState>({
    show: false,
    top: 0,
    left: 0,
    selectedText: '',
  });
  const [showAiExplanationModal, setShowAiExplanationModal] = useState(false);
  const [showNoteCardCreator, setShowNoteCardCreator] = useState(false);
  const [noteCardCreatorMode, setNoteCardCreatorMode] = useState<'note' | 'card'>('note');

  const handleMouseDown = useCallback(() => {
    // Start a timer. If MouseUp doesn't clear it before threshold, it's a long press.
    timerRef.current = setTimeout(() => {
      // This timeout is just to mark a long press intent.
      // The actual speech trigger is in handleMouseUp.
      console.log("Timer fired: potential long press detected.");
    }, LONG_PRESS_THRESHOLD);
  }, []);

  const handleMouseUp = useCallback(() => {
    // Clear the timer immediately, regardless of whether it fired or not
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    const selection = window.getSelection();
    const selectedText = selection ? selection.toString().trim() : '';
    
    if (selection && selectedText.length > 0 && containerRef.current?.contains(selection.anchorNode)) {
      // If there's a selection (either quick drag or long press drag), speak it
      console.log("Selected text:", selectedText, "Speaking automatically...");
      speak(selectedText);

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();

      // Always show toolbar for other actions (explain, note, card)
      setToolbar({
        show: true,
        top: rect.top - containerRect.top,
        left: rect.left - containerRect.left + rect.width / 2,
        selectedText,
      });
    } else {
      // Hide toolbar if selection is cleared or outside the container
      if (toolbar.show) {
        setToolbar((prev) => ({ ...prev, show: false }));
        cancel();
      }
    }
  }, [toolbar.show, cancel, speak]);

  const handleToolbarAction = (action: ToolbarAction) => {
    console.log(`Action: ${action}, Text: "${toolbar.selectedText}"`);
    // 'speak' action is now handled automatically on selection, so it's removed from toolbar
    if (action === 'explain') {
      setShowAiExplanationModal(true);
    } else if (action === 'add-note') {
      setNoteCardCreatorMode('note');
      setShowNoteCardCreator(true);
    } else if (action === 'add-card') {
      setNoteCardCreatorMode('card');
      setShowNoteCardCreator(true);
    }
    setToolbar((prev) => ({ ...prev, show: false }));
  };
  
  const handleClick = useCallback((event: React.MouseEvent) => {
    // If a selection is active, or if a drag initiated (even if no text was selected), do nothing
    const selection = window.getSelection();
    if(selection && selection.toString().length > 0) return; // Selection already handled by handleMouseUp
    if(timerRef.current) { // If mousedown timer was active, it means a potential drag/long press was intended, so ignore click
        clearTimeout(timerRef.current);
        timerRef.current = null;
        return;
    }
    
    cancel(); // Cancel any ongoing speech before attempting to speak a new word

    const target = event.target as HTMLElement;
    
    // Ensure we are clicking on text within our container
    if (containerRef.current && containerRef.current.contains(target)) {
      const range = document.caretRangeFromPoint(event.clientX, event.clientY);
      if (range && range.startContainer.nodeType === Node.TEXT_NODE) {
        // Get the text content and find the word boundaries
        const textContent = range.startContainer.textContent || '';
        const offset = range.startOffset;
        
        // Find word boundaries
        let start = offset;
        let end = offset;
        
        // Move start backwards until we hit a word boundary
        while (start > 0 && !/\s/.test(textContent[start - 1])) {
          start--;
        }
        
        // Move end forwards until we hit a word boundary
        while (end < textContent.length && !/\s/.test(textContent[end])) {
          end++;
        }
        
        let clickedWord = textContent.substring(start, end).trim();
        clickedWord = clickedWord.replace(/^[.,;:!?"'‘’“”«»-]+|[.,;:!?"'‘’“”«»-]+$/g, '');

        if (clickedWord.length > 0) {
            console.log("Clicked word for TTS:", clickedWord);
            speak(clickedWord);
        } else {
            console.log("No specific word found at click point.");
        }
      } else {
        console.log("Clicked outside a text node or caretRangeFromPoint returned null.");
      }
    }
  }, [speak, cancel]);

  // Hide toolbar and modals when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Also clear timer if clicked outside
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        !target.closest('.FloatingToolbar') &&
        !target.closest('.AiExplanationModal') &&
        !target.closest('.NoteCardCreator')
      ) {
        if (toolbar.show) {
          setToolbar(prev => ({ ...prev, show: false }));
          cancel();
        }
        if (showAiExplanationModal) {
          setShowAiExplanationModal(false);
        }
        if (showNoteCardCreator) {
          setShowNoteCardCreator(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [toolbar.show, showAiExplanationModal, showNoteCardCreator, cancel]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown} // Add mousedown listener
      onMouseUp={handleMouseUp}   // Existing mouseup listener
      onClick={handleClick}
      style={{ cursor: 'text', position: 'relative' }}
      className="FloatingToolbarContainer"
    >
      <FloatingToolbar
        show={toolbar.show}
        top={toolbar.top}
        left={toolbar.left}
        onAction={handleToolbarAction}
      />
      {children}
      <AiExplanationModal
        show={showAiExplanationModal}
        onClose={() => setShowAiExplanationModal(false)}
        selectedText={toolbar.selectedText}
      />
      <NoteCardCreator
        show={showNoteCardCreator}
        onClose={() => setShowNoteCardCreator(false)}
        selectedText={toolbar.selectedText}
        mode={noteCardCreatorMode}
      />
    </div>
  );
}





import { useState, useCallback } from 'react';

export function useSlashCommands() {
  const [activeCommand, setActiveCommand] = useState<string | null>(null);
  const [commandSearch, setCommandSearch] = useState('');

  // 检测斜杠命令
  const detectSlashCommand = useCallback((text: string, cursorPos: number) => {
    const beforeCursor = text.slice(0, cursorPos);
    const lastSlash = beforeCursor.lastIndexOf('/');
    
    if (lastSlash === -1) return null;
    
    // 检查 / 前是否是空格或行首
    if (lastSlash > 0 && !/\s/.test(beforeCursor[lastSlash - 1])) {
      return null;
    }
    
    const command = beforeCursor.slice(lastSlash + 1);
    return command;
  }, []);

  const handleCommandChange = useCallback((text: string, cursorPos: number) => {
    const command = detectSlashCommand(text, cursorPos);
    if (command !== null) {
      setCommandSearch(command);
      setActiveCommand('search');
    } else if (activeCommand === 'search') {
      setActiveCommand(null);
      setCommandSearch('');
    }
  }, [detectSlashCommand, activeCommand]);

  const selectCommand = useCallback((command: string) => {
    setActiveCommand(command === 'music' ? 'music' : null);
    setCommandSearch('');
  }, []);

  const closeCommand = useCallback(() => {
    setActiveCommand(null);
    setCommandSearch('');
  }, []);

  return {
    activeCommand,
    commandSearch,
    handleCommandChange,
    selectCommand,
    closeCommand,
    setActiveCommand // 有时需要手动强制设置（如 music）
  };
}

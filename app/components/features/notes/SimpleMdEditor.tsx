'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/app/components/ui/button'
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2,
  Link as LinkIcon,
  Save
} from 'lucide-react'

interface SimpleMdEditorProps {
  className?: string
}

export default function SimpleMdEditor({ className = '' }: SimpleMdEditorProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: '开始写笔记...',
      }),
    ],
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[400px] px-4 py-3',
      },
    },
    onUpdate: ({ editor }) => {
      // 自动保存（debounce 1秒）
      if (saveTimeout) {
        clearTimeout(saveTimeout)
      }
      const timeout = setTimeout(() => {
        saveContent(editor.getHTML())
      }, 1000)
      setSaveTimeout(timeout)
    },
  })

  // 加载内容
  useEffect(() => {
    loadContent()
  }, [])

  const loadContent = async () => {
    try {
      const response = await fetch('/api/notes')
      if (response.ok) {
        const note = await response.json()
        if (editor && note.content) {
          editor.commands.setContent(note.content)
        }
      }
    } catch (error) {
      console.error('加载笔记失败:', error)
    }
  }

  const saveContent = useCallback(async (content: string) => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (response.ok) {
        setLastSaved(new Date())
      }
    } catch (error) {
      console.error('保存笔记失败:', error)
    } finally {
      setIsSaving(false)
    }
  }, [])

  const manualSave = () => {
    if (editor) {
      saveContent(editor.getHTML())
    }
  }

  if (!editor) {
    return null
  }

  return (
    <div className={className}>
      {/* 状态栏 */}
      <div className="flex items-center justify-end gap-2 text-sm text-gray-400 mb-3">
        {lastSaved && (
          <span>已保存 {lastSaved.toLocaleTimeString()}</span>
        )}
        {isSaving && <span className="text-blue-400">保存中...</span>}
      </div>

      {/* 工具栏 */}
      <div className="border-b border-gray-700 pb-3 mb-3">
        <div className="flex flex-wrap gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'bg-gray-700' : ''}
          >
            <Bold className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'bg-gray-700' : ''}
          >
            <Italic className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-700 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor.isActive('heading', { level: 1 }) ? 'bg-gray-700' : ''}
          >
            <Heading1 className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive('heading', { level: 2 }) ? 'bg-gray-700' : ''}
          >
            <Heading2 className="h-4 w-4" />
          </Button>

          <div className="w-px h-6 bg-gray-700 mx-1" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'bg-gray-700' : ''}
          >
            <List className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'bg-gray-700' : ''}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <div className="ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={manualSave}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </div>

      {/* 编辑器 */}
      <div>
        <EditorContent editor={editor} />
        
        {/* 编辑器样式 */}
        <style jsx global>{`
          .ProseMirror {
            color: #e5e7eb;
          }
          
          .ProseMirror h1 {
            font-size: 2em;
            font-weight: bold;
            margin: 1em 0 0.5em;
            color: #f3f4f6;
          }
          
          .ProseMirror h2 {
            font-size: 1.5em;
            font-weight: bold;
            margin: 0.83em 0 0.5em;
            color: #f3f4f6;
          }
          
          .ProseMirror h3 {
            font-size: 1.17em;
            font-weight: bold;
            margin: 0.67em 0 0.5em;
            color: #f3f4f6;
          }
          
          .ProseMirror ul {
            list-style: disc;
            padding-left: 1.5em;
            margin: 1em 0;
          }
          
          .ProseMirror ol {
            list-style: decimal;
            padding-left: 1.5em;
            margin: 1em 0;
          }
          
          .ProseMirror li {
            margin: 0.5em 0;
          }
          
          .ProseMirror p {
            margin: 1em 0;
          }
          
          .ProseMirror a {
            color: #60a5fa;
            text-decoration: underline;
          }
          
          .ProseMirror code {
            background-color: rgba(255, 255, 255, 0.1);
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-family: monospace;
          }
          
          .ProseMirror pre {
            background-color: rgba(0, 0, 0, 0.3);
            padding: 1em;
            border-radius: 5px;
            overflow-x: auto;
          }
          
          .ProseMirror pre code {
            background: none;
            padding: 0;
          }
          
          .ProseMirror p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left;
            color: #6b7280;
            pointer-events: none;
            height: 0;
          }
        `}</style>
      </div>
    </div>
  )
}


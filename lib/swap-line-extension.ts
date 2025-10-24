import { Extension } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import type { Node } from '@tiptap/pm/model'
import type { ResolvedPos } from '@tiptap/pm/model'

/**
 * SwapLineExtension - 用于交换当前行与上/下行的内容
 * 快捷键：
 *   - Ctrl+ArrowUp: 当前行与上一行交换
 *   - Ctrl+ArrowDown: 当前行与下一行交换
 */
export const SwapLineExtension = Extension.create({
  name: 'swapLine',

  addKeyboardShortcuts() {
    return {
      // Ctrl+ArrowUp: 与上一行交换
      'Ctrl-ArrowUp': ({ editor }) => {
        const { state, dispatch } = editor.view
        const { $from } = state.selection
        
        const currentBlockPos = findBlockElementPos(state, $from)
        if (currentBlockPos === null || currentBlockPos === 0) {
          return true
        }

        const prevBlockPos = findPrevBlockElementPos(state, currentBlockPos)
        if (prevBlockPos === null) {
          return true
        }

        swapNodes(state, dispatch, prevBlockPos, currentBlockPos)
        return true
      },
      // Ctrl+ArrowDown: 与下一行交换
      'Ctrl-ArrowDown': ({ editor }) => {
        const { state, dispatch } = editor.view
        const { $from } = state.selection
        
        const currentBlockPos = findBlockElementPos(state, $from)
        if (currentBlockPos === null) return true

        const nextBlockPos = findNextBlockElementPos(state, currentBlockPos)
        if (nextBlockPos === null) {
          return true
        }

        swapNodes(state, dispatch, currentBlockPos, nextBlockPos)
        return true
      },
    }
  },
})

// 查找当前块级元素位置
function findBlockElementPos(state: EditorState, $from: ResolvedPos): number | null {
  let pos = $from.before($from.depth)
  let node = state.doc.nodeAt(pos)
  
  // 如果当前节点不是块级元素，向上查找
  while (node && !node.type.isBlock && pos > 0) {
    pos--
    node = state.doc.nodeAt(pos)
  }

  return node && node.type.isBlock ? pos : null
}

// 查找上一个块级元素位置
function findPrevBlockElementPos(state: EditorState, currentPos: number): number | null {
  let pos = currentPos - 1
  while (pos >= 0) {
    const node = state.doc.nodeAt(pos)
    if (node && node.type.isBlock) {
      return pos
    }
    pos--
  }
  return null
}

// 查找下一个块级元素位置
function findNextBlockElementPos(state: EditorState, currentPos: number): number | null {
  let pos = currentPos + 1
  while (pos < state.doc.content.size) {
    const node = state.doc.nodeAt(pos)
    if (node && node.type.isBlock) {
      return pos
    }
    pos++
  }
  return null
}

// 交换两个节点
function swapNodes(state: EditorState, dispatch: (tr: Transaction) => void, pos1: number, pos2: number) {
  const node1 = state.doc.nodeAt(pos1)
  const node2 = state.doc.nodeAt(pos2)

  if (!node1 || !node2) return

  // 创建事务
  let tr = state.tr

  // 获取两个节点的大小
  const size1 = node1.nodeSize
  const size2 = node2.nodeSize

  // 删除第二个节点
  tr = tr.delete(pos2, pos2 + size2)

  // 在第一个节点处插入第二个节点
  tr = tr.insert(pos1, node2)

  // 删除原来第一个节点的位置（已经向后移动了）
  tr = tr.delete(pos1 + size2, pos1 + size2 + size1)

  dispatch(tr)
}

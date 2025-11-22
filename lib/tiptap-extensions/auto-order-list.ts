/**
 * AutoOrderListExtension - 自动重新编号有序列表
 * 
 * 功能：当有序列表的编号不从 1 开始时，自动重置为从 1 开始
 * 使用场景：删除列表第一项后，后续项自动重新编号
 * 
 * 示例：
 * 删除前：1. 第一项  2. 第二项  3. 第三项
 * 删除第一项后：2. 第二项  3. 第三项
 * 自动修正为：1. 第二项  2. 第三项
 */

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'

export const AutoOrderListExtension = Extension.create({
  name: 'autoOrderList',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('autoOrderList'),
        
        /**
         * appendTransaction 在每次文档变更后执行
         * 返回新的 transaction 来修改文档，或返回 null 表示无需修改
         */
        appendTransaction(transactions, oldState, newState) {
          // 1. 性能优化：只有在文档内容真正变化时才处理
          const hasDocChanged = transactions.some(tr => tr.docChanged)
          if (!hasDocChanged) {
            return null
          }

          // 2. 创建新的 transaction 用于修改
          const tr = newState.tr
          let modified = false

          // 3. 遍历整个文档，查找所有 orderedList 节点
          newState.doc.descendants((node, pos) => {
            // 只处理有序列表节点
            if (node.type.name === 'orderedList') {
              // 检查 start 属性
              const currentStart = node.attrs.start
              
              // 如果 start 不是 1（或未定义，默认为 1），则需要重置
              if (currentStart && currentStart !== 1) {
                // 使用 setNodeMarkup 更新节点属性
                tr.setNodeMarkup(pos, null, {
                  ...node.attrs,
                  start: 1  // 重置为 1
                })
                modified = true
                
                // 调试日志（可选）
                // console.log(`🔄 列表自动重新编号: start ${currentStart} → 1`)
              }
            }
            
            // 返回 true 继续遍历子节点
            return true
          })

          // 4. 如果有修改，返回 transaction；否则返回 null
          return modified ? tr : null
        }
      })
    ]
  }
})










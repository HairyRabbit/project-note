import type * as MarkdownIt from 'markdown-it'
import { block_name, inline_name } from './tag-block'

export function get_tags(md: MarkdownIt, content: string) {
  const tokens = md.parse(content, {})
  const tags: string[] = []
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (undefined === token) break
    if (block_name !== token.type) continue

    token.children?.forEach(t => {
      if(inline_name === t.type) tags.push(t.content)
    })
  }
  
  return tags
}


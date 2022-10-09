import * as MarkdownIt from 'markdown-it'

export const block_name = 'tag_block'
export const inline_name = 'tag_inline'
const block_regexp = /^\@tag:\s*/

export const tag_block: MarkdownIt.PluginSimple = (md) => {
  md.block.ruler.before('paragraph', block_name, (state, startLine, endLine, silent) => {
    const content = state.getLines(startLine, startLine + 1, 0, false)

    if (block_regexp.test(content) && state.isEmpty(startLine - 1)) {
      console.log('yes: opener', content)
      const tags = parse_content(content.replace(block_regexp, ''))

      const token = state.push(block_name, '', 0)
      token.tag = 'div'
      token.content = content
      token.block = true
      token.children = tags.map(tag => {
        const token = new state.Token(inline_name, 'span', 0)
        token.content = tag
        return token
      })
      state.line = startLine + 2
      console.log(token)
      return true
    }

    return false
  })

  md.renderer.rules[block_name] = (tokens, idx, options, env, renderer) => {
    return `<div class="tag">${renderer.renderInline(tokens[idx].children ?? [], options, env)}</div>`
  }
  md.renderer.rules[inline_name] = (tokens, idx, _options, _env, _renderer) => {
    return `<span class="tag-item">${tokens[idx].content}</span>`
  }
}

function parse_content(content: string) {
  const tag = content.split(',')
  return tag.map(str => str.trim())
}
import type * as MarkdownIt from 'markdown-it'

export function get_title_text(md: MarkdownIt, content: string) {
  const tokens = md.parse(content, {})
  const inlines: (typeof tokens)['0'][] = []
  for (let i = 0, beg = false;i < tokens.length;i++) {
    const token = tokens[i]
    if (undefined === token) break
    if ('heading_open' === token.type && 'h1' === token.tag) {
      beg = true
      continue
    }
    if ('heading_close' === token.type && 'h1' === token.tag) {
      break
    }

    if (!beg) continue
    if ('inline' === token.type && token.children) {
      token.children.forEach(t => inlines.push(t))
    }
  }
  const title = md.renderer.renderInlineAsText(inlines, {}, {})
  return title
}


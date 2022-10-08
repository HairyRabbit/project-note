import * as vscode from 'vscode'
import { Note, NoteBook, PrismaClient } from '../database/gen'
import { get_db } from './db'
import * as MarkdownIt from 'markdown-it'

const NoteSchema = 'note'

export class NoteTreeView implements vscode.TreeDataProvider<NoteBook | Note>, vscode.FileSystemProvider {
  private _onDidChangeTreeData: vscode.EventEmitter<NoteBook | Note | undefined | null | void> = new vscode.EventEmitter<NoteBook | Note | undefined | null | void>()
  readonly onDidChangeTreeData: vscode.Event<NoteBook | Note | undefined | null | void> = this._onDidChangeTreeData.event  

  private _onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>()
  readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._onDidChangeFile.event

  private md = MarkdownIt()

  constructor(context: vscode.ExtensionContext, private db: ReturnType<typeof get_db>, private default_note_book: NoteBook) {
    context.subscriptions.push(
      vscode.workspace.registerFileSystemProvider(NoteSchema, this, { isCaseSensitive: true }),
      vscode.window.registerTreeDataProvider('note.view.notebooks', this),

      vscode.commands.registerCommand('note.command.notebook.create', this.create_notebook.bind(this)),
      vscode.commands.registerCommand('note.command.note.create', this.create_note.bind(this)),
      vscode.commands.registerCommand('note.command.refresh', this.refresh.bind(this)),
      vscode.commands.registerCommand('note.command.notebook.delete', this.delete_notebook.bind(this)),
      vscode.commands.registerCommand('note.command.notebook.rename', this.rename_notebook.bind(this)),

      vscode.commands.registerCommand('note.command.note.open', this.open_note.bind(this)),
      vscode.commands.registerCommand('note.command.note.delete', this.delete_note.bind(this)),
    )

    this.refresh()
  }

  async getChildren(parent_notebook?: NoteBook) {
    if (undefined === parent_notebook) {
      const [notebooks, notes] = await this.db.$transaction([
        this.db.noteBook.findMany({
          where: {
            parent: null,
            is_default: false,
          }
        }),
        this.db.note.findMany({
          where: {
            notebook_id: this.default_note_book.id
          }
        })
      ])

      return [
        ...notebooks,
        ...notes,
      ]
    }
    else {
      const [notebooks, notes] = await this.db.$transaction([
        this.db.noteBook.findMany({
          where: {
            pid: parent_notebook.id
          }
        }),
        this.db.note.findMany({
          where: {
            notebook_id: parent_notebook.id
          }
        })
      ])

      return [
        ...notebooks,
        ...notes,
      ]
    }
  }

  getTreeItem(entity: NoteBook | Note): vscode.TreeItem {
    if ('name' in entity) {
      return {
        id: entity.id,
        label: entity.name,
        collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
        iconPath: new vscode.ThemeIcon('notebook'),
        contextValue: 'notebook',
      }
    }
    else {
      return {
        id: entity.id,
        label: entity.title,
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        iconPath: new vscode.ThemeIcon('output'),
        contextValue: 'note',
        command: {
          title: 'Open',
          command: 'note.command.note.open',
          arguments: [entity]
        }
      }
    }
  }



  refresh(): void {
    this._onDidChangeTreeData.fire()
  }


  private _fireSoonHandle?: NodeJS.Timer
  private _bufferedEvents: vscode.FileChangeEvent[] = []

  private _fireSoon(...events: vscode.FileChangeEvent[]): void {
    this._bufferedEvents.push(...events)

    if (this._fireSoonHandle) {
      clearTimeout(this._fireSoonHandle)
    }

    this._fireSoonHandle = setTimeout(() => {
      this._onDidChangeFile.fire(this._bufferedEvents)
      this._bufferedEvents.length = 0
    }, 5)
  }

  stat(uri: vscode.Uri): vscode.FileStat {
    const query = new URLSearchParams(uri.query)
    const id = query.get('id')
    if (null === id) throw vscode.FileSystemError.FileNotFound(uri)

    const ctime = query.get('ctime')
    const mtime = query.get('mtime')
    const size = query.get('size')    

    return {
      type: vscode.FileType.File,
      ctime: ctime ? parseInt(ctime) : 0,
      mtime: mtime ? parseInt(mtime) : 0,
      size: size ? parseInt(size) : 0,
    }
  }

  watch(_resource: vscode.Uri): vscode.Disposable {
    // ignore, fires for all changes...
    return new vscode.Disposable(() => { })
  }




  readDirectory(uri: vscode.Uri): [string, vscode.FileType][] | Thenable<[string, vscode.FileType][]> {
    throw vscode.FileSystemError.FileNotFound(uri)
  }

  createDirectory(uri: vscode.Uri): void {    
    throw vscode.FileSystemError.FileNotFound(uri)
  }

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {    
    const query = new URLSearchParams(uri.query)
    const id = query.get('id')
    if (null === id) throw vscode.FileSystemError.FileNotFound(uri)

    const note = await this.db.note.findUnique({
      where: {
        id,
      }
    })
    if (null === note) throw vscode.FileSystemError.FileNotFound(uri)
    await this.db.note.update({
      where: {
        id,
      },
      data: {
        accessed_at: new Date()
      }
    })
    return Buffer.from(note.content)
  }

  async writeFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
    const query = new URLSearchParams(uri.query)
    const id = query.get('id')
    if (null === id) throw vscode.FileSystemError.FileNotFound(uri)

    const note_content = Buffer.from(content).toString('utf-8')
    const tokens = this.md.parse(note_content, {})
    const inlines: (typeof tokens)['0'][] = []
    for (let i = 0,beg = false; i < tokens.length; i++) {
      const token = tokens[i]
      if(undefined === token) break
      if('heading_open' === token.type && 'h1' === token.tag) {
        beg = true
        continue
      }
      if('heading_close' === token.type && 'h1' === token.tag) {
        break
      }

      if(!beg) continue
      if('inline' === token.type && token.children) {
        token.children.forEach(t => inlines.push(t))
      }
    }
    const title = this.md.renderer.renderInlineAsText(inlines, {}, {})
    console.log(title)

    await this.db.note.update({
      where: {
        id
      },
      data: {
        title: '' === title ? undefined : title,
        content: note_content
      },
    })

    this._fireSoon({ type: vscode.FileChangeType.Changed, uri })
    this.refresh()
  }

  rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void {    
    throw vscode.FileSystemError.FileNotFound(oldUri)
  }

  delete(uri: vscode.Uri): void {    
    throw vscode.FileSystemError.FileNotFound(uri)
  }


  async create_notebook() {
    const input = await vscode.window.showInputBox({
      title: 'Notebook Name',
      placeHolder: 'Press new notebook name',
    })

    const name = input?.trim()
    if (undefined === name || '' === name) return

    await this.db.noteBook.create({
      data: {
        name
      }
    })
    this.refresh()
  }
  async create_note(notebook: NoteBook = this.default_note_book) {
    await this.db.note.create({
      data: {
        title: 'New Note',
        content: '',
        notebook_id: notebook.id
      }
    })
    this.refresh()
  }
  async rename_notebook(notebook: NoteBook) {
    const input = await vscode.window.showInputBox({
      title: 'Notebook Name',
      placeHolder: 'Press new notebook name',
    })
    const name = input?.trim()
    if (undefined === name || '' === name) return

    await this.db.noteBook.update({
      where: {
        id: notebook.id
      },
      data: {
        name,
      }
    })
    this.refresh()
  }

  async delete_notebook(notebook: NoteBook) {
    const result = await vscode.window.showInformationMessage('Do you want delete this notebook', {
      modal: true,
      detail: 'Delete notebook will also delete all notes under this notebook',
    }, 'Yes', 'No')
    if ('Yes' !== result) return

    await this.db.noteBook.delete({
      where: {
        id: notebook.id
      }
    })
    this.refresh()
  }

  async open_note(note: Note) {
    const query = new URLSearchParams()
    query.set('id', note.id)
    query.set('ctime', note.created_at.getTime().toString())
    query.set('mtime', note.updated_at.getTime().toString())
    query.set('size', note.content.length.toString())
    const uri = vscode.Uri.parse(`${NoteSchema}:/${note.title}?${query.toString()}`)
    const editor = await vscode.window.showTextDocument(uri, { preview: false })
    vscode.languages.setTextDocumentLanguage(editor.document, 'markdown')
  }

  async delete_note(note: Note) {
    const result = await vscode.window.showInformationMessage('Do you want delete this note', 'Yes', 'No')
    if ('Yes' !== result) return

    await this.db.note.delete({
      where: {
        id: note.id
      }
    })
    this.refresh()
  }
}
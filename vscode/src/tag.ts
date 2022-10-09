import * as vscode from 'vscode'
import { Tag, Prisma } from '../database/gen'
import { get_db } from './db'

type Entity = Tag & { _count: Prisma.TagCountOutputType }

export class TagTreeView implements vscode.TreeDataProvider<Entity> {
  private _onDidChangeTreeData: vscode.EventEmitter<Entity | undefined | null | void> = new vscode.EventEmitter<Entity | undefined | null | void>()
  readonly onDidChangeTreeData: vscode.Event<Entity | undefined | null | void> = this._onDidChangeTreeData.event    

  constructor(context: vscode.ExtensionContext, private db: ReturnType<typeof get_db>) {
    context.subscriptions.push(
      vscode.window.registerTreeDataProvider('note.view.tags', this),

      vscode.commands.registerCommand('note.command.tag.refresh', this.refresh.bind(this)),
      vscode.commands.registerCommand('note.command.tag.delete', this.delete_tag.bind(this)),
    )

    this.refresh()
  }
  async getChildren() {
    const tags = await this.db.tag.findMany({
      include: {
        _count: true
      },
    })

    console.log(tags)

    return tags
  }

  getTreeItem(entity: Entity): vscode.TreeItem {
    return {
      id: entity.id,
      label: `${entity.name}(${entity._count.NodeTag.toString()})`,
      collapsibleState: vscode.TreeItemCollapsibleState.None,
      iconPath: new vscode.ThemeIcon('tag'),
      contextValue: 'tag',
    }
  }

  refresh(): void {
    this._onDidChangeTreeData.fire()
  }

  async delete_tag(entity: Entity) {
    const result = await vscode.window.showInformationMessage('Do you want delete this tag', {
      detail: 'Delete tag will also delete tag relation for notes',
    }, 'Yes', 'No')
    if ('Yes' !== result) return

    await this.db.tag.delete({
      where: {
        id: entity.id
      }
    })
    this.refresh()
  }
}
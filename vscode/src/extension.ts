// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import { get_db } from './db'
import { NoteTreeView } from './treeview'
import { tag_block } from './markdown/tag-block'
import { TagTreeView } from './tag'


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  // console.log('Congratulations, your extension "note" is now active!')

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  // let disposable = vscode.commands.registerCommand('note.helloWorld', () => {
    // The code you place here will be executed every time your command is executed
    // Display a message box to the user
    // vscode.window.showInformationMessage('Hello World from note!')
  // })

  // context.subscriptions.push(disposable)

  const db = get_db()
  let default_notebook = await db.noteBook.findFirst({
    where: {
      is_default: true    
    }
  })
  if(null === default_notebook) default_notebook = await db.noteBook.create({
    data: {
      name: 'Default NoteBook',
      is_default: true,
    }
  })

  const notebook_view = new NoteTreeView(context, db, default_notebook)
  const tag_view = new TagTreeView(context, db)

  notebook_view.onDidChangeFile(() => tag_view.refresh())
  
  return {
    extendMarkdownIt(md: any) {
      return md.use(tag_block)
    }
  }
}

// this method is called when your extension is deactivated
export function deactivate() { }
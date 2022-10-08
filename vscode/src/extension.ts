// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import { get_db } from './db'
import { NoteTreeView } from './treeview'


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

  const treeview = new NoteTreeView(context, db, default_notebook)
  
  // const note_fs = new NoteProvider()  

  // context.subscriptions.push(vscode.workspace.registerFileSystemProvider('note', note_fs, { isCaseSensitive: true }))

  // note_fs.writeFile(vscode.Uri.parse('note:/foo'), Buffer.from('bar'), { create: true, overwrite: true })
  // vscode.workspace.updateWorkspaceFolders(0, 0, { uri: vscode.Uri.parse('note:/'), name: "Note" })

  
  
  // context.subscriptions.push(vscode.window.createTreeView('note.view.notebooks', {
  //   treeDataProvider: treeview
  // }))
  // vscode.workspace.registerTextDocumentContentProvider('note', new (class implements vscode.TextDocumentContentProvider {
  //   onDidChangeEmitter = new vscode.EventEmitter<vscode.Uri>();
  //   onDidChange = this.onDidChangeEmitter.event;
  //   provideTextDocumentContent(uri: vscode.Uri): string {
  //     // invoke cowsay, use uri-path as text
  //     return 'bar'
  //   }
  // })())

  // context.subscriptions.push(vscode.commands.registerCommand('note.command.create', () => {
  //   console.log(arguments)
  //   create_note()
  //   treeview.refresh()
  // }))
  // context.subscriptions.push(vscode.commands.registerCommand('note.command.open', async () => {
  //   console.log(arguments)
  //   let uri = vscode.Uri.parse('note:/foo')
  //   // let doc = await vscode.workspace.openTextDocument({
  //   //   language: 'markdown',
  //   //   content: 'bar'
  //   // })
  //   // const doc = await vscode.workspace.openTextDocument(uri)
  //   const editor = await vscode.window.showTextDocument(uri, { preview: false })
  //   vscode.languages.setTextDocumentLanguage(editor.document, 'markdown')
  // }))
  // context.subscriptions.push(vscode.commands.registerCommand('note.command.delete', () => {
  //   console.log(arguments)
  //   create_note()
  //   treeview.refresh()
  // }))

  // context.subscriptions.push(provider_fs)
}

// this method is called when your extension is deactivated
export function deactivate() { }